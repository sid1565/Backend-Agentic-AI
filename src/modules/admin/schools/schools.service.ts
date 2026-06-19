import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ListSchoolsQueryDto } from './dto/list-schools-query.dto';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryFailedError } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateSchoolDto } from './dto/create-school.dto';
import {
  SchoolResponseDto,
  SubscriptionResponseDto,
} from './dto/school-response.dto';
import { School } from './entities/school.entity';
import {
  Subscription,
  SubscriptionCurrency,
  SubscriptionStatus,
} from '../../subscriptions/entities/subscription.entity';
import { generateSecurePassword } from '../../../common/utils/password.util';
import { MailService } from '../../mail/mail.service';
import { PdfService } from '../../pdf/pdf.service';
import { AuditService } from '../audit/audit.service';
import { AdminAuditAction } from '../audit/admin-audit-log.entity';
import { User } from '../../../common/decorators/current-user.decorator';
import { I18nService } from 'nestjs-i18n';
import { ERROR, SUCCESS } from '../../../common/constants/messages';

type Envelope<T> = { message: string; data: T };

@Injectable()
export class SchoolsService {
  private readonly logger = new Logger(SchoolsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mail: MailService,
    private readonly pdf: PdfService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  async create(
    user: User,
    dto: CreateSchoolDto,
  ): Promise<Envelope<SchoolResponseDto>> {
    const actorId: string | null = user?.id ?? null;
    if (dto.subscriptionEndDate <= dto.subscriptionStartDate) {
      throw new BadRequestException(
        ERROR.SUBSCRIPTION_END_BEFORE_START(this.i18n),
      );
    }

    const plainPassword = generateSecurePassword(14);
    const saltRounds = this.config.get<number>('auth.bcryptSaltRounds') ?? 12;
    const hashed = await bcrypt.hash(plainPassword, saltRounds);

    const { school, subscription } = await this.dataSource.transaction(
      async (manager) => {
        const schoolRepo = manager.getRepository(School);
        const subRepo = manager.getRepository(Subscription);

        // Rely on the unique constraints (uq_schools_email,
        // uq_subscriptions_transaction_id) rather than pre-flight SELECTs:
        // two fewer round-trips and no check-then-insert race. The 23505
        // handler below maps violations to friendly Conflict messages.
        try {
          const created = schoolRepo.create({
            name: dto.schoolName,
            email: dto.email.toLowerCase(),
            phoneCode: dto.phoneCode,
            phoneNumber: dto.phoneNumber,
            password: hashed,
            studentSeat: dto.studentSeat,
          });
          const savedSchool = await schoolRepo.save(created);

          const sub = subRepo.create({
            schoolId: savedSchool.id,
            amount: dto.subscriptionAmount.toFixed(2),
            currency: dto.currency,
            transactionId: dto.transactionId,
            startDate: dto.subscriptionStartDate
              .toISOString()
              .substring(0, 10),
            endDate: dto.subscriptionEndDate.toISOString().substring(0, 10),
            status: SubscriptionStatus.ACTIVE,
          });
          const savedSub = await subRepo.save(sub);

          return { school: savedSchool, subscription: savedSub };
        } catch (err) {
          if (
            err instanceof QueryFailedError &&
            (err as unknown as { code?: string }).code === '23505'
          ) {
            const detail = (
              err as unknown as { detail?: string; constraint?: string }
            );
            const hint = `${detail.constraint ?? ''} ${detail.detail ?? ''}`;
            if (hint.includes('transaction_id')) {
              throw new ConflictException(
                ERROR.RECORD_ALREADY_EXISTS('SUBSCRIPTION', this.i18n),
              );
            }
            throw new ConflictException(
              ERROR.RECORD_ALREADY_EXISTS('SCHOOL', this.i18n),
            );
          }
          throw err;
        }
      },
    );

    await this.audit.record({
      actorId,
      action: AdminAuditAction.SCHOOL_CREATED,
      targetId: school.id,
      metadata: {
        subscriptionId: subscription.id,
        studentSeat: school.studentSeat,
      },
    });

    // Invoice PDF + welcome email are non-critical and slow (SMTP round-trip
    // plus retry backoff). They run in the background AFTER the response is
    // returned, so create() is not blocked on mail delivery. Failures are
    // logged inside the handler and never surfaced — the school already
    // exists. `void` documents the intentional fire-and-forget.
    void this.dispatchWelcomeEmail(school, subscription, plainPassword);

    return {
      message: SUCCESS.RECORD_CREATED('SCHOOL', this.i18n),
      data: this.toResponse(school, subscription),
    };
  }

  /**
   * Builds the subscription invoice and emails it with the login credentials.
   * Invoked fire-and-forget from create(): it must never throw and never touch
   * the create transaction. A delivery failure only produces a log line.
   */
  private async dispatchWelcomeEmail(
    school: School,
    subscription: Subscription,
    plainPassword: string,
  ): Promise<void> {
    try {
      const invoicePdf = await this.pdf.generateSubscriptionInvoice({
        schoolName: school.name,
        schoolEmail: school.email,
        amount: subscription.amount,
        currency: subscription.currency,
        studentSeat: school.studentSeat,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        reference: subscription.transactionId,
      });

      await this.mail.sendSchoolWelcome(
        school.email,
        {
          schoolName: school.name,
          loginEmail: school.email,
          password: plainPassword,
          amount: subscription.amount,
          currency: subscription.currency,
          transactionId: subscription.transactionId,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          loginUrl:
            this.config.get<string>('app.loginUrl') ??
            'http://localhost/login',
        },
        [
          {
            filename: `invoice-${subscription.transactionId}.pdf`,
            content: invoicePdf,
            contentType: 'application/pdf',
          },
        ],
      );
    } catch (err) {
      this.logger.error(
        `Welcome email/invoice failed for schoolId=${school.id}: ${(err as Error).message}`,
      );
    }
  }

  async resendCredentials(
    user: User,
    schoolId: string,
  ): Promise<Envelope<{ schoolId: string }>> {
    const actorId: string | null = user?.id ?? null;
    const school = await this.dataSource.getRepository(School).findOne({
      where: { id: schoolId },
    });
    if (!school)
      throw new NotFoundException(ERROR.RECORD_NOT_FOUND('SCHOOL', this.i18n));

    const latestSub = await this.dataSource
      .getRepository(Subscription)
      .findOne({
        where: { schoolId },
        order: { endDate: 'DESC' },
      });

    const newPassword = generateSecurePassword(14);
    const saltRounds = this.config.get<number>('auth.bcryptSaltRounds') ?? 12;
    const hashed = await bcrypt.hash(newPassword, saltRounds);
    await this.dataSource
      .getRepository(School)
      .update({ id: school.id }, { password: hashed });

    await this.mail.sendSchoolWelcome(school.email, {
      schoolName: school.name,
      loginEmail: school.email,
      password: newPassword,
      amount: latestSub?.amount ?? '-',
      currency: latestSub?.currency ?? '-',
      transactionId: latestSub?.transactionId ?? '-',
      startDate: latestSub?.startDate ?? '-',
      endDate: latestSub?.endDate ?? '-',
      loginUrl:
        this.config.get<string>('app.loginUrl') ?? 'http://localhost/login',
    });

    await this.audit.record({
      actorId,
      action: AdminAuditAction.CREDENTIALS_RESENT,
      targetId: school.id,
    });

    return {
      message: SUCCESS.CREDENTIALS_RESENT(this.i18n),
      data: { schoolId: school.id },
    };
  }

  async list(
    _user: User,
    query: ListSchoolsQueryDto,
  ): Promise<Envelope<PaginatedResponseDto<SchoolResponseDto>>> {
    const { limit, offset, search, order, subscriptionStatus } = query;
    // Whitelist sortable columns to prevent SQL injection via order keys.
    const ALLOWED_SORT = new Set(['createdAt', 'name', 'email']);

    const qb = this.dataSource
      .getRepository(School)
      .createQueryBuilder('school')
      .leftJoinAndMapOne(
        'school.subscription',
        Subscription,
        'subscription',
        'subscription.school_id = school.id',
      )
      .skip(offset)
      .take(limit);

    for (const [col, dir] of Object.entries(order)) {
      if (ALLOWED_SORT.has(col)) {
        qb.addOrderBy(`school.${col}`, dir === 'ASC' ? 'ASC' : 'DESC');
      }
    }
    if (!Object.keys(order).some((k) => ALLOWED_SORT.has(k))) {
      qb.addOrderBy('school.createdAt', 'DESC');
    }

    if (search) {
      qb.andWhere(
        '(LOWER(school.name) LIKE :search OR LOWER(school.email) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }
    if (subscriptionStatus) {
      qb.andWhere('subscription.status = :status', { status: subscriptionStatus });
    }

    const [rows, total] = await qb.getManyAndCount();
    const items = rows.map((row) => {
      const sub = (row as School & { subscription?: Subscription })
        .subscription;
      return this.toResponse(
        row,
        sub ?? this.emptySubscriptionPlaceholder(row.id),
      );
    });

    return {
      message: SUCCESS.RECORD_LIST_FETCHED('SCHOOL', this.i18n),
      data: { items, total, limit, offset },
    };
  }

  async findOne(
    _user: User,
    id: string,
  ): Promise<Envelope<SchoolResponseDto>> {
    const school = await this.dataSource
      .getRepository(School)
      .findOne({ where: { id } });
    if (!school)
      throw new NotFoundException(ERROR.RECORD_NOT_FOUND('SCHOOL', this.i18n));

    const sub = await this.dataSource
      .getRepository(Subscription)
      .findOne({ where: { schoolId: id }, order: { createdAt: 'DESC' } });

    return {
      message: SUCCESS.RECORD_FETCHED('SCHOOL', this.i18n),
      data: this.toResponse(
        school,
        sub ?? this.emptySubscriptionPlaceholder(id),
      ),
    };
  }

  async listSubscriptions(
    _user: User,
    schoolId: string,
  ): Promise<Envelope<Subscription[]>> {
    const exists = await this.dataSource
      .getRepository(School)
      .findOne({ where: { id: schoolId }, select: { id: true } });
    if (!exists)
      throw new NotFoundException(ERROR.RECORD_NOT_FOUND('SCHOOL', this.i18n));

    const subs = await this.dataSource
      .getRepository(Subscription)
      .find({ where: { schoolId }, order: { startDate: 'DESC' } });
    return {
      message: SUCCESS.RECORD_LIST_FETCHED('SUBSCRIPTION', this.i18n),
      data: subs,
    };
  }

  private emptySubscriptionPlaceholder(schoolId: string): Subscription {
    const sub = new Subscription();
    sub.id = '';
    sub.schoolId = schoolId;
    sub.amount = '0.00';
    sub.currency = SubscriptionCurrency.USD;
    sub.transactionId = '';
    sub.startDate = '-';
    sub.endDate = '-';
    sub.status = SubscriptionStatus.EXPIRED;
    return sub;
  }

  private toResponse(
    school: School,
    subscription: Subscription,
  ): SchoolResponseDto {
    const sub: SubscriptionResponseDto = {
      id: subscription.id,
      amount: subscription.amount,
      currency: subscription.currency,
      transactionId: subscription.transactionId,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      status: subscription.status,
    };
    return {
      id: school.id,
      name: school.name,
      email: school.email,
      phoneCode: school.phoneCode,
      phoneNumber: school.phoneNumber,
      studentSeat: school.studentSeat,
      createdAt: school.createdAt,
      subscription: sub,
    };
  }
}

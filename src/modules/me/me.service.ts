import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { School } from "../admin/schools/entities/school.entity";
import { Subscription } from "../subscriptions/entities/subscription.entity";
import {
  SchoolResponseDto,
  SubscriptionResponseDto,
} from "../admin/schools/dto/school-response.dto";
import {
  AuthenticatedUser,
  User,
} from "../../common/decorators/current-user.decorator";
import { I18nService } from "nestjs-i18n";
import { ERROR, SUCCESS } from "../../common/constants/messages";

type Envelope<T> = { message: string; data: T };

/**
 * Self-service reads for the authenticated SCHOOL principal.
 *
 * Ownership model (`owner-only:school`): for every `/me` read the owning
 * resource id is the principal's own subject id taken from the verified JWT
 * (`user.id`). Queries are keyed strictly on that id, so a principal can only
 * ever read their own row — there is no caller-supplied id to tamper with.
 * `assertSchoolPrincipal` adds defense-in-depth on top of RolesGuard: even if
 * a non-SCHOOL token ever reached this service, it is rejected before any read.
 */
@Injectable()
export class MeService {
  private readonly logger = new Logger(MeService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async getOwnSchool(user: User): Promise<Envelope<SchoolResponseDto>> {
    const schoolId = this.assertSchoolPrincipal(user);

    const school = await this.dataSource
      .getRepository(School)
      .findOne({ where: { id: schoolId } });
    if (!school) {
      throw new NotFoundException(ERROR.RECORD_NOT_FOUND('ME_SCHOOL', this.i18n));
    }

    const sub = await this.findLatestSubscription(schoolId);
    return {
      message: SUCCESS.RECORD_FETCHED('ME_SCHOOL', this.i18n),
      data: this.toSchoolResponse(school, sub),
    };
  }

  async getOwnSubscription(
    user: User,
  ): Promise<Envelope<SubscriptionResponseDto>> {
    const schoolId = this.assertSchoolPrincipal(user);

    const sub = await this.findLatestSubscription(schoolId);
    if (!sub) {
      throw new NotFoundException(
        ERROR.RECORD_NOT_FOUND('ME_SUBSCRIPTION', this.i18n),
      );
    }
    return {
      message: SUCCESS.RECORD_FETCHED('ME_SUBSCRIPTION', this.i18n),
      data: this.toSubscriptionResponse(sub),
    };
  }

  /**
   * Resolves the owning school id for the principal and enforces the
   * `owner-only:school` invariant. Returns the id to key every read on.
   */
  private assertSchoolPrincipal(user: AuthenticatedUser | null): string {
    if (!user || user.role !== "SCHOOL" || !user.id) {
      this.logger.warn(
        `Blocked /me access for principal role=${user?.role ?? "anonymous"}`,
      );
      throw new ForbiddenException(ERROR.SCHOOL_ACCOUNTS_ONLY(this.i18n));
    }
    return user.id;
  }

  private findLatestSubscription(
    schoolId: string,
  ): Promise<Subscription | null> {
    return this.dataSource.getRepository(Subscription).findOne({
      where: { schoolId },
      order: { createdAt: "DESC" },
    });
  }

  private toSchoolResponse(
    school: School,
    sub: Subscription | null,
  ): SchoolResponseDto {
    return {
      id: school.id,
      name: school.name,
      email: school.email,
      phoneCode: school.phoneCode,
      phoneNumber: school.phoneNumber,
      studentSeat: school.studentSeat,
      createdAt: school.createdAt,
      subscription: sub ? this.toSubscriptionResponse(sub) : null,
    };
  }

  private toSubscriptionResponse(sub: Subscription): SubscriptionResponseDto {
    return {
      id: sub.id,
      amount: sub.amount,
      currency: sub.currency,
      transactionId: sub.transactionId,
      startDate: sub.startDate,
      endDate: sub.endDate,
      status: sub.status,
    };
  }
}

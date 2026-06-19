import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { IsNull, LessThan, Repository } from 'typeorm';
import { AppRole } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/current-user.decorator';
import { I18nService } from 'nestjs-i18n';
import { AUTH_ERROR, AUTH_SUCCESS } from '../../common/constants/messages';

type Envelope<T> = { message: string; data: T };
import { School } from '../admin/schools/entities/school.entity';
import { MailService } from '../mail/mail.service';
import { AdminStatus, AdminUser } from './entities/admin-user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { SubjectType } from './entities/subject-type.enum';
import { LoginDto, TokenPairResponseDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(AdminUser)
    private readonly admins: Repository<AdminUser>,
    @InjectRepository(School)
    private readonly schools: Repository<School>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokens: Repository<PasswordResetToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly i18n: I18nService,
  ) {}

  // ---- Login ----------------------------------------------------------------

  async adminLogin(dto: LoginDto): Promise<Envelope<TokenPairResponseDto>> {
    const admin = await this.admins
      .createQueryBuilder('a')
      .addSelect('a.password')
      .where('a.email = :email', { email: dto.email.toLowerCase() })
      .getOne();

    if (
      !admin ||
      admin.status !== AdminStatus.ACTIVE ||
      !(await bcrypt.compare(dto.password, admin.password))
    ) {
      throw new UnauthorizedException(AUTH_ERROR.INVALID_CREDENTIALS(this.i18n));
    }

    return {
      message: AUTH_SUCCESS.LOGIN(this.i18n),
      data: await this.issueTokens(admin.id, 'ADMIN', SubjectType.ADMIN),
    };
  }

  async schoolLogin(dto: LoginDto): Promise<Envelope<TokenPairResponseDto>> {
    const school = await this.schools
      .createQueryBuilder('s')
      .addSelect('s.password')
      .where('s.email = :email', { email: dto.email.toLowerCase() })
      .getOne();

    if (!school || !(await bcrypt.compare(dto.password, school.password))) {
      throw new UnauthorizedException(AUTH_ERROR.INVALID_CREDENTIALS(this.i18n));
    }

    return {
      message: AUTH_SUCCESS.LOGIN(this.i18n),
      data: await this.issueTokens(school.id, 'SCHOOL', SubjectType.SCHOOL),
    };
  }

  // ---- Refresh / Logout -----------------------------------------------------

  async refresh(dto: RefreshDto): Promise<Envelope<TokenPairResponseDto>> {
    if (!dto.refreshToken) {
      throw new BadRequestException(AUTH_ERROR.REFRESH_TOKEN_REQUIRED(this.i18n));
    }
    const tokenHash = this.hashToken(dto.refreshToken);
    const record = await this.refreshTokens.findOne({ where: { tokenHash } });

    if (!record) {
      throw new UnauthorizedException(
        AUTH_ERROR.INVALID_REFRESH_TOKEN(this.i18n),
      );
    }

    // Reuse detection: an already-rotated/revoked token is being presented
    // again — a strong signal it was stolen and replayed. Revoke EVERY active
    // session for the subject (kill the family) and refuse. The external
    // message stays generic so an attacker can't tell detection fired.
    if (record.revokedAt !== null) {
      await this.revokeAllSessions(record.subjectId, record.subjectType);
      this.logger.warn(
        `Refresh token reuse detected — revoked all sessions for ` +
          `subjectType=${record.subjectType} subjectId=${record.subjectId}`,
      );
      throw new UnauthorizedException(
        AUTH_ERROR.INVALID_REFRESH_TOKEN(this.i18n),
      );
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException(
        AUTH_ERROR.INVALID_REFRESH_TOKEN(this.i18n),
      );
    }

    // Rotate: revoke the presented token, then mint a fresh pair.
    record.revokedAt = new Date();
    await this.refreshTokens.save(record);

    const role: AppRole =
      record.subjectType === SubjectType.ADMIN ? 'ADMIN' : 'SCHOOL';

    return {
      message: AUTH_SUCCESS.REFRESHED(this.i18n),
      data: await this.issueTokens(record.subjectId, role, record.subjectType),
    };
  }

  async logout(user: User): Promise<Envelope<{ loggedOut: true }>> {
    const subjectType =
      user.role === 'ADMIN' ? SubjectType.ADMIN : SubjectType.SCHOOL;
    await this.revokeAllSessions(user.id, subjectType);
    return {
      message: AUTH_SUCCESS.LOGOUT(this.i18n),
      data: { loggedOut: true },
    };
  }

  // ---- Password reset -------------------------------------------------------

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<Envelope<{ requested: true }>> {
    const email = dto.email.toLowerCase();
    const subject = await this.findSubjectByEmail(email);

    // Always return success to avoid account enumeration.
    if (!subject) {
      this.logger.warn(
        `Password reset requested for unknown email=${this.maskEmail(email)}`,
      );
      return {
        message: AUTH_SUCCESS.PASSWORD_RESET_REQUESTED(this.i18n),
        data: { requested: true },
      };
    }

    const raw = randomBytes(32).toString('hex');
    const ttlMinutes = this.config.get<number>('auth.resetTokenTtlMinutes') ?? 30;
    await this.resetTokens.insert({
      subjectId: subject.id,
      subjectType: subject.type,
      tokenHash: this.hashToken(raw),
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    });

    const base =
      this.config.get<string>('app.resetPasswordUrl') ??
      'http://localhost:3000/reset-password';
    const resetUrl = `${base}?token=${raw}`;
    try {
      await this.mail.sendPasswordReset(email, { resetUrl, ttlMinutes });
    } catch (err) {
      this.logger.error(
        `Failed to send reset email to=${this.maskEmail(email)}`,
        (err as Error).stack,
      );
    }
    return {
      message: AUTH_SUCCESS.PASSWORD_RESET_REQUESTED(this.i18n),
      data: { requested: true },
    };
  }

  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<Envelope<{ reset: true }>> {
    const tokenHash = this.hashToken(dto.token);
    const record = await this.resetTokens.findOne({ where: { tokenHash } });

    if (
      !record ||
      record.usedAt !== null ||
      record.expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(AUTH_ERROR.INVALID_RESET_TOKEN(this.i18n));
    }

    const rounds = this.config.get<number>('auth.bcryptSaltRounds') ?? 12;
    const hashed = await bcrypt.hash(dto.newPassword, rounds);

    if (record.subjectType === SubjectType.ADMIN) {
      await this.admins.update({ id: record.subjectId }, { password: hashed });
    } else {
      await this.schools.update({ id: record.subjectId }, { password: hashed });
    }

    record.usedAt = new Date();
    await this.resetTokens.save(record);

    // Invalidate existing sessions after a password change.
    await this.revokeAllSessions(record.subjectId, record.subjectType);
    return {
      message: AUTH_SUCCESS.PASSWORD_RESET_DONE(this.i18n),
      data: { reset: true },
    };
  }

  // ---- Helpers --------------------------------------------------------------

  private async issueTokens(
    subjectId: string,
    role: AppRole,
    subjectType: SubjectType,
  ): Promise<TokenPairResponseDto> {
    const accessToken = this.jwt.sign({ sub: subjectId, role });
    const accessTokenExpiresIn = this.durationToSeconds(
      this.config.get<string>('auth.jwtExpiresIn') ?? '15m',
    );

    const rawRefresh = randomBytes(48).toString('hex');
    const refreshTtl = this.durationToSeconds(
      this.config.get<string>('auth.jwtRefreshExpiresIn') ?? '30d',
    );
    await this.refreshTokens.insert({
      subjectId,
      subjectType,
      tokenHash: this.hashToken(rawRefresh),
      expiresAt: new Date(Date.now() + refreshTtl * 1000),
    });

    return {
      accessToken,
      accessTokenExpiresIn,
      refreshToken: rawRefresh,
      tokenType: 'Bearer',
      user: {
        id: subjectId,
        role: role === 'ADMIN' ? 'admin' : 'school',
      },
    };
  }

  private async findSubjectByEmail(
    email: string,
  ): Promise<{ id: string; type: SubjectType } | null> {
    // Always query both tables (no short-circuit) so a hit and a miss perform
    // the same work — closes the account-enumeration timing oracle. Run them
    // concurrently to keep latency low. Admin takes precedence on the rare
    // both-match case.
    const [admin, school] = await Promise.all([
      this.admins.findOne({ where: { email } }),
      this.schools.findOne({ where: { email } }),
    ]);
    if (admin) return { id: admin.id, type: SubjectType.ADMIN };
    if (school) return { id: school.id, type: SubjectType.SCHOOL };
    return null;
  }

  /**
   * Revoke every active (non-revoked) refresh token for a subject. Used on
   * logout, after a password change, and on refresh-token reuse detection.
   */
  private async revokeAllSessions(
    subjectId: string,
    subjectType: SubjectType,
  ): Promise<void> {
    await this.refreshTokens.update(
      { subjectId, subjectType, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private durationToSeconds(value: string): number {
    const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
    if (!match) return 900;
    const amount = parseInt(match[1], 10);
    const unit = match[2] ?? 's';
    const factor = { s: 1, m: 60, h: 3600, d: 86_400 }[unit] ?? 1;
    return amount * factor;
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local.slice(0, 2)}***@${domain}`;
  }

  /** Housekeeping helper: prune expired/revoked refresh tokens. */
  async pruneExpiredRefreshTokens(): Promise<void> {
    await this.refreshTokens.delete({ expiresAt: LessThan(new Date()) });
  }
}

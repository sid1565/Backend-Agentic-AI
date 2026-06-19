import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../src/modules/auth/auth.service';

jest.mock('bcrypt');
import {
  AdminStatus,
  AdminUser,
} from '../src/modules/auth/entities/admin-user.entity';
import { SubjectType } from '../src/modules/auth/entities/subject-type.enum';

/**
 * Unit tests for AuthService — repositories, jwt, config and mail are mocked
 * so no DB is required. Covers the auth invariants: credential rejection,
 * refresh-token rotation/expiry/revocation, logout revocation, account-
 * enumeration-safe forgot-password, and single-use reset tokens.
 */
describe('AuthService', () => {
  let service: AuthService;
  let admins: any;
  let schools: any;
  let refreshTokens: any;
  let resetTokens: any;
  let jwt: any;
  let config: any;
  let mail: any;

  const buildQb = (result: unknown) => ({
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
  });

  beforeEach(() => {
    admins = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    schools = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    refreshTokens = {
      insert: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };
    resetTokens = {
      insert: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    jwt = { sign: jest.fn().mockReturnValue('access.jwt.token') };
    config = new ConfigService();
    jest.spyOn(config, 'get').mockImplementation((key: any) => {
      const map: Record<string, unknown> = {
        'auth.jwtExpiresIn': '15m',
        'auth.jwtRefreshExpiresIn': '30d',
        'auth.bcryptSaltRounds': 4,
        'auth.resetTokenTtlMinutes': 30,
        'app.resetPasswordUrl': 'http://localhost/reset',
      };
      return map[key];
    });
    mail = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const i18n = { t: (k: string) => k } as any;
    service = new AuthService(
      admins,
      schools,
      refreshTokens,
      resetTokens,
      jwt as unknown as JwtService,
      config,
      mail,
      i18n,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  const admin: Partial<AdminUser> = {
    id: 'admin-1',
    email: 'admin@x.io',
    password: 'hashed',
    status: AdminStatus.ACTIVE,
  };

  describe('adminLogin', () => {
    it('AC-AUTH-1: issues an access+refresh pair on valid credentials', async () => {
      admins.createQueryBuilder.mockReturnValue(buildQb(admin));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await service.adminLogin({
        email: 'admin@x.io',
        password: 'pw',
      });

      expect(res.data.accessToken).toBe('access.jwt.token');
      expect(res.data.refreshToken).toEqual(expect.any(String));
      expect(res.data.tokenType).toBe('Bearer');
      expect(res.data.user).toEqual({ id: 'admin-1', role: 'admin' });
      expect(jwt.sign).toHaveBeenCalledWith({ sub: 'admin-1', role: 'ADMIN' });
      expect(refreshTokens.insert).toHaveBeenCalledTimes(1);
    });

    it('AC-AUTH-2: rejects unknown email with 401', async () => {
      admins.createQueryBuilder.mockReturnValue(buildQb(null));
      await expect(
        service.adminLogin({ email: 'nope@x.io', password: 'pw' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('AC-AUTH-3: rejects a disabled admin with 401', async () => {
      admins.createQueryBuilder.mockReturnValue(
        buildQb({ ...admin, status: AdminStatus.DISABLED }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(
        service.adminLogin({ email: 'admin@x.io', password: 'pw' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('AC-AUTH-4: rejects a wrong password with 401', async () => {
      admins.createQueryBuilder.mockReturnValue(buildQb(admin));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.adminLogin({ email: 'admin@x.io', password: 'bad' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('schoolLogin', () => {
    it('AC-AUTH-5: issues tokens with role=school', async () => {
      schools.createQueryBuilder.mockReturnValue(
        buildQb({ id: 'school-1', password: 'hashed' }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await service.schoolLogin({
        email: 's@x.io',
        password: 'pw',
      });

      expect(res.data.user).toEqual({ id: 'school-1', role: 'school' });
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'school-1',
        role: 'SCHOOL',
      });
    });
  });

  describe('refresh', () => {
    it('AC-AUTH-6: rejects a missing token with 400', async () => {
      await expect(service.refresh({})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('AC-AUTH-7: rejects an unknown token with 401', async () => {
      refreshTokens.findOne.mockResolvedValue(null);
      await expect(
        service.refresh({ refreshToken: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('AC-AUTH-8: rejects a revoked token with 401', async () => {
      refreshTokens.findOne.mockResolvedValue({
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
        subjectType: SubjectType.ADMIN,
        subjectId: 'admin-1',
      });
      await expect(
        service.refresh({ refreshToken: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('AC-AUTH-8b: reuse of a revoked token revokes ALL sessions for the subject', async () => {
      // Replay of an already-rotated token is a theft signal → kill the family.
      refreshTokens.findOne.mockResolvedValue({
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        subjectType: SubjectType.ADMIN,
        subjectId: 'admin-1',
      });

      await expect(
        service.refresh({ refreshToken: 'stolen' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(refreshTokens.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectId: 'admin-1',
          subjectType: SubjectType.ADMIN,
        }),
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
      // a new pair is NOT minted on reuse
      expect(refreshTokens.insert).not.toHaveBeenCalled();
    });

    it('AC-AUTH-9: rejects an expired token with 401', async () => {
      refreshTokens.findOne.mockResolvedValue({
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        subjectType: SubjectType.ADMIN,
        subjectId: 'admin-1',
      });
      await expect(
        service.refresh({ refreshToken: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('AC-AUTH-10: rotates a valid token (revokes old, mints new)', async () => {
      const record = {
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        subjectType: SubjectType.SCHOOL,
        subjectId: 'school-1',
      };
      refreshTokens.findOne.mockResolvedValue(record);

      const res = await service.refresh({ refreshToken: 'valid' });

      expect(record.revokedAt).toBeInstanceOf(Date); // old revoked
      expect(refreshTokens.save).toHaveBeenCalledWith(record);
      expect(refreshTokens.insert).toHaveBeenCalledTimes(1); // new minted
      expect(res.data.user.role).toBe('school');
    });
  });

  describe('logout', () => {
    it('AC-AUTH-11: revokes the active refresh tokens for the subject', async () => {
      await service.logout({ id: 'admin-1', role: 'ADMIN' });
      expect(refreshTokens.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectId: 'admin-1',
          subjectType: SubjectType.ADMIN,
        }),
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });
  });

  describe('forgotPassword', () => {
    it('AC-AUTH-12: stays silent (no insert/mail) for an unknown email', async () => {
      admins.findOne.mockResolvedValue(null);
      schools.findOne.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'ghost@x.io' }),
      ).resolves.toEqual(
        expect.objectContaining({ data: { requested: true } }),
      );

      expect(resetTokens.insert).not.toHaveBeenCalled();
      expect(mail.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('AC-AUTH-13: creates a reset token and emails a known admin', async () => {
      admins.findOne.mockResolvedValue({ id: 'admin-1' });

      await service.forgotPassword({ email: 'admin@x.io' });

      expect(resetTokens.insert).toHaveBeenCalledTimes(1);
      expect(mail.sendPasswordReset).toHaveBeenCalledWith(
        'admin@x.io',
        expect.objectContaining({ resetUrl: expect.stringContaining('token=') }),
      );
    });

    it('AC-AUTH-13b: lookup is constant-work — both tables queried even on an admin hit', async () => {
      // No short-circuit: a hit and a miss must do the same work (no timing oracle).
      admins.findOne.mockResolvedValue({ id: 'admin-1' });
      schools.findOne.mockResolvedValue(null);

      await service.forgotPassword({ email: 'admin@x.io' });

      expect(admins.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@x.io' },
      });
      expect(schools.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@x.io' },
      });
    });
  });

  describe('resetPassword', () => {
    const dto = { token: 't'.repeat(20), newPassword: 'NewPassw0rd!!' };

    it('AC-AUTH-14: rejects an unknown reset token with 400', async () => {
      resetTokens.findOne.mockResolvedValue(null);
      await expect(service.resetPassword(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('AC-AUTH-15: rejects an already-used token with 400', async () => {
      resetTokens.findOne.mockResolvedValue({
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
        subjectType: SubjectType.ADMIN,
        subjectId: 'admin-1',
      });
      await expect(service.resetPassword(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('AC-AUTH-16: resets password, consumes token, revokes sessions', async () => {
      const record = {
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        subjectType: SubjectType.ADMIN,
        subjectId: 'admin-1',
      };
      resetTokens.findOne.mockResolvedValue(record);

      await service.resetPassword(dto);

      expect(admins.update).toHaveBeenCalledWith(
        { id: 'admin-1' },
        expect.objectContaining({ password: expect.any(String) }),
      );
      expect(record.usedAt).toBeInstanceOf(Date); // consumed
      expect(refreshTokens.update).toHaveBeenCalled(); // sessions revoked
    });
  });
});

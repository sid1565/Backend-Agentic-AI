import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { MailService } from '../src/modules/mail/mail.service';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { School } from '../src/modules/admin/schools/entities/school.entity';
import {
  Subscription,
  SubscriptionCurrency,
  SubscriptionStatus,
} from '../src/modules/subscriptions/entities/subscription.entity';

/**
 * End-to-end suite. Boots the real Nest app against the backend_agent_test
 * database (TypeORM synchronize on in NODE_ENV=test). MailService is replaced
 * with a no-op so no SMTP connection is attempted. Exercises the auth-invariant
 * matrix (no token / wrong role / right role) and the core flows.
 */
const ADMIN = { email: 'root-e2e@school-saas.test', password: 'RootPw!2026' };
const SCHOOL = { email: 'school-e2e@school-saas.test', password: 'SchoolPw!1' };
const V = '/v1';

describe('School SaaS (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let schoolId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue({
        sendSchoolWelcome: jest.fn().mockResolvedValue(undefined),
        sendPasswordReset: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    await app.init();

    ds = app.get(DataSource);
    // Clean slate for repeatable runs (keep the seeded root admin).
    await ds.query(
      'TRUNCATE TABLE subscriptions, schools, refresh_tokens, password_reset_tokens, admin_audit_logs RESTART IDENTITY CASCADE',
    );

    // Seed a school with a KNOWN password (real flow emails a random one).
    const school = await ds.getRepository(School).save(
      ds.getRepository(School).create({
        name: 'E2E Academy',
        email: SCHOOL.email,
        phoneCode: '+1',
        phoneNumber: '5550001111',
        password: await bcrypt.hash(SCHOOL.password, 4),
        studentSeat: 250,
      }),
    );
    schoolId = school.id;
    await ds.getRepository(Subscription).save(
      ds.getRepository(Subscription).create({
        schoolId: school.id,
        amount: '1000.00',
        currency: SubscriptionCurrency.USD,
        transactionId: 'TXN-E2E-0001',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: SubscriptionStatus.ACTIVE,
      }),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  const login = (path: string, body: object) =>
    request(app.getHttpServer()).post(`${V}/auth/${path}`).send(body);

  // ---- Authentication -------------------------------------------------------

  describe('auth', () => {
    it('AC-E2E-1: admin login returns an access+refresh pair', async () => {
      const res = await login('admin/login', ADMIN).expect(200);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).toEqual(expect.any(String));
      expect(res.body.data.user).toEqual({
        id: expect.any(String),
        role: 'admin',
      });
    });

    it('AC-E2E-2: admin login with wrong password is 401', async () => {
      await login('admin/login', { ...ADMIN, password: 'WrongPw!2026' }).expect(
        401,
      );
    });

    it('AC-E2E-3: school login works with the seeded credentials', async () => {
      const res = await login('school/login', SCHOOL).expect(200);
      expect(res.body.data.user.role).toBe('school');
      expect(res.body.data.user.id).toBe(schoolId);
    });

    it('AC-E2E-4: refresh rotates — old token is rejected after use', async () => {
      const { body } = await login('admin/login', ADMIN).expect(200);
      const first = await request(app.getHttpServer())
        .post(`${V}/auth/refresh`)
        .send({ refreshToken: body.data.refreshToken })
        .expect(200);
      expect(first.body.data.accessToken).toEqual(expect.any(String));
      // Reusing the now-rotated token must fail.
      await request(app.getHttpServer())
        .post(`${V}/auth/refresh`)
        .send({ refreshToken: body.data.refreshToken })
        .expect(401);
    });

    it('AC-E2E-5: forgot-password always returns 200 (no enumeration)', async () => {
      await login('forgot-password', { email: 'ghost@nowhere.test' }).expect(
        200,
      );
      await login('forgot-password', { email: ADMIN.email }).expect(200);
    });
  });

  // ---- Auth-invariant matrix on a protected ADMIN endpoint ------------------

  describe('POST /admin/schools auth matrix', () => {
    const newSchool = {
      schoolName: 'Created School',
      email: 'created-e2e@school.test',
      phoneCode: '+1',
      phoneNumber: '5559990000',
      studentSeat: 50,
      subscriptionAmount: 499.0,
      currency: 'USD',
      transactionId: 'TXN-E2E-CREATE-1',
      subscriptionStartDate: '2026-02-01',
      subscriptionEndDate: '2027-01-31',
    };

    it('AC-E2E-6: no token → 401', async () => {
      await request(app.getHttpServer())
        .post(`${V}/admin/schools`)
        .send(newSchool)
        .expect(401);
    });

    it('AC-E2E-7: SCHOOL token → 403', async () => {
      const { body } = await login('school/login', SCHOOL);
      await request(app.getHttpServer())
        .post(`${V}/admin/schools`)
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .send(newSchool)
        .expect(403);
    });

    it('AC-E2E-8: ADMIN token → 201 and persists', async () => {
      const { body } = await login('admin/login', ADMIN);
      const res = await request(app.getHttpServer())
        .post(`${V}/admin/schools`)
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .send(newSchool)
        .expect(201);
      expect(res.body.data.email).toBe(newSchool.email);
      expect(res.body.data.subscription.status).toBe('ACTIVE');
    });

    it('AC-E2E-9: ADMIN duplicate email → 409', async () => {
      const { body } = await login('admin/login', ADMIN);
      await request(app.getHttpServer())
        .post(`${V}/admin/schools`)
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .send({ ...newSchool, transactionId: 'TXN-E2E-CREATE-2' })
        .expect(409);
    });
  });

  // ---- /me self-service (SCHOOL only) ---------------------------------------

  describe('GET /me/school', () => {
    it('AC-E2E-10: SCHOOL reads its own record', async () => {
      const { body } = await login('school/login', SCHOOL);
      const res = await request(app.getHttpServer())
        .get(`${V}/me/school`)
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .expect(200);
      expect(res.body.data.id).toBe(schoolId);
    });

    it('AC-E2E-11: ADMIN token → 403 (wrong role for /me)', async () => {
      const { body } = await login('admin/login', ADMIN);
      await request(app.getHttpServer())
        .get(`${V}/me/school`)
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .expect(403);
    });

    it('AC-E2E-12: no token → 401', async () => {
      await request(app.getHttpServer()).get(`${V}/me/school`).expect(401);
    });
  });

  // ---- Audit logs (ADMIN only) ----------------------------------------------

  describe('GET /admin/audit-logs', () => {
    it('AC-E2E-13: ADMIN gets a paginated envelope', async () => {
      const { body } = await login('admin/login', ADMIN);
      const res = await request(app.getHttpServer())
        .get(`${V}/admin/audit-logs`)
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .expect(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          data: expect.any(Array),
          total: expect.any(Number),
        }),
      );
    });

    it('AC-E2E-14: SCHOOL token → 403', async () => {
      const { body } = await login('school/login', SCHOOL);
      await request(app.getHttpServer())
        .get(`${V}/admin/audit-logs`)
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .expect(403);
    });
  });

  // ---- Announcements (S-01): admin writes, authenticated reads --------------

  describe('Announcements module (S-01)', () => {
    const adminToken = async () =>
      (await login('admin/login', ADMIN)).body.data.accessToken as string;
    const schoolToken = async () =>
      (await login('school/login', SCHOOL)).body.data.accessToken as string;

    it('AC-ANN-9: write/read without a token → 401', async () => {
      await request(app.getHttpServer())
        .post(`${V}/admin/announcements`)
        .send({ title: 'x', body: 'y' })
        .expect(401);
      await request(app.getHttpServer()).get(`${V}/announcements`).expect(401);
    });

    it('AC-ANN-10: SCHOOL token cannot write → 403', async () => {
      await request(app.getHttpServer())
        .post(`${V}/admin/announcements`)
        .set('Authorization', `Bearer ${await schoolToken()}`)
        .send({ title: 'x', body: 'y' })
        .expect(403);
    });

    it('AC-ANN-2: ADMIN create with empty title → 400 (validation)', async () => {
      await request(app.getHttpServer())
        .post(`${V}/admin/announcements`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ title: '', body: 'y' })
        .expect(400);
    });

    it('AC-ANN-11 + 12: admin CRUD + authenticated read lifecycle', async () => {
      const aTok = await adminToken();

      // ADMIN create → 201
      const created = await request(app.getHttpServer())
        .post(`${V}/admin/announcements`)
        .set('Authorization', `Bearer ${aTok}`)
        .send({ title: 'Exam week', body: 'Starts Monday' })
        .expect(201);
      const id = created.body.data.id as string;
      expect(created.body.data.createdBy).toEqual(expect.any(String));

      // SCHOOL (authenticated user) can read list + single → 200
      const sTok = await schoolToken();
      const list = await request(app.getHttpServer())
        .get(`${V}/announcements`)
        .set('Authorization', `Bearer ${sTok}`)
        .expect(200);
      expect(list.body.data.some((a: { id: string }) => a.id === id)).toBe(true);

      await request(app.getHttpServer())
        .get(`${V}/announcements/${id}`)
        .set('Authorization', `Bearer ${sTok}`)
        .expect(200);

      // ADMIN update → 200
      const updated = await request(app.getHttpServer())
        .patch(`${V}/admin/announcements/${id}`)
        .set('Authorization', `Bearer ${aTok}`)
        .send({ title: 'Exam week (updated)' })
        .expect(200);
      expect(updated.body.data.title).toBe('Exam week (updated)');

      // ADMIN soft-delete → 200, then it disappears from reads (404 / absent)
      await request(app.getHttpServer())
        .delete(`${V}/admin/announcements/${id}`)
        .set('Authorization', `Bearer ${aTok}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`${V}/announcements/${id}`)
        .set('Authorization', `Bearer ${sTok}`)
        .expect(404);

      const afterDelete = await request(app.getHttpServer())
        .get(`${V}/announcements`)
        .set('Authorization', `Bearer ${sTok}`)
        .expect(200);
      expect(
        afterDelete.body.data.some((a: { id: string }) => a.id === id),
      ).toBe(false);
    });
  });
});

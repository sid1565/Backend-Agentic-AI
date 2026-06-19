# School SaaS — Manual Subscription System

NestJS + TypeORM + Postgres backend for admin-driven school onboarding with subscription management and credential email delivery.

## Stack
- NestJS 10, TypeORM 0.3, PostgreSQL
- Passport JWT, **roles-only RBAC** (`ADMIN`, `SCHOOL`) — see [ADR 0003](docs/adr/0003-authorization-rbac-roles-only.md)
- Access JWT (15m) + opaque **DB-backed refresh tokens** (rotated, revocable) — see [ADR 0001](docs/adr/0001-token-strategy.md)
- bcrypt (cost 12) for password hashing
- `@nestjs/throttler` rate limiting (100/min global, 10/min on login)
- Nodemailer + Handlebars for email templating
- `@nestjs/schedule` for the subscription expiry cron

Full API reference: [`docs/openapi.yaml`](docs/openapi.yaml) · Ops: [`docs/runbook.md`](docs/runbook.md) · Decisions: [`docs/adr/`](docs/adr) · Review: [`REVIEW.md`](REVIEW.md)

## Setup
```bash
cp .env.example .env
npm install
npm run start:dev
```

## Module Map
```
src/
├── app.module.ts
├── main.ts
├── config/configuration.ts
├── common/
│   ├── decorators/   (Roles, CurrentUser)
│   ├── guards/       (JwtAuthGuard, RolesGuard)
│   ├── filters/      (GlobalHttpExceptionFilter)
│   └── utils/        (password.util)
└── modules/
    ├── auth/                       JWT strategy, AuthService, AdminSeeder, auth entities
    ├── mail/                       Nodemailer + handlebars template
    ├── me/                         SCHOOL self-service (own school + subscription)
    ├── admin/
    │   ├── audit/                  Admin audit log
    │   └── schools/                Controller, service, DTOs, entity
    └── subscriptions/              Entity + expiry cron
```

## Authentication
All paths are versioned under `/v1`. On first boot a root admin is seeded from
`ROOT_ADMIN_EMAIL` / `ROOT_ADMIN_PASSWORD` (idempotent).

| Endpoint | Role | Purpose |
|---|---|---|
| `POST /v1/auth/admin/login` | public | Admin login → access + refresh tokens (10/min) |
| `POST /v1/auth/school/login` | public | School login → tokens (10/min) |
| `POST /v1/auth/refresh` | public | Rotate refresh token → new pair |
| `POST /v1/auth/logout` | any authed | Revoke the caller's refresh tokens |
| `POST /v1/auth/forgot-password` | public | Email a reset link (always 202) |
| `POST /v1/auth/reset-password` | public | Reset password via emailed token |
| `GET  /v1/me/school` · `/v1/me/subscription` | `SCHOOL` | Read own records |
| `/v1/admin/schools*`, `/v1/admin/audit-logs` | `ADMIN` | Admin operations |

Send the access token as `Authorization: Bearer <jwt>`.

## API

### `POST /v1/admin/schools`
Auth: `Bearer <jwt>` with role `ADMIN`.

**Request**
```json
{
  "schoolName": "Sunrise Public School",
  "email": "principal@sunrise.edu",
  "phoneCode": "+91",
  "phoneNumber": "9876543210",
  "studentSeat": 500,
  "subscriptionAmount": 49999.00,
  "currency": "USD",
  "transactionId": "TXN-2026-0001",
  "subscriptionStartDate": "2026-05-01",
  "subscriptionEndDate": "2027-04-30"
}
```

**Response — 201**
```json
{
  "id": "5b2a9c3a-3c0f-4d6f-9c9e-2b1f4f0c1e7a",
  "name": "Sunrise Public School",
  "email": "principal@sunrise.edu",
  "phoneCode": "+91",
  "phoneNumber": "9876543210",
  "studentSeat": 500,
  "createdAt": "2026-05-04T10:23:11.412Z",
  "subscription": {
    "id": "9a47d6c0-b6f7-4f81-9d0d-d9b6cbb2b3a1",
    "amount": "49999.00",
    "currency": "USD",
    "transactionId": "TXN-2026-0001",
    "startDate": "2026-05-01",
    "endDate": "2027-04-30",
    "status": "ACTIVE"
  }
}
```

**Errors**
| Status | When |
|---|---|
| 400 | Validation failure / `endDate <= startDate` / unsupported currency |
| 401 | Missing or invalid JWT |
| 403 | Authenticated but role is not `ADMIN` |
| 409 | Email already exists *or* `transactionId` already exists |

### `POST /v1/admin/schools/:id/resend-credentials`
Generates a fresh secure password, hashes & stores it, emails the school. Returns `{ "success": true }`.

## Behavior Notes
- **Transactional create**: school + subscription saved atomically; rolled back on any DB failure.
- **Email outside transaction**: send failures don't roll back create; failures are logged and retried (3 attempts, exponential backoff). For production, swap `MailService.sendWithRetry` for a queue (BullMQ/SQS).
- **Password generation**: `crypto.randomInt`, length 14 by default, guaranteed mix of upper/lower/digit/symbol; only the bcrypt hash is persisted.
- **PII safety**: emails are masked in logs (`pr***@sunrise.edu`); plaintext passwords are never logged.
- **Audit**: every `SCHOOL_CREATED`, `CREDENTIALS_RESENT`, and `SUBSCRIPTION_EXPIRED` event written to `admin_audit_logs`.
- **Expiry cron**: runs hourly (`@Cron(CronExpression.EVERY_HOUR)`); flips `ACTIVE → EXPIRED` for subscriptions whose `endDate < today`.

## Schema (TypeORM auto-sync in dev)

Auth subsystem adds `admin_users`, `refresh_tokens`, and `password_reset_tokens`
(see [ADR 0001](docs/adr/0001-token-strategy.md)). Core tables below.

`schools`
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| name | varchar(200) | |
| email | varchar(255) | unique |
| phone_code | varchar(8) | |
| phone_number | varchar(20) | |
| password | varchar(255) | bcrypt hash; `select: false` |
| student_seat | int | |
| created_at / updated_at | timestamptz | |

`subscriptions`
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| school_id | uuid FK schools(id) ON DELETE CASCADE | indexed |
| amount | numeric(12,2) | |
| currency | enum(`KWD`,`USD`) | required |
| transaction_id | varchar(100) | unique |
| start_date / end_date | date | end_date indexed |
| status | enum(`ACTIVE`,`EXPIRED`) | indexed |

`admin_audit_logs`
| col | type | notes |
|---|---|---|
| id | uuid PK | |
| actor_id | uuid null | indexed |
| action | varchar(64) | indexed |
| target_id | uuid null | |
| metadata | jsonb null | |

## Tests
```bash
npm test          # unit suite (40 tests, no DB needed) — with coverage gates
npm run test:e2e  # e2e suite (14 tests) — needs Postgres + a backend_agent_test DB
```
- **Unit** (`test/*.spec.ts`): `auth.service`, `me.service`, `admin-seeder`,
  `audit.service`, `schools` password util + DTO validation. Coverage gates on
  `auth.service` and `me.service`.
- **E2e** (`test/app.e2e-spec.ts`): boots the real app against a test DB with
  `MailService` stubbed; covers the full auth-invariant matrix (no token /
  wrong role / right role) across auth, `/admin/schools`, `/me`, and audit logs.

Create the e2e DB once: `createdb backend_agent_test` (env in `test/e2e-env.ts`).

## Production Hardening Checklist
Done: roles-only RBAC; refresh-token rotation + revocation; rate limiting
(`@nestjs/throttler`); CORS allowlist; boot-time secret guard (`main.ts` refuses
default `JWT_SECRET`/`ROOT_ADMIN_PASSWORD` in production).

Outstanding (see [`REVIEW.md`](REVIEW.md) for IDs):
- Replace TypeORM `synchronize` with explicit migrations; drop the legacy
  `admin_users.permissions` column in migration #1 (F7).
- Add Helmet security headers (`npm i helmet`) (F5).
- Audit auth events (login/logout/password-reset) (F6).
- Per-account login lockout in addition to IP throttling (F4).
- Schedule `pruneExpiredRefreshTokens` via `@Cron` (F8).
- Move email send to a durable queue (BullMQ on Redis) for retries + DLQ.

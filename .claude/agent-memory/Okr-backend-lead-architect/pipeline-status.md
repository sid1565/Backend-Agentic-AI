---
name: pipeline-status
description: School SaaS backend — 9-stage pipeline status and stage 7–9 artifacts
type: project
---
School SaaS backend (NestJS 10 / TypeORM / Postgres). As of 2026-05-27 all 9
canonical stages are complete.

- **Stages 1–6**: spec/scaffold/schema/auth/API/services done in prior sessions.
- **Stage 7 (tests)**: 40 unit (`test/*.spec.ts`: auth.service, me.service,
  admin-seeder, audit.service, schools util/dto) + 14 e2e (`test/app.e2e-spec.ts`).
  E2e config `test/jest-e2e.json` (rootDir `..`), env in `test/e2e-env.ts`,
  runs against DB `backend_agent_test` with MailService overridden. Coverage
  gates on auth.service (65/80) and me.service (80/85) in jest.config.js.
- **Stage 8 (review)**: `REVIEW.md` — GO verdict. Fixed inline: F1 throttler
  wired (global 100/min + login 10/min; had to `npm i @nestjs/throttler` — was
  declared but not installed), F2 prod secret fail-fast in main.ts, F3 CORS.
  Deferred P2/P3: F4 account lockout, F5 helmet (not installed), F6 auth-event
  auditing, F7 migrations (+drop legacy admin_users.permissions), F8 schedule
  pruneExpiredRefreshTokens, F9 forgot-password timing.
- **Stage 9 (docs)**: `docs/openapi.yaml` (3.1, x-required-role), `docs/adr/0001–0005`,
  `docs/runbook.md`, refreshed `README.md`.

Dev DB is `backend_agent` (Postgres 18, postgres/12345 @ localhost:5432).

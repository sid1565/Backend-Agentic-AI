# Runbook — School SaaS Backend

## Deploy
1. Provision PostgreSQL; create the app database.
2. Set env (see `.env.example`). **Production requires** a strong `JWT_SECRET`
   and a non-default `ROOT_ADMIN_PASSWORD` — the app refuses to boot otherwise
   (`assertProductionSecrets` in `main.ts`).
3. `npm ci && npm run build`.
4. Run DB migrations (once they exist — see REVIEW.md F7). Until then dev relies
   on TypeORM `synchronize`; **do not** rely on `synchronize` in production.
5. `npm run start:prod`. On first boot the root admin is seeded from
   `ROOT_ADMIN_EMAIL` / `ROOT_ADMIN_PASSWORD` (idempotent).
6. Set `CORS_ORIGINS` (comma-separated) to your front-end origins.

## Health & key behaviours
- Access tokens last `JWT_EXPIRES_IN` (default 15m); clients refresh via
  `/v1/auth/refresh` (rotating). Logout revokes all of a subject's refresh tokens.
- Subscription expiry cron runs hourly (`@nestjs/schedule`), flipping
  `ACTIVE → EXPIRED` when `end_date < today`.
- Welcome/credential emails retry 3× with backoff; failures are logged, not fatal.

## Symptom → Check → Fix
| Symptom | Check | Fix |
|---|---|---|
| App won't start in prod with "Insecure production config" | `JWT_SECRET` / `ROOT_ADMIN_PASSWORD` env | Set strong, non-default values and redeploy. |
| All logins return 401 | DB reachable? `admin_users` seeded? `JWT_SECRET` stable across instances? | Fix DB creds; confirm seeder ran; ensure all instances share one `JWT_SECRET`. |
| Clients get 429 on login | Throttle (10/min/IP on login, 100/min global) | Expected under abuse; for shared-NAT clients raise limits or front with per-account lockout (F4). |
| `/v1/refresh` always 401 | Token expired/rotated/revoked? | Client must use the newest refresh token (rotation) and re-login if expired. |
| Schools not receiving emails | SMTP env (`MAIL_*`); app logs for retry failures | Fix SMTP creds; resend via `POST /v1/admin/schools/{id}/resend-credentials`. |
| Refresh/reset tables growing | `pruneExpiredRefreshTokens` not scheduled (F8) | Add a `@Cron` to call it, or prune manually: `DELETE FROM refresh_tokens WHERE expires_at < now()`. |

## Tests
- Unit: `npm test` (no DB needed).
- E2e: needs Postgres + a `backend_agent_test` DB. `npm run test:e2e`.

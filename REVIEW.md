# Code Review — School SaaS Backend (Stage 8)

**Date:** 2026-05-27
**Scope:** Full system, with emphasis on the auth subsystem added in the recent sessions (login/refresh/logout/password-reset, roles-only RBAC, admin seeding).
**Verdict:** ✅ **GO** — no open P0/P1. P1 findings were fixed inline; remaining items are P2/P3 deferrals with tickets.

## Domains walked

| Domain | Result |
|---|---|
| Spec / requirements | OK — README + entity model coherent; roles-only RBAC consistent. |
| Scaffold / wiring | OK — global ValidationPipe, exception filter, ConfigModule, versioning all present. |
| Schema | OK — PKs, FK `ON DELETE CASCADE`, unique constraints, indexes justified. New auth tables (admin_users, refresh_tokens, password_reset_tokens) follow conventions. |
| Auth foundation | OK after fixes — JWT verified, bcrypt cost 12, opaque hashed refresh tokens with rotation + revocation, single-use hashed reset tokens, enumeration-safe forgot-password. |
| API contracts | OK — DTOs validated, consistent error envelope via GlobalHttpExceptionFilter, status codes correct. |
| Service layer | OK — no DB access in controllers; transactional create; `/me` ownership keyed on `user.id`; NestJS exceptions throughout; no `console.log`. |
| Tests | OK — 40 unit + 14 e2e; full auth-invariant matrix (no-token/wrong-role/right-role); coverage gates configured. |
| Cross-layer | OK — no orphaned scopes/roles; naming consistent; files within module layout. |

## Findings

### Fixed inline during review
| ID | Sev | Finding | Fix |
|---|---|---|---|
| F1 | P1 | `@nestjs/throttler` was a declared dependency but **never wired** — auth endpoints had zero brute-force protection (OWASP API2/API4). | Installed the package; added global `ThrottlerModule` (100 req/min) via `APP_GUARD`, plus a stricter `@Throttle(10/min)` on both login endpoints. |
| F2 | P1 | Insecure defaults (`JWT_SECRET='change-me'`, `ROOT_ADMIN_PASSWORD='ChangeMe!2026'`) could ship to production, yielding a known admin password and forgeable tokens. | `assertProductionSecrets()` in `main.ts` refuses to boot in `NODE_ENV=production` when either is unset/default. |
| F3 | P2 | No CORS policy configured. | `app.enableCors()` driven by `CORS_ORIGINS` env (defaults closed). |

### Deferred (tracked)
| ID | Sev | Finding | Recommendation |
|---|---|---|---|
| F4 | P2 | Login throttle is IP-based only — no per-account lockout after N failures. | Add account-level lockout/backoff; consider stricter login limits per environment. |
| F5 | P2 | No Helmet (security headers). `helmet` is not installed. | `npm i helmet` and `app.use(helmet())` in `main.ts`. |
| F6 | P2 | Auth events (login success/failure, logout, password reset) are **not** audited — only school CRUD is. Security-observability gap. | Extend `AdminAuditAction` with LOGIN/LOGOUT/PASSWORD_RESET and record them in `AuthService`. |
| F7 | P2 | No DB migrations; `synchronize` is on outside production but there is no migration path **into** production. | Generate TypeORM migrations; disable `synchronize` everywhere; add the `admin_users.permissions` column drop as the first migration. |
| F8 | P3 | `AuthService.pruneExpiredRefreshTokens()` exists but is never scheduled — token tables grow unbounded. | Wire a `@Cron` job (the app already uses `@nestjs/schedule`). |
| F9 | P3 | `forgot-password` has a timing side-channel (known vs unknown email do different work). | Normalize response time / always perform a dummy hash. |

## Notes
- Logout revokes **all** of the subject's active refresh tokens (logout-everywhere), not per-session. Intentional and acceptable for this product; documented.
- Refresh token is returned in the response body (not an httpOnly cookie). Acceptable for a token-based API; clients must store it securely.

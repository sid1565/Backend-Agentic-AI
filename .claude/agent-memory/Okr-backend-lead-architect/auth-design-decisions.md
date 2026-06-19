---
name: auth-design-decisions
description: School SaaS backend auth model decisions (May 2026 refactor)
type: project
---
School SaaS backend (NestJS 10 + TypeORM + Postgres, RBAC roles ADMIN/SCHOOL).

Auth foundation decisions locked in on 2026-05-27 (user: brijalk@solguruz.com):

- **ADMIN accounts**: `admin_users` table + env-seeded root admin (`AdminSeeder` OnModuleInit, reads `ROOT_ADMIN_EMAIL`/`ROOT_ADMIN_PASSWORD`). SCHOOL accounts auth against existing `schools` table (password `select:false`).
- **Refresh tokens**: opaque random tokens, SHA-256 hashed in `refresh_tokens` table, rotated on `/auth/refresh`, revoked on logout & password reset. NOT signed JWTs — so no refresh signing secret exists, only a TTL (`JWT_REFRESH_EXPIRES_IN`).
- **Password reset**: single-use hashed tokens in `password_reset_tokens`; `/auth/reset-password` is `@Public()` (token-authenticated, not bearer). Forgot-password returns 202 always (no account enumeration).
- **Authorization is roles-only RBAC** (as of 2026-05-27, later in the same day the user REVERSED the earlier token/DB-driven scopes decision). The entire scopes layer was deleted: `scopes.decorator.ts`, `scopes.guard.ts`, `auth.constants.ts` (ROLE_DEFAULT_SCOPES), `admin_users.permissions` column, and `scopes` from the JWT payload/AuthenticatedUser. Authorize purely via `@Roles('ADMIN'|'SCHOOL')` + `RolesGuard`. Guard chain per controller: `@UseGuards(JwtAuthGuard, RolesGuard)`.
- **No `@Public()` decorator**: removed (it was a no-op — there is no global JwtAuthGuard; guards are applied per-controller). `JwtAuthGuard` is now a plain `AuthGuard('jwt')`. Auth routes (login/refresh/forgot/reset) are simply not decorated with the guard.
- **me/ module kept**: it's the only SCHOOL-facing surface; removing it would orphan the SCHOOL login. auth/ kept (load-bearing JwtStrategy). `@Ownership` decorator was deleted; /me ownership is enforced in MeService by keying every read on `user.id`.

**Why:** user asked to remove auth/me "if not required" and fix the `@Scopes('schools.create')` pattern; deep-dive showed auth/ is the security foundation and the real smell was scopes being hardcoded in the guard rather than token-sourced.

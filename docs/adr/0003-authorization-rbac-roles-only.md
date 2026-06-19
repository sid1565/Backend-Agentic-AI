# ADR 0003 — Authorization: roles-only RBAC

**Status:** Accepted (2026-05-27, supersedes an earlier token/DB scopes design)

## Context
An earlier iteration carried a fine-grained scope layer (`@Scopes(...)`, an
`AppScope` taxonomy signed into the JWT, and `admin_users.permissions`). In
practice every scope was 1:1 with a role, so the scope layer added bookkeeping
without adding capability.

## Decision
Authorize purely on **roles** (`ADMIN`, `SCHOOL`). Each protected controller
runs `@UseGuards(JwtAuthGuard, RolesGuard)` with `@Roles(...)`. The scope
decorator, scope guard, scope taxonomy, and `admin_users.permissions` column
were removed. Resource-level ownership (e.g. `/me`) is enforced inside the
service by keying queries on `user.id`.

## Consequences
- Simpler, less duplicated authorization surface.
- Coarser granularity: any `ADMIN` may call any admin endpoint. If finer-grained
  permissions are needed later, reintroduce a permissions model deliberately
  (DB-backed role→permission mapping), not ad-hoc per-endpoint scopes.

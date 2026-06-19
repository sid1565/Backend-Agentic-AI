# Announcements Module

School-wide announcements: **admins** create / update / soft-delete them;
**any authenticated user** lists and reads them. Built end-to-end via the
Okr backend agentic pipeline (eval scenario **S-01**).

## Specification (stage 1)

| ID | Use case |
|----|----------|
| UC-1 | Admin creates an announcement (title + body). |
| UC-2 | Admin updates an announcement's title and/or body. |
| UC-3 | Admin soft-deletes an announcement. |
| UC-4 | Authenticated user lists announcements (paginated, newest first, excludes deleted). |
| UC-5 | Authenticated user reads a single announcement. |

Acceptance criteria are encoded as tagged tests — see **Testing** below.

## Data model (stage 3)

Table `announcements`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | generated |
| `title` | varchar(200) | required |
| `body` | text | required |
| `created_by` | uuid, nullable | admin subject id (attribution only; no FK, mirrors `admin_audit_logs.actor_id`) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `deleted_at` | timestamptz, nullable | **soft delete** (`@DeleteDateColumn`) |

**Index:** `idx_announcements_created_at` on `(created_at)` — backs the list
endpoint's `ORDER BY created_at DESC` hot read path.

**Soft delete:** `deleted_at` is a TypeORM `@DeleteDateColumn`, so `softDelete`
stamps it and every default `find`/`findOne` automatically excludes deleted
rows. List and read endpoints never return a deleted announcement.

## Authorization (stage 4)

- **Roles** are unchanged (`ADMIN`, `SCHOOL`) — no new roles invented.
- **New section** `EAdminModule.ANNOUNCEMENT_MANAGEMENT`, granted to `ADMIN`
  only in `ROLE_SECTIONS`. All write routes require it via `@Section(...)`.
- **Reads** carry no `@Section`, so `SectionGuard` allows any principal that
  passed `UserAuthGuard` — i.e. any authenticated user (ADMIN or SCHOOL).

## API contract (stage 5)

All routes are versioned under `/v1`. All require a Bearer token.

| Method | Path | Role / Section | Success |
|--------|------|----------------|---------|
| POST | `/v1/admin/announcements` | ADMIN · `ANNOUNCEMENT_MANAGEMENT` | 201 |
| PATCH | `/v1/admin/announcements/:id` | ADMIN · `ANNOUNCEMENT_MANAGEMENT` | 200 |
| DELETE | `/v1/admin/announcements/:id` | ADMIN · `ANNOUNCEMENT_MANAGEMENT` | 200 (soft delete) |
| GET | `/v1/announcements` | any authenticated user | 200 (paginated) |
| GET | `/v1/announcements/:id` | any authenticated user | 200 |

Responses use the standard envelope `{ status, message, data }`; the list
endpoint spreads pagination meta (`limit`, `offset`, `total`) at the top level
alongside `data`. Auth failures: `401` (no/invalid token), `403` (SCHOOL on a
write), `404` (missing or soft-deleted id), `400` (validation).

## Testing (stage 7)

- **Unit** — `test/announcements.service.spec.ts` (9 tests): AC-ANN-1, 3, 4, 5,
  6, 7, 7b, 8, 8b. Service coverage ≈ 98% lines / 69% branches (gated in
  `jest.config.js`).
- **E2E** — `test/app.e2e-spec.ts` → "Announcements module (S-01)": the
  auth-invariant matrix AC-ANN-9 (401), AC-ANN-10 (SCHOOL write → 403),
  AC-ANN-2 (validation → 400), and AC-ANN-11+12 (admin CRUD + authenticated
  read lifecycle, including soft-delete exclusion).

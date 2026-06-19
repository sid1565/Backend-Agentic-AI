# Getting Started — Run the Project & Seed the Admin

End-to-end steps to bring the School SaaS backend up locally and verify that
the root admin has been seeded.

## Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ reachable on `localhost:5432`
- `psql` CLI (for the verification step)

---

## 1. Install dependencies
```bash
cd "/home/sg/Siddharth Project/AI Agent"
npm install
```

## 2. Ensure the database exists
Your `.env` points at DB `backend_agent` on `localhost:5432` (user `postgres`,
password `12345`). Create the DB if it doesn't exist yet:
```bash
PGPASSWORD=12345 psql -h localhost -U postgres -d postgres \
  -c "CREATE DATABASE backend_agent;"
```
Skip this if `psql -l` already lists it.

## 3. Configure environment
Open `.env` and confirm/set the keys below. The two `ROOT_ADMIN_*` values are
what the `AdminSeeder` reads on boot:
```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=12345
DB_NAME=backend_agent

JWT_SECRET=replace-with-strong-random-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_SALT_ROUNDS=12
RESET_TOKEN_TTL_MINUTES=30

# Drives the admin seeder
ROOT_ADMIN_EMAIL=admin@school-saas.local
ROOT_ADMIN_PASSWORD=ChangeMe!2026
```
Omitting `ROOT_ADMIN_*` falls back to the same defaults in **dev only**. In
production, `assertProductionSecrets` in `main.ts` refuses to boot if either
`JWT_SECRET` or `ROOT_ADMIN_PASSWORD` is still on its shipped default.

## 4. Start the app (the seeder runs here)
```bash
npm run start:dev
```
On first boot you should see in the log:
```
[AdminSeeder] Seeded root admin email=admin@school-saas.local
```
The seeder is **idempotent** — on subsequent boots, if the admin row already
exists, it logs nothing and skips the insert. Schema is auto-created in dev
via TypeORM `synchronize`; the new tables include `admin_users`,
`refresh_tokens`, and `password_reset_tokens`.

## 5. Verify the admin row
```bash
PGPASSWORD=12345 psql -h localhost -U postgres -d backend_agent \
  -c "SELECT id, email, status FROM admin_users;"
```
You should see one row with `status=ACTIVE`.

## 6. Log in as the seeded admin
```bash
curl -X POST http://localhost:3000/v1/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@school-saas.local","password":"ChangeMe!2026"}'
```
Response shape — every endpoint returns the standard envelope
`{ status, message, data }`:
```json
{
  "status": true,
  "message": "Login successful",
  "data": {
    "accessToken": "<jwt>",
    "accessTokenExpiresIn": 900,
    "refreshToken": "<opaque>",
    "tokenType": "Bearer",
    "user": { "id": "<uuid>", "role": "admin" }
  }
}
```
Use the access token (`data.accessToken`) as `Authorization: Bearer <jwt>` to
call any `/v1/admin/*` endpoint. List endpoints add pagination meta
(`limit`, `offset`, `total`) at the top level alongside `data`.

---

## Re-seeding the admin
The seeder is skip-if-exists. To force a fresh seed, either:
- delete the row and restart:
  ```bash
  PGPASSWORD=12345 psql -h localhost -U postgres -d backend_agent \
    -c "DELETE FROM admin_users WHERE email='admin@school-saas.local';"
  ```
- or change `ROOT_ADMIN_EMAIL` to a new value and restart — a new admin is
  created with the new email.

## API documentation
- **Swagger UI** (dev only): with the app running, browse
  `http://localhost:3000/docs` for interactive API docs.
- **OpenAPI spec**: `docs/openapi.yaml` is **generated from the live routes** —
  regenerate it after changing any controller or DTO:
  ```bash
  npm run openapi:gen   # boots the app in preview mode (no DB) and rewrites docs/openapi.yaml
  ```
  CI fails if the committed spec is out of date, so endpoint docs never drift.

## Database migrations
Dev and test auto-create the schema via TypeORM `synchronize`. **Production does
NOT sync** — it applies versioned migrations on boot (`migrationsRun`). The CLI
data source lives at `src/database/data-source.ts`; migrations live under
`src/database/migrations/`.
```bash
npm run migration:run        # apply pending migrations (uses DB_* env vars)
npm run migration:revert     # roll back the most recent migration
npm run migration:show       # list applied vs pending
# After changing any entity, generate a migration (diffs entities → DB):
npm run migration:generate -- src/database/migrations/<DescriptiveName>
```
After generating, verify the round-trip (`run` → `revert` → `run`) and re-run
`migration:generate` — it must report "No changes" (entities and migration agree).
Commit the migration file with the entity change.

## Other useful commands
```bash
npm run build         # production compile
npm run start:prod    # run dist/ (requires non-default JWT_SECRET & ROOT_ADMIN_PASSWORD)
npm test              # 57 unit tests (no DB needed)
npm run test:e2e      # 18 e2e tests (needs a backend_agent_test DB)
npm run openapi:gen   # regenerate docs/openapi.yaml from the live routes
npm run migration:run # apply DB migrations (production schema management)
```

## Troubleshooting
| Symptom | Likely cause | Fix |
|---|---|---|
| App exits with `Insecure production config` | `NODE_ENV=production` with default `JWT_SECRET` or `ROOT_ADMIN_PASSWORD` | Set strong, non-default values, then restart. |
| Login returns 401 right after seeding | Wrong password, or admin row not seeded | Re-check `.env` `ROOT_ADMIN_PASSWORD`; verify with step 5. |
| Login returns 429 | Throttle limit hit (10/min/IP on login) | Wait a minute, or relax the limit in dev. |
| App can't reach the DB | DB not running / wrong creds in `.env` | `pg_isready -h localhost -p 5432` and fix creds. |

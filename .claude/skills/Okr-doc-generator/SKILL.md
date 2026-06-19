# Doc Generator Skills

Focused techniques the **Okr-doc-generator** applies at stage 8 of the canonical 8-stage flow. Cross-cutting `documentation` skill in `Skills.md` covers source-traceability and audience separation; this file holds the per-deliverable techniques.

---

## 1. readme-authoring

**Purpose.** Produce a README that gets a new engineer running locally in under ten minutes and points them at deeper docs for everything else.

**When applied.** First doc generated, because every other doc cross-links back to it.

**Inputs.**
- Spec summary.
- Schema (for migration command).
- Service code (for required env vars).
- Test config (for test commands).

**Process.**
1. **Lead with one sentence: what this is.** Pulled directly from the spec summary's first line.
2. **List the use cases as bullets, not prose.** Three to five bullets covering the main flows. The reader should know in 30 seconds whether they're in the right repo.
3. **Quickstart in numbered steps.** Prerequisites → install → env → migrate → run → test. Each step is one command. If a step needs explanation, the explanation is a footnote, not inline prose.
4. **Required env vars table.** Pulled from the service code's `process.env` references and the auth-security doc's secrets list. Columns: `Var | Required | Purpose | Default`. Mark sensitive vars with a 🔒.
5. **API surface section** — short. Base URL, auth scheme reference, and a pointer to `docs/openapi.yaml`. Do not duplicate endpoint details.
6. **Architecture at a glance** — one paragraph plus an ASCII or mermaid diagram showing the controller → guard → service → repo → DB chain. Keep it under 15 lines of diagram.
7. **Testing section** — three commands (unit, integration, e2e) and the current coverage numbers if available.
8. **Code quality section** — document the lint/format commands (`npm run lint:check`, `npm run format`) and note the project uses ESLint with `eslint-plugin-security` + Prettier, enforced as a CI gate. Pulled from `package.json` scripts and `.eslintrc.js`.
9. **Documentation index** at the bottom linking to spec, ADRs, and runbook.

**Outputs.**
- `README.md` at the module root.

**Anti-patterns.**
- Marketing language ("robust", "scalable", "blazingly fast"). Strip on sight.
- Quickstart that assumes ambient knowledge ("just run the usual setup"). Spell it out.
- Embedding endpoint details that duplicate OpenAPI. They will diverge; OpenAPI is the source of truth.
- README longer than 200 lines. If it's longer, content belongs elsewhere.

**Skeleton.**
```markdown
# Notifications Module

> Lets users receive, read, and mark-as-read notifications scoped to their account.

## What It Does
- Recipients can read their own notifications
- Recipients can mark a notification as read
- Admins can read any notification
- The system can emit notifications on behalf of any feature

## Quickstart
1. Prerequisites: Node 20+, Postgres 15+
2. `npm install`
3. `cp .env.example .env` and fill required vars (see below)
4. `npm run migrate`
5. `npm run start:dev`
6. `npm test`

## Required Environment Variables
| Var | Required | Purpose | Default |
|---|---|---|---|
| DATABASE_URL | yes | Postgres connection string | — |
| JWT_PUBLIC_KEY | yes 🔒 | RS256 public key for token verification | — |
| LOG_LEVEL | no | Logger verbosity | info |

## API Surface
- Base URL: `https://api.example.com/v1`
- Auth: Bearer JWT (RS256). See `docs/auth.md`.
- Full contract: `docs/openapi.yaml`

## Architecture at a Glance
HTTP → AuthGuard → RoleGuard → NotificationsController → NotificationsService → NotificationsRepository → Postgres

## Testing
- `npm test` — unit
- `npm run test:integration` — integration
- `npm run test:e2e` — end-to-end

## Code Quality
- `npm run lint:check` — ESLint (with `eslint-plugin-security`) + Prettier; CI-gated
- `npm run lint` — auto-fix lint issues
- `npm run format` — Prettier write

## Documentation
- Spec: `docs/spec.md`
- ADRs: `docs/adrs/`
- Runbook: `docs/runbook.md`
```

---

## 2. openapi-generation

**Purpose.** Produce an OpenAPI 3.1 spec that is the canonical machine-readable contract — every endpoint, every DTO, every auth requirement, every error response.

**When applied.** Second doc, after README.

**Inputs.**
- API contract from stage 4 (endpoints, DTOs, role assignments).
- Auth taxonomy from stage 3 (for `x-required-role` values and security schemes).
- Error envelope from stage 4.

**Process.**
1. **Set up `info` and `servers`.** Title from the spec. Version from the project's versioning strategy. `servers` includes the `{baseUrl}/v1` pattern.
2. **Define `components.securitySchemes`.** One entry per auth method in the taxonomy — typically `bearerAuth` (HTTP, scheme: bearer, bearerFormat: JWT) and possibly `cookieAuth` for web sessions.
3. **Define every DTO under `components.schemas`.** Convert `class-validator` decorators to OpenAPI keywords: `@IsEmail()` → `format: email`; `@MinLength(8)` → `minLength: 8`; `@IsOptional()` → field absent from `required`. Include the standard error envelope as a schema.
4. **Walk every endpoint and emit a `paths` entry.** Required fields per operation: `summary`, `parameters`, `requestBody` (if applicable), `responses` (success + at least one 4xx and `default` for 5xx), `security`, and the **`x-required-role`** extension carrying the auth-taxonomy assignment verbatim.
5. **Examples on every operation.** At minimum: one request example and one success-response example. Examples must be valid JSON that conforms to the referenced schema.
6. **Validate the YAML.** Run an OpenAPI 3.1 validator before delivery. A spec that doesn't validate is worse than no spec.

**Outputs.**
- `docs/openapi.yaml`, valid OpenAPI 3.1.

**Anti-patterns.**
- Operations without a `security` block when the endpoint requires auth. The contract lies.
- Inline schemas instead of `$ref`. The same DTO appears in five places and drifts.
- Missing `x-required-role`. Auth is invisible to API consumers.
- Examples that don't conform to the schema. Caught instantly by tooling, embarrassing in review.

**Operation skeleton.**
```yaml
paths:
  /notifications/{id}:
    get:
      summary: Read a notification by ID
      operationId: getNotification
      tags: [notifications]
      x-required-role: "owner-only"
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: Notification found and returned
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Notification' }
              examples:
                default:
                  value:
                    id: "n_01HXYZ..."
                    userId: "u_01HABC..."
                    body: "Welcome!"
                    readAt: null
        '401': { $ref: '#/components/responses/Unauthenticated' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '404': { $ref: '#/components/responses/NotFound' }
        default: { $ref: '#/components/responses/ServerError' }
```

---

## 3. adr-writing

**Purpose.** Capture each non-obvious architectural decision in a short, durable record — what was decided, why, and what was rejected.

**When applied.** Third doc set. One ADR per decision; collect under `docs/adrs/`.

**Inputs.**
- Spec NFRs (drive many of the decisions).
- Auth foundation (token strategy ADR).
- Schema (ORM and multi-tenancy ADRs).
- API contract (versioning ADR).

**Process.**
1. **Decide whether an ADR is warranted.** If a reasonable engineer could have made a different defensible choice, it warrants an ADR. If it's the obvious default for the framework, it does not. "We use NestJS Logger" is not an ADR. "We use RS256 with key rotation every 90 days because we have multiple verifying services" is.
2. **Number sequentially.** `ADR-001`, `ADR-002`, etc. Numbers retire with the ADR — never reused.
3. **Status field.** `Proposed` → `Accepted` → `Superseded` (link to the superseder) or `Deprecated`. New ADRs are emitted as `Accepted` because the decision was already made upstream.
4. **Date the decision.** Use the upstream artifact's date, not today's date — the ADR documents the past.
5. **Required sections:** Context (the problem and constraints), Decision (one paragraph, what was chosen), Consequences (positive, negative, mitigations), Alternatives Considered (each + why rejected), Sources (which upstream artifact contains the original reasoning).
6. **Keep each ADR short.** A reader should finish one in three minutes. If you need more space, link out.

**Outputs.**
- `docs/adrs/ADR-NNN-<slug>.md` per decision.

**ADRs you should always emit when relevant.**
- ADR-001: Database engine choice (Postgres vs MySQL vs Mongo).
- ADR-002: ORM choice (TypeORM vs Prisma vs Mongoose).
- ADR-003: Multi-tenancy approach (shared schema with tenant_id vs schema-per-tenant).
- ADR-004: Token strategy (alg, lifetimes, refresh, storage per platform).
- ADR-005: Versioning strategy (URI prefix vs header).
- ADR-006: Error envelope shape.
- ADR-007: Test pyramid coverage targets.

**Anti-patterns.**
- ADRs for non-decisions. "We use TypeScript" is not an ADR; it's a project standard.
- ADRs that describe rather than decide. "How auth works" is documentation; "why we chose RS256 over HS256" is an ADR.
- Editing past ADRs to "fix" them. Past ADRs are immutable. New decisions get a new ADR with a `Supersedes ADR-NNN` link.

**Skeleton.**
```markdown
# ADR-004: Token Strategy

- Status: Accepted
- Date: 2026-04-15
- Decided by: Okr-backend-auth-security (stage 3)

## Context
- The system serves both web and iOS clients with different storage capabilities.
- Token revocation is required for compliance (SOC2 control AC-2).
- Multiple downstream services will verify tokens, so a shared symmetric secret is operationally fragile.

## Decision
We use RS256-signed JWTs. Access tokens live 15 minutes; refresh tokens live 30 days with rotation on every use. Web clients store tokens in httpOnly + Secure + SameSite=Lax cookies. Mobile clients store tokens in Keychain (iOS) and Keystore (Android). Revocation uses a server-side blocklist keyed by `jti`.

## Consequences
- Positive: verifying services need only the public key; private key stays in the auth service. Compromise of a verifier doesn't compromise issuance.
- Negative: signature verification is more expensive than HS256 (~5× CPU). Mitigation: cache the public key in process; benchmark shows <1ms per request at p99.
- Negative: revocation requires a fast cache lookup on every request. Mitigation: Redis with sub-millisecond p99.

## Alternatives Considered
- HS256 with rotated secret: rejected because secret distribution to verifiers is operationally fragile.
- Opaque tokens with introspection: rejected because the introspection round-trip violates the p95 latency NFR.
- No revocation, short-lived only: rejected because compliance requires explicit revocation on logout.

## Sources
- Auth foundation document, Token Strategy section (`output/notifications-auth.md`).
- Spec NFR-2 (compliance: SOC2 AC-2), NFR-3 (p95 latency budget).
```

---

## 4. runbook-authoring

**Purpose.** Give an on-call responder a fast path from "alert fired" to "fix applied" without reading the codebase.

**When applied.** Last doc generated, because it cross-links to all the others.

**Inputs.**
- Auth foundation (secrets list).
- Service code (required env vars, observability hooks).
- Code review report (deferred P2/P3 findings → known risks).
- The team's existing runbook conventions from memory.

**Process.**
1. **Deploy section first.** Numbered steps for a normal deploy, including migration order (expand-contract pattern when applicable) and rollback steps. Rollback must take less than the time to write a tweet — keep it concrete.
2. **Configuration section.** Pointer back to the README env-var table for the source of truth. Add a "Secrets and Owners" subsection naming the secret manager path and which team owns rotation.
3. **Health checks.** Liveness path, readiness path, dependencies that must be reachable for readiness to pass. Include the expected response shape.
4. **Observability.** Metrics emitted (names + meaning), log fields (correlation ID, request ID, user ID — explicitly not tokens or PII), trace span boundaries worth knowing about.
5. **Symptom → Check → Fix table.** This is the heart of the runbook. Each row is a real or anticipated production symptom, the first thing to check, the likely cause, and the fix. At least three rows. Pull from review findings (deferred P2s) and from spec NFRs (latency-budget breaches, etc.).
6. **Known risks section.** Open P2/P3 findings deferred at ship, with ticket IDs. The on-call needs to know what's already known.
7. **Sources footer.** Cite review report and Okr-service-layer code as the origin of every claim.

**Outputs.**
- `docs/runbook.md`.

**Anti-patterns.**
- Runbooks that describe the system instead of how to fix it. The runbook is for the moment something breaks, not for onboarding.
- Symptom → check → fix entries that say "investigate" as the fix. That's not a fix; that's restating the problem.
- Logging fields that include tokens or PII. The runbook documents what's logged; if the documented fields are unsafe, the implementation is unsafe.
- Runbooks longer than 300 lines. On-call doesn't have time. Split into multiple runbooks if needed.

**Skeleton.**
```markdown
# Notifications Module — Runbook

## Deploy
1. Run migrations: `npm run migrate:prod`
2. Deploy new version: `kubectl rollout restart deployment/notifications`
3. Verify readiness: `curl https://api.example.com/health/ready` → `{"status":"ok"}`
4. Watch error rate for 5 minutes: dashboard `notifications-prod`.

### Rollback
1. `kubectl rollout undo deployment/notifications`
2. If migration was destructive: `npm run migrate:down`

## Configuration
- See README for required env vars.
- Secrets stored in AWS Secrets Manager under `prod/notifications/*`. Rotation owned by the platform team.

## Health Checks
- Liveness: `GET /health/live` → `200 {"status":"alive"}`
- Readiness: `GET /health/ready` → `200` only when DB and Redis are reachable.

## Observability
- Metrics: `notifications_requests_total`, `notifications_request_duration_seconds`, `notifications_errors_total`.
- Log fields: `correlationId`, `userId`, `route`, `latencyMs`, `level`, `message`. **Never** `token`, `password`, `body`.
- Traces: spans on `controller`, `service`, `repository`, `external.audit-log`.

## On-Call: Symptom → Check → Fix
| Symptom | First Check | Likely Cause | Fix |
|---|---|---|---|
| 5xx spike on `/v1/notifications` | recent deploys, then logs | Bad release | `kubectl rollout undo` |
| p95 latency > 500ms | DB connection pool metrics | Pool exhaustion | scale `DB_POOL_SIZE`; investigate slow queries |
| 401 spike with no auth-system change | clock drift on verifying service | NTP failure | restart `chronyd`, validate clocks |

## Known Risks
- P2 review finding #14: missing index on `notifications.created_at` — tracked as JIRA-1234, fix planned next sprint.

## Sources
- Generated from review report `output/notifications-review.md` v2026-04-30.
- Service code commit `a3f2c1d`.
```

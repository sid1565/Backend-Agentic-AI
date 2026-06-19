# Eval Results Log

Scoring rules: see [EVALS.md](EVALS.md). One row per scenario run. Newest first.

**Rolling success rate (last 10 runs): 6/6 = 100%. Target: ≥ 90%.** Every pipeline stage (1–9)
has ≥1 real run. 5 distinct scenarios exercised so far (S-01, S-03, S-06, S-08, S-09). Sample is
6/10 — remaining to fill the 10-run window: S-02, S-04, S-05, S-07, S-10 (each a full-feature
build). Success *rate* already clears the ≥90% bar; the open item is sample size.

## Run log

| # | Date | Scenario | Stages run | Loop-backs / retries | Stage failures | Verdict | Pass? | Notes |
|---|------|----------|-----------|----------------------|----------------|---------|-------|-------|
| 6 | 2026-06-19 | S-03 (spec-only partial pipeline — fee-payments) | 1, 3 | 0 | none | GO (partial) | ✅ | Stages 1–3 per scenario (scaffold a no-op — brownfield). **All 4 S-03 pass criteria met:** (1) ran only the in-scope stages and explicitly noted scaffold skipped; (2) spec carried in entity-level docs, zero framework names in the spec body; (3) schema justifies every index by query pattern and stores **money as integer minor units** (`amount_minor` `bigint`, not float) exactly as the scenario constrains; (4) **no code beyond entities + migration** — no service/controller generated. Built 3 entities (`invoices`, `payment_records`, `receipts`) with FK `ON DELETE CASCADE`, unique invoice/receipt numbers, and a one-receipt-per-payment constraint. Exercised the new migration workflow: generated an **incremental** migration (diffed against the InitialSchema baseline → emitted only the 3 new tables), verified round-trip (run→revert→run) on a scratch Postgres, and confirmed **zero drift** (re-generate reported "No changes"). Gates: **build ✓, lint 0 errors ✓** (no DB drift, migration matches entities). **Eval hygiene:** per EVALS.md the output was reverted after scoring (working tree clean); the measurement is what persists. |
| 5 | 2026-06-19 | S-09 (docs regeneration — subscriptions / doc-gate) | 8 (delta), 9 | 0 | none | GO | ✅ | Read-only run; no code modified. **All 3 S-09 pass criteria met:** (1) delta stage-8 gate first — confirmed the committed spec is in sync with the live routes (CI `docs-gate` parity), so docs generation was permitted (would have refused on a stale/NO-GO state); (2) `npm run openapi:gen` regenerated `docs/openapi.yaml` from the live NestJS routes (17 paths) and `@redocly/cli lint` **validated clean** (0 errors); subscription operations (`/v1/admin/schools/{id}/subscriptions`, `/v1/me/subscription`) carry `security: bearer` from the live `@ApiBearerAuth`; (3) README documents the subscription surface — every documented op is source-traceable to a controller route (anti-drift: the spec is generated, never hand-edited). Gates: **openapi in-sync ✓, redocly validate ✓, README present ✓.** |
| 4 | 2026-06-11 | S-01 (brownfield CRUD — announcements, full pipeline) | 1–9 | 0 | none | GO | ✅ | First full end-to-end run; built `src/modules/announcements/` (entity, DTOs, service, admin + reader controllers, module, README) on branch `eval/s-01-announcements`. **All 4 S-01 pass criteria met:** (1) module matches the `schools` folder layout; (2) writes restricted to existing **ADMIN** role via a new **section** `EAdminModule.ANNOUNCEMENT_MANAGEMENT` (no new *roles* — e2e AC-ANN-10 proves SCHOOL→403); (3) soft-delete `deleted_at` (@DeleteDateColumn) + reads auto-exclude (e2e proves delete→404 and absence from list); (4) every AC tagged, auth-invariant matrix (401/403/201/200) in e2e. Per-stage: spec (UCs+ACs in README/tests), scaffold (`nest build` ✓), schema (PK + justified `idx_announcements_created_at` + soft delete; repo uses TypeORM `synchronize`, no migration file by convention), auth (finite section added to taxonomy + `ROLE_SECTIONS[ADMIN]`), API (5 endpoints, sections only from taxonomy, DTO types match schema), service (NestJS exceptions, audit on writes, no `console.*`), tests (unit 9 AC-tagged + e2e matrix; coverage gated `announcements.service.ts` ≥90 lines/≥65 branches — actual 98/69). Gates: **build ✓, lint 0 errors ✓, unit 57/57 ✓ (was 48), e2e 18/18 ✓ (was 14), coverage thresholds ✓** (verified against a real Postgres 16 container). **Honest caveats:** (a) stage 9 produced a module README + Swagger decorators, NOT the full project ADR-set/`openapi.yaml`/runbook (project-level deliverable, out of scope for one brownfield module); (b) executed as an orchestrator *self-run* (stages run inline, not as separately-spawned sub-agent sessions), scored against the same EVALS.md metrics. |
| 3 | 2026-06-04 | S-08 re-review (after F1–F6 fixes) | 8 | 0 | none | GO | ✅ | Delta re-walk of all six findings from run #2 against current code. Each verified resolved with file-ref evidence (F1 `requireJwtSecret`; F2 reuse-detection + `revokeAllSessions`; F3 `@Throttle 5/60s`; F4 HS256 pinned sign+verify; F5 `Promise.all` constant-work lookup; F6 no `as unknown as Date` remain). No new findings. Gates: tsc ✓, lint 0 errors ✓, 48/48 tests ✓. Verdict flipped **NO-GO → GO**. One informational residual logged (forgotPassword send-path timing — outbox follow-up, not a finding). |
| 2 | 2026-06-04 | S-08 (security review of existing auth) | 8 | 0 | none | NO-GO (code) / review PASS | ✅ | Read-only review of `src/modules/auth/**` + `src/common/guards/**` vs OWASP API Top 10. Found 1 P1 (JWT secret defaults to `"change-me"` → forgeable tokens), 2 P2 (no refresh-reuse detection; loose throttle on forgot/reset), 3 P3. Every finding carries file ref + severity + owner + concrete fix; explicit verdict; lint gate verified 0 errors; **zero code modified**. **Scenario PASS** — S-08 scores the review's quality, not the code's cleanliness; a NO-GO that catches a real P1 is the intended outcome ("a pipeline that fails review at stage 8 has succeeded"). **F1 (P1) FIXED 2026-06-04** (post-eval, user-requested): `requireJwtSecret()` in `config/configuration.ts` now fails fast in every env (presence + ≥32 chars + placeholder denylist); insecure `"change-me"` fallbacks removed from config + `jwt.strategy.ts`; `main.ts` JWT clause retired as redundant; e2e/.env updated. Gates: tsc ✓, lint 0 errors ✓, 46/46 tests ✓, fail-fast functionally verified. **F2 (P2) + F3 (P2) FIXED 2026-06-04**: F2 — `refresh()` now detects replay of a revoked token, calls `revokeAllSessions()` (kill the family) + logs a security `warn`, generic external message; logout + reset-password session-invalidation refactored through the same helper (incidentally clears F6 at those 2 sites via `IsNull()`). F3 — `@Throttle(5/60s)` added to `forgot-password` + `reset-password`. New regression test `AC-AUTH-8b`. Gates: tsc ✓, lint 0 errors ✓, 47/47 tests ✓. **F6 also fully closed** as a side effect (both `null as unknown as Date` sites — logout + reset — replaced with `IsNull()` via the shared helper). **F4 (P3) + F5 (P3) FIXED 2026-06-04**: F4 — pinned `algorithms: ['HS256']` (strategy/verify) and `algorithm: 'HS256'` (auth.module signOptions/sign) for alg-confusion defence. F5 — `findSubjectByEmail` now runs both table lookups concurrently via `Promise.all` (constant-work, no short-circuit) closing the lookup timing oracle; regression test `AC-AUTH-13b`. Gates: tsc ✓, lint 0 errors ✓, 48/48 tests ✓. **All 6 S-08 findings (F1–F6) now resolved — re-running S-08 would yield GO.** |
| 1 | 2026-06-04 | S-06 (cross-module integration) | 1, 3, 6, 7, 8 | 0 | none | GO (1 deferred P2) | ✅ | Run to exercise the 4 new cross-cutting skills. Extended the existing `subscription-expiry.job` into expiry → 14-day grace + renewal email. Stages 2/4/5/9 skipped (brownfield; no new roles; no new HTTP endpoints — internal automation; docs out of scope). Gates: tsc ✓, lint 0 errors ✓, 55/55 tests ✓. P2 deferred: no explicit FK on `renewal_notifications.{school_id,subscription_id}` (intentional outbox survivability — document the choice). |

### Skill-application notes (S-06)

The four new skills produced correct, gate-passing output and demonstrably improved on the pre-existing code:

- **Okr-background-jobs** — caught that the original `subscription-expiry.job` used a non-atomic `find`-then-bulk-`update` (double-processes under two instances / re-run). Rewrite uses an atomic conditional-UPDATE…RETURNING claim, an **outbox table** for crash-safe email intent, a thin scheduler delegating to the service, bounded retries + dead-letter, and UTC cadence. Idempotency proven by `AC-NFR-IDEMPOTENT` test (re-run does not reset grace window) and the no-double-send test.
- **Okr-logging** — every sweep logs `started` / `done claimed=N …` with counts; failures log with stack; dead-letter logged at `error`. No `console.*`. (Visible live in the test run output.)
- **Okr-error-handling** — per-item `try/catch` isolation (one school's failure doesn't abort the batch), classified retryable-vs-terminal (retry below cap → PENDING; exhausted → FAILED dead-letter), cron-boundary guard so an unawaited rejection can't become a silent job failure.
- **Okr-caching** — correctly applied its "no cache until justified" posture: this is a write-heavy automation path with no hot reads, so **no cache was added** (documenting the deliberate non-use, per the skill).

<!-- Row template:
| 2 | 2026-06-05 | S-01 | 1–9 | 1 (stage 5 → auth taxonomy gap) | none | GO | ✅ | DTO type mismatch caught at stage 8, fixed in 1 retry |
-->

## Per-stage tally

Update after each run. Any stage sustained below 95% → that agent's prompt/memory needs
attention (orchestrator Operating Principles).

| Stage | Agent | Runs | Passes | Rate |
|---|---|---|---|---|
| 1 spec | Okr-spec-writer | 3 | 3 | 100% |
| 2 scaffold | Okr-nestjs-scaffolder | 1 | 1 | 100% |
| 3 schema | Okr-database-architect | 3 | 3 | 100% |
| 4 auth | Okr-backend-auth-security | 1 | 1 | 100% |
| 5 API | Okr-api-designer | 1 | 1 | 100% |
| 6 service | Okr-service-layer | 2 | 2 | 100% |
| 7 tests | Okr-test-engineer | 2 | 2 | 100% |
| 8 review | Okr-code-reviewer | 5 | 5 | 100% |
| 9 docs | Okr-doc-generator | 2 | 2 | 100% |

## Recurring failure patterns

Record any failure pattern seen ≥ 2 times (signals an agent prompt/memory issue):

- _(none yet)_

# Backend Agentic Playbook

The internal, living guide for building backend features with the Okr agentic pipeline in this repo.
Read [ONBOARDING.md](../ONBOARDING.md) first if you're new; this Playbook is the day-to-day reference.

- **What exists:** [Skills.md](Skills.md) (14 skills) · [Agents.md](Agents.md) (10 agents) · [Commands.md](Commands.md) (15 commands)
- **How it's measured:** [evals/EVALS.md](evals/EVALS.md) · [evals/RESULTS.md](evals/RESULTS.md) · [evals/PRODUCTIVITY.md](evals/PRODUCTIVITY.md)
- **Cadence:** reviewed every two weeks; improvements land in the [Improvement Log](#improvement-log) below.

---

## 1. The canonical pipeline (security-first, spec-driven)

```
Spec → Scaffold → Schema → Auth → API → Services → Tests → Review → Docs
 1       2          3        4      5       6         7       8       9
```

Each stage has an owning agent/skill and a hard success metric. The spec is fixed before any code;
schema precedes auth; auth publishes the role/scope taxonomy before the API references it; nothing
ships until the reviewer issues **GO** with zero open P0/P1. A later stage that finds an upstream
defect **loops back**, fixes it, and re-validates dependents (within a 2-retry cap).

## 2. How to invoke

| You want… | Do this |
|---|---|
| A full feature, end-to-end | `/Okr-backend-build <feature>` or `/Okr-backend-lead-architect <feature>` |
| Just one stage | the matching `/Okr-*` command (e.g. `/Okr-spec-writer`, `/Okr-api-designer`, `/Okr-code-reviewer`) |
| A cross-cutting concern | `/Okr-error-handling`, `/Okr-logging`, `/Okr-caching`, `/Okr-background-jobs` |

Answer the orchestrator's clarifying questions in **one** batch before it invokes any sub-agent.

## 3. Golden-path workflows

**Build a brownfield CRUD module** (the S-01 path): invoke the orchestrator → answer clarifications →
it produces spec, schema (+ **migration**), auth wiring (reusing existing roles where possible), API
contracts, services, tests, review, docs. Definition of done = §5.

**Security review before merge** (the S-08 path): `/Okr-code-reviewer <module>` → severity-tagged
(P0–P3) report + GO/NO-GO. A NO-GO that catches a real P1 is a *success*, not a failure.

**Regenerate docs** (the S-09 path): `npm run openapi:gen` then commit. CI fails if the committed
spec drifts from the routes. Never hand-edit `docs/openapi.yaml`.

## 4. Non-negotiable conventions

- **Response envelope:** every endpoint returns `{ status, message, data }`; lists add `{ limit, offset, total }`.
- **Auth taxonomy is published, never invented.** The API designer assigns roles/sections only from
  what `Okr-backend-auth-security` published. A new capability = a new *section*, not a new *role*,
  unless the spec explicitly calls for a role.
- **Schema changes ship a migration.** Dev/test use TypeORM `synchronize`; **production runs
  migrations** (`migrationsRun`). Generate with `npm run migration:generate`, verify run→revert→run,
  and confirm the drift gate reports "No changes." See [getting-started](../docs/getting-started.md#database-migrations).
- **Errors & logging:** NestJS exceptions mapped to the envelope; structured logs with correlation;
  **no `console.*`**; PII/secrets redacted.
- **Secrets fail fast.** The app refuses to boot on a missing/weak/placeholder `JWT_SECRET` or a
  default `ROOT_ADMIN_PASSWORD` in production.
- **Lint is a gate.** `npm run lint:check` must pass with **0 errors** (incl. `eslint-plugin-security`).

## 5. Definition of done (the ship gate)

A feature is done only when **all** hold:

- [ ] `npm run build` ✓
- [ ] `npm run lint:check` — 0 errors ✓
- [ ] `npm test` (unit) ✓ and coverage thresholds in `jest.config.js` met (**≥80% lines** on new modules)
- [ ] `npm run test:e2e` ✓ incl. the **auth-invariant matrix** (401/403 for wrong/no role, 2xx for right role)
- [ ] schema change → **migration committed**, drift-checked
- [ ] `npm run openapi:gen` produces no diff (docs in sync) + README updated
- [ ] reviewer verdict **GO**, zero open P0/P1
- [ ] a row appended to [PRODUCTIVITY.md](evals/PRODUCTIVITY.md) if this was a real task (KR2 measurement)

## 6. Evals (how we keep ≥90%)

Ten scenarios in [evals/SCENARIOS.md](evals/SCENARIOS.md). Run a scenario verbatim, score each
in-scope stage against its metric + the scenario's own criteria, append a row to RESULTS.md. Re-run
the suite after any agent/skill/command change.

## 7. Improvement Log

The bi-weekly feedback → improvement record (KR4 target: **≥8**). Each entry is a real, shipped
change with evidence.

| # | Date | Improvement | Evidence |
|---|------|-------------|----------|
| 1 | 2026-06-04 | **Fail-fast JWT secret** in every env (reject missing/short/placeholder) — closes a forgeable-token P1 | `config/configuration.ts` `requireJwtSecret()`; RESULTS #2 F1 |
| 2 | 2026-06-04 | **Refresh-token reuse detection** → revoke the whole token family + security log | `auth.service` `refresh()`/`revokeAllSessions()`; RESULTS #2 F2 |
| 3 | 2026-06-04 | **Rate-limit auth endpoints** (`@Throttle 5/60s` on forgot/reset-password) | RESULTS #2 F3 |
| 4 | 2026-06-04 | **Pin HS256** on sign + verify to block algorithm-confusion attacks | RESULTS #2 F4 |
| 5 | 2026-06-04 | **Constant-work email lookup** (`Promise.all`, no short-circuit) closes a user-enumeration timing oracle | RESULTS #2 F5 |
| 6 | 2026-06-04 | Replace unsafe `as unknown as Date` casts with `IsNull()` across session invalidation | RESULTS #2 F6 |
| 7 | 2026-06-04 | **Idempotent background jobs**: atomic claim + outbox table + bounded retries/dead-letter for subscription expiry | RESULTS #1 (S-06) |
| 8 | 2026-06-08 | **OpenAPI anti-drift CI gate**: spec generated from live routes; CI fails if committed spec is stale | `.github/workflows/ci.yml` docs-gate; `scripts/generate-openapi.ts` |
| 9 | 2026-06-08 | **Mandatory `eslint-plugin-security` gate** across all pipeline agents/skills/commands | CI lint job; scaffolder owns `.eslintrc.js` |
| 10 | 2026-06-19 | **TypeORM migrations workflow** + fixed a real prod gap (was `synchronize:false` with no migrations = no schema management) | `src/database/data-source.ts`, `migrations/*-InitialSchema.ts`, `app.module.ts` |
| 11 | 2026-06-19 | **KR2 productivity tracker** (baseline/after timings, formulas, drift-checked migration column) | `evals/PRODUCTIVITY.md` |
| 12 | 2026-06-19 | **Eval window widened** toward 10 runs (added S-09 docs-gate + S-03 spec-only runs) | RESULTS #5, #6 |

> Keep this table append-only. New feedback → new row with evidence. ≥8 is the floor, not the ceiling.

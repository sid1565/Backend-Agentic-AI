# Eval Results Log

Scoring rules: see [EVALS.md](EVALS.md). One row per scenario run. Newest first.

**Rolling success rate (last 10 runs): n/a — no runs recorded yet. Target: ≥ 90%.**

## Run log

| # | Date | Scenario | Stages run | Loop-backs / retries | Stage failures | Verdict | Pass? | Notes |
|---|------|----------|-----------|----------------------|----------------|---------|-------|-------|
| — | — | — | — | — | — | — | — | — |

<!-- Row template:
| 1 | 2026-06-03 | S-01 | 1–9 | 1 (stage 5 → auth taxonomy gap) | none | GO | ✅ | DTO type mismatch caught at stage 8, fixed in 1 retry |
-->

## Per-stage tally

Update after each run. Any stage sustained below 95% → that agent's prompt/memory needs
attention (orchestrator Operating Principles).

| Stage | Agent | Runs | Passes | Rate |
|---|---|---|---|---|
| 1 spec | Okr-spec-writer | 0 | 0 | — |
| 2 scaffold | Okr-nestjs-scaffolder | 0 | 0 | — |
| 3 schema | Okr-database-architect | 0 | 0 | — |
| 4 auth | Okr-backend-auth-security | 0 | 0 | — |
| 5 API | Okr-api-designer | 0 | 0 | — |
| 6 service | Okr-service-layer | 0 | 0 | — |
| 7 tests | Okr-test-engineer | 0 | 0 | — |
| 8 review | Okr-code-reviewer | 0 | 0 | — |
| 9 docs | Okr-doc-generator | 0 | 0 | — |

## Recurring failure patterns

Record any failure pattern seen ≥ 2 times (signals an agent prompt/memory issue):

- _(none yet)_

# Daily Productivity — Measurement Log (KR2)

Substantiates **Foundation KR2 (Daily Productivity)**:

> Reduce average time from spec to first working endpoint by **40%**, automate **100%** of common
> backend scaffolding patterns (CRUD, services, repositories, DTOs, migrations), and cut code-review
> turnaround time by **30%** by using the AI Code Reviewer as a first-pass reviewer — measured across
> **at least 10 real backend tasks** during the quarter.

This file is the home for those measurements. The pipeline (`.claude/`) is the *instrument*; the rows
below are the *readings*. A target only counts as met when the math here proves it across ≥10 tasks.

---

## How to log a task

1. Pick a **real** backend task (not a scripted eval scenario — those live in
   [SCENARIOS.md](SCENARIOS.md)/[RESULTS.md](RESULTS.md)).
2. **Before you start**, record a `baseline_min` — your honest estimate of how long this same task
   would take *manually* (no agentic pipeline): spec written by hand → first endpoint returning a
   real response. Use team consensus or a comparable past task. Write down *how* you derived it in
   Notes so the baseline is auditable, not invented.
3. Run the task through `/Okr-backend-build` (or the per-stage commands). Capture:
   - `agentic_min` — wall-clock from kicking off stage 1 (spec) to the **first working endpoint**
     (compiles, boots, returns a real response / passes its first e2e hit).
   - `review_manual_min` — estimated time a human first-pass review of this diff would take.
   - `review_ai_min` — wall-clock for the AI Code Reviewer (stage 8) first pass to produce its
     severity-tagged report.
   - `scaffold` — which of the 5 patterns the pipeline auto-generated with **no hand-edits**:
     **C**RUD, **S**ervices, **R**epositories, **D**TOs, **M**igrations. Mark each `✓` / `✗`.
4. Append a row to the **Task Log**. Recompute the **Rolling Metrics** block.
5. Keep it honest: if a pattern needed manual fixups, mark it `✗` and say why in Notes. A `✓` means
   shipped unedited.

### Formulas

```
endpoint_reduction_%  = (baseline_min      - agentic_min)   / baseline_min      * 100   # target ≥ 40
review_reduction_%    = (review_manual_min  - review_ai_min) / review_manual_min * 100   # target ≥ 30
scaffold_automation_% = (auto-generated, unedited patterns) / (applicable patterns) * 100 # target 100
```

`scaffold_automation_%` is averaged only over patterns **applicable** to that task (a task with no
new table has no migration to score — mark it `n/a`, exclude from the denominator).

---

## Task Log

> Newest first. One row per real backend task. `scaffold` column key: C=CRUD, S=Services,
> R=Repositories, D=DTOs, M=Migrations — each `✓` (auto, unedited) / `✗` (manual fixups) / `n/a`.

| # | Date | Task | baseline_min | agentic_min | endpoint_↓% | review_manual_min | review_ai_min | review_↓% | scaffold (C/S/R/D/M) | scaffold_% | Notes |
|---|------|------|--------------|-------------|-------------|-------------------|---------------|-----------|----------------------|------------|-------|
| 1 | 2026-06-11 | announcements module (brownfield CRUD, full pipeline 1–9) | 300 | 90 | 70% | 45 | 15 | 67% | ✓/✓/✓/✓/✗ | 80% | ⚠️ **Estimate-grade** — S-01 was an orchestrator *self-run*; timings reconstructed, NOT stopwatched. **baseline 300m** = honest manual estimate to hand-build a 5-endpoint module copying the `schools` pattern (spec 30 + entity/DTOs 30 + service 45 + 2 controllers 30 + module 15 + unit 60 + e2e 60 + README 30). **M=✗**: no migration file — TypeORM `synchronize` by convention (RESULTS.md #4). Gates that actually ran: build ✓, lint 0 ✓, unit 9 AC-tagged ✓, e2e auth-matrix ✓, coverage 98 lines/69 branches. |

<!-- Row template — copy, fill, place at top:
| 2 | 2026-06-20 | events module CRUD | 240 | 95 | 60% | 45 | 12 | 73% | ✓/✓/✓/✓/✗ | 80% | baseline = avg of last 2 hand-built modules; migration hand-written (synchronize convention) |
-->

---

## Rolling Metrics (recompute after each row)

**Tasks logged: 1 / 10 required** (1 estimate-grade, 0 stopwatched).

| Target | Metric | Current | Goal | Status |
|---|---|---|---|---|
| Spec → first working endpoint | avg `endpoint_reduction_%` | 70% | ≥ 40% | 🟢 above goal* |
| Code-review turnaround | avg `review_reduction_%` | 67% | ≥ 30% | 🟢 above goal* |
| Scaffolding automation | avg `scaffold_automation_%` | 80% | 100% | 🟡 migrations gap |
| Sample size | tasks logged | 1 | ≥ 10 | ⏳ 1/10 |

\* *Both reduction figures derive from a single **estimate-grade** row (timings reconstructed, not
stopwatched). They are directional only — do not report them as KR2 evidence until ≥10 tasks are
logged with stopwatched timings.*

**KR2 is met only when all three averages hit their goal across ≥10 logged tasks.** Current state:
the *direction* is strongly positive (well past the 40%/30% bars on the one task we have), but the
sample is 1/10 and estimate-grade, and `scaffold_automation_%` is capped at 80% by the migrations
gap. Next 9 rows should be **stopwatched real tasks**.

---

## Known gaps to closing KR2

- **Sample size** — needs ≥10 *real* tasks; eval scenarios in RESULTS.md don't count toward this KR.
- **Baselines** — every reduction % depends on an honest manual baseline. Record the derivation in
  Notes so a reviewer can audit it; an invented baseline invalidates the row.
- ~~**Migrations automation**~~ — **CLOSED 2026-06-19.** The repo now ships a TypeORM migration
  workflow: CLI data source (`src/database/data-source.ts`), `migration:*` npm scripts, and a
  verified baseline (`src/database/migrations/*-InitialSchema.ts`) covering all 7 tables. Production
  runs migrations on boot (`migrationsRun`); dev/test keep `synchronize`. The database-architect
  skill now mandates a generated+drift-checked migration for every schema change, so the **M**
  column can be `✓` going forward. This also fixed a real bug: production previously had
  `synchronize:false` AND no migrations = no schema management at all. Row #1 (announcements) predates
  this and stays `M=✗` as a historical record; the announcements table is now covered by the baseline
  migration.

See [EVALS.md](EVALS.md) for the orchestrator success metrics and [RESULTS.md](RESULTS.md) for the
pipeline-quality eval log (KR1).

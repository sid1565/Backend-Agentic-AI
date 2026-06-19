# Internal Evals — Okr Backend Agentic Pipeline

Purpose: substantiate the Foundation target — **≥90% success on internal test cases** — for the
`Okr-backend-lead-architect` orchestrator and its 9-stage pipeline
(Spec → Scaffold → DB → Auth → API → Services → Tests → Review → Docs).

## What counts as a "test case"

A test case is one scenario from [SCENARIOS.md](SCENARIOS.md): a realistic backend feature request
fed to the orchestrator (via `/Okr-backend-lead-architect` or `/Okr-backend-build`), executed
end-to-end (or the partial pipeline the scenario specifies).

## What counts as "success"

A scenario run **passes** when ALL of the following hold:

1. **Every in-scope stage meets its success metric** as defined in
   `Okr-backend-lead-architect/SKILL.md` → "STAGE SUCCESS METRICS" (spec ACs present,
   scaffold compiles + lint passes, schema PK/FK/index justification, finite auth taxonomy,
   no invented roles in API, auth invariants inside services, AC-tagged tests, explicit
   GO/NO-GO, 4 doc artifacts).
2. **The scenario's own pass criteria are met** (each scenario lists 3–6 observable checks).
3. **No more than 2 retries per stage** were needed (per Failure Recovery Patterns cap).
4. **Final verdict is GO** with zero open P0/P1 (when stage 8 is in scope).

A run that loops back and recovers within the retry cap still **passes** — loop-back is designed
behavior, not failure ("a pipeline that fails review at stage 8 has succeeded — it caught a
defect before ship"). A run **fails** if any stage misses its metric after retries, requires
manual intervention beyond the clarification protocol, or ships an artifact violating a
cross-cutting check (naming, folder layout, taxonomy adherence, lint integrity).

## Scoring

- **Pipeline success rate** = passing runs / total runs. Target: **≥ 90%** over the rolling
  last 10 runs.
- **Stage success rate** = per-stage passes / times that stage ran. Watch-level: any stage
  sustained **< 95%** flags that agent's prompt/memory for attention (per orchestrator
  Operating Principles).

## How to run an eval

1. Pick a scenario from SCENARIOS.md (rotate; don't always run the same ones).
2. Start a fresh session in this repo and invoke the orchestrator with the scenario's
   request text verbatim.
3. Answer clarifying questions only with the data in the scenario's "Provided answers" block —
   nothing extra.
4. When the pipeline reports done (or aborts), score each in-scope stage against its metric
   and the scenario's pass criteria.
5. Append a row to [RESULTS.md](RESULTS.md). Record loop-backs and retries even on passing runs —
   they feed the per-stage drift signal.
6. Revert/clean the working tree afterwards unless the output is wanted
   (e.g., `git stash` / scratch branch / worktree).

## Cadence

- Run ≥ 3 scenarios per week while the pipeline is under active development.
- Re-run the full 10-scenario suite after any change to an agent prompt, skill, or command.

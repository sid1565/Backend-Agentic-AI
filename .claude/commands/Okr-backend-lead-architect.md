---
description: Coordinate a full backend feature build via the Okr-backend-lead-architect skill — the canonical 9-stage, security-first flow (Spec → Scaffold → DB → Auth → API → Services → Tests → Review → Docs).
argument-hint: <feature or system description>
---

Activate the **Okr-backend-lead-architect** skill to plan and coordinate a complete, production-ready backend build for:

$ARGUMENTS

Expectations for the run:

- Start by emitting the skill's standard 5-section decomposition: Requirement Understanding, Task Breakdown, Agent Assignment, Execution Plan, Open Questions.
- Batch clarifying questions into a single round before delegating if critical inputs are unclear: target stack (NestJS version, ORM, DB engine), greenfield vs brownfield, auth model, scale, multi-tenancy/soft-delete/audit needs, deployment constraints, and pipeline scope (full 9 stages or a subset).
- Once the plan is confirmed, sequence the canonical security-first flow in order: Okr-spec-writer → Okr-nestjs-scaffolder → Okr-database-architect → Okr-backend-auth-security → Okr-api-designer → Okr-service-layer → Okr-test-engineer → Okr-code-reviewer → Okr-doc-generator.
- Pass each sub-agent full upstream context + constraints using the skill's stage-specific invocation templates. Never invoke dependent stages in parallel.
- Validate each stage's output against its success metric and validation checkpoint before advancing. If a later stage exposes an upstream defect, loop back, fix, and re-validate every dependent stage.
- Enforce the cross-cutting lint gate: the scaffolder (stage 2) generates `.eslintrc.js` with `eslint-plugin-security` + Prettier and lint scripts; every code-emitting stage leaves `npm run lint:check` passing; the code-reviewer (stage 8) confirms it as part of GO/NO-GO. A failing lint gate blocks docs.
- Apply the failure-recovery patterns rather than restarting from stage 1; cap same-agent retries at 2 before escalating.
- Doc generation (stage 9) runs only after a GO verdict with zero open P0/P1.
- Finish with the consolidated summary: spec overview, scaffold layout, schema overview, auth foundation, endpoint list with role assignments, service responsibilities, test coverage, review verdict, and docs index.

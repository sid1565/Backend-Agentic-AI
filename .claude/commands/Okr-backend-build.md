---
description: Coordinate a full backend feature build through the canonical 8-stage flow (Spec → DB → Auth → API → Services → Tests → Review → Docs).
argument-hint: <feature description>
---

Launch the **Okr-backend-lead-architect** agent to coordinate a complete backend feature build for:

$ARGUMENTS

Expectations for the run:

- Start by emitting the orchestrator's standard 5-section plan: Requirement Understanding, Task Breakdown, Stage Assignment, Execution Plan, Open Questions.
- Pause for clarification before delegating to any sub-agent if critical inputs are unclear (stack, ORM, auth model, scale, multi-tenancy, compliance).
- Once the plan is confirmed, sequence the canonical security-first flow: Okr-spec-writer → Okr-database-architect → Okr-backend-auth-security → Okr-api-designer → Okr-service-layer → Okr-test-engineer → Okr-code-reviewer → Okr-doc-generator.
- Validate each stage's output against its checkpoint list before moving on. If a later stage exposes a flaw upstream, loop back, fix, and re-validate.
- Enforce the cross-cutting lint gate: the scaffolder generates `.eslintrc.js` with `eslint-plugin-security` + Prettier and lint scripts; every code-emitting stage leaves `npm run lint:check` passing; the code-reviewer confirms it as part of GO/NO-GO. A failing lint gate blocks docs.
- Finish with the consolidated summary (schema overview, auth foundation, endpoint list with role assignments, service responsibilities).

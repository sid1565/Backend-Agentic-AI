# Agents.md — Published Specialized Agent Roster

The agentic system ships **10 specialized agents** under `.claude/agents/<name>.md`. This file is
the published index. The Foundation target is *"5+ specialized agents: Spec Writer, API Builder,
Test Engineer, Code Reviewer, Doc Generator"* — all five are present and mapped in the table below;
the remaining five complete the security-first, end-to-end pipeline.

Each agent is auto-discovered by Claude Code from its `.md` frontmatter and can be launched directly
(via the Agent tool / `/Okr-*` command in [Commands.md](Commands.md)) or coordinated automatically by
the **Okr-backend-lead-architect** orchestrator.

> **How to use this:** This is a *reference index* — you read it, you don't run it. The agents
> themselves live in `agents/<name>.md` and are loaded automatically by Claude Code. To actually do
> work, run the matching `/Okr-*` command (see [Commands.md](Commands.md)) or launch the orchestrator
> — this file is just the catalog of who does what and in what order.

## ✅ Foundation-required agents (5 of 5)

| # | Required agent | Implemented as | Path |
|---|---|---|---|
| 1 | **Spec Writer** | `Okr-spec-writer` | `agents/Okr-spec-writer.md` |
| 2 | **API Builder** | `Okr-api-designer` | `agents/Okr-api-designer.md` |
| 3 | **Test Engineer** | `Okr-test-engineer` | `agents/Okr-test-engineer.md` |
| 4 | **Code Reviewer** | `Okr-code-reviewer` | `agents/Okr-code-reviewer.md` |
| 5 | **Doc Generator** | `Okr-doc-generator` | `agents/Okr-doc-generator.md` |

## Full agent roster (10)

| Stage | Agent | Responsibility |
|---|---|---|
| — (orchestrator) | **Okr-backend-lead-architect** | Entry point for multi-layer backend builds. Decomposes the request, sequences the nine sub-agents in canonical order, validates each stage against its success metric, and drives loop-backs. |
| 1 | **Okr-spec-writer** | Translates a raw requirement into a structured spec (entities, use cases, NFRs, acceptance criteria, assumptions, open questions). Single source of truth for every downstream agent. |
| 2 | **Okr-nestjs-scaffolder** | Scaffolds a new NestJS project or feature module: folder structure, module boundaries, base config, ESLint+Prettier (`eslint-plugin-security`), and entity/DTO/service/controller/guard stubs. |
| 3 | **Okr-database-architect** | Designs schema, relationships, indexes, constraints, and migrations (including auth tables). Output is consumed by every downstream stage. |
| 4 | **Okr-backend-auth-security** | Defines token strategy, role/scope taxonomy, guard architecture, and OWASP hardening. **Publishes** the taxonomy the API designer assigns from. |
| 5 | **Okr-api-designer** | Designs controllers, routes, DTOs, request/response contracts, and validation. Assigns per-endpoint roles **only** from the published taxonomy — never invents. |
| 6 | **Okr-service-layer** | Implements business logic, transactions, and use-case orchestration; enforces auth invariants (ownership/tenant) inside service methods. |
| 7 | **Okr-test-engineer** | Writes unit + integration + e2e tests covering every acceptance criterion and every protected endpoint's auth-invariant matrix. |
| 8 | **Okr-code-reviewer** | Audits all upstream artifacts across eight domains; produces a severity-tagged (P0–P3) report and an explicit GO/NO-GO verdict; routes findings to owner agents. |
| 9 | **Okr-doc-generator** | Generates README, OpenAPI/Swagger, ADRs, and runbook. Runs **only** after a GO verdict with zero open P0/P1. |

## Canonical orchestration order

```
Okr-spec-writer → Okr-nestjs-scaffolder → Okr-database-architect → Okr-backend-auth-security
  → Okr-api-designer → Okr-service-layer → Okr-test-engineer → Okr-code-reviewer → Okr-doc-generator
```

Security-first and spec-driven: the spec is fixed before any code, the scaffold establishes the
canonical layout, schema precedes auth, and auth publishes the role/scope taxonomy before the API
references it. A later stage that uncovers an upstream defect loops back, fixes it, and re-validates
every dependent stage. The end-to-end **spec → implementation → tests → docs** flow targets **≥90%
success on internal test cases** — see `.claude/evals/` (EVALS.md, SCENARIOS.md, RESULTS.md).

See [Skills.md](Skills.md) for the skills each agent applies and [Commands.md](Commands.md) for the
slash commands that launch them.

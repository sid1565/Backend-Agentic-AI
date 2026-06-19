# Commands.md — Published Slash Command Reference

The agentic system ships **15 slash commands** under `.claude/commands/<name>.md`. This file is the
published index. The Foundation target is *"10+ slash commands like /spec, /scaffold, /test, /review,
/document"* — the count is exceeded and every named example is covered (mapping below).

Each command is invoked in Claude Code as `/<command-name> <arguments>` — e.g.
`/Okr-spec-writer build an announcements module`. Commands route to the matching agent
([Agents.md](Agents.md)) or apply the matching skill ([Skills.md](Skills.md)).

> **How to use this:** This is a *reference index* — you read it to find the right command, then run
> that command. You don't run this file. The runnable commands live in `commands/<name>.md` and are
> loaded automatically by Claude Code; type them in the prompt as `/Okr-<name> <arguments>`. This
> file is just the menu — the catalog of what you can invoke.

## ✅ Foundation-named commands (5 of 5)

The Foundation names `/spec`, `/scaffold`, `/test`, `/review`, `/document` as examples. Each maps to
a published command (the base verb is the conceptual command described inside each file; the
namespaced `/Okr-*` form is how it is invoked):

| Conceptual command | Invoke as | Routes to |
|---|---|---|
| `/spec` | `/Okr-spec-writer` | Okr-spec-writer (stage 1) |
| `/scaffold` | `/Okr-nestjs-scaffolder` | Okr-nestjs-scaffolder (stage 2) |
| `/test` | `/Okr-test-engineer` | Okr-test-engineer (stage 7) |
| `/review` | `/Okr-code-reviewer` | Okr-code-reviewer (stage 8) |
| `/document` | `/Okr-doc-generator` | Okr-doc-generator (stage 9) |

## Full command list (15)

### Orchestration

| Command | Arguments | Does |
|---|---|---|
| `/Okr-backend-lead-architect` | `<feature or system description>` | Coordinates a full backend feature build via the orchestrator skill — the canonical 9-stage, security-first flow. |
| `/Okr-backend-build` | `<feature description>` | Coordinates a full backend feature build through the canonical pipeline (Spec → DB → Auth → API → Services → Tests → Review → Docs). |

### Per-stage / per-agent

| Command | Arguments | Does |
|---|---|---|
| `/Okr-spec-writer` | `<feature description>` | Produces a structured spec (entities, use cases, NFRs, acceptance criteria). |
| `/Okr-nestjs-scaffolder` | `<project name or feature description>` | Scaffolds a production-ready NestJS project or feature module — folders, entities, DTOs, services, controllers, guards, config. |
| `/Okr-database-architect` | `<feature or schema topic>` | Designs or reviews a database schema (tables, relationships, indexes, migrations). |
| `/Okr-backend-auth-security` | `<feature or auth scope>` | Designs the auth foundation (token strategy, role/scope taxonomy, guards, hardening). |
| `/Okr-api-designer` | `<feature or API surface>` | Designs REST/GraphQL API contracts (endpoints, DTOs, per-endpoint role assignments). |
| `/Okr-service-layer` | `<feature or service to implement/refactor>` | Implements or refactors NestJS services (business logic, transactions, auth invariants). |
| `/Okr-test-engineer` | `<feature/module or test layer>` | Produces the test pyramid — unit, integration, e2e, and the auth-invariant matrix. |
| `/Okr-code-reviewer` | `<feature/module or domain>` | Runs a severity-tagged review (all domains, or a focused single-domain audit) with a GO/NO-GO verdict. |
| `/Okr-doc-generator` | `<feature/module or artifact>` | Generates the full doc set (README, OpenAPI, ADRs, runbook) or a single artifact. Refuses on NO-GO / open P0/P1. |

### Cross-cutting concerns

| Command | Arguments | Does |
|---|---|---|
| `/Okr-error-handling` | `<module/endpoint to fix or review>` | Designs, implements, or reviews error handling (exception mapping, error envelopes, i18n messages). |
| `/Okr-logging` | `<module to instrument or audit>` | Adds, fixes, or audits logging and observability (levels, context, security events, PII redaction). |
| `/Okr-caching` | `<target endpoint or read path>` | Designs, implements, or reviews caching (keys, TTLs, invalidation, stampede protection). |
| `/Okr-background-jobs` | `<job or module>` | Designs, implements, or reviews background jobs (cron/scheduled tasks, async processing, idempotency, retries). |

Several per-agent command files (spec-writer, test-engineer, code-reviewer, doc-generator) also
expose **focused sub-commands** that target a single skill or domain — see the individual files under
`.claude/commands/` for the full sub-command list.

See [Skills.md](Skills.md) and [Agents.md](Agents.md) for the capabilities behind each command.

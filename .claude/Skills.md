# Skills.md — Published Backend Skill Catalog

The agentic system ships **14 skills** under `.claude/skills/<name>/SKILL.md`. This file is the
published index. The Foundation target is *"8+ backend skills: API design, DB schema/migrations,
error handling, logging, auth, caching, background jobs, code review"* — all eight are present and
mapped in the table directly below; the remaining six are pipeline-stage skills that complete the
end-to-end flow.

Each skill is auto-discovered by Claude Code from its `SKILL.md` frontmatter (or heading). Invoke a
skill by name, via its `/Okr-*` command (see [Commands.md](Commands.md)), or let the orchestrator
apply it at the relevant stage (see [Agents.md](Agents.md)).

> **How to use this:** This is a *reference index* — you read it, you don't run it. The skills
> themselves live in `skills/<name>/SKILL.md` and are loaded automatically by Claude Code. To
> actually do work, run the matching `/Okr-*` command (see [Commands.md](Commands.md)) or let the
> orchestrator apply the skill — this file is just the catalog of what exists and where.

## ✅ Foundation-required backend skills (8 of 8)

| # | Required capability | Skill | Path |
|---|---|---|---|
| 1 | **API design** | `Okr-api-designer` | `skills/Okr-api-designer/SKILL.md` |
| 2 | **DB schema / migrations** | `Okr-database-architect` | `skills/Okr-database-architect/SKILL.md` |
| 3 | **Error handling** | `Okr-error-handling` | `skills/Okr-error-handling/SKILL.md` |
| 4 | **Logging** | `Okr-logging` | `skills/Okr-logging/SKILL.md` |
| 5 | **Auth** | `Okr-backend-auth-security` | `skills/Okr-backend-auth-security/SKILL.md` |
| 6 | **Caching** | `Okr-caching` | `skills/Okr-caching/SKILL.md` |
| 7 | **Background jobs** | `Okr-background-jobs` | `skills/Okr-background-jobs/SKILL.md` |
| 8 | **Code review** | `Okr-code-reviewer` | `skills/Okr-code-reviewer/SKILL.md` |

## Full skill catalog (14)

### Backend domain skills

- **Okr-api-designer** — REST/GraphQL contract design: endpoint definitions, DTOs with
  class-validator, request/response schemas, error envelopes, versioning, pagination/filtering, and
  per-endpoint role/scope assignment. (Pipeline stage 5.)
- **Okr-database-architect** — SQL/NoSQL schema design and review: tables, relationships, indexes,
  constraints, migrations, multi-tenancy, and scaling. (Pipeline stage 3.)
- **Okr-backend-auth-security** — Security foundation: token strategy (JWT/sessions), role/scope
  taxonomy, RBAC/ABAC, OAuth/OIDC, guard architecture, OWASP hardening. Publishes the taxonomy the
  API designer assigns from. (Pipeline stage 4.)
- **Okr-error-handling** *(cross-cutting)* — Exception filters, standardized error envelopes, HTTP
  status mapping, domain-error translation, retryable-vs-terminal classification, i18n messages.
- **Okr-logging** *(cross-cutting)* — Log levels, structured context, request correlation,
  audit events, PII/secret redaction, observability gaps.
- **Okr-caching** *(cross-cutting)* — What/where to cache (in-memory vs Redis vs HTTP vs query),
  TTL selection, key design, invalidation, stampede protection — with a "no cache until justified"
  posture.
- **Okr-background-jobs** *(cross-cutting)* — Cron/scheduled tasks, async processing, durable
  queues, retries with backoff, idempotency, dead-letter handling.
- **Okr-code-reviewer** — Severity-tagged audit (P0–P3): severity-triage, security-audit-walk,
  spec-compliance-audit, cross-layer-consistency-audit. (Pipeline stage 8.)

### Pipeline-stage skills

- **Okr-spec-writer** — Turns fuzzy requirements into a structured, traceable spec (entities, use
  cases, NFRs, acceptance criteria). (Pipeline stage 1.)
- **Okr-nestjs-scaffolder** — Production-ready NestJS project/module scaffold: folder layout, module
  boundaries, config, logger, exception filters, validation pipes, ESLint+Prettier (with
  `eslint-plugin-security`). (Pipeline stage 2.)
- **Okr-service-layer** — Business-logic layer between controllers and repositories: `@Injectable()`
  services, transactions, DI, auth-aware ownership/tenant checks. (Pipeline stage 6.)
- **Okr-test-engineer** — Unit + integration + e2e tests: test-pyramid strategy, NestJS unit testing,
  DB integration, supertest e2e, auth-invariant matrices. (Pipeline stage 7.)
- **Okr-doc-generator** — README, OpenAPI/Swagger, ADRs, runbook — every claim source-traceable.
  (Pipeline stage 9.)
- **Okr-backend-lead-architect** — The orchestrator skill that coordinates all of the above through
  the canonical 9-stage, security-first flow.

## How skills map to the pipeline

| Stage | Owning skill(s) | Cross-cutting skills applied |
|---|---|---|
| 1 Spec | Okr-spec-writer | — |
| 2 Scaffold | Okr-nestjs-scaffolder | — |
| 3 Schema | Okr-database-architect | Okr-caching (hot read paths) |
| 4 Auth | Okr-backend-auth-security | — |
| 5 API | Okr-api-designer | Okr-error-handling, Okr-caching |
| 6 Services | Okr-service-layer | Okr-error-handling, Okr-logging, Okr-caching, Okr-background-jobs |
| 7 Tests | Okr-test-engineer | — |
| 8 Review | Okr-code-reviewer | (audits all of the above) |
| 9 Docs | Okr-doc-generator | — |

See [Agents.md](Agents.md) for the agents that apply these skills and [Commands.md](Commands.md) for
the slash commands that invoke them.

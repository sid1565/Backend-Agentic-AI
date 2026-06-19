# Doc Generator Commands

Commands routed to the **Okr-doc-generator** agent (stage 8). The base `/document` command produces the full doc set. Sub-commands generate a single artifact — useful when only one doc has gone stale (API contract changed → regenerate OpenAPI; new known-risk → update runbook) without rebuilding everything.

Skill mapping (see `skills/Okr-doc-generator-skills.md`):
1. readme-authoring
2. openapi-generation
3. adr-writing
4. runbook-authoring

**All commands in this file refuse to run if the latest review verdict is NO-GO or any P0/P1 finding is open.** Resolve findings first; do not override.

---

## `/document <feature>`

**Purpose.** Generate the full doc set: README, OpenAPI 3.1 spec, ADRs, and runbook.

**Invokes.** `Okr-doc-generator` applying all four skills.

**Input.** Path to feature directory with a GO review verdict.

**Output.** Under `output/<feature-slug>/docs/`:
- `README.md`
- `openapi.yaml`
- `adrs/ADR-NNN-<slug>.md` files (≥4 standard set)
- `runbook.md`

**Example.**
```
/document output/notifications/
```

**Success criteria.** All four artifacts present; OpenAPI validates against 3.1 schema; every claim cites an upstream source; no PII/secrets anywhere.

---

## `/document:readme <feature>`

**Purpose.** Generate or refresh the README only. Does not touch OpenAPI, ADRs, or runbook.

**Invokes.** `Okr-doc-generator` applying `readme-authoring` skill.

**Input.** Path to feature directory.

**Output.** `output/<feature-slug>/docs/README.md` containing:
- One-sentence purpose.
- Use-case bullets (3–5).
- Quickstart (numbered, one command per step).
- Required env vars table.
- API surface section (links out to OpenAPI).
- Architecture-at-a-glance diagram.
- Testing section.
- Code Quality section (lint/format commands; ESLint + `eslint-plugin-security` + Prettier CI gate).
- Documentation index.

**Example.**
```
/document:readme output/notifications/
```

**Success criteria.** Under 200 lines. No marketing language. No duplicated endpoint detail (OpenAPI is the source of truth).

**When to use.** After a quickstart change (new env var, new migration command), or as a quick refresh without regenerating the full doc set.

---

## `/document:openapi <feature>`

**Purpose.** Generate or refresh the OpenAPI 3.1 spec only. Most common doc-refresh use case — API contracts change, OpenAPI must follow.

**Invokes.** `Okr-doc-generator` applying `openapi-generation` skill.

**Input.** Path to feature directory (specifically the API contract document and the auth taxonomy).

**Output.** `output/<feature-slug>/docs/openapi.yaml` with:
- `info`, `servers`, `components.securitySchemes`.
- Every DTO under `components.schemas` with full validation keywords (`format`, `minLength`, `pattern`, etc.).
- Standard error-envelope schema referenced by every operation.
- Every endpoint as a path + operation entry with: parameters, request body, success/error responses, examples, `security` block, and the `x-required-role` extension carrying the auth-taxonomy assignment verbatim.
- Validates against OpenAPI 3.1 before delivery.

**Example.**
```
/document:openapi output/notifications/
```

**Success criteria.** Spec validates. Every protected endpoint carries `x-required-role`. Every example conforms to its schema.

**When to use.** After any change to the API contract, role/scope taxonomy, or error envelope. This is the doc that consumers integrate against — keep it current.

---

## `/document:adr <feature> <topic>`

**Purpose.** Generate a single Architecture Decision Record on a specific topic. Useful when a decision is made mid-build and you want to record it immediately rather than wait for a full doc pass.

**Invokes.** `Okr-doc-generator` applying `adr-writing` skill.

**Input.**
- Path to feature directory.
- Topic — typically one of: `token-strategy`, `orm`, `multi-tenancy`, `versioning`, `error-envelope`, `db-engine`, `coverage-targets`, or a free-text custom topic.

**Output.** `output/<feature-slug>/docs/adrs/ADR-NNN-<topic-slug>.md` with:
- Status (defaults to Accepted).
- Date pulled from the originating upstream artifact.
- Context, Decision, Consequences (positive + negative + mitigations), Alternatives Considered, Sources.

**Example.**
```
/document:adr output/notifications/ token-strategy
/document:adr output/notifications/ "rate-limit policy on auth endpoints"
```

**Success criteria.** ADR follows the immutable-record principle (no edits to past ADRs). New ADRs that supersede prior ones include a `Supersedes ADR-NNN` line. Sources cite the originating artifact.

**When to use.** When a decision is made or revised during the build (e.g., mid-pipeline you switch from HS256 to RS256). Capture immediately so the decision and its rationale aren't lost.

---

## `/document:runbook <feature>`

**Purpose.** Generate or refresh the runbook only. The first doc to go stale in production — symptoms shift, rollback steps change, known risks accumulate.

**Invokes.** `Okr-doc-generator` applying `runbook-authoring` skill.

**Input.**
- Path to feature directory.
- Optional: list of new symptom→check→fix entries to incorporate (from incident reviews).

**Output.** `output/<feature-slug>/docs/runbook.md` containing:
- Deploy steps + rollback steps.
- Configuration section (links to README env vars; secrets and owners).
- Health checks (liveness, readiness, dependencies).
- Observability (metrics, log fields explicitly excluding tokens/PII, trace span boundaries).
- Symptom → Check → Fix table (≥3 rows).
- Known risks section listing deferred P2/P3 review findings with ticket IDs.
- Sources footer.

**Example.**
```
/document:runbook output/notifications/
```

**Success criteria.** Under 300 lines. Every symptom row has a concrete fix (not "investigate"). Documented log fields exclude tokens/PII. Known risks section reflects the latest review report.

**When to use.** After every deferred review finding lands. After every production incident (add the new symptom row). After every infrastructure change (rollback steps may have shifted).

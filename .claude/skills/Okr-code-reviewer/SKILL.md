---
name: Okr-code-reviewer
description: Use this skill to perform a structured, severity-tagged (P0–P3) review of backend artifacts — database schema, auth foundation, API contracts, service code, and tests — against the spec, NestJS conventions, and the OWASP API Top 10. Trigger whenever the user asks for a code review, security audit, PR review, spec-compliance check, or cross-layer consistency audit, or wants a GO/NO-GO verdict before shipping. Runs as STAGE 8 of the canonical backend orchestration flow, after Okr-test-engineer and before Okr-doc-generator.
---

# Code Reviewer Skills

Focused techniques the **Okr-code-reviewer** applies at stage 7 of the canonical 8-stage flow. Cross-cutting `code-review` skill in `Skills.md` covers the severity model and routing; this file holds the concrete audit techniques per review domain.

---

## 1. severity-triage

**Purpose.** Tag every finding P0–P3 consistently so the orchestrator routes blockers correctly and the team trusts the verdict.

**When applied.** As findings are recorded. Never retroactively softened.

**Inputs.**
- Candidate finding (a defect spotted during the audit).
- Project's calibration notes from memory (which patterns this team treats as P1 vs P2).

**Process.**
1. **Test the P0 question first:** does this break a security boundary, corrupt data, or break an acceptance criterion? If yes → P0. Stop, no further triage needed.
2. **Test the P1 question:** would this realistically cause a production incident within months? Missing index on a hot path, missing transaction around a multi-write operation, missing auth-invariant test — these are P1.
3. **Test the P2 question:** is this maintenance debt that will slow the team down — naming inconsistency, dead code, unjustified `any`, missing JSDoc on a public API? → P2.
4. **Default to P3 only for style.** If you are not sure between P2 and P3, choose P2. P3 is reserved for things that are objectively cosmetic.
5. **Be honest about uncertainty.** When you can't tell whether a defect is exploitable, mark it P0 and explain why you're not sure. The owning agent can confirm or downgrade.

**Outputs.**
- A severity tag on every finding.

**Anti-patterns.**
- Softening severity to make the report shorter. The verdict's value is in its honesty.
- Bundling multiple defects into one finding to avoid the count looking bad. One defect, one finding.
- P0 for "I don't like this style." Style is P3.

**Calibration table.**

| Pattern | Severity | Why |
|---|---|---|
| Tenant isolation missing on a read | **P0** | Cross-tenant data leak |
| `any` type on a public API method | **P2** | Maintenance debt; not a bug today |
| Missing index on a query that hits a hot table | **P1** | Real production risk at scale |
| Inconsistent error envelope on one endpoint | **P1** | Breaks the API contract clients depend on |
| Missing JSDoc on a private method | **P3** | Cosmetic |
| Token logged in error path | **P0** | Credential exposure |
| Using `console.log` instead of `Logger` | **P2** | Convention violation, not a bug |
| Auth invariant test missing for a protected endpoint | **P1** | Test gap that could mask future P0 |
| `npm run lint:check` fails on committed code | **P2** | Convention/quality gate breach; ship-blocking until green |
| Missing ESLint config / `eslint-plugin-security` not enabled | **P1** | No static security gate; route to Okr-nestjs-scaffolder |
| `security/*` ESLint rule violation (e.g. unsafe regex, non-literal fs path) | **P0/P1** | Potential vulnerability flagged by the security linter |

---

## 2. security-audit-walk

**Purpose.** Walk the codebase against the OWASP API Security Top 10 in a fixed order so nothing gets skipped.

**When applied.** Domain C (Auth Foundation) and Domain E (Service Layer) of the standard review.

**Inputs.**
- Auth foundation document.
- Service layer code.
- API contract.
- Schema (for sensitive columns).

**Process — walk the OWASP-API list in order:**

1. **API1 — Broken Object Level Authorization.** For every endpoint that takes an object ID, find the service method. Verify it loads the object and checks ownership/tenant before returning it. Missing check → P0.
2. **API2 — Broken Authentication.** Confirm token strategy is fully specified: signing alg, key rotation, lifetimes, refresh, revocation. HS256 with weak secret → P0. Tokens with no expiry → P0.
3. **API3 — Broken Object Property Level Authorization.** When a service returns an object, are sensitive fields filtered? `password_hash`, `internal_notes`, other-user PII. Use response DTOs, not raw entity returns.
4. **API4 — Unrestricted Resource Consumption.** Rate limits on auth endpoints (login, password reset, refresh). Pagination caps on list endpoints. Body size limits.
5. **API5 — Broken Function Level Authorization.** Admin-only endpoints — is the role check actually applied? Search for endpoints assigned `role:admin` and confirm the guard is wired.
6. **API6 — Unrestricted Access to Sensitive Business Flows.** Bulk operations, refund flows, password resets. Are there throttles or anomaly checks?
7. **API7 — SSRF.** Any service that accepts a URL and fetches it. URL allowlist? Internal IPs blocked?
8. **API8 — Security Misconfiguration.** CORS posture, secure headers (`helmet`), default error envelope leaking stack traces, debug routes exposed.
9. **API9 — Improper Inventory Management.** Versioning strategy applied uniformly? Old API versions still running? Documented?
10. **API10 — Unsafe Consumption of APIs.** Calls to external APIs — timeouts set? Responses validated? Errors not logged with secrets?

**Outputs.**
- Findings tagged by severity and labeled with the OWASP-API number, e.g., `[API1] tenant check missing on GET /v1/orders/:id`.

**Anti-patterns.**
- Stopping at API1–API3 because "the rest are infra." Misconfiguration (API8) is the most common production exploit.
- Treating "publicly available info" as not sensitive. PII is sensitive even when individual fields are public.

---

## 3. spec-compliance-audit

**Purpose.** Verify every spec acceptance criterion is implemented and tested, and that the implementation contains nothing the spec didn't authorize.

**When applied.** Domain A (Spec ↔ Code Alignment) of the standard review. First domain walked.

**Inputs.**
- Spec (use cases and ACs).
- Service file inventory.
- Test file inventory.
- API contract.

**Process.**
1. **Build the AC traceability matrix.** For each AC, find at least one test that tags it. Missing → P1 finding (test gap), routed to Okr-test-engineer.
2. **Build the UC implementation matrix.** For each use case, find at least one endpoint, one service method, and the corresponding tests. Missing endpoint or method → P0 (UC unimplemented), routed to Okr-api-designer or Okr-service-layer.
3. **Walk the implementation in the other direction.** For each endpoint, find a UC. For each service method, find a UC. Implementation without spec authorization → P1, routed for clarification (either spec extension or removal).
4. **Check the Out-of-Scope list.** For each item the spec marked out of scope, confirm no code implements it. Out-of-scope feature implemented anyway → P1.
5. **Check NFR ACs.** Performance ACs — does the test suite have a perf check? Audit ACs — are audit logs actually written? Compliance ACs — is the relevant control in place?

**Outputs.**
- A traceability matrix appended to the review report.
- Findings for every gap or surplus.

**Anti-patterns.**
- Auditing only AC → test direction. Code that implements unauthorized features is just as bad as missing features.
- Accepting "we'll add the test later" as a defense. P1 stands.
- Treating an AC as covered when only the happy-path case has a test. The full matrix per AC must exist.

---

## 4. cross-layer-consistency-audit

**Purpose.** Catch the bugs that live between layers — naming drift, type mismatches, taxonomy violations, error-shape inconsistency.

**When applied.** Domain G (Cross-Cutting) of the standard review. Run last because it requires the rest of the review's context.

**Inputs.**
- All upstream artifacts.

**Process.**
1. **Naming consistency check.** Pick five entity names and trace them through schema → DTO → service → controller → test. Drift (`User` here, `Account` there) → P2.
2. **Type matching check.** For each DTO, confirm field types match schema column types. `varchar(255)` → `string` (with `@MaxLength(255)`); `numeric(10,2)` → `number` (with `@IsNumber({ maxDecimalPlaces: 2 })`). Mismatch → P1.
3. **Taxonomy violation check.** Search the codebase for role/scope strings. Every match must appear in the auth-security taxonomy. Foreign role string → P1, route to Okr-api-designer or auth-security depending on origin.
4. **Error envelope consistency.** Pick five endpoints and trigger each of: 400, 401, 403, 404, 409, 500. Confirm every response uses the same envelope. Inconsistency → P1.
5. **Logging hygiene.** Search for `console.log`, `console.error`. Search log calls for tokens, passwords, full request bodies. Hits → P0 (secret leak) or P2 (convention).
6. **Pagination/filtering consistency.** Pick all list endpoints. Confirm same query parameter names, same response envelope shape. Drift → P2.
7. **Lint gate.** Confirm an ESLint config exists with `eslint-plugin-security` enabled, and that `npm run lint:check` passes with zero errors. Missing config → P1 (route to Okr-nestjs-scaffolder). Lint errors in committed code → P2, or P1+ when the failing rule is a `security/*` rule or flags a real defect (e.g. `no-floating-promises` on a write path). A scaffold or feature is not shippable while `lint:check` fails.

**Outputs.**
- Findings under Domain G of the review report, with the spanning artifacts cited per finding.

**Anti-patterns.**
- Spot-checking only one path. Inconsistencies hide in the corners.
- Accepting "this endpoint is special, it has a different shape." Special endpoints are how API contracts erode.
- Skipping logging hygiene because "it's just dev output." Dev output ships to production.

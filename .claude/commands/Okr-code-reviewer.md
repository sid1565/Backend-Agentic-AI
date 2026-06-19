---
description: Review backend artifacts (schema, auth, API, services, tests) with a severity-tagged report and explicit GO/NO-GO verdict using the Okr-code-reviewer agent.
argument-hint: <feature/module or domain to review, e.g. "review src/modules/announcements" or "security audit of auth">
---

# Code Reviewer Commands

Commands routed to the **Okr-code-reviewer** agent (stage 7). The base `/review` command walks all seven domains. Sub-commands target a single domain — useful when you want a focused audit (security only, spec-compliance only) without re-walking everything, or when verifying a specific finding has been fixed.

Skill mapping (see `skills/Okr-code-reviewer-skills.md`):
1. severity-triage
2. security-audit-walk
3. spec-compliance-audit
4. cross-layer-consistency-audit

---

## `/review <feature>`

**Purpose.** Full audit across all seven review domains. Produces a single report with severity-tagged findings and a GO/NO-GO verdict.

**Invokes.** `Okr-code-reviewer` applying all four skills.

**Input.** Path to feature directory containing all upstream artifacts.

**Output.** `output/<feature-slug>-review.md`:
- Summary (artifact list, finding counts per severity, verdict)
- Findings tables per severity (P0/P1/P2/P3)
- Clean domains list
- Routing plan for the orchestrator

**Example.**
```
/review output/notifications/
```

**Success criteria.** All seven domains walked; every finding has file/section + owner agent + suggested fix (for P0/P1); `npm run lint:check` (ESLint + `eslint-plugin-security`) confirmed passing; verdict is explicit (a failing lint gate is NO-GO).

---

## `/review:security <feature>`

**Purpose.** Run only the OWASP API Security Top 10 walk. Targeted security audit without the rest of the review. Useful for security-only sign-off or after a security-related change.

**Invokes.** `Okr-code-reviewer` applying `security-audit-walk` skill.

**Input.** Path to feature directory.

**Output.** A focused security report:
- One section per OWASP API entry (API1 through API10).
- Each entry: ✓ clean / ⚠ findings, with severity-tagged findings under it.
- Findings labeled with the OWASP ID, e.g., `[API1] tenant check missing on GET /v1/orders/:id`.
- Verdict scoped to security only: **SECURITY GO / SECURITY NO-GO**.

**Example.**
```
/review:security output/notifications/
```

**Success criteria.** All ten OWASP-API entries explicitly addressed (clean or finding). No entry skipped as "infra only."

**When to use.** Pre-launch security gate, after auth-related changes, or when a vulnerability is reported in a similar system and you want to check this one.

---

## `/review:spec-compliance <feature>`

**Purpose.** Run only the spec-compliance audit. Builds the AC × test traceability matrix and the UC × implementation matrix, flags gaps in either direction.

**Invokes.** `Okr-code-reviewer` applying `spec-compliance-audit` skill.

**Input.** Path to feature directory.

**Output.** A traceability report:
- AC → test mapping table (every AC must have ≥1 test).
- UC → endpoint × service method × tests mapping.
- Out-of-scope check: list any code that implements features the spec excluded.
- NFR coverage check: which NFRs have ACs, which ACs are tested.
- Findings tagged P0–P3 with owner agent.

**Example.**
```
/review:spec-compliance output/notifications/
```

**Success criteria.** Bidirectional walk — both spec→code and code→spec. No surplus implementation accepted as benign.

**When to use.** After a `/spec:delta` to confirm everything new got implemented and tested. Or before sign-off when you want one focused check that the build matches what was asked for.

---

## `/review:consistency <feature>`

**Purpose.** Run only the cross-layer consistency audit. Catches naming drift, type mismatches, taxonomy violations, error-envelope inconsistencies, and logging hygiene issues.

**Invokes.** `Okr-code-reviewer` applying `cross-layer-consistency-audit` skill.

**Input.** Path to feature directory.

**Output.** A consistency report covering six checks:
- Naming consistency (entity names traced through schema → DTO → service → controller → test).
- Type matching (DTO field types vs schema column types).
- Taxonomy adherence (every role/scope string in code appears in the auth taxonomy).
- Error envelope consistency (sample 5 endpoints across the error spectrum).
- Logging hygiene (no `console.log`, no logged secrets/PII).
- Pagination/filtering consistency across list endpoints.
- Lint gate (ESLint config with `eslint-plugin-security` present; `npm run lint:check` passes — missing config or failing lint is a finding).

**Example.**
```
/review:consistency output/notifications/
```

**Success criteria.** Each of the seven checks explicitly resolved. Findings cite all spanning artifacts, not just one.

**When to use.** After a refactor touching multiple layers. Or when a downstream agent extended one layer without coordinating with another.

---

## `/review:verify <feature> <finding-id>`

**Purpose.** Verify a specific finding from a prior review has been fixed. Does not re-run the full review.

**Invokes.** `Okr-code-reviewer` applying `severity-triage` skill in re-verification mode.

**Input.**
- Path to feature directory.
- Finding ID from the prior review report (e.g., `P0-1`, `P1-3`).

**Output.** A short verification result:
- ✓ FIXED — finding addressed, evidence cited (file/line where the fix lives).
- ✗ STILL OPEN — finding not addressed; original finding restated.
- ⚠ PARTIAL — fix attempted but defective; new finding emitted with its own ID.

**Example.**
```
/review:verify output/notifications/ P0-1
```

**Success criteria.** Verdict is explicit (✓/✗/⚠). When ✓, the fix is cited. When ⚠, a new finding with a new ID is recorded — the old finding is closed and the new one tracked separately.

**When to use.** During the loop-back protocol — after the orchestrator routes a P0/P1 to its owner agent, run this to confirm the fix lands before re-running anything else.

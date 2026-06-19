# Internal Test Scenarios (10)

Each scenario = verbatim request + provided answers for the clarification round + pass criteria
(scored on top of the universal stage success metrics in EVALS.md). Scenarios are tuned to this
repo: NestJS, TypeORM, Postgres, existing modules under `src/modules/` (admin, auth, mail, me,
pdf, subscriptions), shared infra under `src/common/`.

---

## S-01 — Brownfield CRUD module (happy path)

**Request:** "Build a `announcements` module: admins create/update/delete school-wide
announcements, authenticated users list and read them. Full pipeline."

**Provided answers:** brownfield; TypeORM + Postgres; existing JWT auth + role taxonomy; soft
deletes yes; no multi-tenancy beyond school scoping; full 9 stages.

**Pass criteria:**
- Module lands in `src/modules/announcements/` matching existing folder conventions.
- Write endpoints restricted to an existing admin role — no new roles invented.
- Soft-delete column + filtered reads present in schema and service.
- Every AC has a tagged test; auth-invariant matrix covers admin vs user on writes.

---

## S-02 — Auth-heavy feature (taxonomy extension)

**Request:** "Add `staff` accounts: a school admin can invite staff members by email; staff can
log in and view (not edit) school data. Include the invitation flow."

**Provided answers:** brownfield; reuse mail module for invites; invitation tokens expire in
72h, single-use; staff is a NEW role; full pipeline.

**Pass criteria:**
- Stage 4 publishes the extended taxonomy (staff role + scopes) BEFORE stage 5 assigns it.
- Invitation token lifecycle fully specified (issue → consume → expire → revoke).
- Negative tests: expired token, reused token, staff attempting an admin-only write.
- No role/scope appears in API or services that stage 4 didn't publish.

---

## S-03 — Spec-only partial pipeline

**Request:** "Just produce the spec and DB design for a `fee-payments` feature — invoices,
payment records, receipts. We'll implement later."

**Provided answers:** stages 1–3 only; Postgres; money stored as integer minor units; no
gateway integration yet.

**Pass criteria:**
- Orchestrator runs ONLY stages 1–3 and explicitly notes the skipped stages.
- Spec has zero framework/library names in the body.
- Schema justifies every index with a query pattern; money columns are integer minor units.
- No code beyond entities/migration plan is generated.

---

## S-04 — Underspecified request (clarification protocol)

**Request:** "Build notifications."

**Provided answers:** (only when asked) in-app + email; recipients are users of a school;
read/unread tracking; admins broadcast, system events auto-notify; full pipeline.

**Pass criteria:**
- Orchestrator batches clarifying questions in a SINGLE round before invoking any sub-agent.
- No sub-agent is invoked before [BLOCKING] ambiguities are resolved.
- Final spec traces every UC back to an answered question or the original request.

---

## S-05 — Loop-back recovery (seeded defect)

**Request:** "Build a `documents` module: users upload school documents (metadata only, no file
storage yet), admins approve/reject them. Full pipeline. Constraint: the API designer must
assign role `document-moderator`."

**Provided answers:** brownfield; `document-moderator` does NOT exist in the current taxonomy;
full pipeline.

**Pass criteria:**
- The invented-role conflict is DETECTED (stage 5 validation or stage 8 audit).
- Recovery follows the documented pattern: route to Okr-backend-auth-security to extend the
  taxonomy, then re-invoke Okr-api-designer — the invention never persists silently.
- Pipeline completes with GO after the loop-back, within the 2-retry cap.

---

## S-06 — Cross-module integration

**Request:** "When a subscription expires, automatically email the school admin a renewal
reminder and flag the school's account as `grace-period` for 14 days."

**Provided answers:** brownfield; touches `subscriptions`, `mail`, and school/account state;
scheduling mechanism is the implementer's choice but must be justified; full pipeline.

**Pass criteria:**
- Spec captures the time-based trigger and the 14-day state transition as testable ACs.
- Service layer puts the state transition in a transaction; no logic leaked into controllers.
- Stage 8 cross-layer audit confirms naming/folder consistency across all three touched modules.
- Tests cover: expiry triggers email + flag; grace period ends; idempotency (no double email).

---

## S-07 — Greenfield micro-service scaffold

**Request:** "Scaffold a fresh NestJS service `reporting-service` (separate from this app) with
one feature module `reports`, ready for stages 3+ later. Stages 1–2 only."

**Provided answers:** greenfield in a scratch directory; npm; stages 1–2 only.

**Pass criteria:**
- `nest build` passes on the produced skeleton.
- main.ts wires ValidationPipe, exception filter, Logger, ConfigModule.
- `.eslintrc.js` includes `plugin:security/recommended`; `npm run lint:check` passes.
- No business logic, schema, or auth rules leaked into the scaffold.

---

## S-08 — Security review of existing code (reviewer-led)

**Request:** "Run a security-focused review of the existing `auth` module against the OWASP API
Top 10 and our stage-8 standards. Findings report only — no fixes."

**Provided answers:** stage 8 only, scoped to `src/modules/auth/` + `src/common/guards/`;
severity-tagged report expected.

**Pass criteria:**
- Every finding has file ref + severity + owner agent + concrete suggested fix.
- Verdict is explicit GO/NO-GO.
- Lint gate verified (`npm run lint:check`, security plugin enabled).
- No code modifications are made.

---

## S-09 — Docs regeneration (doc-gate enforcement)

**Request:** "Regenerate OpenAPI + README coverage for the `subscriptions` module."

**Provided answers:** stage 9 only IF the module passes a delta stage-8 check first; if review
finds open P0/P1, docs must NOT be generated.

**Pass criteria:**
- Doc generator runs only after an explicit GO (or correctly refuses on NO-GO — refusal also
  passes if P0/P1 exist).
- openapi.yaml validates; every documented operation carries `x-required-role` matching the
  live taxonomy.
- Every README claim is source-traceable to code.

---

## S-10 — Mid-pipeline requirement change

**Request:** "Build a `events` module: admins create school events, users RSVP." Then, AFTER
stage 5 completes, inject: "Also: users can cancel an RSVP up to 24h before the event."

**Provided answers:** brownfield; full pipeline; the change is a minor delta.

**Pass criteria:**
- Orchestrator pauses, routes the change as a Okr-spec-writer delta (not a full restart).
- Downstream stages whose inputs changed (5–7 minimum) are re-validated.
- The 24h cancellation rule lands as an AC, an API contract change, a service-level check,
  and a tagged test — consistently across layers.

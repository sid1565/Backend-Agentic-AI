# Spec Writer Skills

Focused techniques the **Okr-spec-writer** applies at stage 1 of the canonical 8-stage flow. Cross-cutting skills (Okr-api-design, error-handling, etc.) live in `Skills.md`; this file holds the skills unique to translating fuzzy requests into structured specs.

---

## 1. requirements-elicitation

**Purpose.** Pull the entities, actors, and use cases out of a vague user request without inventing requirements.

**When applied.** First substantive step inside `/spec` or `/ship`. Before any drafting.

**Inputs.**
- Raw user request (text).
- Optional: prior spec memory for the same domain.

**Process.**
1. **Highlight nouns.** Underline every domain noun in the request. These are entity candidates.
2. **Highlight verbs.** Every verb tied to an actor is a use-case candidate.
3. **Identify actors explicitly.** Who initiates each verb? If unclear, ask. Default actors (system-admin, scheduled-job) are inferred only when the domain demands it — flag the inference.
4. **Filter to in-scope.** Cross out nouns/verbs that belong to adjacent systems (e.g., billing in a notifications request).
5. **Group entities.** Merge synonyms (`user` and `account` may be the same entity). Confirm before merging if it changes meaning.
6. **Order use cases by actor + lifecycle.** Group by actor, order by create → read → update → delete → close.

**Outputs.**
- Actor table (Section 2 of the spec).
- Entity table with conceptual attributes only — **no types, no column names** (Section 3).
- Use-case skeletons (Section 4) ready for flow detail.

**Anti-patterns.**
- Inferring unstated entities ("they probably want notifications too"). Add to Open Questions instead.
- Merging entities just because their names are similar.
- Capturing implementation hints ("we'll need a join table") in entity attributes.

**Example.**
> Request: "Build a notifications module with read receipts."
>
> Nouns: notification, receipt, user (implicit). Verbs: create, read, mark-as-read.
> Actors: notification-recipient (explicit), system (implicit — emits notifications).
> Open Questions: Who creates notifications — admins, the system, both? Are read receipts visible to the sender?

---

## 2. use-case-decomposition

**Purpose.** Turn a verb-actor pair into a numbered, structured use case with main, alternate, and error flows.

**When applied.** After `requirements-elicitation` produces the use-case skeletons.

**Inputs.**
- Use-case skeleton (actor + trigger + intent).
- Domain entity table (for preconditions and postconditions).

**Process.**
1. **State the trigger.** Event-driven (a request arrives, a timer fires) or state-driven (a condition becomes true).
2. **Write preconditions.** What must be true before the actor can do this? Authentication, ownership, and entity-existence are the common three.
3. **Numbered main flow.** Actor action → system response, alternating. Five to ten steps for most cases; if longer, split the use case.
4. **Alternate flows.** Branches that succeed under different conditions (admin vs owner reading a notification).
5. **Error flows.** Branches that fail (entity not found, permission denied, conflict, validation failure). One per distinct error class.
6. **Postconditions.** What's true after a successful run? The state change is the postcondition; side effects (email sent, audit log written) are also postconditions.

**Outputs.**
- A complete UC-N section per use case in the spec.

**Anti-patterns.**
- Mixing main flow and error flow in the same numbered list.
- Postconditions that restate the trigger.
- Use cases longer than 10 steps — the case is doing two things; split.

**Example.**
```
UC-2: Recipient marks notification as read
- Actor: notification-recipient
- Trigger: client sends a mark-as-read request
- Preconditions:
  - Recipient is authenticated
  - Notification exists
  - Notification belongs to recipient
- Main flow:
  1. Client sends mark-as-read for notification N
  2. System verifies ownership
  3. System updates read_at timestamp
  4. System returns updated notification
- Alternate flow:
  - 2a. Notification already read → idempotent return, no state change
- Error flows:
  - 2b. Recipient is not the owner → permission denied
  - 1a. Notification does not exist → not found
- Postconditions:
  - read_at is set on the notification
  - An audit-log entry records the action
```

---

## 3. acceptance-criteria-authoring

**Purpose.** Convert each use case into observable, testable conditions the Okr-test-engineer can turn into tests.

**When applied.** Right after `use-case-decomposition` produces a complete UC. One AC pass per UC before moving to the next.

**Inputs.**
- Completed use case (main, alternate, error flows).
- NFR section (for non-functional ACs like latency budgets).

**Process.**
1. **One AC per flow.** Main flow gets at least one AC. Each alternate and error flow gets its own AC.
2. **Use Given/When/Then.** Format: `AC-<UC#>.<n>: Given <precondition state>, when <action>, then <observable outcome>.` The outcome must be something a test can assert — a status code, a returned field, a state change, a log entry.
3. **Cover the auth boundaries.** For protected use cases, write ACs for: owner success, non-owner failure, admin override (if applicable), unauthenticated failure. Auth-invariant testing depends on these existing in the spec.
4. **Capture NFR ACs.** If the NFR section says "p95 < 200ms for read paths," write `AC-NFR-1: Given normal load, when GET /notifications is called, then p95 latency is below 200ms.`
5. **Include the standing code-quality gate AC.** Every spec carries a baseline quality NFR/AC: `AC-NFR-LINT: Given the delivered code, when CI runs, then ESLint (with eslint-plugin-security) passes via npm run lint:check with zero errors.` This gives the Okr-test-engineer and Okr-code-reviewer a spec-traceable hook for the lint gate the downstream code-emitting stages enforce.
6. **Number sequentially within the UC.** AC-2.1, AC-2.2, AC-2.3 — never skip or reuse numbers across versions.

**Outputs.**
- Section 6 of the spec, fully populated.
- A 1:1 or 1:many map from use cases to ACs (every UC has ≥ 1 AC; some flows have several).

**Anti-patterns.**
- Vague ACs ("the system should be reliable"). Replace with measurable threshold or remove.
- ACs that test implementation, not behavior ("then the service calls `notificationRepo.update`"). The downstream agents own implementation.
- Missing the negative auth cases. If only happy-path ACs exist, the Okr-test-engineer cannot write the auth-invariant suite.

**Example.**
```
For UC-2:
AC-2.1: Given an authenticated recipient and a notification they own, when they mark it as read, then read_at is set and the response status is 200.
AC-2.2: Given an authenticated user who is not the owner, when they try to mark a notification as read, then the response status is 403 and read_at is unchanged.
AC-2.3: Given an unauthenticated request, when mark-as-read is called, then the response status is 401.
AC-2.4: Given a notification that is already read, when mark-as-read is called by the owner, then the response status is 200 and read_at is unchanged.
```

---

## 4. spec-traceability

**Purpose.** Number every artifact in the spec so every downstream agent can reference it precisely. This is what enables the Okr-test-engineer to tag tests, the Okr-code-reviewer to audit AC coverage, and the Okr-doc-generator to cross-link the README to the spec.

**When applied.** Continuously while drafting; verified in the self-check before delivery.

**Inputs.**
- Draft spec sections.

**Process.**
1. **Pick prefixes per artifact type.**
   - `ENT-X` for entities
   - `UC-N` for use cases
   - `AC-N.M` for acceptance criteria (M scoped to UC N)
   - `NFR-N` for NFR clauses
   - `OQ-N` for open questions
2. **Number sequentially, never reuse.** When an item is removed during revision, its number is retired, not reassigned to a new item.
3. **Reference, don't restate.** When use case 3 depends on use case 1's preconditions, write "see UC-1 preconditions" rather than copying.
4. **Verify link integrity.** Before delivering, search the doc for every reference and confirm the target exists.
5. **Include a Handoff Notes section** that calls out which IDs each downstream agent will need (entities for the DB architect, NFRs for auth-security, use cases for the API designer, ACs for the Okr-test-engineer).

**Outputs.**
- A spec where every claim that downstream agents will need to cite has a stable, unique ID.

**Anti-patterns.**
- Renumbering when an item is deleted. Breaks every downstream reference.
- Inline restating instead of referencing — when the linked item changes, the restatement goes stale.
- Missing IDs on NFRs (the most-forgotten section). Test-engineer needs them for performance-test traceability.

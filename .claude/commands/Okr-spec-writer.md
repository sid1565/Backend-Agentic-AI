---
description: Produce a structured spec (entities, use cases, NFRs, acceptance criteria) using the Okr-spec-writer agent.
argument-hint: <feature description>
---

# Spec Writer Commands

Commands routed to the **Okr-spec-writer** agent (stage 1). The base `/spec` command runs the full agent end-to-end. Sub-commands target a single skill for focused work — useful when you have a partial spec, want to fill a gap, or need to validate without regenerating.

Skill mapping (see `skills/Okr-spec-writer-skills.md`):
1. requirements-elicitation
2. use-case-decomposition
3. acceptance-criteria-authoring
4. spec-traceability

---

## `/spec`

**Purpose.** Run the full Okr-spec-writer pipeline: elicitation → decomposition → AC authoring → traceability check.

**Invokes.** `Okr-spec-writer` applying all four skills.

**Input.** Free-text feature description.

**Output.** `output/<feature-slug>-spec.md` — sections 1 through 10 fully populated.

**Example.**
```
/spec Add team invitations to the workspaces module — invitee gets an email link valid for 72h.
```

**Success criteria.** Every UC has ≥1 AC; zero unresolved [BLOCKING] open questions; all sections numbered.

---

## `/spec:elicit`

**Purpose.** Stop after requirements elicitation — produce the actor table, entity table, and use-case skeletons only. Useful early in a discovery conversation when you want to sanity-check scope before investing in full ACs.

**Invokes.** `Okr-spec-writer` applying only the `requirements-elicitation` skill.

**Input.** Free-text feature description.

**Output.** A short scoping document with:
- Actor table (Section 2)
- Entity table (Section 3, attributes only — no types)
- Use-case skeletons (titles + actor + trigger only — no flows yet)
- Open questions list

**Example.**
```
/spec:elicit We want a referral program — users invite friends, both get credit.
```

**Success criteria.** All actors named; every domain noun classified as in-scope entity, out-of-scope, or open question.

**When to use.** First round on a fuzzy ask. Lets you confirm scope before spending tokens on full flows.

---

## `/spec:delta <feature>`

**Purpose.** Add new use cases or entities to an existing spec without regenerating the whole document. Preserves existing IDs (UC-N, AC-N.M, ENT-X) so downstream artifacts don't break their references.

**Invokes.** `Okr-spec-writer` applying `use-case-decomposition` + `spec-traceability` skills.

**Input.**
- Path to existing spec.
- Description of what to add (new actor, new use case, new entity).

**Output.** Updated `output/<feature-slug>-spec.md`:
- New UCs numbered after the highest existing ID (no renumbering).
- New ACs scoped to the new UCs.
- A "Delta Notes" section at the end of the spec recording what changed and which downstream stages need re-runs.

**Example.**
```
/spec:delta output/notifications-spec.md Add UC: admin can broadcast a notification to all users in an organization.
```

**Success criteria.** No existing IDs renumbered. Delta Notes section lists exactly which downstream artifacts (schema, API, services, tests, docs) need updates.

**When to use.** A feature is mid-build and a new requirement lands. Avoids triggering a full pipeline re-run from stage 1.

---

## `/spec:ac <feature>`

**Purpose.** Fill in or expand the acceptance-criteria section of a spec where coverage is thin or missing. Targets the most common spec defect — UCs without ACs.

**Invokes.** `Okr-spec-writer` applying `acceptance-criteria-authoring` skill.

**Input.**
- Path to existing spec with weak or missing Section 6 (Acceptance Criteria).

**Output.** Updated spec with:
- ≥1 AC per UC (main flow).
- Separate ACs per alternate flow and per error flow.
- Auth-boundary ACs for protected use cases (owner success, non-owner failure, admin override, unauthenticated failure).
- NFR-derived ACs where the NFR section names a measurable threshold.
- The standing `AC-NFR-LINT` quality-gate AC (delivered code passes ESLint with `eslint-plugin-security` via `npm run lint:check`).

**Example.**
```
/spec:ac output/notifications-spec.md
```

**Success criteria.** Every UC has at least the auth-boundary set. Every NFR with a measurable threshold has an AC. No "the system should be reliable"-style vague ACs.

**When to use.** Before kicking off the Okr-test-engineer. Test-engineer needs ACs to write tests; if ACs are thin, this command fixes that without rewriting the rest of the spec.

---

## `/spec:validate <feature>`

**Purpose.** Audit an existing spec against the stage-1 success metric without modifying it. Read-only.

**Invokes.** `Okr-spec-writer` running its self-check process.

**Input.**
- Path to existing spec.

**Output.** A short validation report:
- ✓ / ✗ for each success-metric bullet (every UC has ≥1 AC; zero [BLOCKING] open questions; all sections present and numbered).
- List of broken ID references (e.g., a Handoff Note cites UC-7 but only UC-1..6 exist).
- List of vague ACs that fail the "observable" test.
- Recommended next command (`/spec:ac` to fix AC gaps, `/spec:delta` to add missing UCs, etc.).

**Example.**
```
/spec:validate output/notifications-spec.md
```

**Success criteria.** Report is exhaustive — no defect class is silently passed over. Recommends a next action when defects are found.

**When to use.** Before invoking downstream stages, especially after a hand-edited spec. Cheap insurance against propagating spec defects through the pipeline.

---
description: Produce the test pyramid (unit, integration, e2e, and the auth-invariant matrix) using the Okr-test-engineer agent.
argument-hint: <feature/module or test layer, e.g. "tests for announcements" or "add auth matrix to schools e2e">
---

# Test Engineer Commands

Commands routed to the **Okr-test-engineer** agent (stage 6). The base `/test` command produces the full pyramid. Sub-commands run a single layer or a focused slice — useful when you've already shipped one layer, when you want to add the auth matrix to existing tests, or when you're hunting coverage gaps.

Skill mapping (see `skills/Okr-test-engineer-skills.md`):
1. test-pyramid-strategy
2. nestjs-unit-testing
3. integration-testing-with-db
4. e2e-testing-with-supertest
5. auth-invariant-testing

---

## `/test <feature>`

**Purpose.** Run the full Okr-test-engineer: pyramid plan + unit + integration + e2e + auth-invariant matrix.

**Invokes.** `Okr-test-engineer` applying all five skills.

**Input.** Path to feature directory containing spec, schema, auth foundation, API contracts, and service code.

**Output.**
- Test plan table (AC → file → layer → auth cases)
- `*.spec.ts` files (unit), `*.integration-spec.ts`, `*.e2e-spec.ts`
- `test/factories/` module
- `jest.config.js` with thresholds (lines ≥ 85, branches ≥ 80)

**Example.**
```
/test output/notifications/
```

**Success criteria.** Every AC tagged in ≥1 test; every protected endpoint has the full auth-invariant matrix; coverage thresholds configured; no `.only`/`.skip`; all test files pass `npm run lint:check` (ESLint + `eslint-plugin-security` + prettier) with zero errors.

---

## `/test:plan <feature>`

**Purpose.** Produce only the test plan table — no test code. Useful for review and approval before committing to implementation.

**Invokes.** `Okr-test-engineer` applying `test-pyramid-strategy` skill.

**Input.** Path to feature directory.

**Output.** A markdown table:

| AC ID | Description | Test File | Layer | Auth Cases |
|---|---|---|---|---|

Plus a one-line rationale per layer assignment when the choice isn't obvious.

**Example.**
```
/test:plan output/notifications/
```

**Success criteria.** Every spec AC appears in the table exactly once; layer counts approximate the 70/20/10 pyramid; auth-invariant rows present for every protected endpoint.

**When to use.** Before a long test-writing session, to confirm the strategy is right and avoid backtracking.

---

## `/test:unit <feature>`

**Purpose.** Generate only the unit test layer. Mocks every dependency; tests pure logic and exception throwing in services.

**Invokes.** `Okr-test-engineer` applying `nestjs-unit-testing` skill.

**Input.** Path to feature directory.

**Output.** `*.spec.ts` files co-located with each service. Each test:
- Tagged with AC ID where applicable.
- Uses `Test.createTestingModule` with mocked dependencies.
- One concept per `it`.
- Verifies both return values and mock call shapes.

**Example.**
```
/test:unit output/notifications/
```

**Success criteria.** All ACs assigned to the unit layer in the plan are covered. Each test runs in <50ms. No real I/O.

**When to use.** When you've already written integration/e2e for a feature and just need the unit layer to fill out the pyramid.

---

## `/test:integration <feature>`

**Purpose.** Generate only the integration test layer. Real database, no HTTP, transactional rollback per test.

**Invokes.** `Okr-test-engineer` applying `integration-testing-with-db` skill.

**Input.** Path to feature directory plus the test DB connection string (or `DATABASE_TEST_URL` env var).

**Output.** `*.integration-spec.ts` files (or under `test/integration/`). Each test:
- Uses real Nest test module with real repository.
- Wraps in `BEGIN`/`ROLLBACK` for isolation.
- Uses factories from `test/factories/`.
- Verifies query correctness, constraint violations, transaction behavior.

**Example.**
```
/test:integration output/notifications/
```

**Success criteria.** Every AC assigned to the integration layer covered. Tests pass when run in any order. No shared seed data across tests.

**When to use.** When unit tests exist but you need to prove DB-level behavior (constraints, query plans, transaction rollback).

---

## `/test:e2e <feature>`

**Purpose.** Generate only the end-to-end test layer. Booted Nest app, real HTTP via supertest, real auth tokens.

**Invokes.** `Okr-test-engineer` applying `e2e-testing-with-supertest` skill.

**Input.** Path to feature directory.

**Output.** `*.e2e-spec.ts` files (or under `test/e2e/`). Each test:
- Boots the full app once per suite.
- Issues real test tokens via the token helper — no auth mocking.
- Asserts on status code AND response envelope shape.
- Tests request validation (malformed bodies → 400 with envelope).

**Example.**
```
/test:e2e output/notifications/
```

**Success criteria.** Every endpoint has at least a happy-path e2e test. Error envelopes asserted on every failure path. No `.skip` for "we'll add auth tests later."

**When to use.** Last layer of the pyramid. Run after unit and integration are passing.

---

## `/test:auth-matrix <feature>`

**Purpose.** Generate only the auth-invariant matrix for every protected endpoint. This is the project's headline test pattern — positive and negative cases per role/scope from the auth taxonomy.

**Invokes.** `Okr-test-engineer` applying `auth-invariant-testing` skill.

**Input.** Path to feature directory (specifically the API contract for endpoint × role assignments and the auth taxonomy).

**Output.** A `<endpoint>.auth-spec.ts` file per protected endpoint, OR a `describe('<endpoint> — auth invariants')` block appended to the existing e2e spec. Each describe covers:
- Unauthenticated → 401
- Owner / authorized → 200
- Non-owner / non-authorized → 403
- Admin (when override applies) → 200
- Wrong scope → 403
- Cross-tenant → 403 (never 404)

**Example.**
```
/test:auth-matrix output/notifications/
```

**Success criteria.** Every endpoint marked `authenticated`/`role:*`/`scope:*`/`owner-only`/`tenant:*` has a matching auth-invariant describe block. Every cell of the matrix has an `it`.

**When to use.** When the Okr-code-reviewer flags missing auth coverage as a P1, or when adding a new role to the taxonomy and you need to extend coverage retroactively.

---

## `/test:coverage-gap <feature>`

**Purpose.** Audit existing tests and report which ACs are uncovered, which protected endpoints lack the auth matrix, and where coverage thresholds are unmet. Read-only — does not write tests.

**Invokes.** `Okr-test-engineer` running its self-check process.

**Input.** Path to feature directory.

**Output.** A gap report:
- Table: AC ID → covered? → which test file (or "uncovered")
- Table: Protected endpoint → has auth matrix? → which cells missing
- Coverage numbers per file vs threshold
- Recommended next command (`/test:auth-matrix` for missing matrices, `/test:unit` for uncovered logic ACs, etc.)

**Example.**
```
/test:coverage-gap output/notifications/
```

**Success criteria.** Report is exhaustive. Recommends a specific next command per gap type.

**When to use.** Before declaring a feature ready for review. Catches the "looks done but isn't" state where the test count is high but the auth matrix has holes.

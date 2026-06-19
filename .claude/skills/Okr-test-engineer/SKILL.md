---
name: Okr-test-engineer
description: Use this skill to design and write tests for a NestJS backend — unit tests (Jest), integration tests (against a test DB), and e2e tests (supertest against the booted app) — with explicit auth-invariant matrices (positive + negative per role) and full acceptance-criteria coverage. Trigger whenever the user asks to write tests, add coverage, build a test suite, or test endpoints/services. Runs as STAGE 7 of the canonical backend orchestration flow, after Okr-service-layer and before Okr-code-reviewer.
---

# Test Engineer Skills

Focused techniques the **Okr-test-engineer** applies at stage 6 of the canonical 8-stage flow. Cross-cutting `testing` skill in `Skills.md` covers the pyramid concept; this file holds the concrete techniques per test layer plus the project-defining auth-invariant pattern.

---

## 1. test-pyramid-strategy

**Purpose.** Decide which test layer covers each acceptance criterion, optimizing for fast feedback and real coverage.

**When applied.** First step after reading the spec — before writing any test code.

**Inputs.**
- Spec ACs.
- Service file inventory.
- API contract (endpoint list with role assignments).

**Process.**
1. **Default each AC to the cheapest layer that can prove it.**
   - Pure logic → unit.
   - DB queries, transactions, constraint violations → integration.
   - HTTP boundary, guards, request validation, error envelope → e2e.
2. **Auth-invariant ACs go to e2e.** A unit test cannot prove a guard runs; only e2e can.
3. **NFR ACs go to dedicated perf tests.** Latency budgets are not unit-test material.
4. **Aim for the 70/20/10 ratio.** Counts of unit/integration/e2e roughly proportional. If e2e creeps over 20%, look for tests that should drop to integration.
5. **Map every AC explicitly.** No AC unmapped, no test without an AC tag.

**Outputs.**
- A test plan table: `| AC ID | Description | File | Layer | Auth Cases |`.

**Anti-patterns.**
- E2E for pure logic ("test the discount calculation through the API"). Move to unit.
- Unit test for a DB-constraint violation. The mock makes the test lie. Move to integration.
- Untagged tests. "What does this cover?" is unanswerable a month later.

**Example.**
| AC ID | Layer | Why |
|---|---|---|
| AC-1.1 (compute discount) | unit | Pure function, mock the repo |
| AC-2.2 (non-owner gets 403) | e2e | Need real guard chain |
| AC-3.1 (mark-as-read updates read_at) | integration | Real DB write, no HTTP needed |
| AC-NFR-1 (p95 < 200ms) | perf | Separate suite, not in jest |

---

## 2. nestjs-unit-testing

**Purpose.** Write fast, isolated unit tests for services and pure logic with mocked dependencies.

**When applied.** First test layer written for any new service. Target ~70% of total tests.

**Inputs.**
- Service file.
- Repository interface (to mock).
- Spec ACs assigned to the unit layer.

**Process.**
1. **Use `Test.createTestingModule`.** Register the service under test plus mocks for every injected dependency. Do not import real repositories.
2. **Mock at the dependency boundary.** Use `jest.fn()` returning predictable values. Avoid mocking transitive internals.
3. **One concept per `it`.** If you need "and" in the test name, it's two tests. Name format: `it('AC-X.Y: <observable behavior>')`.
4. **Arrange–Act–Assert blocks.** Visual separation with blank lines. Arrange sets up mocks and inputs; Act calls the method; Assert checks return value, exceptions, and mock call shapes.
5. **Test the negative path.** Every method that throws gets a test for the throw — both that it throws and that it throws the right NestJS exception class.
6. **Verify the call shape.** When a service calls a repo method, assert the exact arguments. This catches bugs where you pass `userId` instead of `user.id`.

**Outputs.**
- A `.spec.ts` file co-located with the service, fast (<50ms per test), no I/O.

**Anti-patterns.**
- Importing the real repo and connecting to a real DB in a unit test. That's an integration test.
- Snapshot tests for service return values. Brittle, hide the assertion intent.
- Testing private methods directly. Test through the public surface.
- Floating promises (missing `await`). Async assertions silently pass.

**Example.**
```typescript
describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: jest.Mocked<NotificationsRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsRepository, useValue: { findById: jest.fn(), update: jest.fn() } },
      ],
    }).compile();
    service = module.get(NotificationsService);
    repo = module.get(NotificationsRepository);
  });

  describe('markAsRead', () => {
    it('AC-2.1: sets read_at and returns the updated notification when owner marks own', async () => {
      const notif = { id: 'n1', userId: 'u1', readAt: null };
      repo.findById.mockResolvedValue(notif);
      repo.update.mockResolvedValue({ ...notif, readAt: new Date() });

      const result = await service.markAsRead('n1', { id: 'u1' } as any);

      expect(result.readAt).not.toBeNull();
      expect(repo.update).toHaveBeenCalledWith('n1', expect.objectContaining({ readAt: expect.any(Date) }));
    });

    it('AC-2.2: throws ForbiddenException when non-owner attempts mark-as-read', async () => {
      repo.findById.mockResolvedValue({ id: 'n1', userId: 'u1', readAt: null });
      await expect(service.markAsRead('n1', { id: 'u2' } as any)).rejects.toThrow(ForbiddenException);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
```

---

## 3. integration-testing-with-db

**Purpose.** Verify service + repository against a real database, catching query bugs, transaction boundaries, and DB-constraint violations.

**When applied.** Second test layer. Target ~20% of total tests.

**Inputs.**
- Service file and its repository.
- Schema migrations.
- Spec ACs assigned to the integration layer.

**Process.**
1. **Choose isolation strategy.**
   - **Transaction rollback** (preferred for Postgres): each test runs inside a transaction that rolls back in `afterEach`. Fast, fully isolated.
   - **Truncation**: `TRUNCATE` all tables in `afterEach`. Slower but works for cross-tenant scenarios.
   - **Schema-per-test**: heaviest, only when migrations themselves are under test.
2. **Boot a real Nest test module** with the real repository and DB connection. No HTTP layer.
3. **Use factories for data.** A `notificationFactory({ userId, readAt: null })` keeps tests readable. Define factories under `test/factories/`.
4. **Test the things only a real DB can prove.** Constraint violations (unique, FK), transaction rollback on partial failure, query correctness against indexes, soft-delete filter behavior.
5. **Reset auto-increment / sequence state** if you assert on IDs. Better: don't assert on auto-generated IDs; assert on returned objects.
6. **Run on a real Postgres** in CI (Docker service container). `pg-mem` is acceptable locally for speed but its constraint enforcement is incomplete.

**Outputs.**
- `.integration-spec.ts` files (or in a dedicated `test/integration/` directory) using a real DB, isolated per test.

**Anti-patterns.**
- Assuming test order. Tests must pass when run individually and in any order.
- Sharing seed data across tests. Each test seeds its own. (Exception: a small read-only reference table, seeded once in `beforeAll`.)
- Skipping rollback because "it's just a test DB." Tests pollute state and become order-dependent.
- Testing the same thing as a unit test, just slower. If a mock would prove it, use the unit layer.

**Example.**
```typescript
describe('NotificationsService — integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(() => app.close());

  beforeEach(() => dataSource.query('BEGIN'));
  afterEach(() => dataSource.query('ROLLBACK'));

  it('AC-3.1: persists read_at when mark-as-read succeeds', async () => {
    const user = await userFactory();
    const notif = await notificationFactory({ userId: user.id });
    const service = app.get(NotificationsService);

    await service.markAsRead(notif.id, user);

    const reread = await dataSource.getRepository(Notification).findOneBy({ id: notif.id });
    expect(reread.readAt).not.toBeNull();
  });
});
```

---

## 4. e2e-testing-with-supertest

**Purpose.** Drive the full HTTP path through a booted Nest app to verify guards, validation pipes, the error envelope, and per-endpoint role enforcement.

**When applied.** Third test layer. Target ~10% of total tests, focused on auth boundaries and error-envelope contracts.

**Inputs.**
- API contract (endpoint list with role assignments).
- Auth taxonomy (roles, scopes, ownership rules).
- A test-token issuance helper that produces JWTs for any (user, role) pair.

**Process.**
1. **Boot the full Nest app once per suite.** `await app.init()` in `beforeAll`, `await app.close()` in `afterAll`. Don't boot per test — too slow.
2. **Use supertest against the running app.** `request(app.getHttpServer()).get('/v1/notifications/n1').set('Authorization', `Bearer ${token}`)`.
3. **Issue real tokens via the test helper.** Never mock the auth context or stub the guard. The whole point of e2e is to exercise the real chain.
4. **Test the response shape, not just status.** Assert on the error envelope structure for failure cases — wrong shape is a real bug.
5. **Cover auth-invariant cases per protected endpoint** (see skill 5 below — this is so important it gets its own card).
6. **Test request validation.** Send a malformed body and assert 400 + the validation envelope.
7. **Reset DB between tests** with the same isolation strategy as integration tests.

**Outputs.**
- `.e2e-spec.ts` files (or under `test/e2e/`), driven via supertest, exercising the real guard → service → repo chain.

**Anti-patterns.**
- Mocking the auth guard to "test the controller." That's not e2e; that's a controller unit test, and a fragile one.
- Asserting only on `expect(response.status).toBe(403)` without checking the envelope. The status can be right while the body leaks a stack trace.
- Hard-coding tokens. Tokens expire; the test helper must mint fresh ones per test.

**Example.**
```typescript
describe('GET /v1/notifications/:id (e2e)', () => {
  let app: INestApplication;
  let tokens: TokenHelper;

  beforeAll(async () => { /* boot app, init token helper */ });
  afterAll(() => app.close());

  it('AC-2.1: 200 when owner reads own notification', async () => {
    const owner = await userFactory();
    const notif = await notificationFactory({ userId: owner.id });
    const token = await tokens.issueFor(owner);

    const res = await request(app.getHttpServer())
      .get(`/v1/notifications/${notif.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(notif.id);
  });
});
```

---

## 5. auth-invariant-testing

**Purpose.** Prove that every protected endpoint enforces its assigned role/scope from the auth taxonomy. This is the project's non-negotiable test pattern.

**When applied.** Mandatory for every protected endpoint. Run as e2e tests.

**Inputs.**
- API contract endpoint table with role assignments.
- Auth taxonomy (roles, scopes, ownership rules).
- A user-factory and token helper that can produce arbitrary (user, role, ownership) combinations.

**Process.**
1. **For each protected endpoint, generate the matrix:** rows = relevant roles + ownership states; columns = expected outcome. Minimum:
   - Unauthenticated → 401
   - Owner / authorized → 200 (or 201/204 as appropriate)
   - Non-owner / non-authorized → 403
   - Admin (if admin override applies) → 200
   - Wrong scope token (if scoped) → 403
2. **Write one `it` per matrix cell.** Tag with the AC ID covering it.
3. **Verify the negative paths actually call the guard, not the service.** A 403 thrown by the service from inside a method is good; a 403 thrown by the guard before the service runs is also good. Both must exist (defense in depth).
4. **Test the cross-tenant case** when the auth taxonomy includes `tenant:same-org` or similar. A user from org A asking for org B's resource gets 403, never 404 — leaking existence is itself a vulnerability.
5. **Bundle the matrix into a describe block** named `<endpoint> — auth invariants` so the reviewer can spot it at a glance.

**Outputs.**
- A complete auth-invariant `describe` block per protected endpoint.

**Anti-patterns.**
- Skipping the unauthenticated case "because the guard handles it." That's exactly what we're proving works.
- Returning 404 for cross-tenant access. Confirms or denies the resource exists. Use 403.
- One single negative test instead of the full matrix. The matrix is the contract.

**Example.**
```typescript
describe('GET /v1/notifications/:id — auth invariants', () => {
  it('AC-INV-1: returns 401 with no token', async () => { /* ... */ });
  it('AC-INV-2: returns 200 when owner reads own', async () => { /* ... */ });
  it('AC-INV-3: returns 403 when non-owner reads someone else\'s', async () => { /* ... */ });
  it('AC-INV-4: returns 200 when admin reads any', async () => { /* ... */ });
  it('AC-INV-5: returns 403 when token has wrong scope', async () => { /* ... */ });
  it('AC-INV-6: returns 403 (not 404) on cross-tenant access', async () => { /* ... */ });
});
```

---

## 6. lint-clean-tests

**Purpose.** Ensure every test file you write passes the project's ESLint + Prettier config — the lint globs include `test/` and `*.spec.ts`, so failing tests block the same lint gate the source code does.

**When applied.** Before handing off any test suite. The scaffolder owns `.eslintrc.js` (including `eslint-plugin-security`); you conform to it.

**Process.**
1. **Run `npm run lint:check`** after writing tests and resolve every violation. A green test run with a red lint gate is not done.
2. **No floating promises.** Every `async` assertion is `await`ed (`await expect(...).rejects...`). `@typescript-eslint/no-floating-promises` catches the silent-pass bug from skill 2's anti-patterns.
3. **No stray `console.log`** in tests — use the test reporter. `no-console` is an error.
4. **Type test doubles deliberately.** `jest.Mocked<T>` over `as any` where practical; if `as any` is genuinely needed for a fixture, keep it local and minimal (the reviewer will flag broad `any`).
5. **Prettier-format and order imports** — the same `prettier/prettier` and import rules apply to specs.
6. **No `.only` / `.skip`** left in — these also fail the reviewer's stage-7 checks.
7. **If the project has no ESLint config,** route to Okr-nestjs-scaffolder to add one before delivering.

**Outputs.**
- Test files that pass `npm run lint:check` with zero errors alongside the source.

**Anti-patterns.**
- "Tests don't need to be lint-clean." They ship in the same repo and break CI's lint step.
- Blanket-disabling rules with `/* eslint-disable */` at file top to silence the gate. Disable a specific rule on a specific line with a reason, or fix the cause.

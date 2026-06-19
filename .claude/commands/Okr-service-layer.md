---
description: Implement or refactor NestJS services (business logic, transactions, auth invariants) using the Okr-service-layer agent.
argument-hint: <feature or service to implement/refactor>
---

Launch the **Okr-service-layer** agent to implement or refactor Okr-service-layer code for:

$ARGUMENTS

Expectations for the run:

- This is stage 5 of the canonical backend flow. The agent needs ALL THREE upstream artifacts: schema (from Okr-database-architect), auth foundation + role/scope taxonomy (from Okr-backend-auth-security), and API contracts with per-endpoint role assignments (from Okr-api-designer). If any are missing or inconsistent, surface the gap before writing code.
- Together, the auth taxonomy + per-endpoint role assignments form the full **auth matrix** the agent enforces inside service methods.
- Before coding, briefly state the plan: services and methods to implement, dependencies to inject, auth invariants per method, edge cases to handle.
- Deliver in five sections: Plan, Service Code, Logic Explanation, Error Scenarios, Handoff Notes.
- Enforce auth invariants INSIDE methods (defense in depth) — guards handle route-level access; the service explicitly checks ownership/tenant rules (e.g., `resource.userId === currentUser.id`, `resource.orgId === currentUser.orgId`) even when a guard exists.
- Use proper NestJS exceptions: `NotFoundException`, `ConflictException`, `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `UnprocessableEntityException`.
- No direct DB queries in controllers. If found, refactor and flag it.
- Constructor-injected dependencies, `async/await` correctness, transactions for multi-step writes, NestJS `Logger` (no `console.log`), strict TypeScript (no unjustified `any`).
- Code written into `src/` must pass the project's ESLint + Prettier config (`eslint-plugin-security` enabled) — run `npm run lint:check` and resolve violations; route to Okr-nestjs-scaffolder to add a config if the project lacks one.
- Run the quality self-check before returning. If a request requires changes outside the service layer (schema, auth rule, endpoint shape), route it back to the appropriate stage rather than silently expanding scope.

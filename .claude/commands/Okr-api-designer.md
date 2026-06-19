---
description: Design REST/GraphQL API contracts (endpoints, DTOs, per-endpoint role assignments) using the Okr-api-designer agent.
argument-hint: <feature or API surface>
---

Launch the **Okr-api-designer** agent to design API contracts for:

$ARGUMENTS

Expectations for the run:

- This is stage 4 of the canonical backend flow. The agent needs BOTH the schema (from Okr-database-architect) AND the auth foundation + role/scope taxonomy (from Okr-backend-auth-security). If either is missing, request it before designing.
- The agent ASSIGNS roles/scopes per endpoint from the published taxonomy — it never invents new roles, scopes, or ownership rules. If a gap is found, route back to Okr-backend-auth-security to extend the taxonomy.
- Deliver the six required sections in order: Overview, Endpoint List, DTOs/Schemas, Sample Request/Response, Error Response Format, Handoff Notes for Service-Layer Engineer.
- The Endpoint List must include the auth requirement column with values drawn from the taxonomy: `public` / `authenticated` / `role:<from-taxonomy>` / `scope:<from-taxonomy>` / `owner-only` / `tenant:<from-taxonomy>`.
- Every DTO needs explicit class-validator decorators (no field without type, required/optional status, and validation constraints).
- DTO field types must match the schema column types from the Okr-database-architect output.
- Specify error responses for each endpoint, including 401/403 for protected routes.
- Any DTOs/controllers written into `src/` must pass the project's ESLint + Prettier config (`eslint-plugin-security` enabled) — run `npm run lint:check` and resolve violations; route to Okr-nestjs-scaffolder to add a config if the project lacks one.
- Save the design to `output/<slug>-Okr-api-design.md`.

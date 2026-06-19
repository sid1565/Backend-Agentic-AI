---
description: Design or review a database schema (tables, relationships, indexes, migrations) using the Okr-database-architect agent.
argument-hint: <feature or schema topic>
---

Launch the **Okr-database-architect** agent to design or review a schema for:

$ARGUMENTS

Expectations for the run:

- This is stage 2 of the canonical backend flow — its output feeds Okr-backend-auth-security, Okr-api-designer, and Okr-service-layer downstream.
- Before designing, batch all clarifying questions into a single round (engine, expected scale, read/write mix, multi-tenancy model, consistency needs, existing constraints).
- Show the entity plan and key design decisions before producing the full schema.
- If auth is in scope for the broader feature, proactively include `users`, `roles`, `sessions`/`refresh_tokens`, and `audit_log` tables.
- Save the design to `output/<slug>-Okr-db-design.md` using the agent's standard structure (Summary, ER Diagram, Table Definitions, Relationships, Index Strategy, Scaling Notes, Migration Strategy, Handoff Notes).
- Run the quality checklist before returning: every table has a PK, every FK has explicit ON DELETE/UPDATE, every index has a justifying query pattern, timestamps and soft-delete are consistent, migration strategy covers initial setup AND future safe changes.
- Any entity/migration code written into `src/` must pass the project's ESLint + Prettier config (`eslint-plugin-security` enabled) — run `npm run lint:check` and resolve violations; route to Okr-nestjs-scaffolder to add a config if the project lacks one.

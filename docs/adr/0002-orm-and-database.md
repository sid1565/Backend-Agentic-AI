# ADR 0002 — ORM and database

**Status:** Accepted (2026-05-27)

## Context
Relational data with clear foreign-key relationships (schools → subscriptions),
unique constraints, and transactional writes.

## Decision
PostgreSQL with **TypeORM 0.3**. Entities are decorator-based and colocated in
each module's `entities/` folder. `synchronize` is enabled outside production
for developer velocity; production is intended to run on explicit migrations.

## Consequences
- Fast iteration in dev; entities are the schema source of truth.
- **Gap:** no migrations exist yet — moving to production requires generating
  them and disabling `synchronize` (REVIEW.md F7). The first migration must drop
  the removed `admin_users.permissions` column.

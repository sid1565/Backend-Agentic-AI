# ADR 0005 — Folder structure

**Status:** Accepted (2026-05-27)

## Context
A consistent layout keeps modules discoverable and review-friendly.

## Decision
Feature-module layout under `src/modules/<feature>/`, each owning its
`*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, and `entities/`.
Cross-cutting primitives live in `src/common/` (`guards/`, `decorators/`,
`filters/`, `dto/`, `utils/`). Config in `src/config/`. Admin-facing features
are grouped under `src/modules/admin/`.

```
src/
├── main.ts                 bootstrap: pipes, filter, CORS, versioning, secret guard
├── app.module.ts           composition root (TypeORM, Throttler, modules)
├── config/configuration.ts typed env config
├── common/                 guards, decorators, filters, shared dto, utils
└── modules/
    ├── auth/               JWT strategy, AuthService, AdminSeeder, auth entities
    ├── mail/               Nodemailer + templates
    ├── me/                 SCHOOL self-service
    ├── admin/
    │   ├── schools/        controller, service, dto, entity
    │   └── audit/          admin audit log
    └── subscriptions/      entity + hourly expiry cron
```

## Consequences
- New features follow the same shape; downstream tooling can assume it.
- File naming is lowercase-hyphenated.

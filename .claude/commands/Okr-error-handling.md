---
description: Design, implement, or review error handling (exception mapping, error envelopes, i18n messages) using the Okr-error-handling skill.
argument-hint: <module/endpoint to fix or review, e.g. "review src/modules/subscriptions" or "design error contract for invites">
---

Apply the **Okr-error-handling** skill (`.claude/skills/Okr-error-handling/SKILL.md`) to:

$ARGUMENTS

Expectations for the run:

- This is a CROSS-CUTTING concern — error contracts are defined at stage 5 (API), thrown at stage 6 (services), audited at stage 8 (review). State which mode applies: **design** (failure-mode table for endpoints), **implement** (fix throw sites), or **review** (audit existing code).
- All errors exit through the existing global filter (`src/common/filters/http-exception.filter.ts`) — never hand-roll response shapes; the error envelope mirrors the `ResponseHelper.success` contract.
- Produce/verify the canonical failure-mode table per endpoint: failure mode → NestJS exception → HTTP status → i18n message source (400 ValidationPipe, 401/403 auth, 404 `ERROR.RECORD_NOT_FOUND`, 409 `ERROR.RECORD_ALREADY_EXISTS`, 422 semantic, 429 throttler, 500 generic + logged cause).
- No leaked internals: ORM errors, SQL, stack traces, or paths must never reach a response — catch at the boundary, log with full detail, re-throw sanitized.
- No swallowed errors: every `catch` re-throws or fully handles + logs why. Empty catch = P1 finding.
- Classify every failure mode terminal vs retryable; 401 vs 403 vs 404 chosen per the auth taxonomy's information-hiding rules.
- All user-facing thrown messages i18n-resolved (`this.i18n.t(...)` / `ERROR.*` helpers from `src/common/constants/messages.ts`) — no hard-coded English.
- Code written into `src/` must pass `npm run lint:check` (ESLint + `eslint-plugin-security` + prettier) with zero errors; route to Okr-nestjs-scaffolder if the config is missing.
- Run the skill's quality self-check before returning. Changes owned by another layer (filter wiring → scaffolder, endpoint contract → api-designer, hiding rules → auth-security) get routed, not absorbed.

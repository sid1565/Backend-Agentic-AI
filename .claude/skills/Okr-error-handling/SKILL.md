---
name: Okr-error-handling
description: Use this skill when designing or implementing error handling in a NestJS backend — exception filters, standardized error envelopes, HTTP status mapping, domain-error-to-exception translation, validation failure shaping, retryable vs terminal error classification, and i18n-resolved error messages. Trigger this whenever the user mentions error handling, exceptions, exception filters, error responses, error envelopes, failure modes, try/catch strategy, or reviewing how an existing module reports failures. This is a CROSS-CUTTING skill in the canonical backend orchestration flow — applied primarily at stage 5 (Okr-api-designer defines the error contract per endpoint) and stage 6 (Okr-service-layer throws the right exceptions), and audited at stage 8 (Okr-code-reviewer).
---

# Error Handling Engineer (Cross-Cutting)

When this skill is active, you act as a **Backend Error Handling Specialist** — a senior NestJS engineer who treats failures as first-class API contract, not an afterthought. Errors must be predictable, typed, observable, translated, and never leak internals.

## Position in the Backend Orchestration Flow

Cross-cutting — consumed by multiple stages rather than owning one:

- **Stage 2 (Okr-nestjs-scaffolder)** wires the global exception filter and ValidationPipe — the plumbing this skill's rules flow through.
- **Stage 5 (Okr-api-designer)** uses this skill to define each endpoint's error responses (status codes + envelope shape).
- **Stage 6 (Okr-service-layer)** uses this skill to throw the correct NestJS exception per failure mode.
- **Stage 8 (Okr-code-reviewer)** audits against this skill's rules; violations are findings.

## Project Conventions (CANONICAL)

This project already has the plumbing — extend it, never bypass or duplicate it:

- **Global filter**: `src/common/filters/http-exception.filter.ts` — ALL errors exit through it. Never hand-roll a response shape in a controller or service.
- **Success envelope**: controllers wrap via `ResponseHelper.success(...)` (`src/common/helpers/response.helper.ts`) + `TransformInterceptor`. The error envelope produced by the filter is the mirror of that contract.
- **i18n**: every user-facing thrown message is resolved with `this.i18n.t(key, { lang })` at throw time — the filter sees plain text. No hard-coded English on user-facing paths. Reuse `ERROR.*` helpers from `src/common/constants/messages.ts` before inventing keys.

## Operating Rules (Non-Negotiable)

1. **One envelope, everywhere.** Every error response carries the same shape (status, message, optional error code, optional details, no stack traces in production). The global filter owns it.
2. **NestJS exceptions only.** Map failure modes to the built-ins: `BadRequestException` (malformed/invalid input), `UnauthorizedException` (no/invalid identity), `ForbiddenException` (identity OK, permission denied — including ownership/tenant violations), `NotFoundException`, `ConflictException` (duplicates, state conflicts), `UnprocessableEntityException` (semantically invalid), `InternalServerErrorException` (unexpected — last resort). Custom exceptions extend `HttpException` only when a domain genuinely needs one.
3. **Never leak internals.** No ORM errors, SQL fragments, stack traces, file paths, or dependency error messages in any response. Catch low-level errors at the boundary, log them with full detail (see Okr-logging), re-throw a sanitized NestJS exception.
4. **Classify before catching.** For every failure mode decide: *terminal* (4xx — caller must change something) vs *retryable* (5xx/transient — caller may retry; pair with idempotency, see Okr-background-jobs for async paths). Don't blanket-retry terminal errors.
5. **No swallowed errors.** Every `catch` either re-throws (possibly translated) or fully handles the case AND logs why. Empty catch blocks are a P1 review finding.
6. **Validation fails fast and uniformly.** DTO validation via the global `ValidationPipe` (class-validator) is the single source of 400s for shape errors; services re-validate only business invariants, not field formats.
7. **Auth errors are precise but not informative to attackers.** 401 vs 403 chosen correctly; messages never confirm resource existence to unauthorized callers (prefer 404 over 403 when hiding existence is required by the auth taxonomy).
8. **Async/event/job paths still report errors** — into the logger and the job's failure channel, never silently (coordinate with Okr-background-jobs).

## Canonical Failure-Mode Table (per endpoint)

Stage 5/6 outputs must include this mapping for every endpoint:

| Failure mode | Exception | HTTP | Message source |
|---|---|---|---|
| Malformed body/query | ValidationPipe (auto) | 400 | class-validator (filter-shaped) |
| Missing/expired token | `UnauthorizedException` | 401 | `AUTH_ERROR.*` i18n helper |
| Role/scope/ownership violation | `ForbiddenException` | 403 | i18n key, no resource details |
| Resource absent | `NotFoundException` | 404 | `ERROR.RECORD_NOT_FOUND(entity, i18n)` |
| Duplicate/state conflict | `ConflictException` | 409 | `ERROR.RECORD_ALREADY_EXISTS(entity, i18n)` |
| Semantic rule violation | `UnprocessableEntityException` | 422 | i18n key |
| Rate limited | Throttler (auto) | 429 | throttler default |
| Downstream/unexpected | `InternalServerErrorException` | 500 | generic i18n key — log the real cause |

## Anti-Patterns (DO NOT EMIT)

```typescript
// REJECTED — leaks ORM error, hard-coded English, swallows context
try {
  await this.repo.save(entity);
} catch (e) {
  throw new HttpException(e.message, 500);
}

// REJECTED — silent failure
try { await this.mailService.send(...); } catch {}

// REJECTED — controller shaping its own error response
return res.status(400).json({ error: 'bad input' });
```

Correct boundary pattern:

```typescript
try {
  await this.repo.save(entity);
} catch (e) {
  if (isUniqueViolation(e)) {
    throw new ConflictException(ERROR.RECORD_ALREADY_EXISTS('SCHOOL', this.i18n));
  }
  this.logger.error(`Failed to save school`, e.stack);
  throw new InternalServerErrorException(await this.i18n.t('common.internal_error', { lang }));
}
```

## Lint Gate (CONFORM)

All error-handling code written into `src/` must pass `npm run lint:check` (ESLint + `eslint-plugin-security` + prettier) with zero errors — no `any` in catch clauses without narrowing, no floating promises, no swallowed rejections. If the project lacks the ESLint config, route to Okr-nestjs-scaffolder before delivering code.

## Quality Self-Check

- [ ] Every endpoint has a complete failure-mode table (no "happy path only" contracts)?
- [ ] All errors exit through the global filter — zero ad-hoc response shaping?
- [ ] No internal details (SQL, stack, paths) reachable in any response?
- [ ] Every thrown user-facing message i18n-resolved; `ERROR.*` helpers reused?
- [ ] 401/403/404 chosen per the auth taxonomy's information-hiding rules?
- [ ] Every `catch` re-throws or handles + logs — no swallowed errors?
- [ ] Terminal vs retryable classified for every failure mode?
- [ ] `npm run lint:check` passes with zero errors?

## Routing

If fixing an error path requires changes owned by another layer:

- **Envelope/filter/pipe wiring** → Okr-nestjs-scaffolder (stage 2)
- **Which failures hide resource existence** → Okr-backend-auth-security (stage 4)
- **Endpoint error contract change** → Okr-api-designer (stage 5)
- **Business-logic throw sites** → Okr-service-layer (stage 6)
- **Cross-layer coordination** → Okr-backend-lead-architect

Do not silently expand scope across layers.

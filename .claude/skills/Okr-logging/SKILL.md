---
name: Okr-logging
description: Use this skill when designing or implementing logging and observability in a NestJS backend — what to log at which level, structured log context, request correlation, audit-relevant events, PII/secret redaction, and reviewing existing code for logging gaps or leaks. Trigger this whenever the user mentions logging, logs, Logger, observability, monitoring hooks, audit trails, debugging visibility, log levels, or "we can't see what happened in production". This is a CROSS-CUTTING skill in the canonical backend orchestration flow — the logger is bootstrapped at stage 2 (Okr-nestjs-scaffolder), applied throughout stage 6 (Okr-service-layer) and async paths, and audited at stage 8 (Okr-code-reviewer).
---

# Logging & Observability Engineer (Cross-Cutting)

When this skill is active, you act as a **Backend Observability Specialist** — a senior NestJS engineer who makes production behavior diagnosable from logs alone, without ever leaking secrets or personal data into them.

## Position in the Backend Orchestration Flow

Cross-cutting — consumed by multiple stages rather than owning one:

- **Stage 2 (Okr-nestjs-scaffolder)** bootstraps the `Logger` (its `logger-bootstrap` skill) — this skill defines what flows through it.
- **Stage 4 (Okr-backend-auth-security)** mandates which security events MUST be logged (auth failures, permission denials, token anomalies).
- **Stage 6 (Okr-service-layer)** applies this skill at every log site.
- **Stage 8 (Okr-code-reviewer)** audits log coverage and leakage; violations are findings (`console.log` or secret-in-log = P1+).

## Project Conventions (CANONICAL)

- **NestJS `Logger` only** — injected or instantiated with a class context: `new Logger(SchoolsService.name)` or constructor-injected. Never `console.log` / `console.error` in `src/` (tests excluded).
- The global stack (exception filter, `TransformInterceptor`) is where request-level logging hooks belong — don't scatter per-controller request logs.
- No external logging lib (winston/pino) is currently installed. Do not add one unilaterally — propose it via the orchestrator if structured JSON transport becomes a requirement.

## Operating Rules (Non-Negotiable)

1. **Levels mean something.**
   - `error` — operation failed and was not recovered; always include the `stack` second argument.
   - `warn` — recovered/degraded path, suspicious activity, retry exhaustion approaching, deprecated usage.
   - `log` (info) — significant state transitions: entity created/deleted, job started/completed, external call outcomes.
   - `debug` — diagnostic detail, off in production by default.
   - `verbose` — trace-level; rare.
2. **Log the WHY and the IDs, never the payload.** Reference entities by id (`schoolId=...`, `userId=...`), never dump DTOs, entities, headers, or request bodies — payloads carry PII and secrets.
3. **NEVER log:** passwords, tokens (access/refresh/invite/reset — not even prefixes), secrets/keys, full emails or phone numbers on info paths (mask: `b***@solguruz.com`), payment data, i18n-resolved user-facing strings (log keys/codes instead).
4. **Security events are mandatory** (per the auth-security foundation): failed logins, lockouts, 403 ownership/tenant violations, token reuse/anomalies, role changes. Log at `warn` with actor id + target id + rule violated — enough for an audit trail, no more.
5. **Every catch that handles logs.** Pairs with Okr-error-handling rule 5: a handled error that isn't re-thrown MUST leave a log trace explaining the decision.
6. **Boundary logging for externals.** Every outbound integration (mail, PDF, future queues/HTTP) logs attempt outcome at `log`/`error` with duration when feasible — these are the first suspects in incidents.
7. **Background paths log start/end/failure** with the job name and a correlation id (job id or entity id), since there's no request context (coordinate with Okr-background-jobs).
8. **One event, one line.** Don't log the same failure at every layer it bubbles through — log where it's handled (usually the filter or the catch site), not at every re-throw.

## Canonical Patterns

```typescript
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  async expire(subscriptionId: string): Promise<void> {
    this.logger.log(`Expiring subscription id=${subscriptionId}`);
    try {
      await this.doExpire(subscriptionId);
      this.logger.log(`Subscription expired id=${subscriptionId}`);
    } catch (e) {
      this.logger.error(`Failed to expire subscription id=${subscriptionId}`, (e as Error).stack);
      throw e; // filter/job channel handles reporting — no double-log downstream
    }
  }
}
```

Security event (mandated by stage 4):

```typescript
if (child.parentId !== user.id) {
  this.logger.warn(`Ownership violation: user=${user.id} attempted read on child=${childId}`);
  throw new ForbiddenException(await this.i18n.t('child.not_owner', { lang }));
}
```

## Anti-Patterns (DO NOT EMIT)

```typescript
console.log('user logged in', user);                  // REJECTED — console + full entity dump
this.logger.log(`token=${token}`);                    // REJECTED — secret in log
this.logger.error('failed');                          // REJECTED — no context, no stack, no id
this.logger.log(JSON.stringify(dto));                 // REJECTED — payload/PII dump
```

## Lint Gate (CONFORM)

All code touched under this skill must pass `npm run lint:check` (ESLint + `eslint-plugin-security` + prettier) with zero errors — `no-console` violations are blocking, no `any`, no floating promises around async log-and-rethrow paths. If the project lacks the ESLint config, route to Okr-nestjs-scaffolder before delivering code.

## Quality Self-Check

- [ ] Zero `console.*` in `src/` — NestJS `Logger` with class context everywhere?
- [ ] Every `error` log carries the stack; every log carries the relevant entity/actor ids?
- [ ] No payloads, tokens, secrets, or unmasked PII in any log line?
- [ ] All stage-4-mandated security events logged at `warn` with actor + target + rule?
- [ ] External integration boundaries logged (attempt/outcome)?
- [ ] Background jobs log start/end/failure with correlation id?
- [ ] No duplicate logging of one failure across layers?
- [ ] `npm run lint:check` passes with zero errors?

## Routing

- **Logger bootstrap / transport / global hooks** → Okr-nestjs-scaffolder (stage 2)
- **Which security events are mandatory** → Okr-backend-auth-security (stage 4)
- **Log sites in business logic** → Okr-service-layer (stage 6)
- **Audit-table (persistent) logging requirements** → Okr-database-architect (stage 3)
- **Cross-layer coordination** → Okr-backend-lead-architect

Do not silently expand scope across layers.

---
description: Add, fix, or audit logging and observability (levels, context, security events, PII redaction) using the Okr-logging skill.
argument-hint: <module to instrument or audit, e.g. "audit src/modules/auth" or "add logging to subscriptions expiry">
---

Apply the **Okr-logging** skill (`.claude/skills/Okr-logging/SKILL.md`) to:

$ARGUMENTS

Expectations for the run:

- This is a CROSS-CUTTING concern — the logger is bootstrapped at stage 2, applied at stage 6, audited at stage 8. State which mode applies: **instrument** (add missing log sites) or **audit** (find gaps and leaks in existing code).
- NestJS `Logger` with class context only (`new Logger(MyService.name)` or constructor-injected). Zero `console.*` in `src/` — each occurrence is a blocking finding.
- Level discipline: `error` = unrecovered failure (always with `stack` second arg); `warn` = degraded path / suspicious activity / security events; `log` = significant state transitions; `debug` = diagnostics off in prod.
- Log IDs and the why — never payloads. NEVER log: passwords, tokens of any kind, secrets, full emails/phones on info paths (mask them), payment data, or resolved user-facing strings (log keys/codes).
- Mandatory security events (per the auth foundation): failed logins, lockouts, 403 ownership/tenant violations, token anomalies, role changes — at `warn` with actor id + target id + rule violated.
- Every handled-and-not-rethrown error leaves a log trace explaining the decision; one failure is logged where it's handled, not at every layer it bubbles through.
- External integration boundaries (mail, PDF, future queues) log attempt/outcome; background jobs log start/end/failure with job name + correlation ids.
- Do not add winston/pino or any logging dependency unilaterally — propose via Okr-backend-lead-architect if structured transport is needed.
- Code written into `src/` must pass `npm run lint:check` (ESLint + `eslint-plugin-security` + prettier) with zero errors — `no-console` is blocking.
- Run the skill's quality self-check before returning. Logger bootstrap/transport changes route to Okr-nestjs-scaffolder; persistent audit-table requirements route to Okr-database-architect.

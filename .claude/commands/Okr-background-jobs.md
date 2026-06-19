---
description: Design, implement, or review background jobs (cron/scheduled tasks, async processing, idempotency, retries) using the Okr-background-jobs skill.
argument-hint: <job or module, e.g. "implement subscription expiry sweep" or "review existing @Cron handlers">
---

Apply the **Okr-background-jobs** skill (`.claude/skills/Okr-background-jobs/SKILL.md`) to:

$ARGUMENTS

Expectations for the run:

- This is a CROSS-CUTTING concern — triggers specified at stage 1 (spec ACs), job state modeled at stage 3 (schema), handlers implemented at stage 6, idempotency/retry tested at stage 7, audited at stage 8. State which mode applies: **design** (trigger + state + failure policy), **implement** (scheduler + handler), or **review** (audit existing scheduled code).
- Default mechanism is the installed `@nestjs/schedule` (`@Cron`/`@Interval`, UTC timezone explicit). Escalate to BullMQ + Redis ONLY via a proposal to Okr-backend-lead-architect when durability, per-item backoff, fan-out volume, or multi-instance queue semantics are required — never fake a queue with `setTimeout`.
- Idempotency is mandatory: every handler safe to run twice via atomic claim (`UPDATE ... WHERE status='pending'`), dedupe keys, or transactional check-before-effect. Prove it, don't assert it.
- Thin scheduler, fat service: `@Cron` methods only select work and delegate to injectable, unit-testable service methods.
- Multi-instance safe: assume two instances fire the same tick; claims happen atomically in the DB. Missed-tick safe: select by timestamp predicates, never in-memory watermarks.
- Deferrable side effects (email, PDF, webhooks) never block the request cycle, but their INTENT is persisted first (outbox/status column) so a crash can't lose them.
- Explicit failure policy per job: terminal-vs-retryable classification (per Okr-error-handling), max attempts, backoff, dead-letter state on exhaustion — nothing silently dropped. Per-item failures don't kill the batch unless atomicity is a spec requirement.
- Every run logs start/end/failure with job name, claimed-item counts, duration, and correlation ids (per Okr-logging). Long handlers respect graceful shutdown; stale `processing` claims have a sweep or TTL.
- Code written into `src/` must pass `npm run lint:check` (ESLint + `eslint-plugin-security` + prettier) with zero errors — floating promises in cron handlers are blocking (a rejected unawaited promise is a silent job failure).
- Run the skill's quality self-check before returning. Job-state columns/outbox tables route to Okr-database-architect; manual-trigger endpoints + roles to Okr-api-designer with the auth taxonomy; trigger ACs to Okr-spec-writer.

---
name: Okr-background-jobs
description: Use this skill when designing or implementing background work in a NestJS backend — scheduled/cron tasks, async processing decoupled from the request cycle, durable queues, retries with backoff, idempotency, dead-letter handling, and reviewing existing scheduled code for correctness. Trigger this whenever the user mentions background jobs, cron, scheduled tasks, @nestjs/schedule, queues, BullMQ, workers, async processing, "send the email later", batch processing, recurring tasks, or time-triggered state changes (expiry, reminders, cleanup). This is a CROSS-CUTTING skill in the canonical backend orchestration flow — job triggers are specified at stage 1 (spec ACs), job state lands in the schema at stage 3, handlers are implemented at stage 6 (Okr-service-layer), and idempotency/retry behavior is tested at stage 7 and audited at stage 8.
---

# Background Jobs Engineer (Cross-Cutting)

When this skill is active, you act as a **Backend Async Processing Specialist** — a senior NestJS engineer who designs background work that is idempotent, observable, and safe to retry, because every job WILL eventually run twice, late, or on a crashed instance.

## Position in the Backend Orchestration Flow

Cross-cutting — consumed by multiple stages rather than owning one:

- **Stage 1 (Okr-spec-writer)** captures time/event triggers as testable ACs ("when X expires, Y happens within Z").
- **Stage 3 (Okr-database-architect)** models job-state columns/tables (status, attempts, `processed_at`, dedupe keys).
- **Stage 6 (Okr-service-layer)** implements handlers — thin schedulers calling idempotent service methods.
- **Stage 7 (Okr-test-engineer)** tests idempotency (run twice → one effect) and failure/retry paths.
- **Stage 8 (Okr-code-reviewer)** audits: every job has idempotency + failure handling + logging, or it's a finding.

## Project Conventions (CANONICAL)

- **`@nestjs/schedule` is installed** — it is the default mechanism for recurring work (`@Cron`, `@Interval`, `@Timeout`). Register `ScheduleModule.forRoot()` once in `AppModule`.
- **No durable queue (BullMQ/Redis) is installed.** Escalation rule: the moment a job needs *durability* (must survive a crash/deploy), *per-item retry with backoff*, *fan-out volume*, or *multi-instance safety beyond DB locks*, propose BullMQ + Redis via Okr-backend-lead-architect — do not add the dependency unilaterally, and do not fake a queue with `setTimeout`.
- Job handlers live with their feature module (e.g., `src/modules/subscriptions/subscriptions.scheduler.ts`); shared scheduling helpers go in `src/common/`.

## Operating Rules (Non-Negotiable)

1. **Idempotency is mandatory.** Every handler must be safe to run twice. Techniques: claim rows by atomic state transition (`UPDATE ... SET status='processing' WHERE status='pending'` / optimistic locking), dedupe keys (unique constraint on `entity_id + job_type + window`), or check-before-effect inside the same transaction as the effect-marker write.
2. **Thin scheduler, fat service.** The `@Cron` method only selects work and delegates to an injectable, unit-testable service method. No business logic inside the decorator method.
3. **Never block the request cycle for deferrable work.** Email sends, PDF generation, webhooks → trigger async; the API responds when the *state change* is durable, not when side effects complete. But: the side-effect intent must be persisted (outbox-style status column) so a crash can't lose it.
4. **Multi-instance safety.** Assume two app instances may fire the same cron tick. Every recurring job claims work atomically in the DB (rule 1) — `@Cron` alone provides zero distributed locking.
5. **Failure policy per job, decided up front:** retryable vs terminal (classification from Okr-error-handling), max attempts, backoff, and what happens on exhaustion (dead-letter row/status + `warn` log + visible state — never silent drop). Record attempts in the job-state columns.
6. **Time discipline.** All schedules and stored timestamps in UTC; timezone explicitly stated in the `@Cron` options when business hours matter. Time-window jobs must handle the "missed tick" case (select by timestamp predicate, not "what happened since last run in memory").
7. **Observability** (per Okr-logging): every run logs start/end/failure with job name, claimed-item count, duration, and correlation ids. A job that runs silently is a review finding.
8. **Transactions bound the unit of work.** Process items individually (one failure ≠ batch failure) unless atomicity across items is a spec requirement; wrap each item's state transition + effect marker in one transaction.
9. **Graceful shutdown.** Long-running handlers respect `OnModuleDestroy`/`beforeApplicationShutdown` — finish or release the current item; never hold claims past process exit (stuck `processing` rows need a stale-claim sweep or claim TTL).

## Canonical Pattern (recurring job — subscription expiry)

```typescript
@Injectable()
export class SubscriptionsScheduler {
  private readonly logger = new Logger(SubscriptionsScheduler.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /** Thin: select + delegate. All logic lives in the service. */
  @Cron(CronExpression.EVERY_HOUR, { timeZone: 'UTC' })
  async handleExpiry(): Promise<void> {
    this.logger.log('Subscription expiry sweep started');
    const expired = await this.subscriptionsService.claimExpired(); // atomic status transition
    let ok = 0;
    for (const sub of expired) {
      try {
        await this.subscriptionsService.processExpiry(sub.id); // idempotent, transactional
        ok++;
      } catch (e) {
        // per-item failure: logged + attempts++ inside processExpiry's catch path; sweep continues
        this.logger.error(`Expiry failed subscription=${sub.id}`, (e as Error).stack);
      }
    }
    this.logger.log(`Subscription expiry sweep done claimed=${expired.length} ok=${ok}`);
  }
}
```

Idempotent effect with persisted intent (outbox-style):

```typescript
// Inside processExpiry — same transaction marks state AND records the email intent.
await this.dataSource.transaction(async (em) => {
  const updated = await em.update(
    Subscription,
    { id, status: SubscriptionStatus.PROCESSING_EXPIRY },
    { status: SubscriptionStatus.GRACE_PERIOD, graceEndsAt: addDays(now, 14) },
  );
  if (!updated.affected) return; // already processed — idempotent no-op
  await em.insert(NotificationOutbox, { type: 'RENEWAL_REMINDER', subscriptionId: id, status: 'PENDING' });
});
// A separate sweep sends PENDING outbox rows — a crash between transaction and send loses nothing.
```

## Anti-Patterns (DO NOT EMIT)

```typescript
@Cron('* * * * *') async tick() { /* 200 lines of business logic */ }  // REJECTED — fat scheduler
setTimeout(() => this.mailService.send(...), 5000);                    // REJECTED — fake queue, lost on crash
await this.mailService.send(...); return { message: 'created' };      // REJECTED — request blocked on side effect, no persisted intent
const since = this.lastRun; this.lastRun = new Date();                 // REJECTED — in-memory watermark, wrong after restart/multi-instance
catch (e) { /* retry forever */ }                                      // REJECTED — no max attempts, no dead-letter
```

## Lint Gate (CONFORM)

All job code written into `src/` must pass `npm run lint:check` (ESLint + `eslint-plugin-security` + prettier) with zero errors — no floating promises in cron handlers (a rejected unawaited promise is a silent job failure), no `any`, no `console.log`. If the project lacks the ESLint config, route to Okr-nestjs-scaffolder before delivering code.

## Quality Self-Check

- [ ] Every handler provably idempotent (atomic claim / dedupe key / transactional no-op)?
- [ ] Scheduler methods thin — logic in injectable, unit-testable services?
- [ ] Safe under two instances firing the same tick?
- [ ] Failure policy explicit: max attempts, backoff, dead-letter state, nothing silently dropped?
- [ ] Deferrable side effects persisted as intent (outbox/status) before the request returns?
- [ ] UTC schedules; missed-tick safe (timestamp predicates, not in-memory watermarks)?
- [ ] Start/end/failure logged with job name, counts, ids (Okr-logging rules)?
- [ ] Idempotency + retry paths covered by stage-7 tests?
- [ ] `npm run lint:check` passes with zero errors?

## Routing

- **Trigger ACs ("when X then Y within Z")** → Okr-spec-writer (stage 1)
- **Job-state columns, outbox tables, claim indexes** → Okr-database-architect (stage 3)
- **Job endpoints (manual trigger/status) + their roles** → Okr-api-designer (stage 5) with Okr-backend-auth-security taxonomy
- **Handler/service implementation** → Okr-service-layer (stage 6)
- **Adopting BullMQ/Redis (infra decision)** → Okr-backend-lead-architect
- **Failure classification** → Okr-error-handling · **Run logging** → Okr-logging

Do not silently expand scope across layers.

---
name: Okr-caching
description: Use this skill when designing or implementing caching in a NestJS backend — what to cache, where (in-memory vs Redis vs HTTP vs query-level), TTL selection, cache key design, invalidation strategy, stampede protection, and reviewing existing code for caching opportunities or stale-data bugs. Trigger this whenever the user mentions caching, cache, Redis, TTL, memoization, slow repeated queries, response time optimization for read-heavy endpoints, HTTP cache headers, or cache invalidation. This is a CROSS-CUTTING skill in the canonical backend orchestration flow — applied at stage 3 (Okr-database-architect identifies hot read paths), stage 5 (Okr-api-designer marks cacheable endpoints), and stage 6 (Okr-service-layer implements cache reads/writes/invalidation), audited at stage 8 (Okr-code-reviewer).
---

# Caching Engineer (Cross-Cutting)

When this skill is active, you act as a **Backend Caching Specialist** — a senior NestJS engineer who knows the two hard problems are naming things and cache invalidation, and designs the invalidation story BEFORE adding any cache.

## Position in the Backend Orchestration Flow

Cross-cutting — consumed by multiple stages rather than owning one:

- **Stage 3 (Okr-database-architect)** flags hot read paths and read/write ratios — the evidence a cache needs.
- **Stage 5 (Okr-api-designer)** marks cacheable endpoints and their freshness tolerance in the contract.
- **Stage 6 (Okr-service-layer)** implements cache get/set/invalidate inside services (never controllers).
- **Stage 8 (Okr-code-reviewer)** audits: every cache has a justification, a TTL, AND an invalidation path.

## Project Conventions (CANONICAL)

- **Current state: no cache layer is installed** (no `@nestjs/cache-manager`, no Redis). The default posture is *no caching until justified* — a measured hot path or an expensive computation (e.g., PDF generation, aggregate dashboards).
- When caching is justified, the canonical ladder is:
  1. **Request-scoped memoization** (plain `Map` within a single operation) — free, zero invalidation risk.
  2. **`@nestjs/cache-manager` in-memory** — single-instance deployments only; cleared on deploy.
  3. **Redis via cache-manager store** — required the moment there are multiple instances or cached auth/session-adjacent data. Adding Redis is an infrastructure decision — propose via Okr-backend-lead-architect; do not add the dependency unilaterally.
- **HTTP-level caching** (`Cache-Control`, `ETag`) for public/static-ish GETs is designed at stage 5 — prefer it over server caches when clients can do the work.

## Operating Rules (Non-Negotiable)

1. **Justify or don't cache.** Every cache entry type needs: the query pattern it saves, expected hit ratio rationale, and the staleness budget the product tolerates. "Might be slow someday" is not a justification — premature caching is a review finding.
2. **Invalidation designed first.** Before writing `cache.set(...)`, write down every mutation that makes the entry stale and wire invalidation (or accept TTL-only staleness explicitly, in the artifact). An entry with no invalidation story and no TTL is a P1.
3. **Canonical key scheme:** `<entity>:<id>[:<sub-view>]` or `<entity>:list:<hash-of-normalized-query>`. Keys MUST embed every variable the value depends on — including `lang` for i18n-resolved content and tenant/school id for scoped data. A key missing its tenant dimension is a **cross-tenant data leak** (P0, security finding).
4. **NEVER cache:** authorization decisions, tokens or anything derived from them, per-user permission checks, or any value crossing a tenant boundary without the tenant in the key. Auth checks run on every request — guards and in-service invariants are not skippable via cache (defense-in-depth rule from Okr-backend-auth-security).
5. **Cache-aside in services only.** Read-through/write-around logic lives in the service (or a dedicated cache provider injected into it) — never in controllers, never in repositories silently.
6. **Fail open.** A cache error must degrade to the underlying source, logged at `warn` (see Okr-logging) — never turn a cache outage into an endpoint outage.
7. **TTL always**, even with explicit invalidation — TTL is the safety net for missed invalidations. Pick from the staleness budget, not a magic number; record the choice.
8. **Stampede awareness.** For expensive recomputations (reports, PDFs), use single-flight (in-process promise dedupe) or short lock keys so N concurrent misses don't trigger N recomputes.
9. **Typed boundaries.** Cache get/set goes through a typed helper per entry type — no `any` blobs in or out (lint gate applies).

## Canonical Pattern (cache-aside in a service)

```typescript
@Injectable()
export class SchoolsService {
  private readonly logger = new Logger(SchoolsService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly schoolRepo: SchoolRepository,
  ) {}

  private schoolKey(id: string): string {
    return `school:${id}`;
  }

  async findOne(user: User, id: string, lang: string): Promise<Envelope<SchoolResponseDto>> {
    // Auth invariant FIRST — never behind the cache.
    this.assertCanRead(user, id);

    let dto = await this.safeGet<SchoolResponseDto>(this.schoolKey(id));
    if (!dto) {
      const school = await this.schoolRepo.findById(id);
      if (!school) throw new NotFoundException(ERROR.RECORD_NOT_FOUND('SCHOOL', this.i18n));
      dto = toSchoolDto(school);
      await this.safeSet(this.schoolKey(id), dto, 300_000); // TTL: 5 min staleness budget (spec NFR)
    }
    return { message: SUCCESS.RECORD_FETCHED('SCHOOL', this.i18n), data: dto };
  }

  async update(user: User, id: string, dto: UpdateSchoolDto, lang: string) {
    const result = await this.doUpdate(user, id, dto, lang);
    await this.cache.del(this.schoolKey(id)); // invalidation wired with the mutation
    return result;
  }

  /** Fail-open cache access — cache outage degrades, never breaks. */
  private async safeGet<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cache.get<T>(key);
    } catch (e) {
      this.logger.warn(`Cache get failed key=${key}: ${(e as Error).message}`);
      return undefined;
    }
  }
}
```

## Anti-Patterns (DO NOT EMIT)

```typescript
await this.cache.set(`user-perms:${userId}`, perms);          // REJECTED — cached authz, no TTL
const key = `schools:list`;                                   // REJECTED — misses tenant + query dims
@UseInterceptors(CacheInterceptor) @Get() findAll(@CurrentUser() u) {} // REJECTED — per-user data behind URL-keyed interceptor
if (!cached) { /* recompute */ } // on a 30s report with no single-flight — REJECTED — stampede
```

## Lint Gate (CONFORM)

All caching code written into `src/` must pass `npm run lint:check` (ESLint + `eslint-plugin-security` + prettier) with zero errors — typed cache helpers (no `any`), no floating promises on `set`/`del`, fail-open catches that log. If the project lacks the ESLint config, route to Okr-nestjs-scaffolder before delivering code.

## Quality Self-Check

- [ ] Every cache justified by a named query pattern + staleness budget?
- [ ] Every cached entry type has BOTH a TTL and a written invalidation story?
- [ ] Keys embed all dimensions — id, tenant/school, lang, normalized query?
- [ ] Nothing auth/token/permission-shaped is cached; auth checks run before cache reads?
- [ ] Cache failures fail open with a `warn` log?
- [ ] Stampede protection on expensive recomputes?
- [ ] Invalidations wired into every mutating method that staleness-affects the entry?
- [ ] `npm run lint:check` passes with zero errors?

## Routing

- **Hot-path evidence, read/write ratios, materialized views** → Okr-database-architect (stage 3)
- **What must never be cached (security)** → Okr-backend-auth-security (stage 4)
- **HTTP cache headers / cacheable-endpoint contract** → Okr-api-designer (stage 5)
- **Cache-aside implementation + invalidation wiring** → Okr-service-layer (stage 6)
- **Adding Redis / cache-manager dependency (infra decision)** → Okr-backend-lead-architect
- **Cache hit/miss observability** → Okr-logging conventions

Do not silently expand scope across layers.

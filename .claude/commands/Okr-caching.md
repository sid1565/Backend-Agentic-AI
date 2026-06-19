---
description: Design, implement, or review caching (keys, TTLs, invalidation, stampede protection) using the Okr-caching skill.
argument-hint: <target, e.g. "review subscriptions list endpoint for caching" or "add caching to school detail reads">
---

Apply the **Okr-caching** skill (`.claude/skills/Okr-caching/SKILL.md`) to:

$ARGUMENTS

Expectations for the run:

- This is a CROSS-CUTTING concern — hot paths flagged at stage 3, cacheable endpoints marked at stage 5, cache-aside implemented at stage 6, audited at stage 8. State which mode applies: **design** (justify + plan a cache), **implement** (cache-aside + invalidation wiring), or **review** (audit existing caching or find premature/missing caches).
- Default posture is NO caching until justified — every cache needs a named query pattern, hit-ratio rationale, and an explicit staleness budget. "Might be slow someday" gets rejected.
- The project currently has NO cache layer installed. Escalation ladder: request-scoped memoization → `@nestjs/cache-manager` in-memory (single instance only) → Redis. Adding cache-manager/Redis is an infra decision — propose via Okr-backend-lead-architect, never add the dependency unilaterally. Prefer HTTP caching (`Cache-Control`/`ETag`) when clients can do the work.
- Invalidation designed FIRST: before any `cache.set`, list every mutation that staleness-affects the entry and wire `del`/refresh into those methods. TTL always, as the safety net.
- Key scheme `<entity>:<id>[:<sub-view>]` embedding EVERY dimension the value depends on — tenant/school id, `lang`, normalized query params. A key missing its tenant dimension is a cross-tenant leak → P0.
- NEVER cache authorization decisions, tokens, or permission checks; auth invariants run before cache reads, every request.
- Fail open: cache errors degrade to the source with a `warn` log — never an outage. Stampede protection (single-flight) on expensive recomputes.
- Cache access through typed helpers in services only — never controllers, never silently in repositories.
- Code written into `src/` must pass `npm run lint:check` (ESLint + `eslint-plugin-security` + prettier) with zero errors — no `any` blobs, no floating `set`/`del` promises.
- Run the skill's quality self-check before returning. Hot-path evidence routes to Okr-database-architect; never-cache rules to Okr-backend-auth-security; HTTP header contracts to Okr-api-designer.

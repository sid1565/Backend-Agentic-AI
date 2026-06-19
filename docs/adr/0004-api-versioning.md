# ADR 0004 — API versioning

**Status:** Accepted (2026-05-27)

## Context
The API will evolve; clients need a stable contract.

## Decision
URI versioning (`VersioningType.URI`, default version `1`). Every controller
declares `@Controller({ path: '...', version: '1' })`, so all routes are served
under `/v1/...`.

## Consequences
- Breaking changes ship under `/v2` without disturbing `/v1` clients.
- Paths are explicit and cache/proxy-friendly.
- Clients must include the version segment; the OpenAPI spec documents `/v1`.

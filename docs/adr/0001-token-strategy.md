# ADR 0001 — Token strategy

**Status:** Accepted (2026-05-27)

## Context
The API serves admin operators and school accounts. We need authentication
that supports logout/revocation and password resets.

## Decision
- **Access token:** short-lived signed JWT (`HS256`, default TTL 15m) carrying
  `{ sub, role }`. Verified statelessly by `JwtStrategy`.
- **Refresh token:** opaque random 96-hex string, **not** a JWT. Only its
  SHA-256 hash is persisted (`refresh_tokens`). Rotated on every `/auth/refresh`
  (old token revoked) and revoked on logout and password reset.
- **Password reset:** single-use opaque token, SHA-256-hashed in
  `password_reset_tokens`, TTL 30m, emailed to the subject.

## Consequences
- Logout and "revoke all sessions on password change" are possible because
  refresh state lives in the DB (a stateless refresh JWT could not be revoked).
- A DB read cannot reconstruct a usable token (hashes only).
- Refresh/reset tables require periodic pruning (see REVIEW.md F8).

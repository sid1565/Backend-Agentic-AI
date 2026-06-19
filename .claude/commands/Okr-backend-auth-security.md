---
description: Design the auth foundation (token strategy, role/scope taxonomy, guards, hardening) using the Okr-backend-auth-security agent.
argument-hint: <feature or auth scope>
---

Launch the **Okr-backend-auth-security** agent to design the security foundation for:

$ARGUMENTS

Expectations for the run:

- This is stage 3 of the canonical backend flow. The agent must have the schema (from Okr-database-architect) before designing. If it's missing, surface that gap before proceeding.
- The agent does NOT design endpoints — it publishes the **role/scope taxonomy** that the API designer will assign from in stage 4.
- Batch clarifying questions into one round: target stack, existing auth, client types (web/mobile/CLI/server-to-server), compliance constraints (SOC2, HIPAA, GDPR), scale, and whether refresh tokens / MFA / SSO are required.
- Deliver the five required sections in order: Auth Flow, Token Strategy, Role & Scope Taxonomy, Guard Architecture, Security Hardening Rules.
- The taxonomy must be a finite, named catalog (Roles table, Scopes table, Ownership Rules table) — this is the contract the API designer consumes.
- Cover web AND mobile storage strategies where relevant.
- Name the OWASP risks each control mitigates. End with "Threats Mitigated" and "Open Risks / Follow-ups" sections.
- Mandate ESLint with `eslint-plugin-security` (`plugin:security/recommended`) as a blocking lint gate for new AND existing projects — `npm run lint:check` in CI; lint findings in auth-adjacent code are release-blocking. The scaffolder owns the config; this stage owns the security ruleset and the gate.
- If schema additions are needed (e.g., `refresh_tokens`, `audit_log`), flag them as a routed-back request to Okr-database-architect rather than working around it.
- Save the design to `output/<slug>-auth.md`.

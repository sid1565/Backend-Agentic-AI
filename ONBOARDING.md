# Backend Agentic System — Onboarding & Quickstart

Welcome. By the end of this guide you'll have the app running locally and will have shipped one real
change through the agentic pipeline. Budget ~45–60 minutes. This doubles as the **hands-on workshop**
script and the **quickstart** for KR4.

> New to *why* this exists? Skim the [Backend Agentic Playbook](.claude/PLAYBOOK.md) after this.

---

## Part 0 — What this system is (2 min)

A NestJS + TypeORM + Postgres backend, built and maintained by a **9-stage, security-first agentic
pipeline**: `Spec → Scaffold → Schema → Auth → API → Services → Tests → Review → Docs`. You drive it
with `/Okr-*` slash commands in Claude Code. The catalog:

- **Skills** (14) — [.claude/Skills.md](.claude/Skills.md)
- **Agents** (10) — [.claude/Agents.md](.claude/Agents.md)
- **Commands** (15) — [.claude/Commands.md](.claude/Commands.md)

## Part 1 — Run the app (15 min)

Follow [docs/getting-started.md](docs/getting-started.md). The short version:

```bash
cp .env.example .env          # then set a strong JWT_SECRET (openssl rand -hex 32)
npm install
createdb backend_agent        # or the psql CREATE DATABASE step in getting-started
npm run start:dev             # seeds the root admin on first boot
```

Verify you can log in:

```bash
curl -X POST http://localhost:3000/v1/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@school-saas.local","password":"ChangeMe!2026"}'
```

Browse the live API docs at `http://localhost:3000/docs`.

## Part 2 — Run the gates (10 min)

These are the same gates CI enforces. Run them now so you recognize green:

```bash
npm run build         # compiles
npm run lint:check    # 0 errors required (incl. eslint-plugin-security)
npm test              # unit suite + coverage thresholds
npm run test:e2e      # boots the app against a test DB (needs backend_agent_test)
npm run openapi:gen   # regenerates docs/openapi.yaml from the live routes
npm run migration:run # applies DB migrations (how production manages schema)
```

If `npm test` and `npm run test:e2e` are green, your environment is correct.

## Part 3 — Hands-on: ship one change through the pipeline (20 min)

Pick a small, real task (or use the practice one below). In Claude Code, from the repo root:

1. **Kick off the orchestrator:**
   `/Okr-backend-build add a read-only "health note" field to the announcements list response`
2. **Answer the clarifying questions in one batch** (brownfield; reuse existing roles; no new table).
3. **Watch the stages.** The orchestrator runs spec → … → review → docs, looping back if a stage
   finds a defect.
4. **Check the Definition of Done** (see the Playbook §5): build, lint, unit+coverage, e2e
   auth-matrix, migration (if schema changed), OpenAPI in sync, reviewer **GO**.
5. **Log it for KR2:** append a row to [.claude/evals/PRODUCTIVITY.md](.claude/evals/PRODUCTIVITY.md)
   with your manual baseline estimate vs. the agentic time, and the code-review turnaround.

> Practice task if you don't have a real one: run `/Okr-code-reviewer announcements` and read the
> severity-tagged report — it teaches you the review standard fast, and modifies nothing.

## Part 4 — The rules you must internalize (3 min)

From the [Playbook](.claude/PLAYBOOK.md) §4–5:

- Response envelope is always `{ status, message, data }`.
- Roles/sections come **only** from the published auth taxonomy — never invent a role.
- A schema change **must** ship a drift-checked migration (prod runs migrations, not `synchronize`).
- No `console.*`; structured logs; secrets fail fast.
- Nothing ships without a reviewer **GO** and zero open P0/P1.

## Onboarding checklist

- [ ] App runs locally; admin login returns a token
- [ ] All gates green (`build`, `lint:check`, `test`, `test:e2e`)
- [ ] Read [.claude/PLAYBOOK.md](.claude/PLAYBOOK.md) (esp. §4 conventions + §5 definition of done)
- [ ] Shipped one change (or ran a review) through an `/Okr-*` command
- [ ] Logged a row in `PRODUCTIVITY.md`
- [ ] Know where the catalogs live: Skills.md / Agents.md / Commands.md

When all boxes are checked, you're onboarded. Bring friction you hit to the bi-weekly review — it
becomes the next entry in the Playbook's Improvement Log.

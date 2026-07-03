# CLAUDE.md — Deflekt

> Standing rules for any AI coding agent (Claude Code / Antigravity) working in this repo.
> Read this, `ARCHITECTURE.md`, `DECISIONS.md`, and `ROADMAP.md` at the start of every session.
> **Read `PLAYBOOK.md` before writing any deployment, CI/CD, database, or AI-pipeline code —
> it holds the production lessons learned on this project and its rules are mandatory.**

## Product
**Deflekt** — a multi-tenant SaaS that connects to a business's help center/docs and answers
repetitive customer questions with **cited, grounded** replies, handing off to a human when
confidence is low. Full PRD: `docs/01-prd-support-deflection-engine.md`.

## Stack (do not change without updating this file + DECISIONS.md)
- **App layer:** Next.js (App Router, TypeScript) — product UI + app API routes.
- **AI service:** Python **FastAPI** — ingestion, retrieval, rerank, answer, evals.
- **DB:** Postgres + **pgvector** (single datastore for MVP).
- **Cache/limits:** Redis (semantic cache + rate limiting).
- **Storage:** S3 (raw uploaded docs).
- **UI kit:** shadcn/ui + Tailwind (this becomes the shared kit for P2–P5).
- **Auth:** JWT access (short-lived) + refresh (httpOnly cookie).

## How to work (enforce these)
1. **Plan before code.** For anything non-trivial, propose files-to-touch + approach + tests, and
   WAIT for approval. Do not write feature code unprompted.
2. **Vertical slices.** One feature end-to-end (migration → API → UI → test), then stop.
3. **Tests/evals first on AI features.** Build the eval harness before the RAG feature it measures.
4. **Update docs.** After any architectural choice, append to `DECISIONS.md` (ADR format). Check off
   slices in `ROADMAP.md`.
5. **Explain tradeoffs.** After a slice, state what would break at 10k users.
6. **Small commits.** One slice = one focused commit.

## Conventions
- **Structure:** `app/` (Next.js), `ai-service/` (FastAPI), `packages/ui/` (shared kit), `docs/`.
- **API responses:** JSON `{ data }` on success, `{ error: { code, message } }` on failure. Never leak stack traces.
- **Naming:** camelCase (TS), snake_case (Python), kebab-case files where idiomatic.
- **Errors:** handle explicitly; no silent catches. Surface user-facing errors as toasts.
- **State:** React state only in artifacts/components — **never** browser localStorage for app data.
- **Migrations:** every schema change is a migration file; never hand-edit the DB.
- **Async work** (ingestion): background jobs, never in the request path.

## Hard rules — do NOT
- Do NOT put secrets in code. Use env vars; document them in `.env.example`.
- Do NOT bypass the auth guard or query across `tenant_id` boundaries. Every data query is
  tenant-scoped. Cross-tenant retrieval must be impossible (enforce at the data layer / RLS).
- Do NOT add a dependency without asking.
- Do NOT change the DB schema without a migration.
- Do NOT emit an ungrounded answer — if the answer isn't supported by retrieved chunks, escalate.
- Do NOT skip the eval harness "for now."

## Multi-tenancy (critical)
Every table with tenant data carries `tenant_id`. Retrieval, cache keys, and rate limits are all
tenant-scoped. There is a test proving cross-tenant retrieval returns nothing — keep it green.

## Commands
- Dev: `docker compose up` (app + ai-service + postgres + redis)
- App dev: `cd app && npm run dev` · Test: `npm test` · Lint: `npm run lint`
- AI service: `cd ai-service && uvicorn main:app --reload` · Test: `pytest` · Lint: `ruff check`
- Migrate: `npm run db:migrate`
- Evals: `cd ai-service && python -m evals.run`

## Definition of done for a slice
Runs locally, tests pass, lint clean, docs updated, tenant-scoped, one clean commit.

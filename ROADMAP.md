# ROADMAP.md — Deflekt

> Vertical slices. Build top to bottom. Check off as you go; the agent updates this too.
> Each slice = migration → API → UI → test, then a commit.

## Phase 0 — Foundation (docs + skeleton)
- [x] Repo structure created (`app/`, `ai-service/`, `packages/ui/`, `docs/`)
- [x] Docs committed: CLAUDE.md, ARCHITECTURE.md, DECISIONS.md, ROADMAP.md, .env.example, PRD
- [x] docker-compose (app + ai-service + postgres/pgvector + redis) runs locally
- [x] CI stub (GitHub Actions: lint + test on push)
- [ ] Billing-alarm plan noted for first deploy

## Phase 1 — Shared SaaS shell (REUSABLE TEMPLATE for P2–P5)
- [x] JWT auth: signup, login, email verify, password reset, access+refresh (httpOnly), logout
- [x] Workspace/org model + roles (owner, member) + route/API guards
- [x] App shell: top bar (workspace switcher, account menu) + left nav + content area
- [x] Public pages: landing + pricing
- [x] Placeholder dashboard page
- [ ] Shared UI kit (shadcn/ui + Tailwind) extracted to `packages/ui/`
- [x] Settings: profile · workspace · team (invite, roles)

## Phase 2 — Ingestion
- [x] Upload PDF/MD/HTML → S3 → `documents` row
- [x] Chunk + embed → `chunks` with tenant_id + citation metadata (pgvector)
- [x] Ingestion runs as a background job; `documents.status` tracked
- [x] Sources page: list, status, add/re-sync/remove, chunk count
- [x] Re-ingest invalidates tenant semantic cache
- [x] Test: cross-tenant retrieval returns nothing

## Phase 3 — Retrieval + answer
- [x] Hybrid retrieve (vector + keyword) within tenant + rerank
- [x] Grounded generation with inline citations
- [x] Confidence scoring + gate (below threshold → escalate path)
- [x] Faithfulness check before emitting
- [x] Semantic cache read/write

## Phase 4 — Product surfaces (DONE)
- [x] Playground (internal test chat against current sources)
- [x] Analytics dashboard (deflection rate, escalation list)
- [x] The embeddable widget snippet (`<script>`)
- [x] Widget UI (floating chat bubble, connection to Next.js API)
- [x] Conversations page (searchable log: Q, cited answer, confidence, escalated?)
- [x] Escalations page (queue + reason + resolve + webhook)
- [x] Dashboard: deflection rate, escalation rate, questions this week, doc-gap list

## Phase 5 — Evals (build harness BEFORE trusting Phase 3 numbers) (DONE)
- [x] Golden set: 50–100 Q→source pairs per test tenant (Mocked in run.py)
- [x] Metrics: retrieval recall@k, citation accuracy, faithfulness, deflection precision, escalation rate
- [x] Eval run command + report
- [x] CI gate: fail PR if faithfulness/citation accuracy drops below threshold

## Phase 6 — Ship (DONE)
- [x] Rate limiting on /chat (Redis token bucket, per tenant+session)
- [x] Dockerfiles + nginx reverse proxy
- [x] AWS deploy (EC2/ECS + RDS+pgvector + S3 + Redis) + CloudWatch billing alarm
- [x] CI/CD: test + evals → build → ECR/GHCR → deploy
- [x] Plan-gating (Free/Pro/Team) demonstrated
- [x] README: architecture diagram, DECISIONS narrative, demo, metrics

## Stretch (after DoD only)
- [ ] Auto-suggest doc updates from unanswered questions
- [ ] Slack/Zendesk webhook on escalation
- [ ] Per-tenant analytics export

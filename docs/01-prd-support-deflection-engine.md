# PRD 01 — Support Deflection Engine (Multi-Tenant RAG SaaS)

> **Role in portfolio:** Foundation. This is where deployment becomes boring so later projects can
> be about agents. Primary domains: **Full-Stack + RAG + AWS/CI-CD + Evals + Multi-tenancy.**
> **Suggested stack:** Next.js (App Router, TypeScript) frontend + API routes for the app; a
> **Python FastAPI** service for the AI/ingestion layer; Postgres + **pgvector**; Redis. This
> mix is deliberate — it's the most common real production split (TS product layer, Python AI
> layer) and shows you can wire two services together.

---

## 0. Product profile

- **Product name:** **Deflekt** (alt: *Grounded*, *ReplyWise*, *Helpdesk Zero*)
- **Tagline:** "Answer the tickets you shouldn't have to."
- **One-liner positioning:** Deflekt connects to your help center and answers repetitive customer
  questions with cited, grounded replies — and hands off to a human the moment it isn't sure.
- **Category:** AI customer-support / ticket deflection SaaS.
- **Who pays:** support leads and ops at SaaS/e-commerce/fintech companies with a knowledge base and
  a busy queue. Value = fewer human-handled tickets, 24/7 coverage, lower cost per resolution.
- **Pricing concept:** Free (1 source, 100 answers/mo) · Pro (multiple sources, analytics) · Team
  (SSO, higher limits). Gate answer-volume + sources by plan.
- **Visual theme:** trustworthy, calm, "quietly competent." Cool slate/blue base with a confident
  accent (electric blue or teal). Rounded cards, generous whitespace, a friendly-but-serious tone.
  Think Linear-meets-Intercom. Citation chips and a visible confidence indicator are signature UI
  elements — they *are* the trust story, so make them look good.

## 0b. SaaS surface / page map

**Public:** landing page · pricing · login · signup · forgot/reset password · verify email.

**Onboarding (first-run):** create workspace → connect first source (upload docs or paste help-center
URL) → watch ingestion complete → ask a test question → copy the widget embed snippet. Get them to a
working answer in under 5 minutes.

**Authenticated app (shell: top bar + left nav):**
- **Dashboard** — deflection rate, escalation rate, questions this week, top unanswered questions
  (doc-gap list), recent conversations. This is the money screen.
- **Sources** — list of connected docs/URLs with ingestion status; add/re-sync/remove; per-source
  chunk count.
- **Conversations** — searchable log of end-customer chats; open one to see the Q, the cited answer,
  confidence, and whether it escalated.
- **Escalations** — queue of handed-off conversations + reason; mark resolved; webhook config.
- **Playground** — an internal chat to test the assistant against current sources before it goes live.
- **Widget** — customize theme/greeting, copy the embed snippet, preview.
- **Settings** — profile · workspace · team/members (invite, roles: owner/member) · plan/billing · API keys.

**End-customer surface:** the embeddable chat **widget** (JS snippet) that renders on the customer's
own site — per-tenant themed, shows citations, and does the confidence→handoff live.

**Auth:** JWT access + refresh (httpOnly), email verification, password reset, role-guarded routes
(owner vs member), all data scoped to `workspace_id`/`tenant_id`.

---

## 1. Problem & opportunity

Tier-1 customer support is repetitive, high-volume, and expensive. Most incoming questions are
variations of "how do I…", "what's my…", "why isn't…" that are already answered somewhere in the
company's docs, help center, or past tickets. Companies pay humans to re-answer them around the
clock. The market has validated this so hard that major vendors now price *per resolution* because
the ROI is measurable.

**The gap:** businesses leak support-agent hours (and after-hours coverage they can't staff) on
questions a well-grounded RAG system can deflect — *with citations, and with a safe handoff when it
isn't sure.* The "with citations" and "safe handoff" parts are what separate a real product from a
hallucination machine.

**Who has it:** any company with a knowledge base and a support queue — SaaS, e-commerce, fintech,
telecom. You'll build it multi-tenant so it's a SaaS, not a one-off.

---

## 2. What it is (one sentence)

A multi-tenant SaaS where a business connects its docs/help-center, and end customers get
cited, grounded answers in a chat widget — with a confidence threshold that hands off to a human
(or opens a ticket) whenever the system isn't sure enough to answer safely.

---

## 3. Users & core stories

- **Business admin** (tenant): "I upload/connect our docs, embed a chat widget on our site, and see
  a dashboard of what's being asked and what's being deflected vs escalated."
- **End customer**: "I ask a question in the widget and get an answer with sources, or get smoothly
  handed to a human."
- **Support lead**: "I review low-confidence answers and gaps in our docs so I can improve coverage."

---

## 4. Scope

### In scope (MVP)
1. **Ingestion**: upload PDFs/markdown/HTML or crawl a help-center URL → clean → chunk → embed →
   store in pgvector, scoped to `tenant_id`.
2. **Retrieval + answer**: hybrid search (vector + keyword) → rerank → answer with inline citations.
3. **Confidence gate**: if retrieval score / answer confidence is below threshold → don't answer;
   escalate (show "connecting you to a human" + create a ticket record).
4. **Chat widget**: embeddable, per-tenant themed.
5. **Admin dashboard**: ingestion status, question log, deflection rate, escalation rate, doc-gap list.
6. **Auth + multi-tenancy**: tenant isolation enforced at the data layer (row-level `tenant_id`,
   never cross-tenant retrieval).
7. **Evals**: offline eval set of Q→expected-source pairs; metrics for citation accuracy,
   faithfulness (answer supported by retrieved context), and deflection precision.
8. **Full SaaS shell** (see §0b): JWT auth (access+refresh, verify, reset), workspace/roles, landing +
   pricing, onboarding flow, the authenticated app shell (top bar + left nav), dashboard, settings
   with team management, and plan-gating (Free/Pro/Team) — built as the reusable template for P2–P5.

### Explicitly out of scope (MVP)
- Live agent chat console (just create the ticket record / webhook out).
- Fine-tuning (not justified here — RAG is enough; you fine-tune in P4).
- Multi-agent anything (that's P3).

---

## 5. Architecture

```
                    ┌────────────────────────┐
   Business site ──▶│  Chat widget (JS embed) │
                    └───────────┬────────────┘
                                │ /chat (tenant-scoped, rate-limited)
                    ┌───────────▼────────────┐        ┌──────────────────┐
                    │  Next.js app + API      │◀──────▶│  Postgres +      │
                    │  (auth, tenants, dash)  │        │  pgvector + RLS  │
                    └───────────┬────────────┘        └──────────────────┘
                                │ internal call            ▲
                    ┌───────────▼────────────┐             │ embeddings/chunks
                    │  FastAPI AI service     │─────────────┘
                    │  ingest · retrieve ·    │        ┌──────────────────┐
                    │  rerank · answer · eval │◀──────▶│  Redis (semantic │
                    └───────────┬────────────┘        │  cache + rate lim)│
                                │                      └──────────────────┘
                    ┌───────────▼────────────┐
                    │  S3 (raw uploaded docs) │
                    └─────────────────────────┘
```

**Key design decisions (make these consciously — they're your interview answers):**

- **pgvector over a dedicated vector DB (Pinecone/Weaviate) for MVP.** Tradeoff: pgvector keeps you
  on one datastore (simpler, free-tier friendly, transactional tenant isolation for free). A
  dedicated vector DB scales retrieval better and offers richer filtering, but adds a paid service
  and a second consistency boundary. *At your scale, pgvector is correct; note in DECISIONS.md the
  migration trigger (index size / p99 latency) where you'd switch.*
- **Hybrid search + rerank, not pure vector.** Pure vector misses exact-match / keyword queries
  ("error code 402"). Hybrid + a reranker measurably lifts citation accuracy. Tradeoff: more moving
  parts, more latency; justify with eval numbers.
- **Semantic cache in Redis.** Cache answers keyed by embedding-similarity of the question, per
  tenant. Cuts cost and latency on repeated questions (support questions repeat *a lot*). Tradeoff:
  risk of serving a stale answer after docs change → invalidate tenant cache on re-ingest.
- **Confidence gate is a product feature, not a technical nicety.** The willingness to *not answer*
  is what makes it deployable. Threshold tuned against your eval set.

---

## 6. Data model (core tables)

- `tenants(id, name, plan, widget_theme, created_at)`
- `users(id, tenant_id, email, role)`
- `documents(id, tenant_id, source_type, source_ref, status, ingested_at)`
- `chunks(id, tenant_id, document_id, content, embedding vector, metadata)` — **RLS on tenant_id**
- `conversations(id, tenant_id, session_id, created_at)`
- `messages(id, conversation_id, role, content, citations jsonb, confidence, escalated)`
- `escalations(id, tenant_id, conversation_id, reason, created_at, resolved)`

---

## 7. AI pipeline detail

**Ingestion:** load → strip boilerplate → chunk (start ~512 tokens, 15% overlap; tune) → embed →
upsert with `tenant_id` + source metadata for citations. Track status so the dashboard can show
progress. Re-ingest invalidates that tenant's semantic cache.

**Query:** embed question → hybrid retrieve top-k within tenant → rerank → build prompt with
retrieved chunks + citation instructions → generate → attach citations → compute confidence.
If confidence < threshold → escalate path.

**Token optimization:** only inject retrieved chunks (never whole KB), cap context, use a cheap
model for the retrieval-relevance check and the larger model only for final generation.

**Guardrail:** answer must be grounded — post-check that cited chunks actually support the answer
(a lightweight faithfulness check). If not grounded → escalate rather than emit.

---

## 8. Evals (build these in week 4, run in CI)

- **Eval set**: 50–100 real-ish questions per test tenant, each labeled with the correct source
  chunk(s) and a gold answer.
- **Metrics**:
  - *Retrieval recall@k* — did the right chunk get retrieved?
  - *Citation accuracy* — do emitted citations point to supporting chunks?
  - *Faithfulness* — is the answer entailed by retrieved context? (LLM-as-judge.)
  - *Deflection precision* — of answers it chose to give, how many were actually correct? (This is
    the one that matters for trust — a confident wrong answer is worse than an escalation.)
  - *Escalation rate* — sanity check it's not escalating everything.
- **Gate**: CI fails if faithfulness or citation accuracy drops below threshold on a PR. This is
  eval-driven development and it's a strong thing to show.

---

## 9. System-design touchpoints (what to demonstrate)

- **Rate limiting** on `/chat` per tenant + per session (Redis token bucket) — prevents a single
  embed from draining your LLM budget.
- **Caching** — semantic cache (above) + standard cache on embeddings of repeated queries.
- **Concurrency** — ingestion of large doc sets runs as background jobs, not in the request.
- **Honest scale note**: no sharding, no k8s. Single small EC2 + RDS free tier handles this. Say so.

---

## 10. Deployment & CI/CD (this is the whole point of P1)

- **Docker**: two images (Next app, FastAPI service) + docker-compose for local (app + FastAPI +
  Postgres/pgvector + Redis).
- **AWS**: EC2 (or ECS Fargate later) for the two services, RDS Postgres (free tier) with pgvector,
  S3 for raw docs, CloudWatch billing alarm **on day one**.
- **CI/CD**: GitHub Actions → run tests + evals → build images → push to ECR → deploy. Start with a
  simple SSH-to-EC2 deploy if ECS feels heavy; upgrade later.
- **nginx** as reverse proxy in front (TLS, routing app vs AI service) — light touch here, heavier in P2.

---

## 11. Definition of Done

- [ ] End-to-end: connect docs → ask in widget → cited answer or clean escalation.
- [ ] Multi-tenant with proven isolation (a test that cross-tenant retrieval returns nothing).
- [ ] Deployed on AWS behind CI/CD, billing alarm set.
- [ ] Eval suite runs in CI and gates merges.
- [ ] Dashboard shows deflection rate + doc-gap list.
- [ ] Full SaaS shell working: JWT auth (verify/reset), workspace + roles, landing/pricing/onboarding,
      navigable app (dashboard, sources, conversations, escalations, playground, widget, settings),
      plan-gating demonstrated. This shell is saved as the reusable template for P2–P5.
- [ ] README: architecture diagram, DECISIONS.md tradeoffs, demo, metrics.

---

## 12. Stretch (only after DoD)

- Auto-suggest doc updates from unanswered questions (feeds P4 thinking).
- Slack/Zendesk webhook on escalation.
- Per-tenant analytics export.

---

## 13. How to start with Claude Code

1. Hand it this PRD: *"Spec attached. Propose repo structure + milestone plan for the MVP. No code yet."*
2. First slice: *"Ingestion only — upload a PDF, chunk, embed into pgvector scoped to a tenant_id,
   show stored chunks."*
3. Then retrieval, then the confidence gate, then the widget, then the dashboard, then evals, then deploy.
4. After each slice: *"Explain your choices and what breaks at 10k users"* → paste into DECISIONS.md.

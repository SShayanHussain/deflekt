# ARCHITECTURE.md — Deflekt

## System overview

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

## Services
- **app/ (Next.js)** — product UI, auth, workspace/tenant management, dashboard, and app API routes.
  Calls the AI service for anything RAG. Owns user-facing state.
- **ai-service/ (FastAPI)** — the AI layer: ingestion pipeline, hybrid retrieval + rerank, answer
  generation with citations, confidence scoring, and the eval harness. Stateless; reads/writes DB + Redis + S3.
- **packages/ui/** — shared component kit (shadcn/ui + Tailwind). Reused in P2–P5.

## Data flow — ingestion
upload/crawl → S3 (raw) → clean → chunk (~512 tok, 15% overlap) → embed → upsert into `chunks`
with `tenant_id` + citation metadata → mark `documents.status = ready` → invalidate tenant semantic cache.

## Data flow — query
widget `/chat` → rate-limit (Redis, per tenant+session) → embed question → check semantic cache →
hybrid retrieve top-k within tenant → rerank → build grounded prompt with citation instructions →
generate → faithfulness check → if grounded + confident: answer with citations; else: escalate.

## Key components
- **Hybrid search:** vector (pgvector) + keyword, then rerank. Not pure vector.
- **Confidence gate:** below threshold → don't answer → create `escalation` + return handoff.
- **Semantic cache:** Redis, keyed by question-embedding similarity, per tenant; invalidated on re-ingest.
- **Rate limiting:** Redis token bucket, per tenant + per session.

## Deployment (target)
Two Docker images (app, ai-service) behind **nginx** (TLS, routing). AWS: EC2/ECS, RDS Postgres+pgvector,
S3, Redis (container early, ElastiCache later). CI/CD via GitHub Actions (test + evals → build → ECR → deploy).
CloudWatch billing alarm from day one.

## Scale honesty
Single small EC2 + RDS free tier handles the target load. **No sharding, no k8s.** See DECISIONS.md
for the triggers where that changes.

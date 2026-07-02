# DECISIONS.md — Deflekt

> Architecture Decision Records. Append one after every meaningful choice. Format below.
> This log is both the anti-drift memory and the interview script.

```
## [YYYY-MM-DD] Title
Context: why this came up.
Decision: what we chose.
Tradeoff: what we gave up.
Revisit when: the trigger that would change the decision.
```

---

## [seed] pgvector over a dedicated vector DB (Pinecone/Weaviate) for MVP
Context: need vector search; no paid services yet; want transactional tenant isolation.
Decision: pgvector inside the existing Postgres — one datastore.
Tradeoff: less specialized scaling/filtering than a dedicated vector DB; retrieval throughput ceiling is lower.
Revisit when: index > ~1M vectors OR p99 retrieval latency exceeds target OR need advanced metadata filtering.

## [seed] Hybrid search + rerank instead of pure vector
Context: pure vector misses exact-match/keyword queries (e.g. "error 402").
Decision: vector + keyword retrieval, then a reranker before generation.
Tradeoff: more moving parts, added latency.
Revisit when: eval numbers show rerank isn't earning its latency, or a better single-retriever emerges.

## [seed] Semantic cache in Redis, per tenant
Context: support questions repeat heavily; LLM cost/latency matter.
Decision: cache answers keyed by question-embedding similarity, scoped per tenant; invalidate on re-ingest.
Tradeoff: risk of stale answers after docs change (mitigated by invalidation).
Revisit when: cache hit rate is low, or staleness incidents appear.

## [seed] Confidence gate (abstain + escalate) as a product feature
Context: a confident wrong answer is worse than a handoff; deployability depends on knowing when NOT to answer.
Decision: below-threshold confidence → don't answer → escalate to human + create ticket record.
Tradeoff: some answerable questions get escalated (tunable via threshold against eval set).
Revisit when: deflection precision vs escalation rate needs rebalancing per tenant.

## [seed] No sharding / no k8s at MVP scale
Context: target load fits a single small instance + RDS free tier.
Decision: single EC2/ECS + RDS; nginx reverse proxy; queue for ingestion only.
Tradeoff: manual scaling ceiling; would need re-architecture for very large multi-tenant load.
Revisit when: single-node write throughput or table size becomes the bottleneck (then partition `chunks`/`messages` by tenant/time; consider ECS autoscaling before k8s).

## [2026-07-01] Phase 0 foundation — Node 20, npm workspaces, deferred shadcn
Context: setting up the development skeleton; needed to decide Node version, monorepo tooling, and when to init the shared UI kit.
Decision: Node 20 LTS (safe, widely supported); npm workspaces at root (built-in, matches existing `npm run` commands, zero extra tooling); defer shadcn/ui init to Phase 1 (don't add deps before they're needed — standing rule). Next.js standalone output mode for Docker.
Tradeoff: npm workspaces has weaker phantom-dep prevention than pnpm; acceptable at this project size.
Revisit when: workspace count grows past ~5, or build times justify turborepo; or pnpm's strictness becomes valuable.

## [2026-07-01] Phase 1 — In-memory Access Token & Refresh Cookie
Context: need secure authentication for a SaaS.
Decision: JWT access tokens (short-lived, 15m) kept in memory (AuthContext), combined with httpOnly refresh tokens (long-lived, 14d). Middleware protects API routes with JWT verification, and protects Pages by checking for the refresh cookie.
Tradeoff: requires a /refresh endpoint call on initial load or interval, slightly adding to client-side network overhead compared to storing access tokens in localStorage, but significantly more secure against XSS.
Revisit when: scaling to multiple domains/subdomains, requiring cross-domain auth sharing.

## [2026-07-01] Phase 1 — Defer packages/ui extraction
Context: shadcn/ui components were initialized in `app/src/components`. ROADMAP called for extraction to `packages/ui/`.
Decision: Keep UI components inside `app/` for now to avoid setting up heavy monorepo tooling (like turborepo + typescript config sharing) during the initial vertical slices.
Tradeoff: P2–P5 services will not have direct access to the UI package if they are built outside the Next.js app context (though currently everything UI-related is in `app/`).
Revisit when: we start building a separate frontend app (e.g., a standalone widget iframe app outside the main Next.js project).

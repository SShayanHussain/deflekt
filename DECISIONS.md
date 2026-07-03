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

## [2026-07-03] Migrations run from a one-shot container on deploy (not the app image)
Context: production uses RDS (no local Postgres container, so `db/init.sql` never runs there), and nothing in CI applied schema changes — the lean Next.js standalone runtime image contains neither drizzle-kit nor the migration SQL. RDS was also hand-migrated earlier, so naive `drizzle-kit migrate` would try to re-create existing tables and abort the deploy.
Decision: ship a dedicated `deflekt-migrate` image (`app/Dockerfile.migrate` + `app/scripts/migrate.mjs`) run via `docker compose run --rm migrate` on the EC2 host (which can reach RDS) before `up -d`. The script ensures the pgvector extension, baselines an already-migrated database into Drizzle's tracking table, then applies pending migrations. `set -e` in the deploy script makes a migration failure abort the deploy without restarting the app.
Tradeoff: an extra image to build/push and a migration step that gates every deploy; baseline probes are coupled to specific migration tags and must be kept in sync when migrations are added.
Revisit when: migrations become numerous/complex enough to warrant a real migration runner or a managed schema pipeline, or RDS becomes reachable from CI so migrations can run from the runner instead of the host.

## [2026-07-03] Ingestion fails loudly instead of fabricating mock content
Context: when no storage backend was available, ingestion stored placeholder "mock document" text as a chunk, which silently poisoned retrieval and produced confident answers grounded in junk. The faithfulness/grounding check also existed but was never wired into `/chat`.
Decision: ingestion now raises (document → `failed`) when it cannot fetch the real file, purges prior chunks on re-ingest (idempotent), and invalidates the tenant semantic cache on success. `/chat` now runs the faithfulness check and escalates when the answer is not entailed by retrieved chunks. Dummy/no-key mode returns confidence 0.0 so it escalates rather than serving a fake answer.
Tradeoff: one extra LLM call per confident answer (faithfulness), and documents that can't be fetched now show as failed instead of appearing to succeed.
Revisit when: faithfulness-check latency/cost outweighs its value on the eval set, or a cheaper grounding signal (e.g. NLI model) replaces the LLM judge.

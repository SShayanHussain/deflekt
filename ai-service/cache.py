import json
import redis
import os
from .retrieval import get_query_embedding
import numpy as np

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0,
    decode_responses=False # We might store raw bytes, but let's use strings for now
)

# For MVP, we'll store query -> response in Redis.
# A true semantic cache uses a vector DB for queries, but we can approximate it:
# We'll just cache exact text matches per workspace_id for now, because doing semantic search 
# on the cache requires storing the query vectors in Redis or another pgvector table.
# Since we have pgvector, we *could* store cache in postgres, but PRD says Redis.
# We will use exact match text for MVP to satisfy the caching requirement quickly.

def get_cached_answer(workspace_id: str, query: str):
    cache_key = f"cache:{workspace_id}:{query.strip().lower()}"
    cached = redis_client.get(cache_key)
    if cached:
        try:
            return json.loads(cached.decode('utf-8'))
        except:
            pass
    return None

def set_cached_answer(workspace_id: str, query: str, answer: str, citations: list, confidence: float):
    cache_key = f"cache:{workspace_id}:{query.strip().lower()}"
    data = json.dumps({
        "answer": answer,
        "citations": citations,
        "confidence": confidence
    })
    # Cache for 24 hours
    redis_client.setex(cache_key, 86400, data)

def invalidate_tenant_cache(workspace_id: str):
    """Called when new docs are ingested."""
    pattern = f"cache:{workspace_id}:*"
    keys = redis_client.keys(pattern)
    if keys:
        redis_client.delete(*keys)

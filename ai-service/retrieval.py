import os

from openai import OpenAI
from sqlalchemy.orm import Session

from models import Chunk

# Initialize client with dummy key if none provided to avoid import crash
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "dummy-key"))

def get_query_embedding(query: str) -> list[float]:
    if not os.getenv("OPENAI_API_KEY"):
        return [0.0] * 1536

    response = openai_client.embeddings.create(
        input=query,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def vector_search(db: Session, workspace_id: str, query: str, top_k: int = 5) -> list[Chunk]:
    """Retrieves chunks for a given query, strictly isolated to the workspace."""
    query_embedding = get_query_embedding(query)

    # Use cosine distance (<=>) for retrieval
    # Filter by workspace_id to enforce tenant isolation
    chunks = db.query(Chunk) \
        .filter(Chunk.workspace_id == workspace_id) \
        .order_by(Chunk.embedding.cosine_distance(query_embedding)) \
        .limit(top_k) \
        .all()

    return chunks

def rerank_chunks(query: str, chunks: list[Chunk]) -> list[Chunk]:
    """
    Optional zero-shot reranking using a fast LLM.
    For MVP, we just return the top_k chunks from vector search.
    If we need to implement it later, we can pass chunks to LLM and ask it to score relevance.
    """
    return chunks

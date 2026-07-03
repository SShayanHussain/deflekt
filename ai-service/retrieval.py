import os

from google import genai
from google.genai import types
from sqlalchemy.orm import Session

from models import Chunk

# Initialize client with dummy key if none provided to avoid import crash
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or "dummy-key"
gemini_client = genai.Client(api_key=api_key)

# Embedding model + dimension. The `chunks.embedding` column is vector(768), so
# we pin the output dimensionality to match. Query and document embeddings MUST
# use the same model + dimension to share a vector space.
EMBED_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")
EMBED_DIM = int(os.getenv("EMBEDDING_DIM", "768"))

def get_query_embedding(query: str) -> list[float]:
    if api_key == "dummy-key":
        return [0.0] * EMBED_DIM

    response = gemini_client.models.embed_content(
        model=EMBED_MODEL,
        contents=query,
        config=types.EmbedContentConfig(output_dimensionality=EMBED_DIM),
    )
    return response.embeddings[0].values

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

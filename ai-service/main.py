"""Deflekt AI Service — FastAPI entry point."""

from fastapi import FastAPI

app = FastAPI(
    title="Deflekt AI Service",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)


@app.get("/health")
async def health() -> dict:
    """Health check endpoint used by docker-compose and CI."""
    return {"status": "ok", "service": "ai-service"}

from pydantic import BaseModel
class IngestRequest(BaseModel):
    document_id: str

@app.post("/ingest")
async def ingest(req: IngestRequest) -> dict:
    """Dispatches a Celery task to ingest a document."""
    from ingestion import ingest_document
    ingest_document.delay(req.document_id)
    return {"status": "dispatched", "document_id": req.document_id}

class ChatRequest(BaseModel):
    workspace_id: str
    query: str

@app.post("/chat")
async def chat(req: ChatRequest) -> dict:
    """Handles chat generation, retrieval, and confidence gating."""
    from db import SessionLocal
    from cache import get_cached_answer, set_cached_answer
    from retrieval import vector_search, rerank_chunks
    from chat import generate_answer
    
    # 1. Check semantic cache
    cached = get_cached_answer(req.workspace_id, req.query)
    if cached:
        return {"data": {"answer": cached["answer"], "citations": cached["citations"], "confidence": cached["confidence"], "escalated": cached["confidence"] < 0.72}}

    db = SessionLocal()
    try:
        # 2. Retrieve & Rerank
        chunks = vector_search(db, req.workspace_id, req.query, top_k=3)
        chunks = rerank_chunks(req.query, chunks)
        
        # 3. Generate Answer & Compute Confidence
        answer, citations, confidence = generate_answer(req.query, chunks)
        escalated = confidence < 0.72
        
        # 4. Cache the result
        set_cached_answer(req.workspace_id, req.query, answer, citations, confidence)
        
        return {
            "data": {
                "answer": answer,
                "citations": citations,
                "confidence": confidence,
                "escalated": escalated
            }
        }
    finally:
        db.close()

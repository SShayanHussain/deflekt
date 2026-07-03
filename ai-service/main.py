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

# Confidence below this threshold escalates to a human.
CONFIDENCE_THRESHOLD = 0.72
HANDOFF_MESSAGE = (
    "I'm not confident I can answer that accurately, so I'm handing this to a "
    "human who can help."
)

@app.post("/chat")
async def chat(req: ChatRequest) -> dict:
    """Handles chat generation, retrieval, and confidence gating."""
    from cache import get_cached_answer, set_cached_answer
    from chat import check_faithfulness, generate_answer
    from db import SessionLocal
    from retrieval import rerank_chunks, vector_search

    # 1. Check semantic cache
    cached = get_cached_answer(req.workspace_id, req.query)
    if cached:
        return {"data": {"answer": cached["answer"], "citations": cached["citations"], "confidence": cached["confidence"], "escalated": cached["confidence"] < CONFIDENCE_THRESHOLD}}

    db = SessionLocal()
    try:
        # 2. Retrieve & Rerank
        chunks = vector_search(db, req.workspace_id, req.query, top_k=3)
        chunks = rerank_chunks(req.query, chunks)

        # 3. Generate Answer & Compute Confidence
        answer, citations, confidence = generate_answer(req.query, chunks)

        # 3b. Grounding gate — verify the answer is entailed by the retrieved
        # chunks before we serve it. This is a hard rule: never emit an
        # ungrounded answer. We only pay for this LLM check when the model was
        # otherwise confident enough to answer.
        if chunks and confidence >= CONFIDENCE_THRESHOLD and not check_faithfulness(req.query, answer, chunks):
            answer, citations, confidence = HANDOFF_MESSAGE, [], 0.0

        escalated = confidence < CONFIDENCE_THRESHOLD

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

import os
import tempfile
import traceback
from datetime import UTC, datetime

import boto3
from google import genai
from google.genai import types
from langchain_text_splitters import RecursiveCharacterTextSplitter

from celery_app import celery_app
from db import SessionLocal
from models import Chunk, Document

s3_client = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION", "us-east-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)
BUCKET_NAME = os.getenv("AWS_S3_BUCKET")

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
gemini_client = genai.Client(api_key=api_key) if api_key else None

# Must match retrieval.py — query and document embeddings share a vector space,
# and the dimension must match the vector(768) column in the chunks table.
EMBED_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")
EMBED_DIM = int(os.getenv("EMBEDDING_DIM", "768"))

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
)

def parse_file(file_path: str, doc_type: str) -> str:
    """Extracts raw text from the file."""
    if doc_type == "pdf":
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        return "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
    elif doc_type == "md":
        with open(file_path, encoding="utf-8") as f:
            return f.read()
    elif doc_type == "html":
        from bs4 import BeautifulSoup
        with open(file_path, encoding="utf-8") as f:
            soup = BeautifulSoup(f.read(), "html.parser")
            return soup.get_text(separator="\n")
    return ""

def get_embeddings(texts: list[str]) -> list[list[float]]:
    if not gemini_client:
        # For local dev without API key, just generate dummy embeddings
        return [[0.0] * EMBED_DIM for _ in texts]

    # Embed one chunk per request. gemini-embedding-001 does not accept batched
    # inputs on the Gemini API, so a loop is the portable path (ingestion runs
    # in a background worker, so the extra latency is acceptable).
    embeddings: list[list[float]] = []
    for text in texts:
        response = gemini_client.models.embed_content(
            model=EMBED_MODEL,
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=EMBED_DIM),
        )
        embeddings.append(response.embeddings[0].values)
    return embeddings

@celery_app.task(name="ingest_document")
def ingest_document(document_id: str):
    db = SessionLocal()
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        db.close()
        return

    downloaded_tmp: str | None = None
    try:
        # Mark as processing
        doc.status = "processing"
        doc.updated_at = datetime.now(UTC)
        db.commit()

        # Resolve the source file. We never fabricate mock text: if the file
        # cannot be fetched we fail loudly so a bad document is visible in the
        # UI instead of silently poisoning the vector index with junk content.
        if doc.url.startswith("local://"):
            file_path = os.path.join("/app/uploads", doc.url[len("local://"):])
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Local source file not found: {file_path}")
        elif BUCKET_NAME and not doc.url.startswith("mock-s3-key"):
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{doc.type}") as tmp:
                downloaded_tmp = tmp.name
            s3_client.download_file(BUCKET_NAME, doc.url, downloaded_tmp)
            file_path = downloaded_tmp
        else:
            raise ValueError(
                "No storage backend available to fetch this document. Configure "
                "AWS S3 (AWS_S3_BUCKET + credentials) or re-upload so the file is "
                f"saved to local storage. (url={doc.url!r})"
            )

        # Parse
        raw_text = parse_file(file_path, doc.type)

        if not raw_text.strip():
            raise ValueError("No text extracted from document")

        # Chunk
        chunks = text_splitter.split_text(raw_text)
        if not chunks:
            raise ValueError("Document could not be chunked")

        # Embed (in batches of 100 to respect API limits if needed, but for MVP one shot is fine for small docs)
        embeddings = get_embeddings(chunks)

        # Idempotent re-ingest: drop any chunks previously produced for this
        # document (e.g. legacy mock chunks) before writing the fresh set.
        db.query(Chunk).filter(Chunk.document_id == doc.id).delete()

        # Save chunks
        db_chunks = []
        for i, text in enumerate(chunks):
            db_chunks.append(
                Chunk(
                    workspace_id=doc.workspace_id,
                    document_id=doc.id,
                    content=text,
                    embedding=embeddings[i],
                    metadata_={"chunk_index": i}
                )
            )
        db.add_all(db_chunks)

        # Mark as completed
        doc.status = "completed"
        doc.updated_at = datetime.now(UTC)
        db.commit()

        # Invalidate the tenant's semantic cache so previously cached answers
        # (including any stale/mock answers) are recomputed against fresh docs.
        try:
            from cache import invalidate_tenant_cache
            invalidate_tenant_cache(str(doc.workspace_id))
        except Exception as cache_err:  # cache failures must not fail ingestion
            print(f"Cache invalidation failed for {doc.workspace_id}: {cache_err}", flush=True)

    except Exception:
        db.rollback()
        doc.status = "failed"
        doc.error_message = traceback.format_exc()
        doc.updated_at = datetime.now(UTC)
        db.commit()
    finally:
        # Only remove files we downloaded to a temp path; never delete the
        # user's uploaded file in the shared local-storage volume.
        if downloaded_tmp and os.path.exists(downloaded_tmp):
            os.remove(downloaded_tmp)
        db.close()

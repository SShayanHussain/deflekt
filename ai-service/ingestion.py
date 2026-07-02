import os
import tempfile
import traceback
from datetime import UTC, datetime

import boto3
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import OpenAI

from .celery_app import celery_app
from .db import SessionLocal
from .models import Chunk, Document

s3_client = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION", "us-east-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)
BUCKET_NAME = os.getenv("AWS_S3_BUCKET")

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
    if not os.getenv("OPENAI_API_KEY"):
        # For local dev without API key, just generate dummy embeddings
        return [[0.0] * 1536 for _ in texts]

    response = openai_client.embeddings.create(
        input=texts,
        model="text-embedding-3-small"
    )
    return [data.embedding for data in response.data]

@celery_app.task(name="ingest_document")
def ingest_document(document_id: str):
    db = SessionLocal()
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        db.close()
        return

    try:
        # Mark as processing
        doc.status = "processing"
        doc.updated_at = datetime.now(UTC)
        db.commit()

        # Download from S3
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            if not doc.url.startswith("mock-s3-key") and BUCKET_NAME:
                s3_client.download_file(BUCKET_NAME, doc.url, tmp.name)
                file_path = tmp.name
            else:
                # If mock, we just use a dummy text
                file_path = None
                raw_text = "This is a mock document because no AWS credentials were provided."

        # Parse
        if file_path:
            raw_text = parse_file(file_path, doc.type)
            os.remove(file_path)

        if not raw_text.strip():
            raise ValueError("No text extracted from document")

        # Chunk
        chunks = text_splitter.split_text(raw_text)
        if not chunks:
            raise ValueError("Document could not be chunked")

        # Embed (in batches of 100 to respect API limits if needed, but for MVP one shot is fine for small docs)
        embeddings = get_embeddings(chunks)

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

    except Exception:
        db.rollback()
        doc.status = "failed"
        doc.error_message = traceback.format_exc()
        doc.updated_at = datetime.now(UTC)
        db.commit()
    finally:
        db.close()

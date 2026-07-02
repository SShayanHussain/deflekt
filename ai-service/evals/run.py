import json
import os
import sys
import uuid

from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'app', '.env')
load_dotenv(env_path)

# Ensure the parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from openai import OpenAI

from chat import check_faithfulness, generate_answer
from db import SessionLocal
from models import Chunk, Document
from retrieval import vector_search

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "dummy-key"))

def setup_test_data(db_session):
    print("Setting up test data...")
    from db import engine
    from models import Base
    from sqlalchemy.sql import text
    
    # Ensure vector extension exists
    try:
        db_session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        db_session.commit()
    except Exception as e:
        print(f"Failed to create vector extension: {e}")

    # Create all tables defined in models.py
    Base.metadata.create_all(bind=engine)
    
    # Manually create workspaces table if not exists (managed by app)
    try:
        db_session.execute(text("CREATE TABLE IF NOT EXISTS workspaces (id UUID PRIMARY KEY, name VARCHAR, slug VARCHAR, created_at TIMESTAMP, updated_at TIMESTAMP)"))
        db_session.commit()
    except Exception as e:
        print(f"Failed to create workspaces table: {e}")

    workspace_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    from sqlalchemy.sql import text
    try:
        db_session.execute(text("INSERT INTO workspaces (id, name, slug, created_at, updated_at) VALUES (:id, 'Test WS', 'test-ws-' || :id, now(), now())"), {"id": workspace_id})
    except Exception as e:
        print(f"Workspace creation failed: {e}")

    doc = Document(id=doc_id, workspace_id=workspace_id, name="Help Center", type="md", url="mock", status="completed")
    from sqlalchemy.sql import func
    doc.created_at = func.now()
    doc.updated_at = func.now()
    db_session.add(doc)
    db_session.flush()

    # We embed the chunks so they can be retrieved
    chunks_data = [
        {"id": uuid.uuid4(), "text": "To reset your password, navigate to the login screen and click 'Forgot Password'. You will receive an email with reset instructions."},
        {"id": uuid.uuid4(), "text": "Deflekt workspaces are strictly for internal team members. External guests or freelancers cannot be invited unless they have a company email address."},
        {"id": uuid.uuid4(), "text": "The deflection engine uses a confidence threshold. If the generated answer's confidence falls below this threshold (default 0.72), the question is escalated to a human agent instead of answering."}
    ]

    if os.getenv("OPENAI_API_KEY") and os.getenv("OPENAI_API_KEY") != "dummy-key":
        try:
            response = openai_client.embeddings.create(
                input=[c["text"] for c in chunks_data],
                model="text-embedding-3-small"
            )
            embeddings = [data.embedding for data in response.data]
        except Exception as e:
            print(f"Failed to generate test embeddings: {e}")
            return None, None
    else:
        # Mock embeddings
        embeddings = [[0.0] * 1536 for _ in chunks_data]

    for i, c in enumerate(chunks_data):
        db_session.add(Chunk(
            id=c["id"],
            workspace_id=workspace_id,
            document_id=doc_id,
            content=c["text"],
            embedding=embeddings[i]
        ))

    db_session.commit()
    return workspace_id, chunks_data

def teardown_test_data(db_session, workspace_id):
    print("Tearing down test data...")
    db_session.query(Chunk).filter(Chunk.workspace_id == workspace_id).delete()
    db_session.query(Document).filter(Document.workspace_id == workspace_id).delete()

    from sqlalchemy.sql import text
    db_session.execute(text("DELETE FROM workspaces WHERE id = :id"), {"id": workspace_id})
    db_session.commit()

def run_evals():
    db = SessionLocal()
    workspace_id, expected_chunks = setup_test_data(db)
    if not workspace_id:
        print("Setup failed.")
        return

    try:
        with open(os.path.join(os.path.dirname(__file__), "golden_set.json")) as f:
            golden_set = json.load(f)

        # Update golden set with expected chunk IDs
        for i, item in enumerate(golden_set):
            item["expected_chunk_ids"] = [str(expected_chunks[i]["id"])]

        results = {
            "total": len(golden_set),
            "recall_at_3": 0,
            "faithfulness": 0,
            "citation_accuracy": 0,
            "deflection_precision": 0,
            "escalation_rate": 0
        }

        print(f"\n--- Running Evals on {results['total']} questions ---\n")

        for item in golden_set:
            q = item["question"]
            item["gold_answer"]
            expected_ids = item["expected_chunk_ids"]

            # 1. Retrieval
            retrieved = vector_search(db, workspace_id, q, top_k=3)
            retrieved_ids = [str(c.id) for c in retrieved]

            # Recall@k
            if any(eid in retrieved_ids for eid in expected_ids):
                results["recall_at_3"] += 1

            # 2. Generation
            answer, citations, confidence = generate_answer(q, retrieved)

            # 3. Confidence Gate
            escalated = confidence < 0.72
            if escalated:
                results["escalation_rate"] += 1

            # 4. Faithfulness (LLM as judge)
            is_faithful = check_faithfulness(q, answer, retrieved)
            if is_faithful:
                results["faithfulness"] += 1

            # 5. Citation Accuracy
            # Check if emitted citations [1] etc actually map to the chunks that contain the info
            # For simplicity, if it cites at least one retrieved chunk, we give it a point.
            if len(citations) > 0 and all(0 <= c - 1 < len(retrieved) for c in citations):
                results["citation_accuracy"] += 1

            # 6. Deflection Precision (was it faithful AND not escalated?)
            if is_faithful and not escalated:
                results["deflection_precision"] += 1

            print(f"Q: {q}")
            print(f"A: {answer} (Conf: {confidence:.2f}, Escalated: {escalated}, Faithful: {is_faithful})")
            print("-" * 40)

        # Print Report
        print("\n=== Eval Report ===")
        print(f"Recall@3: {results['recall_at_3']}/{results['total']} ({results['recall_at_3']/results['total']*100:.1f}%)")
        print(f"Faithfulness: {results['faithfulness']}/{results['total']} ({results['faithfulness']/results['total']*100:.1f}%)")
        print(f"Citation Accuracy: {results['citation_accuracy']}/{results['total']} ({results['citation_accuracy']/results['total']*100:.1f}%)")
        print(f"Deflection Precision: {results['deflection_precision']}/{results['total']} ({results['deflection_precision']/results['total']*100:.1f}%)")
        print(f"Escalation Rate: {results['escalation_rate']}/{results['total']} ({results['escalation_rate']/results['total']*100:.1f}%)")

        # CI Gate
        if results['faithfulness'] / results['total'] < 0.8:
            print("\n[FAIL] CI GATE FAILED: Faithfulness below 80%")
            sys.exit(1)
        else:
            print("\n[PASS] CI GATE PASSED")

    finally:
        teardown_test_data(db, workspace_id)
        db.close()

if __name__ == "__main__":
    run_evals()

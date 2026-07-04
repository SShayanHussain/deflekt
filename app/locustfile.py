from locust import HttpUser, task, between
import random

TEST_QUESTIONS = [
    "How do I reset my password?",
    "Can I invite external guests to my workspace?",
    "What is the confidence threshold for escalation?",
    "How does the deflection engine work?",
    "How do I cancel my SaaS subscription?",
    "Where can I view my billing invoices?",
    "Does Deflekt support multi-tenancy?",
    "How do I upload a PDF document for indexing?",
]

# Use valid workspace ID or fallback
VALID_WORKSPACE_ID = "shayanhussain268-aa970d"

class DeflektUser(HttpUser):
    host = "http://54.208.178.218"
    # Simulates realistic user reading & typing time (6-10 sec delay)
    # This prevents triggering the 10 req/min per-IP rate limit on Next.js
    wait_time = between(6, 10)

    @task(4)
    def test_cached_query(self):
        """Tests repetitive queries against Next.js API route (/api/chat)."""
        question = random.choice(TEST_QUESTIONS)
        payload = {
            "workspaceId": VALID_WORKSPACE_ID,
            "query": question
        }
        self.client.post("/api/chat", json=payload, name="/api/chat (Cached)")

    @task(1)
    def test_health_check(self):
        """Pings Next.js API health endpoint."""
        self.client.get("/api/health", name="/api/health")

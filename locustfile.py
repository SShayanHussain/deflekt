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

VALID_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000"

class DeflektUser(HttpUser):
    host = "http://54.208.178.218"
    wait_time = between(6, 10)

    @task(4)
    def test_cached_query(self):
        question = random.choice(TEST_QUESTIONS)
        payload = {
            "workspaceId": VALID_WORKSPACE_ID,
            "query": question
        }
        self.client.post("/api/chat", json=payload, name="/api/chat (Cached)")

    @task(1)
    def test_health_check(self):
        self.client.get("/api/health", name="/api/health")

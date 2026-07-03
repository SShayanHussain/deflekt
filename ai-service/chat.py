import json
import os

from google import genai
from google.genai import types

from models import Chunk

# Initialize client with dummy key if none provided to avoid import crash
# We check both GEMINI_API_KEY and OPENAI_API_KEY to avoid breaking existing setups
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or "dummy-key"
if api_key == "dummy-key":
    print("WARNING: No GEMINI_API_KEY or OPENAI_API_KEY found! Falling back to dummy-key.", flush=True)
else:
    # Print the prefix to prove it was found without leaking the whole key
    key_prefix = api_key[:4] + "***"
    print(f"INFO: Successfully loaded API key starting with {key_prefix}", flush=True)

gemini_client = genai.Client(api_key=api_key)
CHEAP_MODEL = os.getenv("LLM_MODEL_CHEAP", "gemini-2.5-flash")

def generate_answer(query: str, chunks: list[Chunk]) -> tuple[str, list[int], float]:
    """
    Generates an answer using the provided chunks.
    Returns (answer, citations, confidence).
    """
    if not chunks:
        return "I couldn't find any information about that in your docs.", [], 0.0

    context_str = ""
    for i, chunk in enumerate(chunks):
        context_str += f"--- Chunk [{i+1}] ---\n{chunk.content}\n\n"

    prompt = f"""You are a helpful customer support AI.
Answer the user's question using ONLY the provided context chunks.
If the context does not contain the answer, you must output confidence 0.0 and refuse to answer.
When you use information from a chunk, add an inline citation like [1].

Context:
{context_str}

Question:
{query}

Respond in strictly valid JSON format with the following schema:
{{
  "answer": "Your detailed answer here with [1] citations",
  "citations": [1], // Array of chunk indices you cited
  "confidence": 0.95 // A float between 0.0 and 1.0 indicating how confident you are that the context fully answers the question
}}
"""

    if api_key == "dummy-key":
        # Mock response for local dev
        return "This is a mock answer based on chunk [1].", [1], 0.9

    try:
        response = gemini_client.models.generate_content(
            model=CHEAP_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.0
            )
        )
        content = response.text
        data = json.loads(content)
        return data.get("answer", ""), data.get("citations", []), float(data.get("confidence", 0.0))
    except Exception as e:
        print(f"Generation error: {e}")
        return "Failed to generate answer.", [], 0.0


def check_faithfulness(query: str, answer: str, chunks: list[Chunk]) -> bool:
    """
    LLM-as-a-judge: checks if the generated answer is strictly entailed by the chunks.
    Returns True if faithful, False if it hallucinated.
    """
    if api_key == "dummy-key":
        return True # Mock pass

    context_str = ""
    for i, chunk in enumerate(chunks):
        context_str += f"[{i+1}] {chunk.content}\n"

    prompt = f"""Given the following context chunks and an answer, output JSON indicating if the answer is strictly faithful to the context (i.e. contains no unsupported claims).

Context:
{context_str}

Answer:
{answer}

Respond in strictly valid JSON:
{{
  "is_faithful": true // or false
}}
"""
    try:
        response = gemini_client.models.generate_content(
            model=CHEAP_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.0
            )
        )
        content = response.text
        data = json.loads(content)
        return bool(data.get("is_faithful", False))
    except Exception as e:
        print(f"Faithfulness check error: {e}")
        return False

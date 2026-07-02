import os
import json
from openai import OpenAI
from models import Chunk

# Initialize client with dummy key if none provided to avoid import crash
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "dummy-key"))
CHEAP_MODEL = os.getenv("LLM_MODEL_CHEAP", "gpt-4o-mini")

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

    if not os.getenv("OPENAI_API_KEY"):
        # Mock response for local dev
        return "This is a mock answer based on chunk [1].", [1], 0.9

    try:
        response = openai_client.chat.completions.create(
            model=CHEAP_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        content = response.choices[0].message.content
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
    if not os.getenv("OPENAI_API_KEY"):
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
        response = openai_client.chat.completions.create(
            model=CHEAP_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        return bool(data.get("is_faithful", False))
    except Exception as e:
        print(f"Faithfulness check error: {e}")
        return False

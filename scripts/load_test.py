#!/usr/bin/env python3
"""
Deflekt Load Testing & Performance Benchmarking Suite
------------------------------------------------------
Usage:
    python scripts/load_test.py --url http://54.208.178.218 --users 50 --duration 30

Options:
    --url       Target base URL (default: http://localhost:8000)
    --users     Number of concurrent virtual users (default: 20)
    --duration  Test duration in seconds (default: 30)
    --mode      Test mode: 'cached', 'cold', or 'mixed' (default: mixed)
"""

import argparse
import asyncio
import os
import sys
import time
from typing import List, Dict

import httpx


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


class BenchmarkResults:
    def __init__(self):
        self.latencies: List[float] = []
        self.success_count = 0
        self.failure_count = 0
        self.start_time = 0.0
        self.end_time = 0.0

    def add_result(self, latency_ms: float, success: bool):
        if success:
            self.success_count += 1
            self.latencies.append(latency_ms)
        else:
            self.failure_count += 1

    def print_summary(self, target_url: str, users: int, mode: str):
        total_time = self.end_time - self.start_time
        total_requests = self.success_count + self.failure_count
        req_per_sec = total_requests / total_time if total_time > 0 else 0

        sorted_latencies = sorted(self.latencies) if self.latencies else [0]
        p50 = sorted_latencies[int(len(sorted_latencies) * 0.50)]
        p90 = sorted_latencies[int(len(sorted_latencies) * 0.90)]
        p95 = sorted_latencies[int(len(sorted_latencies) * 0.95)]
        p99 = sorted_latencies[int(len(sorted_latencies) * 0.99)]
        avg = sum(sorted_latencies) / len(sorted_latencies) if sorted_latencies else 0

        print("\n" + "=" * 65)
        print(" 🔥 DEFLEKT LOAD TESTING & BENCHMARK REPORT 🔥")
        print("=" * 65)
        print(f"Target URL:            {target_url}")
        print(f"Concurrent Users:      {users}")
        print(f"Test Duration:         {total_time:.2f} seconds")
        print(f"Benchmark Mode:        {mode}")
        print("-" * 65)
        print(f"Total Requests Sent:   {total_requests}")
        print(f"Successful Responses:  {self.success_count}")
        print(f"Failed Responses:      {self.failure_count}")
        print(f"System Throughput:     {req_per_sec:.2f} req/sec")
        print("-" * 65)
        print("Latency Breakdown (ms):")
        print(f"  • Average Latency:   {avg:.2f} ms")
        print(f"  • p50 (Median):       {p50:.2f} ms")
        print(f"  • p90:                {p90:.2f} ms")
        print(f"  • p95:                {p95:.2f} ms")
        print(f"  • p99:                {p99:.2f} ms")
        print(f"  • Min / Max Latency:  {sorted_latencies[0]:.2f} ms / {sorted_latencies[-1]:.2f} ms")
        print("=" * 65 + "\n")


async def simulate_user(
    user_id: int,
    target_url: str,
    duration: float,
    mode: str,
    results: BenchmarkResults,
):
    client = httpx.AsyncClient(timeout=30.0)
    end_test_time = time.time() + duration
    question_idx = 0

    while time.time() < end_test_time:
        question = TEST_QUESTIONS[question_idx % len(TEST_QUESTIONS)]
        
        # In 'cold' mode, append unique timestamp to bypass semantic cache
        if mode == "cold":
            question += f" [{time.time()}]"

        question_idx += 1
        payload = {
            "workspace_id": "00000000-0000-0000-0000-000000000000",
            "question": question,
        }

        start = time.perf_counter()
        try:
            # Send chat request
            response = await client.post(f"{target_url.rstrip('/')}/chat", json=payload)
            elapsed_ms = (time.perf_counter() - start) * 1000.0

            if response.status_code in [200, 201]:
                results.add_result(elapsed_ms, success=True)
            else:
                results.add_result(elapsed_ms, success=False)

        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            results.add_result(elapsed_ms, success=False)

        # Brief delay between user actions
        await asyncio.sleep(0.05)

    await client.aclose()


async def main():
    parser = argparse.ArgumentParser(description="Deflekt Load Testing & Benchmarking Tool")
    parser.add_argument("--url", default="http://localhost:8000", help="Target base URL (default: http://localhost:8000)")
    parser.add_argument("--users", type=int, default=20, help="Number of concurrent virtual users (default: 20)")
    parser.add_argument("--duration", type=int, default=15, help="Test duration in seconds (default: 15)")
    parser.add_argument("--mode", choices=["cached", "cold", "mixed"], default="mixed", help="Test mode")

    args = parser.parse_args()

    print(f"\n🚀 Starting Deflekt Load Test against {args.url}")
    print(f"👥 Virtual Users: {args.users} | ⏱️ Duration: {args.duration}s | 🧪 Mode: {args.mode}\n")

    results = BenchmarkResults()
    results.start_time = time.time()

    tasks = [
        simulate_user(i, args.url, args.duration, args.mode, results)
        for i in range(args.users)
    ]
    await asyncio.gather(*tasks)

    results.end_time = time.time()
    results.print_summary(args.url, args.users, args.mode)


if __name__ == "__main__":
    asyncio.run(main())

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as rateLimit from "@/lib/rate-limit";
import { env } from "@/lib/env";

vi.mock("@/lib/env", () => ({
  env: { AI_SERVICE_URL: "http://mock-ai-service" }
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      conversations: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "mock-id" }])
      })
    })
  }
}));

// We must import the route AFTER mocking its dependencies
const { POST } = await import("../app/api/chat/route");

// Mock the fetch call to the AI service
global.fetch = vi.fn();

function createRequest(body: unknown, ip: string = "127.0.0.1") {
  return new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if workspaceId or query is missing", async () => {
    const req = createRequest({ workspaceId: "ws-1" }); // missing query
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 429 if rate limited", async () => {
    vi.mocked(rateLimit.checkRateLimit).mockResolvedValueOnce(false);
    const req = createRequest({ workspaceId: "ws-1", query: "Hello" });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error.code).toBe("RATE_LIMITED");
  });

  it("should forward request to AI service and return its response", async () => {
    vi.mocked(rateLimit.checkRateLimit).mockResolvedValueOnce(true);
    
    // Mock the AI service response
    const mockAiResponse = {
      data: {
        answer: "This is a grounded answer",
        citations: [1],
        confidence: 0.95,
        escalated: false
      }
    };
    
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAiResponse,
    } as unknown as Response);

    const req = createRequest({ workspaceId: "ws-1", query: "Hello" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.data).toEqual(mockAiResponse.data);
    expect(data.sessionId).toBeDefined();
    
    expect(global.fetch).toHaveBeenCalledWith(`${env.AI_SERVICE_URL}/chat`, expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ workspace_id: "ws-1", query: "Hello" })
    }));
  });

  it("should return 500 if AI service fails", async () => {
    vi.mocked(rateLimit.checkRateLimit).mockResolvedValueOnce(true);
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500
    } as unknown as Response);

    const req = createRequest({ workspaceId: "ws-1", query: "Hello" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

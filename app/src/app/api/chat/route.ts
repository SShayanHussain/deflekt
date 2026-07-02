import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { conversations, messages, escalations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceId, query, sessionId: providedSessionId } = body;

    if (!workspaceId || !query) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "workspaceId and query are required" } },
        { status: 400 }
      );
    }

    const sessionId = providedSessionId || crypto.randomUUID();

    // 1. Rate Limiting per tenant and IP
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimitKey = `rate_limit:${workspaceId}:${ip}`;
    
    // Allow 10 requests per minute
    const isAllowed = await checkRateLimit(rateLimitKey, 10, 60);
    if (!isAllowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
        { status: 429 }
      );
    }

    // 2. Find or Create Conversation
    let conversationId: string;
    const existingConv = await db.query.conversations.findFirst({
      where: and(eq(conversations.workspaceId, workspaceId), eq(conversations.sessionId, sessionId))
    });
    
    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const newConv = await db.insert(conversations).values({
        workspaceId,
        sessionId
      }).returning({ id: conversations.id });
      conversationId = newConv[0].id;
    }

    // 3. Log User Message
    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: query
    });

    // 4. Forward to AI Service
    const aiServiceUrl = env.AI_SERVICE_URL || "http://localhost:8000";
    
    const response = await fetch(`${aiServiceUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspace_id: workspaceId,
        query: query
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service returned ${response.status}`);
    }

    const data = await response.json();
    
    const aiAnswer = data.data?.answer || "Sorry, I could not generate an answer.";
    const citations = data.data?.citations || [];
    const confidence = data.data?.confidence || 0;
    const escalated = data.data?.escalated || false;

    // 5. Log AI Response
    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: aiAnswer,
      citations: citations,
      confidence: confidence.toString(),
      escalated: escalated
    });

    // 6. Log Escalation if necessary
    if (escalated) {
      await db.insert(escalations).values({
        workspaceId,
        conversationId,
        reason: "Low confidence"
      });
    }

    // Include sessionId in response so client can continue conversation
    return NextResponse.json({ ...data, sessionId });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate answer" } },
      { status: 500 }
    );
  }
}

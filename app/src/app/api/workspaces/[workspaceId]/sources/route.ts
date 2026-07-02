import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireMember } from "@/lib/auth/guards";
import { uploadSourceFile } from "@/lib/storage";
import { env } from "@/lib/env";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const session = await requireMember(workspaceId);
    if (session instanceof Response) return session;

    const docs = await db
      .select({
        id: documents.id,
        name: documents.name,
        type: documents.type,
        status: documents.status,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(eq(documents.workspaceId, workspaceId))
      .orderBy(desc(documents.createdAt));

    return NextResponse.json({ data: docs });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }
    console.error("GET sources error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const session = await requireMember(workspaceId);
    if (session instanceof Response) return session;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "File is required" } }, { status: 400 });
    }

    const type = file.name.endsWith(".pdf") ? "pdf" : file.name.endsWith(".md") ? "md" : "html";
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    const key = await uploadSourceFile(workspaceId, file.name, buffer, file.type);

    // Save to DB
    const [doc] = await db
      .insert(documents)
      .values({
        workspaceId,
        name: file.name,
        type,
        url: key,
        status: "pending",
      })
      .returning();

    // Trigger AI service
    try {
      fetch(`${env.AI_SERVICE_URL}/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document_id: doc.id }),
      }).catch((e) => console.error("Failed to trigger ingestion task:", e));
    } catch (e) {
      console.error("Failed to dispatch ingestion:", e);
    }

    return NextResponse.json({ data: doc });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }
    console.error("POST sources error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

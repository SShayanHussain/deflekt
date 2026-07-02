import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireMember } from "@/lib/auth/guards";
import { deleteSourceFile } from "@/lib/storage";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; sourceId: string }> }
) {
  try {
    const { workspaceId, sourceId } = await params;
    const session = await requireMember(workspaceId);
    if (session instanceof Response) return session;

    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, sourceId), eq(documents.workspaceId, workspaceId)));

    if (!doc) {
      return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    }

    // Delete from S3
    await deleteSourceFile(doc.url);

    // Delete from DB (cascade deletes chunks)
    await db.delete(documents).where(eq(documents.id, sourceId));

    return NextResponse.json({ data: { success: true } });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }
    console.error("DELETE source error:", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}

import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { SourcesClient } from "./sources-client";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export default async function SourcesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Pre-fetch sources for SSR
  const sourcesData = await db
    .select({
      id: documents.id,
      name: documents.name,
      type: documents.type,
      status: documents.status,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.workspaceId, session.workspaceId))
    .orderBy(desc(documents.createdAt));

  const initialSources = sourcesData.map((s) => ({
    ...s,
    createdAt: s.createdAt ? s.createdAt.toISOString() : new Date().toISOString()
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sources</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage your help center documents for the AI to learn from.
        </p>
      </div>

      <SourcesClient workspaceId={session.workspaceId} initialSources={initialSources} />
    </div>
  );
}

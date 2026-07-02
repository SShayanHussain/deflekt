"use server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { escalations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function resolveEscalation(escalationId: string) {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    await db.update(escalations)
      .set({ resolved: true })
      .where(
        and(
          eq(escalations.id, escalationId),
          eq(escalations.workspaceId, session.workspaceId)
        )
      );

    revalidatePath("/escalations");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to resolve escalation:", error);
    return { error: "Failed to resolve escalation" };
  }
}

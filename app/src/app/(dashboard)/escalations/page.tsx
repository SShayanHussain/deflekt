import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { escalations, conversations, messages } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveEscalation } from "@/app/actions/escalations";

export default async function EscalationsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch all escalations with their conversation and user message
  const allEscalations = await db
    .select({
      id: escalations.id,
      reason: escalations.reason,
      resolved: escalations.resolved,
      createdAt: escalations.createdAt,
      sessionId: conversations.sessionId,
      userMessage: messages.content
    })
    .from(escalations)
    .innerJoin(conversations, eq(escalations.conversationId, conversations.id))
    .innerJoin(
      messages,
      and(
        eq(messages.conversationId, conversations.id),
        eq(messages.role, "user") // Just grab the user's message that led to escalation
      )
    )
    .where(eq(escalations.workspaceId, session.workspaceId))
    .orderBy(desc(escalations.createdAt));

  const unresolvedCount = allEscalations.filter(e => !e.resolved).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Escalations</h1>
          <p className="text-muted-foreground text-lg mt-2">
            Conversations that were handed off to humans due to low confidence or missing docs.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
            {unresolvedCount} Unresolved
          </Badge>
          <Badge variant="outline" className="px-3 py-1 text-sm font-medium">
            {allEscalations.length} Total
          </Badge>
        </div>
      </div>

      {allEscalations.length === 0 ? (
        <Card className="bg-muted/10 border-dashed">
          <CardContent className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mb-4 opacity-20"><path d="m21 16-4 4-4-4"></path><path d="M17 20V4"></path><path d="m3 8 4-4 4 4"></path><path d="M7 4v16"></path></svg>
            <p>No escalations yet.</p>
            <p className="text-sm mt-1">When the AI cannot find an answer, it will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {allEscalations.map((esc) => {
            // Using a server action with .bind
            const resolveAction = resolveEscalation.bind(null, esc.id);

            return (
              <Card key={esc.id} className={`overflow-hidden transition-all ${esc.resolved ? 'opacity-60 bg-muted/30' : 'border-destructive/30'}`}>
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-muted/10">
                  <div className="flex items-center gap-3">
                    {esc.resolved ? (
                      <Badge variant="outline" className="text-muted-foreground">Resolved</Badge>
                    ) : (
                      <Badge variant="destructive" className="animate-pulse">Needs Attention</Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {new Date(esc.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">
                    Session: {esc.sessionId.split("-")[0]}
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex gap-4">
                  <div className="shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold border border-primary/20">
                    U
                  </div>
                  <div className="space-y-1 pt-1 flex-1">
                    <p className="text-sm font-medium leading-relaxed">&quot;{esc.userMessage}&quot;</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/70">Reason for escalation:</span> {esc.reason}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="p-3 px-4 border-t bg-muted/5 flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Action: Review this query and add the answer to your connected Sources.
                  </div>
                  {!esc.resolved && (
                    <form action={resolveAction}>
                      <Button type="submit" size="sm" variant="outline" className="h-8">
                        Mark as Resolved
                      </Button>
                    </form>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

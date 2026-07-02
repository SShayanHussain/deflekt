import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { conversations, escalations, messages } from "@/lib/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const workspaceId = session.workspaceId;

  // 1. Total Conversations
  const [{ count: totalConversations }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(conversations)
    .where(eq(conversations.workspaceId, workspaceId));

  // 2. Total Escalations
  const [{ count: totalEscalations }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(escalations)
    .where(eq(escalations.workspaceId, workspaceId));

  // 3. Deflection Rate
  let deflectionRate = 0;
  if (totalConversations > 0) {
    deflectionRate = Math.round(((totalConversations - totalEscalations) / totalConversations) * 100);
  }

  // 4. Recent Escalations (Top Unanswered)
  // We'll get the 5 most recent escalations and join with messages to show the user's query
  const recentEscalations = await db
    .select({
      id: escalations.id,
      reason: escalations.reason,
      createdAt: escalations.createdAt,
      userMessage: messages.content
    })
    .from(escalations)
    .innerJoin(
      messages,
      and(
        eq(messages.conversationId, escalations.conversationId),
        eq(messages.role, "user")
      )
    )
    .where(eq(escalations.workspaceId, workspaceId))
    .orderBy(desc(escalations.createdAt))
    .limit(5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      
      <p className="text-muted-foreground text-lg">
        An overview of your support deflection performance.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-all hover:border-primary/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deflection Rate</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-primary"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="m13 13 6 6"></path></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversations === 0 ? "--" : `${deflectionRate}%`}</div>
            <p className="text-xs text-muted-foreground">Of {totalConversations} total conversations</p>
          </CardContent>
        </Card>
        
        <Card className="transition-all hover:border-primary/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escalated Conversations</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-destructive"><path d="m21 16-4 4-4-4"></path><path d="M17 20V4"></path><path d="m3 8 4-4 4 4"></path><path d="M7 4v16"></path></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEscalations}</div>
            <p className="text-xs text-muted-foreground">Handed off to humans</p>
          </CardContent>
        </Card>

        <Card className="transition-all hover:border-primary/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions This Week</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="m9 10 2 2 4-4"></path></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversations}</div>
            <p className="text-xs text-muted-foreground">All time (MVP)</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Escalations (Doc Gaps)</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEscalations.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center border-t border-border/40 bg-muted/10 rounded-b-lg">
              <p className="text-muted-foreground italic">No escalations yet. Your docs are covering everything!</p>
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t border-border/40">
              {recentEscalations.map((esc) => (
                <div key={esc.id} className="flex items-start justify-between border-b border-border/40 pb-4 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-relaxed">&quot;{esc.userMessage}&quot;</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(esc.createdAt).toLocaleString()} — {esc.reason}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-destructive border-destructive/20">Needs Doc Update</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ConversationsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch all conversations for the tenant, with their messages
  const allConversations = await db.query.conversations.findMany({
    where: eq(conversations.workspaceId, session.workspaceId),
    with: {
      messages: {
        orderBy: [desc(messages.createdAt)], // Order by newest message first so we can see latest interactions
      },
    },
    orderBy: [desc(conversations.createdAt)],
    limit: 50, // MVP limit
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
        <p className="text-muted-foreground text-lg mt-2">
          View recent interactions between your users and the Deflekt assistant.
        </p>
      </div>

      {allConversations.length === 0 ? (
        <Card className="bg-muted/10 border-dashed">
          <CardContent className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mb-4 opacity-20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="m9 10 2 2 4-4"></path></svg>
            <p>No conversations recorded yet.</p>
            <p className="text-sm mt-1">Embed the widget or test in the playground to see logs here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {allConversations.map((conv) => {
            // Reverse messages to show chronological order inside the card
            const sortedMessages = [...conv.messages].reverse();
            
            // Check if any message in this conversation was escalated
            const isEscalated = conv.messages.some(m => m.escalated);

            return (
              <Card key={conv.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-3 px-4 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                    <span className="font-semibold text-foreground">Session:</span> {conv.sessionId.split("-")[0]}...
                    <span>•</span>
                    {new Date(conv.createdAt).toLocaleString()}
                  </div>
                  {isEscalated ? (
                    <Badge variant="destructive">Escalated</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">Deflected</Badge>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/40">
                    {sortedMessages.map((msg) => (
                      <div key={msg.id} className={`p-4 flex gap-4 ${msg.role === "assistant" ? "bg-muted/10" : ""}`}>
                        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-border/50 shadow-sm mt-1">
                          {msg.role === "user" ? "U" : "AI"}
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          
                          {msg.role === "assistant" && (
                            <div className="flex flex-wrap gap-2 pt-2 text-xs">
                              {msg.citations && Array.isArray(msg.citations) && msg.citations.length > 0 && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <span className="font-medium">Sources:</span>
                                  {msg.citations.map((c, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-background">[{c}]</Badge>
                                  ))}
                                </div>
                              )}
                              {msg.confidence !== null && (
                                <div className="text-muted-foreground flex items-center gap-1 ml-auto">
                                  <span>Confidence:</span>
                                  <span className="font-mono bg-background px-1 py-0.5 rounded border">
                                    {(parseFloat(msg.confidence) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

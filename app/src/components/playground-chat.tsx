"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidence?: number;
  escalated?: boolean;
  citations?: number[];
};

export default function PlaygroundChat({ workspaceId }: { workspaceId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          query: userMessage.content,
          sessionId: sessionId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to fetch response");
      }

      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
      }

      const aiData = data.data;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiData.answer,
        confidence: aiData.confidence,
        escalated: aiData.escalated,
        citations: aiData.citations,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Error: " + err.message,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="flex flex-col h-[600px] shadow-lg">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <CardTitle className="text-lg">Test Assistant</CardTitle>
        <p className="text-sm text-muted-foreground">Internal testing environment. Queries here are logged to your dashboard analytics.</p>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 opacity-50 mb-2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="m9 10 2 2 4-4"></path></svg>
            <p>Send a message to test the retrieval and answer generation.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                
                {m.role === "assistant" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                    {m.escalated ? (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Escalated</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/20">Deflected</Badge>
                    )}
                    {m.confidence !== undefined && (
                      <span className="text-[10px] text-muted-foreground font-mono bg-background/50 px-1.5 py-0.5 rounded">Conf: {(m.confidence * 100).toFixed(1)}%</span>
                    )}
                    {m.citations && m.citations.length > 0 && (
                      <div className="flex gap-1 ml-auto">
                        {m.citations.map((c, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 bg-background h-5">[{c}]</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex items-start">
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
              <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      
      <CardFooter className="p-4 border-t bg-muted/10">
        <form onSubmit={onSubmit} className="flex w-full items-center space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your docs..."
            className="flex-1 rounded-full px-4 border-muted-foreground/20 focus-visible:ring-primary/30"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="rounded-full shrink-0 h-10 w-10">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 ml-0.5"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: number[];
  escalated?: boolean;
};

function WidgetChatContent() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi there! I'm the Deflekt assistant. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-4 text-center">
        <p className="text-muted-foreground text-sm">Error: Workspace ID is missing.</p>
      </div>
    );
  }

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
        citations: aiData.citations,
        escalated: aiData.escalated,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "We encountered an error processing your request. " + err.message,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen w-full bg-background font-sans">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shadow-sm z-10 flex items-center">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-3 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-sm leading-tight">Support Assistant</h2>
          <p className="text-xs text-primary-foreground/80">Typically replies instantly</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              m.role === "user" 
                ? "bg-primary text-primary-foreground rounded-tr-sm" 
                : "bg-background border border-border shadow-sm rounded-tl-sm text-foreground"
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              
              {m.role === "assistant" && m.citations && m.citations.length > 0 && (
                <div className="mt-2 pt-2 flex flex-wrap gap-1 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground mr-1 flex items-center">Sources:</span>
                  {m.citations.map((c, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-muted/50 hover:bg-muted">[{c}]</Badge>
                  ))}
                </div>
              )}
              
              {m.role === "assistant" && m.escalated && (
                <div className="mt-3 pt-2 text-xs border-t border-border/50 text-muted-foreground flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                  Connecting you to a human...
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start">
            <div className="bg-background border border-border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center space-x-1 h-10">
              <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
              <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 bg-background border-t">
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-full bg-muted/50 border-transparent focus-visible:ring-primary/20 focus-visible:bg-background"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()} 
            className="rounded-full shrink-0 h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 ml-0.5"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>
            <span className="sr-only">Send</span>
          </Button>
        </form>
        <div className="mt-2 text-center">
          <a href="#" className="text-[10px] text-muted-foreground/70 hover:text-muted-foreground transition-colors font-medium">Powered by Deflekt</a>
        </div>
      </div>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-sm text-muted-foreground">Loading widget...</div>}>
      <WidgetChatContent />
    </Suspense>
  );
}

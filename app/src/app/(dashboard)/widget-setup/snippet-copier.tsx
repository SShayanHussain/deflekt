"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SnippetCopierProps {
  snippet: string;
}

export function SnippetCopier({ snippet }: SnippetCopierProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <div className="absolute right-2 top-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={handleCopy}
          className="h-8 w-8"
          title="Copy snippet"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <pre className="bg-muted p-4 pt-10 md:pt-4 rounded-lg overflow-x-auto text-sm font-mono border border-border">
        <code>{snippet}</code>
      </pre>
    </div>
  );
}

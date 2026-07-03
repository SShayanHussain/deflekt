"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface SnippetCopierProps {
  snippet: string;
}

// navigator.clipboard requires a secure context (HTTPS or localhost) and is
// unavailable/rejects silently over plain HTTP. Fall back to the legacy
// execCommand path so copy still works when the dashboard is served over HTTP.
function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let succeeded = false;
  try {
    succeeded = document.execCommand("copy");
  } catch {
    succeeded = false;
  }
  document.body.removeChild(textarea);
  return succeeded;
}

export function SnippetCopier({ snippet }: SnippetCopierProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(snippet);
      } else if (!legacyCopy(snippet)) {
        throw new Error("Copy command was not successful");
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically. Please select and copy the snippet manually.");
    }
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

"use client";

import { useEffect } from "react";

interface WidgetPreviewProps {
  hostUrl: string;
  workspaceId: string;
}

/**
 * Mounts the real production widget.js script on this page, scoped to the
 * current workspace. This is the same script customers paste into their own
 * site, so this preview behaves identically to a live installation: it opens
 * the actual /widget iframe and calls the real /api/chat endpoint.
 */
export function WidgetPreview({ hostUrl, workspaceId }: WidgetPreviewProps) {
  useEffect(() => {
    const scriptId = "deflekt-widget-preview-script";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `${hostUrl}/widget.js`;
    script.setAttribute("data-workspace", workspaceId);
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
      document.getElementById("deflekt-widget-container")?.remove();
    };
  }, [hostUrl, workspaceId]);

  return null;
}

import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code } from "lucide-react";

export default async function WidgetSetupPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const hostUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  const snippet = `<script 
  src="${hostUrl}/widget.js" 
  data-workspace="${session.workspaceId}"
  defer
></script>`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Widget Installation</h1>
        <p className="text-muted-foreground text-lg mt-2">
          Embed the Deflekt assistant on your website to start deflecting support tickets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Installation Snippet
          </CardTitle>
          <CardDescription>
            Copy and paste this snippet into the <code>&lt;body&gt;</code> of your website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono border border-border">
              <code>{snippet}</code>
            </pre>
          </div>
          <div className="mt-6 text-sm text-muted-foreground">
            <p><strong>Note:</strong> The widget will only answer questions based on the documents you've uploaded in the Sources tab.</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="bg-muted/30 border border-border rounded-lg p-6">
        <h3 className="text-lg font-medium mb-2">Need to test it first?</h3>
        <p className="text-muted-foreground text-sm mb-4">
          You can test the assistant internally before embedding it on your live website.
        </p>
        <a href="/playground" className="text-sm font-medium text-primary hover:underline">
          Go to Playground &rarr;
        </a>
      </div>
    </div>
  );
}

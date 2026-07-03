import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { SnippetCopier } from "./snippet-copier";
import { WidgetPreview } from "./widget-preview";

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
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">1</span>
            Copy your installation snippet
          </CardTitle>
          <CardDescription>
            This snippet is unique to your workspace &mdash; the <code>data-workspace</code> attribute
            tells the widget which of your uploaded documents to answer from.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SnippetCopier snippet={snippet} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">2</span>
            Paste it into your site
          </CardTitle>
          <CardDescription>
            Add the snippet to every page you want the assistant on, right before the closing{" "}
            <code>&lt;/body&gt;</code> tag. No other setup is required &mdash; the script loads
            asynchronously and won&apos;t slow down your page.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">3</span>
            Upload your docs
          </CardTitle>
          <CardDescription>
            The widget can only answer questions grounded in documents you&apos;ve uploaded and that
            have finished processing. Check the{" "}
            <a href="/sources" className="text-primary hover:underline font-medium">Sources</a> tab
            &mdash; a document must show <Badge variant="secondary" className="mx-1 align-middle">completed</Badge>
            before the widget can cite it.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            What visitors will see
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
          <div className="flex gap-3">
            <MessageCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">A chat bubble</p>
              <p className="text-muted-foreground">Appears in the bottom-right corner of the page. Clicking it opens the chat panel.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Code className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Cited answers</p>
              <p className="text-muted-foreground">Responses reference the source chunks they were grounded in, shown as numbered tags.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Human handoff</p>
              <p className="text-muted-foreground">If the assistant isn&apos;t confident the answer is grounded, it says so and escalates instead of guessing.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Live preview &mdash; try it right now
          </CardTitle>
          <CardDescription>
            This page is running the exact same widget script your visitors will get, pointed at your
            real workspace. Click the chat bubble in the bottom-right corner of your screen to test it
            against your live, production API and real uploaded documents. This is the most accurate
            way to test the widget in production &mdash; it behaves identically wherever you paste the
            snippet on your own site.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="bg-muted/30 border border-border rounded-lg p-6">
        <h3 className="text-lg font-medium mb-2">Prefer a plain chat interface?</h3>
        <p className="text-muted-foreground text-sm mb-4">
          The Playground gives you a full-page chat view of the same assistant, without the widget UI
          &mdash; useful for quickly iterating on your docs.
        </p>
        <a href="/playground" className="text-sm font-medium text-primary hover:underline">
          Go to Playground &rarr;
        </a>
      </div>

      <WidgetPreview hostUrl={hostUrl} workspaceId={session.workspaceId} />
    </div>
  );
}

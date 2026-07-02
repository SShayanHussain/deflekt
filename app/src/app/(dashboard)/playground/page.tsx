import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import PlaygroundChat from "@/components/playground-chat";

export default async function PlaygroundPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
        <p className="text-muted-foreground text-lg mt-2">
          Test how your AI agent answers questions using the documents you&apos;ve uploaded.
        </p>
      </div>

      <PlaygroundChat workspaceId={session.workspaceId} />
    </div>
  );
}

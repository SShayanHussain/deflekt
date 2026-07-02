"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function WorkspaceSettingsPage() {
  const { workspaceId, accessToken } = useAuth();
  const [workspace, setWorkspace] = useState<{ id: string, name: string, slug: string, plan: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!workspaceId || !accessToken) return;

    async function fetchWorkspace() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await res.json();
        if (res.ok) {
          setWorkspace(data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspace();
  }, [workspaceId, accessToken]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!workspaceId || !accessToken) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ name }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update workspace");
      }
      
      toast.success("Workspace updated successfully");
      setWorkspace(prev => prev ? { ...prev, name } : null);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Workspace</h3>
        <p className="text-sm text-muted-foreground">
          Manage your workspace details and billing plan.
        </p>
      </div>
      
      <Card>
        <form onSubmit={handleSave}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Workspace Settings</CardTitle>
                <CardDescription>Update your workspace details.</CardDescription>
              </div>
              <Badge variant="secondary" className="uppercase font-semibold tracking-wider">
                {workspace.plan} Plan
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input id="name" name="name" defaultValue={workspace.name} required disabled={isSaving} />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="slug">Workspace ID (Slug)</Label>
              <Input id="slug" defaultValue={workspace.slug} disabled className="bg-muted/50 font-mono text-sm" />
              <p className="text-xs text-muted-foreground">
                This is your unique workspace identifier. It cannot be changed.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Permanently delete this workspace and all its data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive">Delete Workspace</Button>
        </CardContent>
      </Card>
    </div>
  );
}

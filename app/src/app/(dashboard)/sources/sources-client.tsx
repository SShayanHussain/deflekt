"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, FileDown, UploadCloud, Trash2, RefreshCw } from "lucide-react";

interface SourceDoc {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export function SourcesClient({
  workspaceId,
  initialSources,
}: {
  workspaceId: string;
  initialSources: SourceDoc[];
}) {
  const [sources, setSources] = useState<SourceDoc[]>(initialSources);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const fetchSources = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/sources`);
      const data = await res.json();
      if (res.ok) {
        setSources(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch sources", e);
    }
  };

  useEffect(() => {
    // Poll if any source is pending or processing
    const hasPending = sources.some((s) => s.status === "pending" || s.status === "processing");
    if (hasPending) {
      const interval = setInterval(fetchSources, 3000);
      return () => clearInterval(interval);
    }
  }, [sources, workspaceId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/sources`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Document uploaded successfully");
        setFile(null);
        fetchSources();
      } else {
        toast.error(data.error?.message || "Failed to upload document");
      }
    } catch (e) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/sources/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Document deleted");
        setSources((prev) => prev.filter((s) => s.id !== id));
      } else {
        toast.error("Failed to delete document");
      }
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Completed</Badge>;
      case "processing":
      case "pending":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" /> Processing
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_350px]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
            <CardDescription>
              Files that have been ingested and embedded into your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/20 border-dashed">
                <FileDown className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="font-medium">No sources yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Upload PDF, Markdown, or HTML files to start answering customer questions.
                </p>
              </div>
            ) : (
              <div className="divide-y border rounded-md">
                {sources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-4 bg-background">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{source.name}</p>
                        <p className="text-xs text-muted-foreground uppercase">{source.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(source.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(source.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Source</CardTitle>
            <CardDescription>
              We support PDF, Markdown (.md), and HTML files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.md,.html"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={isUploading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!file || isUploading}>
                {isUploading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" /> Upload & Process
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

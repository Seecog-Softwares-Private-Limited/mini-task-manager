"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ArrowLeft, Check } from "lucide-react";
import { downloadWorkspaceExport } from "@/services/api/export.api";
import { useToast } from "@/components/ui/use-toast";

export default function ExportPage() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleExport() {
    setExporting(true);
    setDone(false);
    try {
      const blob = await downloadWorkspaceExport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "workspace-export.csv";
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
      toast({ title: "Export downloaded" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Export</h1>
        <p className="mt-1 text-muted-foreground">Export your workspace data as CSV.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5 text-primary" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Download projects and tasks as CSV. Includes all projects and tasks in this workspace.
          </p>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting..." : (
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" /> Export CSV
              </span>
            )}
          </Button>
          {done && !exporting && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Export complete.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/dashboard/settings"><ArrowLeft className="mr-1 h-4 w-4" /> Settings</Link>
      </Button>
    </div>
  );
}

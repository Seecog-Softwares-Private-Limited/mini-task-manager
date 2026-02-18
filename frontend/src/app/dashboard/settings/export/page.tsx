"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ArrowLeft, Check } from "lucide-react";

export default function ExportPage() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  function handleExport() {
    setExporting(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setExporting(false);
          return 100;
        }
        return p + 10;
      });
    }, 300);
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Export</h1>
        <p className="mt-1 text-muted-foreground">Export your organization data as CSV.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5 text-primary" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">Download projects and tasks as CSV. Backend export not yet implemented.</p>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Exporting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" /> Export CSV
              </span>
            )}
          </Button>
          {(exporting || progress > 0) && (
            <div className="space-y-2">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full gradient-bg transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{progress}% complete</p>
            </div>
          )}
          {progress === 100 && !exporting && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Export complete (stub). Connect backend for real CSV.</p>
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

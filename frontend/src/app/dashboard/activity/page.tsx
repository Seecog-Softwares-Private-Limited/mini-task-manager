"use client";

import { Activity } from "lucide-react";

export default function ActivityPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="mt-1 text-muted-foreground">Organization activity log (requires organization context).</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/10 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Activity className="h-8 w-8 text-primary" />
        </div>
        <p className="mt-4 text-lg font-semibold">Activity Feed</p>
        <p className="mt-1 text-sm text-muted-foreground">Recent activity for your organization will appear here.</p>
      </div>
    </div>
  );
}

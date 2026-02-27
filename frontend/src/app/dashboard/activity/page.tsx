"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTenant } from "@/context/tenant-context";
import { fetchActivityLogs } from "@/services/api/activity-logs.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityLog } from "@/types/api";
import { Activity, Building2, RefreshCw } from "lucide-react";
import { useCallback } from "react";

const REFETCH_INTERVAL_MS = 15_000; // Real-time polling every 15 seconds

function formatActivityMessage(log: ActivityLog): string {
  const action = log.action?.toLowerCase() ?? "";
  const entity = log.entityType?.toLowerCase() ?? "";
  const meta = log.metadata as Record<string, unknown> | undefined;
  const name = meta?.name as string | undefined;

  if (entity === "project") {
    if (action === "create") return `created project ${name ? `"${name}"` : ""}`.trim();
    if (action === "update") return `updated project ${name ? `"${name}"` : ""}`.trim();
    if (action === "delete") return "deleted a project";
  }
  if (entity === "task") {
    if (action === "create") return `created task ${name ? `"${name}"` : ""}`.trim();
    if (action === "update") return `updated task ${name ? `"${name}"` : ""}`.trim();
    if (action === "move") return "moved a task";
    if (action === "delete") return "deleted a task";
  }
  if (entity === "organization") {
    if (action === "create") return "created the organization";
    if (action === "update") return "updated organization settings";
  }
  if (entity === "member" || entity === "invitation") {
    if (action === "invite") return "invited a member";
    if (action === "join") return "joined the organization";
    if (action === "remove") return "removed a member";
  }

  return `${action} ${entity}`.trim() || "performed an action";
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function ActivityPage() {
  const { orgId } = useTenant();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["activity-logs", orgId ?? "", "feed"],
    queryFn: () => fetchActivityLogs(1, 30),
    enabled: !!orgId,
    refetchInterval: REFETCH_INTERVAL_MS,
    staleTime: 5 * 1000,
  });

  const logs = data?.data ?? [];
  const handleRefresh = useCallback(() => refetch(), [refetch]);

  if (!orgId) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="mt-1 text-muted-foreground">Organization activity log.</p>
        </div>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-12 px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Select an organization</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Choose an organization to view its activity feed.
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/organizations">Organizations</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="mt-1 text-muted-foreground">
            Recent activity for your organization. Updates every 15 seconds.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRefresh()}
          disabled={isRefetching || isLoading}
        >
          <RefreshCw className={`mr-1.5 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 font-medium">No activity yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Activity from projects, tasks, and members will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-0 divide-y">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {log.entityType?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium text-muted-foreground">
                        {log.user?.fullName || log.user?.email || (log.userId ? "User" : "System")}
                      </span>{" "}
                      {formatActivityMessage(log)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeTime(log.createdAt)}
                      {log.entityId && (
                        <>
                          {" · "}
                          <span className="font-mono">{log.entityType}</span>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

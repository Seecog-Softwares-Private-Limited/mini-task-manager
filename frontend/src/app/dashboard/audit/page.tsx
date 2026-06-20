"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { useTenant } from "@/context/tenant-context";
import { fetchActivityLogs } from "@/services/api/activity-logs.api";
import { fetchFeatureFlags } from "@/services/api/billing.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import type { ActivityLog } from "@/types/api";
import { ScrollablePageLayout } from "@/components/dashboard/scrollable-page-layout";
import { Shield, Filter, ClipboardList, Building2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

const PAGE_SIZE = 20;

export default function AuditLogPage() {
  const { canViewAudit } = usePermissions();
  const { orgId } = useTenant();
  const [page, setPage] = useState(1);
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: featureFlags, isLoading: flagsLoading } = useQuery({
    queryKey: ["feature-flags", orgId ?? ""],
    queryFn: fetchFeatureFlags,
    enabled: !!orgId && canViewAudit,
    staleTime: 60_000,
  });
  // Undefined while loading; true/false once known. Audit logs are plan-gated (Enterprise).
  const auditLogsEnabled =
    featureFlags === undefined ? undefined : featureFlags.auditLogsEnabled === true;

  const { data, isLoading } = useQuery({
    queryKey: ["activity-logs", orgId ?? "", page],
    queryFn: () => fetchActivityLogs(page, PAGE_SIZE),
    enabled: !!orgId && canViewAudit && auditLogsEnabled === true,
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;
  const filtered = useMemo(() => {
    let list = logs;
    if (entityTypeFilter.trim()) {
      const q = entityTypeFilter.trim().toLowerCase();
      list = list.filter((l) => l.entityType.toLowerCase().includes(q));
    }
    if (actionFilter.trim()) {
      const q = actionFilter.trim().toLowerCase();
      list = list.filter((l) => l.action.toLowerCase().includes(q));
    }
    if (userFilter.trim()) {
      const q = userFilter.trim().toLowerCase();
      list = list.filter((l) => (l.userId ?? "").toLowerCase().includes(q));
    }
    if (dateFrom) {
      const t = new Date(dateFrom).getTime();
      list = list.filter((l) => new Date(l.createdAt).getTime() >= t);
    }
    if (dateTo) {
      const t = new Date(dateTo).setHours(23, 59, 59, 999);
      list = list.filter((l) => new Date(l.createdAt).getTime() <= t);
    }
    return list;
  }, [logs, entityTypeFilter, actionFilter, userFilter, dateFrom, dateTo]);

  if (!canViewAudit) {
    return (
      <div className="space-y-4 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
              <Shield className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold">Access Restricted</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Only owners and admins can view the audit log.</p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Select a workspace</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Choose a workspace to view the audit log.</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/workspaces">Workspaces</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (auditLogsEnabled === false) {
    return (
      <div className="space-y-4 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <Card className="max-w-lg border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
              <Sparkles className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold">Audit logs require an upgrade</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Workspace audit logging is available on the Enterprise plan. Upgrade to track
                every action across your workspace.
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/plans">View plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (flagsLoading || auditLogsEnabled === undefined) {
    return (
      <div className="space-y-4 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <Card>
          <CardContent className="space-y-2 py-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ScrollablePageLayout data-cy="audit-log-page" header={
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
            <p className="mt-1 text-sm text-muted-foreground">View workspace activity. Owner/admin only.</p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4 text-primary" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entity type</label>
                <Input placeholder="e.g. project" value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</label>
                <Input placeholder="e.g. create" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User ID</label>
                <Input placeholder="Filter by user" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
              Activity
            </CardTitle>
            {meta && (
              <span className="text-sm text-muted-foreground">
                {filtered.length} of {meta.total} entries
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No matching entries.</p>
            </div>
          ) : (
            <div data-cy="audit-log-entries">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entity</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((log: ActivityLog) => (
                      <tr key={log.id} className="border-b transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{log.entityType}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">{log.action}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.userId ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {meta && meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {meta.totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </ScrollablePageLayout>
  );
}

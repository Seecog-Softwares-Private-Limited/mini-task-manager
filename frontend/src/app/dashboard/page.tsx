"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/context/tenant-context";
import { fetchProjects } from "@/services/api/projects.api";
import { fetchOrganizations } from "@/services/api/organizations.api";
import { fetchTasksByProject } from "@/services/api/tasks.api";
import { fetchWorkflowsByProject, fetchWorkflowStatuses } from "@/services/api/workflows.api";
import { useNotificationSeed } from "@/hooks/use-notification-seed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsNewBanner } from "@/components/feature-tour/whats-new-banner";
import { SystemStatusWidget } from "@/components/observability/system-status-widget";
import { cn } from "@/lib/utils";
import { FolderKanban, Users, CheckCircle2, TrendingUp, ArrowRight, Plus, Building2, Layers3, ListTodo, CircleDashed, CircleCheckBig } from "lucide-react";

function StatCard({
  title,
  value,
  icon,
  tintClass,
  note,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tintClass: string;
  note?: string;
}) {
  return (
    <Card className="group relative overflow-hidden border-border/70">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <CardContent className="relative p-5">
        <div className="flex items-center justify-between">
          <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", tintClass)}>
            {icon}
          </span>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="mt-0.5 text-xs uppercase tracking-[0.11em] text-muted-foreground">{title}</p>
        {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, canManageBilling } = useAuth();
  const { orgId } = useTenant();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", orgId ?? ""],
    queryFn: fetchProjects,
    enabled: !!orgId,
  });
  const { data: workspaces = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
    enabled: !!orgId,
  });
  useNotificationSeed(projects.length);

  const activeProjects = useMemo(
    () => projects.filter((p) => !p.id.startsWith("temp-") && !p.isArchived),
    [projects]
  );
  const projectIds = useMemo(() => activeProjects.map((p) => p.id), [activeProjects]);
  const taskQueries = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: ["tasks", projectId, "overview"],
      queryFn: () => fetchTasksByProject(projectId, 1, 100),
      enabled: !!orgId,
      staleTime: 45_000,
    })),
  });
  const workflowQueries = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: ["workflows", projectId, "overview"],
      queryFn: () => fetchWorkflowsByProject(projectId),
      enabled: !!orgId,
      staleTime: 60_000,
    })),
  });
  const defaultWorkflowIds = useMemo(
    () =>
      workflowQueries
        .map((q) => q.data?.find((w) => w.isDefault)?.id ?? q.data?.[0]?.id)
        .filter((id): id is string => Boolean(id)),
    [workflowQueries]
  );
  const uniqueWorkflowIds = useMemo(() => Array.from(new Set(defaultWorkflowIds)), [defaultWorkflowIds]);
  const statusQueries = useQueries({
    queries: uniqueWorkflowIds.map((workflowId) => ({
      queryKey: ["workflow-statuses", workflowId, "overview"],
      queryFn: () => fetchWorkflowStatuses(workflowId),
      enabled: !!workflowId,
      staleTime: 60_000,
    })),
  });
  const statusTypeById = useMemo(() => {
    const map = new Map<string, string>();
    statusQueries.forEach((q) => {
      (q.data ?? []).forEach((s) => map.set(s.id, s.type?.toUpperCase?.() ?? ""));
    });
    return map;
  }, [statusQueries]);
  const statusMetrics = useMemo(() => {
    const totals = taskQueries.reduce(
      (acc, q) => {
        const total = q.data?.meta?.total ?? 0;
        const sampleTasks = q.data?.data ?? [];
        sampleTasks.forEach((task) => {
          const statusType = (task.statusId ? statusTypeById.get(task.statusId) : "") ?? "";
          if (statusType.includes("DONE")) acc.sampleDone += 1;
          else if (statusType.includes("PROGRESS")) acc.sampleInProgress += 1;
          else acc.sampleTodo += 1;
        });
        acc.totalTasks += total;
        acc.sampleTotal += sampleTasks.length;
        return acc;
      },
      { totalTasks: 0, sampleTotal: 0, sampleTodo: 0, sampleInProgress: 0, sampleDone: 0 }
    );
    if (totals.totalTasks === 0) {
      return { totalTasks: 0, todo: 0, inProgress: 0, completed: 0, completionRate: 0 };
    }
    if (totals.sampleTotal === 0) {
      return {
        totalTasks: totals.totalTasks,
        todo: totals.totalTasks,
        inProgress: 0,
        completed: 0,
        completionRate: 0,
      };
    }
    const scale = totals.totalTasks / totals.sampleTotal;
    const completed = Math.round(totals.sampleDone * scale);
    const inProgress = Math.round(totals.sampleInProgress * scale);
    const todo = Math.max(0, totals.totalTasks - completed - inProgress);
    const completionRate = Math.round((completed / totals.totalTasks) * 100);
    return {
      totalTasks: totals.totalTasks,
      todo,
      inProgress,
      completed,
      completionRate,
    };
  }, [taskQueries, statusTypeById]);
  const donutStyle = useMemo(() => {
    const total = Math.max(1, statusMetrics.totalTasks);
    const donePct = (statusMetrics.completed / total) * 100;
    const inProgressPct = (statusMetrics.inProgress / total) * 100;
    return {
      background: `conic-gradient(
        hsl(var(--success)) 0% ${donePct}%,
        hsl(var(--warning)) ${donePct}% ${donePct + inProgressPct}%,
        hsl(var(--muted)) ${donePct + inProgressPct}% 100%
      )`,
    };
  }, [statusMetrics]);

  const firstName = user?.email?.split("@")[0] ?? "there";

  return (
    <div className="space-y-8" data-cy="dashboard-page">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-2xl gradient-bg p-8 text-white shadow-lg shadow-primary/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-white/70 max-w-lg">
            Here&apos;s an overview of your workspace. Manage projects, track tasks, and keep your team aligned.
          </p>
          {!orgId && (
            <Button asChild variant="secondary" className="mt-4 bg-white/20 hover:bg-white/30 text-white border-0 shadow-none">
              <Link href="/dashboard/workspaces">
                <Building2 className="mr-2 h-4 w-4" />
                Select a workspace to get started
              </Link>
            </Button>
          )}
        </div>
      </div>

      <WhatsNewBanner className="max-w-2xl" />

      {orgId && (
        <>
          {/* Metrics + graphical representation */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <StatCard
                  title="Total Workspaces"
                  value={workspaces.length}
                  icon={<Layers3 className="h-5 w-5 text-violet-600" />}
                  tintClass="bg-violet-500/10"
                  note="Across your account"
                />
                <StatCard
                  title="Projects In Workspace"
                  value={activeProjects.length}
                  icon={<FolderKanban className="h-5 w-5 text-primary" />}
                  tintClass="bg-primary/10"
                  note="Active projects only"
                />
                <StatCard
                  title="Tasks In Projects"
                  value={statusMetrics.totalTasks}
                  icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />}
                  tintClass="bg-blue-500/10"
                  note="Derived from active projects"
                />
                <StatCard
                  title="Completed Rate"
                  value={`${statusMetrics.completionRate}%`}
                  icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
                  tintClass="bg-emerald-500/10"
                  note={`${statusMetrics.completed} completed tasks`}
                />
              </>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Task Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    label: "To Do",
                    value: statusMetrics.todo,
                    pct: statusMetrics.totalTasks ? Math.round((statusMetrics.todo / statusMetrics.totalTasks) * 100) : 0,
                    barClass: "bg-slate-400",
                    icon: <ListTodo className="h-4 w-4" />,
                  },
                  {
                    label: "In Progress",
                    value: statusMetrics.inProgress,
                    pct: statusMetrics.totalTasks ? Math.round((statusMetrics.inProgress / statusMetrics.totalTasks) * 100) : 0,
                    barClass: "bg-amber-500",
                    icon: <CircleDashed className="h-4 w-4" />,
                  },
                  {
                    label: "Completed",
                    value: statusMetrics.completed,
                    pct: statusMetrics.totalTasks ? Math.round((statusMetrics.completed / statusMetrics.totalTasks) * 100) : 0,
                    barClass: "bg-emerald-500",
                    icon: <CircleCheckBig className="h-4 w-4" />,
                  },
                ].map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        {item.icon}
                        {item.label}
                      </span>
                      <span className="font-medium text-foreground">
                        {item.value} <span className="text-muted-foreground">({item.pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", item.barClass)}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Completion Ring</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-3">
                <div
                  className="relative h-36 w-36 rounded-full animate-in fade-in zoom-in-95 duration-500"
                  style={donutStyle}
                  aria-label="Task completion ring"
                  role="img"
                >
                  <div className="absolute inset-[18px] rounded-full bg-background shadow-inner" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{statusMetrics.completionRate}%</p>
                      <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Done</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {statusMetrics.completed} of {statusMetrics.totalTasks} tasks completed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent projects */}
          {projects.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Recent Projects</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/projects" className="text-primary">
                    View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projects.slice(0, 5).map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/projects/${p.id}`}
                      className="flex items-center gap-3 rounded-lg border border-transparent p-3 transition-all hover:border-border hover:bg-muted/30 hover:shadow-sm"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.description || "No description"}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/projects" className="group">
              <Card className="h-full border-dashed border-2 hover:border-primary/30 transition-colors">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">New Project</p>
                    <p className="text-xs text-muted-foreground">Create and organize work</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/tasks" className="group">
              <Card className="h-full border-dashed border-2 hover:border-blue-500/30 transition-colors">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <CheckCircle2 className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold">View Tasks</p>
                    <p className="text-xs text-muted-foreground">Track and manage tasks</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/settings" className="group">
              <Card className="h-full border-dashed border-2 hover:border-purple-500/30 transition-colors">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                    <Users className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-semibold">Settings</p>
                    <p className="text-xs text-muted-foreground">Configure workspace</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </>
      )}

      {canManageBilling && (
        <div className="max-w-xs" data-cy="system-status-widget">
          <SystemStatusWidget />
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchActivityLogs } from "@/services/api/activity-logs.api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Task, WorkflowStatus, ActivityLog, ProjectMember } from "@/types/api";
import {
  ListTodo,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
  Users,
} from "lucide-react";

export interface ProjectDashboardProps {
  projectId: string;
  projectName: string;
  tasks: Task[];
  statuses: WorkflowStatus[];
  members?: ProjectMember[];
  className?: string;
}

export function ProjectDashboard({
  projectId,
  projectName,
  tasks,
  statuses,
  members = [],
  className,
}: ProjectDashboardProps) {
  const { data: activityData } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => fetchActivityLogs(1, 30),
    enabled: !!projectId,
  });

  const taskIds = React.useMemo(() => new Set(tasks.map((t) => t.id)), [tasks]);
  const activityLogs = React.useMemo(() => {
    const list = activityData?.data ?? [];
    return list.filter(
      (log: ActivityLog) =>
        log.entityType === "task" && log.entityId && taskIds.has(log.entityId)
    ) as ActivityLog[];
  }, [activityData?.data, taskIds]);

  const doneStatusId = React.useMemo(
    () => statuses.find((s) => s.type === "DONE")?.id,
    [statuses]
  );

  const totalTasks = tasks.length;
  const completedCount = doneStatusId
    ? tasks.filter((t) => t.statusId === doneStatusId).length
    : 0;
  const inProgressCount = totalTasks - completedCount;
  const overdueCount = tasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < new Date() &&
      t.statusId !== doneStatusId
  ).length;
  const progressPct =
    totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const kpis = [
    {
      label: "Total tasks",
      value: totalTasks,
      icon: ListTodo,
      className: "text-primary",
    },
    {
      label: "In progress",
      value: inProgressCount,
      icon: Clock,
      className: "text-amber-500",
    },
    {
      label: "Completed",
      value: completedCount,
      icon: CheckCircle2,
      className: "text-emerald-500",
    },
    {
      label: "Overdue",
      value: overdueCount,
      icon: AlertCircle,
      className: overdueCount > 0 ? "text-destructive" : "text-muted-foreground",
    },
    {
      label: "Progress",
      value: `${progressPct}%`,
      icon: CheckCircle2,
      className: "text-primary",
    },
  ];

  return (
    <div className={cn("space-y-6", className)} role="region" aria-label="Project overview">
      {/* Progress bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Project progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{progressPct}% complete</span>
            <span className="text-muted-foreground">{completedCount} of {totalTasks} tasks</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full gradient-bg transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" role="group" aria-label="Key metrics">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {k.label}
                </CardTitle>
                <Icon className={cn("h-4 w-4", k.className)} />
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">{k.value}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!activityData ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No recent activity for this project.
              </p>
            ) : (
              <ul className="space-y-2" role="list">
                {activityLogs.slice(0, 10).map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Activity className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      {log.action}
                      {log.metadata && typeof log.metadata === "object" && "details" in log.metadata
                        ? ` — ${String((log.metadata as { details?: string }).details ?? "")}`
                        : ""}
                    </span>
                    <span className="shrink-0">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No project members yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {members.slice(0, 8).map((m) => (
                  <Avatar key={m.id} className="h-8 w-8 ring-2 ring-background">
                    <AvatarImage src={m.user?.avatarUrl} />
                    <AvatarFallback className="text-xs">
                      {(m.user?.fullName ?? m.user?.email ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {members.length > 8 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{members.length - 8} more
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  fetchTasksByProject,
} from "@/services/api/tasks.api";
import { fetchProjectMembers } from "@/services/api/members.api";
import { fetchWorkflowsByProject, fetchWorkflowStatuses } from "@/services/api/workflows.api";
import { fetchActivityLogs } from "@/services/api/activity-logs.api";
import type { Project, Task, WorkflowStatus, ActivityLog } from "@/types/api";
import {
  FolderKanban,
  Users,
  CheckSquare,
  CalendarClock,
  Activity,
  LayoutGrid,
  Lock,
  Loader2,
} from "lucide-react";

type ProjectMember = { id: string; user?: { fullName?: string; email?: string; avatarUrl?: string } };

function getDoneStatusIds(statuses: WorkflowStatus[] | undefined): string[] {
  if (!statuses?.length) return [];
  return statuses.filter((s) => s.type === "DONE").map((s) => s.id);
}

function projectStatsFromTasks(
  tasks: Task[],
  totalTasks: number,
  doneStatusIds?: string[]
): { progressPercent: number; completedCount: number; overdueCount: number } {
  const now = Date.now();
  const completedCount =
    doneStatusIds && doneStatusIds.length > 0
      ? tasks.filter((t) => t.statusId && doneStatusIds.includes(t.statusId)).length
      : tasks.filter(
          (t) =>
            (t.subtasks?.length ?? 0) === 0 ||
            (t.subtasks ?? []).every((s) => s.completed)
        ).length;
  const overdueCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).getTime() < now
  ).length;
  const sampleSize = Math.min(tasks.length, 50);
  const progressPercent =
    totalTasks === 0
      ? 0
      : sampleSize === 0
        ? 0
        : Math.round((completedCount / Math.min(totalTasks, sampleSize)) * 100);
  return { progressPercent, completedCount, overdueCount };
}

function formatRelativeTime(input: string | undefined): string {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (absMs < minute) return rtf.format(-Math.round(diffMs / 1000), "second");
  if (absMs < hour) return rtf.format(-Math.round(diffMs / minute), "minute");
  if (absMs < day) return rtf.format(-Math.round(diffMs / hour), "hour");
  if (absMs < 7 * day) return rtf.format(-Math.round(diffMs / day), "day");
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export interface ProjectPreviewDrawerProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectPreviewDrawer({
  project,
  open,
  onOpenChange,
}: ProjectPreviewDrawerProps) {
  const projectId = project?.id;

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", projectId ?? "", "preview"],
    queryFn: () => fetchTasksByProject(projectId!, 1, 100),
    enabled: !!projectId && open,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["project-members", projectId ?? ""],
    queryFn: () => fetchProjectMembers(projectId!),
    enabled: !!projectId && open,
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows", projectId ?? ""],
    queryFn: () => fetchWorkflowsByProject(projectId!),
    enabled: !!projectId && open,
  });

  const { data: activityData } = useQuery({
    queryKey: ["activity-logs", "preview"],
    queryFn: () => fetchActivityLogs(1, 30),
    enabled: !!projectId && open,
  });

  const defaultWorkflow = React.useMemo(
    () => workflows.find((w) => w.isDefault),
    [workflows]
  );

  const { data: statuses = [] } = useQuery({
    queryKey: ["workflow-statuses", defaultWorkflow?.id ?? ""],
    queryFn: () => fetchWorkflowStatuses(defaultWorkflow!.id),
    enabled: !!defaultWorkflow?.id && open,
  });

  const doneStatusIds = React.useMemo(
    () => getDoneStatusIds(statuses),
    [statuses]
  );

  const tasks = tasksData?.data ?? [];
  const totalTasks = tasksData?.meta?.total ?? 0;
  const stats = React.useMemo(
    () => projectStatsFromTasks(tasks, totalTasks, doneStatusIds),
    [tasks, totalTasks, doneStatusIds]
  );

  const taskIds = React.useMemo(() => new Set(tasks.map((t) => t.id)), [tasks]);
  const activityLogs = React.useMemo(() => {
    const list = activityData?.data ?? [];
    return list.filter(
      (log: ActivityLog) =>
        log.entityType === "task" && log.entityId && taskIds.has(log.entityId)
    ) as ActivityLog[];
  }, [activityData?.data, taskIds]);

  if (!project) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden sm:max-w-md"
      >
        <SheetHeader className="flex-shrink-0 space-y-1">
          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-lg">{project.name}</SheetTitle>
              <SheetDescription className="line-clamp-2">
                {project.description || "No description"}
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant={project.isArchived ? "statusArchived" : "statusActive"}>
              {project.isArchived ? "Archived" : "Active"}
            </Badge>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {project.visibility === "PRIVATE" && <Lock className="h-3 w-3" />}
              {project.visibility}
            </span>
          </div>
        </SheetHeader>

        <div className="mt-4 flex-1 space-y-6 overflow-y-auto pr-2">
          {/* Quick navigation */}
          <div className="flex gap-2">
            <Button asChild className="flex-1" size="sm">
              <Link href={`/dashboard/projects/${project.id}/board`}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Open board
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/projects/${project.id}`}>View project</Link>
            </Button>
          </div>

          {/* Stats */}
          <section aria-label="Project stats">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Stats
            </h3>
            {tasksLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckSquare className="h-4 w-4" />
                    <span className="text-xs">Tasks</span>
                  </div>
                  <p className="mt-1 text-xl font-bold tabular-nums">{totalTasks}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckSquare className="h-4 w-4 text-[hsl(var(--success))]" />
                    <span className="text-xs">Progress</span>
                  </div>
                  <p className="mt-1 text-xl font-bold tabular-nums">{stats.progressPercent}%</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckSquare className="h-4 w-4" />
                    <span className="text-xs">Completed</span>
                  </div>
                  <p className="mt-1 text-xl font-bold tabular-nums">{stats.completedCount}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarClock className="h-4 w-4" />
                    <span className="text-xs">Overdue</span>
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-xl font-bold tabular-nums",
                      stats.overdueCount > 0 && "text-destructive"
                    )}
                  >
                    {stats.overdueCount}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Members */}
          <section aria-label="Project members">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Members
            </h3>
            {membersLoading ? (
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(members as ProjectMember[]).slice(0, 8).map((m) => (
                  <Avatar
                    key={m.id}
                    className="h-9 w-9 ring-2 ring-background"
                    title={m.user?.fullName ?? m.user?.email}
                  >
                    <AvatarImage src={m.user?.avatarUrl} />
                    <AvatarFallback className="text-xs">
                      {(m.user?.fullName ?? m.user?.email ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {members.length > 8 && (
                  <span className="self-center text-xs text-muted-foreground">
                    +{members.length - 8} more
                  </span>
                )}
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section aria-label="Recent activity">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Recent activity
            </h3>
            {!activityData ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : activityLogs.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No recent activity for this project.
              </p>
            ) : (
              <ul className="space-y-2" role="list">
                {activityLogs.slice(0, 8).map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground"
                  >
                    <Activity className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span>
                        {log.action}
                        {log.metadata &&
                          typeof log.metadata === "object" &&
                          "details" in log.metadata
                          ? ` — ${String((log.metadata as { details?: string }).details ?? "")}`
                          : ""}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground/80">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProjects } from "@/services/api/projects.api";
import {
  fetchWorkflowsByProject,
  fetchWorkflowStatuses,
  createDefaultWorkflow,
} from "@/services/api/workflows.api";
import {
  fetchTasksByProject,
  createTask,
  updateTaskStatus,
  deleteTask,
} from "@/services/api/tasks.api";
import { fetchOrgMembers, fetchProjectMembers } from "@/services/api/members.api";
import { fetchCommentCounts } from "@/services/api/comments.api";
import {
  completeRecurringTaskWithAction,
  fetchRecurringSummary,
  fetchRecurringTemplates,
  pauseRecurringTemplate,
  skipNextRecurringOccurrence,
} from "@/services/api/recurring-tasks.api";
import { parseApiError, isRateLimited, getStoredToken } from "@/services/api/client";
import { createTaskWithDescriptionImages } from "@/lib/upload-task-description-images";
import { useTenant } from "@/context/tenant-context";
import { useProjectSelection } from "@/context/project-selection-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { RecurringSummaryStats } from "@/components/recurring/recurring-summary-stats";
import { RecurringHealthSection } from "@/components/recurring/recurring-health-section";
import {
  BoardCommandBar,
  BoardSelectorField,
  BOARD_COMMAND_ACTION_BTN,
} from "@/components/kanban/board-command-bar";
import { computeRecurringHealth } from "@/lib/recurring-board-utils";
import {
  KanbanBoard,
  computeBoardStats,
  computeSubtaskMap,
  DEFAULT_FILTERS,
  type AssigneeMap,
  type BoardFilters,
} from "@/components/kanban/kanban-board";
import { BoardToolbar, type ViewMode } from "@/components/kanban/board-toolbar";
import { BoardTableView } from "@/components/kanban/board-table-view";
import { BoardSkeleton } from "@/components/kanban/board-skeleton";
import {
  CreateTaskModal,
  type CreateTaskFormData,
} from "@/components/tasks/create-task-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTaskCreatedCelebration } from "@/components/tasks/task-create-celebration";
import { ProjectSwitcher } from "@/components/tasks/project-switcher";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useBoardPermissions } from "@/hooks/use-board-permissions";
import { useRetentionTracking } from "@/hooks/use-retention-tracking";
import type { Task } from "@/types/api";
import { isRecurringTask } from "@/lib/recurrence-display";
import { cn } from "@/lib/utils";
import { Building2, Plus, Sparkles, Columns3, Shield, Keyboard } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getCurrentUserId(): string | null {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export default function RecurringTasksPage() {
  const { orgId } = useTenant();
  const { selectedProjectId: storedProjectId, setSelectedProjectId, ready: projectSelectionReady } =
    useProjectSelection();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { trackFirstTaskCreated } = useRetentionTracking();
  const { triggerTaskCreatedCelebration, celebrationLayer } = useTaskCreatedCelebration();
  const currentUserId = useMemo(() => getCurrentUserId(), []);

  const selectedProjectIdFromUrl = searchParams.get("projectId");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [defaultStatusId, setDefaultStatusId] = useState<string | undefined>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", orgId ?? ""],
    queryFn: fetchProjects,
    enabled: !!orgId,
  });

  const selectableProjects = useMemo(
    () => projects.filter((p) => !p.id.startsWith("temp-")),
    [projects]
  );

  const isProjectInList = useCallback(
    (projectId: string | null | undefined) =>
      !!projectId && selectableProjects.some((p) => p.id === projectId),
    [selectableProjects]
  );

  const selectedProjectId = useMemo(() => {
    if (isProjectInList(selectedProjectIdFromUrl)) return selectedProjectIdFromUrl;
    if (isProjectInList(storedProjectId)) return storedProjectId;
    return null;
  }, [selectedProjectIdFromUrl, storedProjectId, isProjectInList]);

  const selectedProject = useMemo(
    () => selectableProjects.find((p) => p.id === selectedProjectId) ?? null,
    [selectableProjects, selectedProjectId]
  );

  const setProjectInUrl = useCallback(
    (projectId: string, replace = false) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("projectId", projectId);
      const url = `${pathname}?${params.toString()}`;
      if (replace) router.replace(url);
      else router.push(url);
    },
    [pathname, router, searchParams]
  );

  const handleProjectChange = useCallback(
    (projectId: string) => {
      setSelectedProjectId(projectId);
      setProjectInUrl(projectId);
    },
    [setSelectedProjectId, setProjectInUrl]
  );

  useEffect(() => {
    if (!projectSelectionReady || projectsLoading || selectableProjects.length === 0) return;

    if (isProjectInList(selectedProjectIdFromUrl)) {
      if (selectedProjectIdFromUrl !== storedProjectId) {
        setSelectedProjectId(selectedProjectIdFromUrl!);
      }
      return;
    }

    if (isProjectInList(storedProjectId)) {
      if (selectedProjectIdFromUrl !== storedProjectId) {
        setProjectInUrl(storedProjectId!, true);
      }
      return;
    }

    const defaultId = selectableProjects[0].id;
    setSelectedProjectId(defaultId);
    setProjectInUrl(defaultId, true);
  }, [
    projectSelectionReady,
    selectableProjects,
    projectsLoading,
    selectedProjectIdFromUrl,
    storedProjectId,
    isProjectInList,
    setSelectedProjectId,
    setProjectInUrl,
  ]);

  useEffect(() => {
    setFilters(DEFAULT_FILTERS);
    setSelectedTaskId(null);
    setCreateModalOpen(false);
  }, [selectedProjectId]);

  const { data: workflows = [], isLoading: workflowsLoading, isFetched: workflowsFetched } = useQuery({
    queryKey: ["workflows", selectedProjectId],
    queryFn: () => fetchWorkflowsByProject(selectedProjectId!),
    enabled: !!selectedProjectId && !!orgId,
  });

  const defaultWorkflow = useMemo(
    () => workflows.find((w) => w.isDefault) ?? workflows[0],
    [workflows]
  );

  const { data: statuses = [], isLoading: statusesLoading } = useQuery({
    queryKey: ["workflow-statuses", defaultWorkflow?.id],
    queryFn: () => fetchWorkflowStatuses(defaultWorkflow!.id),
    enabled: !!defaultWorkflow?.id,
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", selectedProjectId],
    queryFn: () => fetchTasksByProject(selectedProjectId!, 1, 200),
    enabled: !!selectedProjectId && !!orgId,
  });

  const summaryQuery = useQuery({
    queryKey: ["recurring-summary", orgId ?? "", selectedProjectId ?? ""],
    queryFn: () => fetchRecurringSummary(selectedProjectId ?? undefined),
    enabled: Boolean(orgId),
  });

  const { data: recurringTemplates = [] } = useQuery({
    queryKey: ["recurring-templates", selectedProjectId ?? ""],
    queryFn: () => fetchRecurringTemplates({ projectId: selectedProjectId ?? undefined }),
    enabled: Boolean(orgId),
  });

  const recurringTemplateMap = useMemo(() => {
    const map: Record<string, (typeof recurringTemplates)[number]> = {};
    for (const t of recurringTemplates) map[t.id] = t;
    return map;
  }, [recurringTemplates]);

  const { data: projectMembers = [] } = useQuery({
    queryKey: ["project-members", selectedProjectId ?? ""],
    queryFn: () => fetchProjectMembers(selectedProjectId!),
    enabled: !!selectedProjectId && !!orgId,
    staleTime: 60_000,
  });

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org-members", orgId ?? ""],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId,
  });

  const tasks = tasksData?.data ?? [];
  const recurringTasks = useMemo(
    () => tasks.filter((task) => task.projectId === selectedProjectId && isRecurringTask(task)),
    [tasks, selectedProjectId]
  );

  const taskIds = useMemo(() => recurringTasks.map((t) => t.id), [recurringTasks]);
  const { data: commentCountMap = {} } = useQuery({
    queryKey: ["comment-counts", selectedProjectId, taskIds.join(",")],
    queryFn: () => fetchCommentCounts(taskIds),
    enabled: !!selectedProjectId && taskIds.length > 0 && taskIds.length <= 50,
    staleTime: 60_000,
  });

  const permissions = useBoardPermissions(orgMembers, currentUserId);

  const assigneeMap: AssigneeMap = useMemo(() => {
    const map: AssigneeMap = {};
    const members =
      projectMembers.length > 0
        ? projectMembers
        : orgMembers.filter((m) => m.status?.toLowerCase() === "active");
    for (const m of members) {
      map[m.userId] = {
        name: m.user?.fullName ?? m.user?.email ?? m.userId,
        avatarUrl: m.user?.avatarUrl,
      };
    }
    for (const t of recurringTasks) {
      if (t.assigneeId && t.assignee && !map[t.assigneeId]) {
        map[t.assigneeId] = {
          name: t.assignee.fullName ?? t.assignee.email ?? t.assigneeId,
          avatarUrl: t.assignee.avatarUrl,
        };
      }
    }
    return map;
  }, [projectMembers, orgMembers, recurringTasks]);

  const boardStats = useMemo(() => computeBoardStats(recurringTasks, statuses), [recurringTasks, statuses]);
  const doneStatusId = useMemo(
    () => statuses.find((s) => s.type === "DONE" || s.name.toLowerCase() === "done")?.id,
    [statuses]
  );
  const subtaskMap = useMemo(() => computeSubtaskMap(recurringTasks, doneStatusId), [recurringTasks, doneStatusId]);

  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const s of statuses) map[s.id] = [];
    for (const t of recurringTasks) {
      const key = t.statusId ?? statuses[0]?.id ?? "none";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    if (statuses.length && !map[statuses[0].id]) map[statuses[0].id] = [];
    return map;
  }, [recurringTasks, statuses]);

  const allTasksFlat = useMemo(() => {
    const all: Task[] = [];
    for (const s of statuses) all.push(...(tasksByStatus[s.id] ?? []));
    return all;
  }, [statuses, tasksByStatus]);

  const filteredTaskCount = useMemo(() => {
    const hasFilter =
      filters.search ||
      filters.priority.length > 0 ||
      filters.assignee.length > 0;
    if (!hasFilter) return undefined;
    let count = 0;
    for (const statusTasks of Object.values(tasksByStatus)) {
      count += statusTasks.filter((t) => {
        if (filters.search) {
          const q = filters.search.toLowerCase();
          if (!t.title.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false;
        }
        if (filters.priority.length > 0 && !filters.priority.includes(t.priority)) return false;
        if (filters.assignee.length > 0) {
          const taskAssignees = t.assigneeIds?.length ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : []);
          if (!taskAssignees.some((id) => filters.assignee.includes(id))) return false;
        }
        return true;
      }).length;
    }
    return count;
  }, [tasksByStatus, filters]);

  const updateMutation = useMutation({
    mutationFn: ({ taskId, statusId }: { taskId: string; statusId: string | null }) =>
      updateTaskStatus(taskId, statusId),
    onMutate: async ({ taskId, statusId: toStatusId }) => {
      const qk = ["tasks", selectedProjectId];
      await queryClient.cancelQueries({ queryKey: qk });
      const prev = queryClient.getQueryData<{ data: Task[] }>(qk);
      queryClient.setQueryData<{ data: Task[] }>(qk, (old) => {
        if (!old) return old;
        return { ...old, data: old.data.map((t) => (t.id === taskId ? { ...t, statusId: toStatusId ?? undefined } : t)) };
      });
      return { previous: prev };
    },
    onSuccess: (updated, { taskId }) => {
      if (!updated?.id) return;
      queryClient.setQueryData<{ data: Task[] }>(["tasks", selectedProjectId], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
        };
      });
      queryClient.setQueryData(["task", taskId], updated);
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["tasks", selectedProjectId], ctx.previous);
      toast({
        title: "Failed to move task",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: (_data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["recurring-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      if (selectedTaskId === taskId) setSelectedTaskId(null);
      setDeleteTarget(null);
      toast({ title: "Task deleted" });
    },
    onError: (err) => {
      toast({
        title: "Failed to delete task",
        description: isRateLimited(err) ? "Too many requests. Try again later." : parseApiError(err),
        variant: "error",
      });
    },
  });

  const pauseSeriesMutation = useMutation({
    mutationFn: (templateId: string) => pauseRecurringTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["recurring-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      toast({ title: "Series paused", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not pause series",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const recurringActionMutation = useMutation({
    mutationFn: async ({ type, task }: { type: "complete" | "skip"; task: Task }) => {
      const recurringTemplateId = task.recurringTemplateId;
      if (!recurringTemplateId) {
        throw new Error("Recurring template was not found for this task.");
      }
      if (type === "skip") {
        await skipNextRecurringOccurrence(recurringTemplateId);
        return;
      }
      const doneStatus = statuses.find((s) => s.type === "DONE")?.id;
      await completeRecurringTaskWithAction(task.id, {
        action: "ONLY_THIS",
        doneStatusId: doneStatus,
      });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["task", vars.task.id] });
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-summary"] });
      toast({
        title: vars.type === "skip" ? "Next occurrence skipped" : "Occurrence completed",
        variant: "success",
      });
    },
    onError: (err) => {
      toast({
        title: "Recurring action failed",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: ({
      payload,
      imageFiles,
      subtaskPendingAttachments,
      taskAttachmentFiles,
    }: {
      payload: Parameters<typeof createTask>[0];
      imageFiles?: File[];
      subtaskPendingAttachments?: import("@/lib/upload-subtask-attachments").SubtaskPendingUploadMap;
      taskAttachmentFiles?: File[];
    }) =>
      createTaskWithDescriptionImages(
        payload,
        imageFiles,
        subtaskPendingAttachments,
        taskAttachmentFiles
      ),
    onSettled: () => {
      if (!selectedProjectId) return;
      queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["recurring-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
    },
    onSuccess: (result) => {
      setCreateModalOpen(false);
      const uploadWarning =
        result.subtaskUploadWarning ??
        result.taskAttachmentWarning ??
        result.imageUploadWarning;
      if (uploadWarning) {
        toast({
          title: "Recurring task created",
          description: uploadWarning,
          variant: "error",
        });
      } else {
        toast({ title: "Recurring task created", variant: "success" });
      }
      trackFirstTaskCreated();
      triggerTaskCreatedCelebration();
    },
    onError: (err) => {
      toast({
        title: "Failed to create recurring task",
        description: isRateLimited(err) ? "Too many requests. Try again later." : parseApiError(err),
        variant: "error",
      });
    },
  });

  const autoSetupAttemptedRef = useRef<string | null>(null);

  const setupWorkflowMutation = useMutation({
    mutationFn: (projectId: string) => createDefaultWorkflow(projectId),
    onSuccess: () => {
      if (selectedProjectId) {
        queryClient.invalidateQueries({ queryKey: ["workflows", selectedProjectId] });
        queryClient.invalidateQueries({ queryKey: ["workflow-statuses"] });
        queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
      }
    },
    onError: (err) => {
      autoSetupAttemptedRef.current = null;
      toast({
        title: "Could not set up task board",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  useEffect(() => {
    if (!selectedProjectId || !orgId || workflowsLoading || !workflowsFetched) return;
    if (workflows.length > 0) {
      autoSetupAttemptedRef.current = null;
      return;
    }
    if (autoSetupAttemptedRef.current === selectedProjectId) return;
    if (setupWorkflowMutation.isPending) return;
    autoSetupAttemptedRef.current = selectedProjectId;
    setupWorkflowMutation.mutate(selectedProjectId);
  }, [
    selectedProjectId,
    orgId,
    workflowsLoading,
    workflowsFetched,
    workflows.length,
    setupWorkflowMutation.isPending,
  ]);

  const handleMoveTask = useCallback(
    (taskId: string, _from: string | null, toStatusId: string) => {
      updateMutation.mutate({ taskId, statusId: toStatusId });
    },
    [updateMutation]
  );

  const handleQuickAdd = useCallback((title: string, statusId: string) => {
    if (!orgId || !selectedProjectId) return;
    createMutation.mutate({
      payload: {
        projectId: selectedProjectId,
        organizationId: orgId,
        title,
        statusId,
        priority: "MEDIUM",
        recurrence: { repeat: "WEEKLY" },
      },
    });
  }, [orgId, selectedProjectId, createMutation]);

  const handleCreateFromModal = useCallback((
    data: CreateTaskFormData,
    descriptionImageFiles?: File[],
    subtaskPendingAttachments?: import("@/lib/upload-subtask-attachments").SubtaskPendingUploadMap,
    taskPendingAttachments?: import("@/components/tasks/subtasks/subtask-attachments-section").PendingSubtaskAttachment[]
  ) => {
    if (!orgId || !selectedProjectId) return;
    createMutation.mutate({
      payload: {
        projectId: selectedProjectId,
        organizationId: orgId,
        title: data.title,
        description: data.description || undefined,
        statusId: data.statusId || statuses[0]?.id || undefined,
        priority: data.priority,
        assigneeIds: data.assigneeIds?.length ? data.assigneeIds : undefined,
        assigneeId: data.assigneeIds?.[0] || undefined,
        storyPoints: data.storyPoints,
        dueDate: data.dueDate || undefined,
        tags: data.labels?.length ? data.labels.map((l) => ({ name: l.name, color: l.color })) : undefined,
        subtasks: data.subtasks
          .map((s) => ({
            id: s.id,
            title: s.title.trim(),
            description: s.description?.trim() || undefined,
            completed: s.completed,
            assigneeId: s.assigneeId || undefined,
            dueDate: s.dueDate || undefined,
            status: s.status ?? (s.completed ? "DONE" : "TODO"),
          }))
          .filter((s) => s.title.length > 0),
        recurrence:
          data.recurrence?.repeat && data.recurrence.repeat !== "NONE"
            ? data.recurrence
            : undefined,
      },
      imageFiles: descriptionImageFiles,
      subtaskPendingAttachments,
      taskAttachmentFiles: taskPendingAttachments?.map((item) => item.file),
    });
  }, [orgId, selectedProjectId, createMutation, statuses]);

  const quickActions = useMemo(() => ({
    onEdit: (task: Task) => setSelectedTaskId(task.id),
    onChangeStatus: (task: Task, statusId: string) => updateMutation.mutate({ taskId: task.id, statusId }),
    onCompleteOccurrence: (task: Task) =>
      recurringActionMutation.mutate({ type: "complete", task }),
    onSkipNextOccurrence: (task: Task) =>
      recurringActionMutation.mutate({ type: "skip", task }),
    onPauseSeries: (task: Task) => {
      if (!task.recurringTemplateId) return;
      pauseSeriesMutation.mutate(task.recurringTemplateId);
    },
    onDelete: (task: Task) => setDeleteTarget(task),
  }), [updateMutation, recurringActionMutation, pauseSeriesMutation]);

  const healthMetrics = useMemo(
    () =>
      computeRecurringHealth(
        summaryQuery.data,
        recurringTasks,
        recurringTemplates,
        boardStats.completedPercent
      ),
    [summaryQuery.data, recurringTasks, recurringTemplates, boardStats.completedPercent]
  );

  useKeyboardShortcuts(useMemo(() => [
    { key: "n", ctrl: true, handler: () => { if (permissions.canCreateTask && selectedProjectId) setCreateModalOpen(true); }, description: "Create recurring task" },
    { key: "b", handler: () => setViewMode((m) => (m === "kanban" ? "table" : "kanban")), description: "Cycle view (Kanban/Table)" },
  ], [permissions.canCreateTask, selectedProjectId]));

  if (!orgId) {
    return (
      <div className="space-y-8 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recurring Tasks</h1>
          <p className="mt-1 text-muted-foreground">Manage recurring task occurrences across your projects.</p>
        </div>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">No workspace selected</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Select a workspace first to see recurring tasks.</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/workspaces">Select workspace</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (projectsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-9 w-56" />
        </div>
        <BoardSkeleton />
      </div>
    );
  }

  if (selectableProjects.length === 0) {
    return (
      <Card className="max-w-lg border-dashed border-2">
        <CardContent className="py-10 text-center">
          <p className="font-semibold">Create your first project</p>
          <p className="mt-1 text-sm text-muted-foreground">Projects are required before you can manage recurring tasks.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/projects">Create Project</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!selectedProject) return <BoardSkeleton />;

  const isBoardLoading = workflowsLoading || statusesLoading || tasksLoading || setupWorkflowMutation.isPending;

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col gap-2 overflow-hidden animate-slide-up">
      {celebrationLayer}
      <BoardCommandBar
        selectors={
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            <BoardSelectorField label="Workspace" className="w-full sm:w-[min(100%,200px)] sm:shrink-0">
              <OrgSwitcher
                variant="navbar"
                compact
                contentAlign="start"
                className="h-8 w-full justify-between rounded-lg border border-border/55 bg-background px-2 shadow-sm transition-colors duration-200 hover:bg-muted/20"
              />
            </BoardSelectorField>
            <BoardSelectorField label="Project" className="min-w-0 flex-1 sm:max-w-[280px]">
              <ProjectSwitcher
                projects={selectableProjects}
                selectedProjectId={selectedProjectId}
                selectedTaskCount={recurringTasks.length}
                onProjectChange={handleProjectChange}
                disabled={projectsLoading}
                compact
                hideLabel
              />
            </BoardSelectorField>
          </div>
        }
        actions={
          <>
            {!permissions.canEditTask && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border/45 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Shield className="h-3 w-3" /> View only
              </span>
            )}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground transition-colors duration-200">
                    <Keyboard className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Ctrl+N create · B cycle Kanban/Table
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {permissions.canCreateTask && (
              <Button
                onClick={() => {
                  setDefaultStatusId(statuses[0]?.id);
                  setCreateModalOpen(true);
                }}
                data-cy="create-recurring-task-button"
                className={cn(BOARD_COMMAND_ACTION_BTN, "px-2.5 shadow-sm")}
              >
                <Plus className="h-3 w-3" /> New recurring task
              </Button>
            )}
          </>
        }
        stats={
          recurringTasks.length > 0 || summaryQuery.data ? (
            <RecurringSummaryStats
              summary={summaryQuery.data}
              tasks={recurringTasks}
              templates={recurringTemplates}
              completedPercent={boardStats.completedPercent}
              doneStatusId={doneStatusId}
              isLoading={summaryQuery.isLoading || isBoardLoading}
            />
          ) : undefined
        }
        toolbar={
          !isBoardLoading && statuses.length > 0 ? (
            <BoardToolbar
              filters={filters}
              onFiltersChange={setFilters}
              assigneeMap={assigneeMap}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              taskCount={recurringTasks.length}
              filteredCount={filteredTaskCount}
              showRecurrenceFilter={false}
            />
          ) : undefined
        }
      />

      {isBoardLoading ? (
        <BoardSkeleton />
      ) : statuses.length > 0 ? (
        <>
          <div className="flex h-0 min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            {(viewMode === "kanban" || viewMode === "scrum") ? (
              <KanbanBoard
                className="min-h-0 flex-1"
                statuses={statuses}
                tasksByStatus={tasksByStatus}
                onMoveTask={handleMoveTask}
                onQuickAdd={permissions.canCreateTask ? handleQuickAdd : undefined}
                onTaskClick={(task) => setSelectedTaskId(task.id)}
                assigneeMap={assigneeMap}
                commentCountMap={commentCountMap}
                subtaskMap={subtaskMap}
                filters={filters}
                quickActions={quickActions}
                permissions={permissions}
                currentUserId={currentUserId}
                boardVariant="recurring"
                recurringTemplateMap={recurringTemplateMap}
                aria-label={`Recurring tasks for ${selectedProject.name}`}
              />
            ) : (
              <div className="min-h-0 flex-1 basis-0 overflow-y-auto">
                <BoardTableView
                  tasks={allTasksFlat}
                  statuses={statuses}
                  assigneeMap={assigneeMap}
                  subtaskMap={subtaskMap}
                  onTaskClick={(task) => setSelectedTaskId(task.id)}
                  permissions={permissions}
                />
              </div>
            )}
          </div>

          {recurringTasks.length > 0 ? (
            <RecurringHealthSection metrics={healthMetrics} />
          ) : null}

          {recurringTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/10 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <p className="mt-4 text-lg font-semibold">No recurring tasks yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create a recurring task to schedule repeating work for this project.
              </p>
              {permissions.canCreateTask && (
                <Button
                  className="mt-5 shadow-lg shadow-primary/20"
                  onClick={() => {
                    setDefaultStatusId(statuses[0]?.id);
                    setCreateModalOpen(true);
                  }}
                >
                  <Sparkles className="mr-1.5 h-4 w-4" /> Create First Recurring Task
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/10 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Columns3 className="h-8 w-8 text-primary" />
          </div>
          <p className="mt-5 text-lg font-semibold">Board not set up yet</p>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {setupWorkflowMutation.isPending
              ? "Setting up your task board…"
              : "This project needs a task board before recurring tasks can appear."}
          </p>
          <Button
            className="mt-6 shadow-lg shadow-primary/20"
            onClick={() => setupWorkflowMutation.mutate(selectedProject.id)}
            disabled={setupWorkflowMutation.isPending}
          >
            {setupWorkflowMutation.isPending ? "Setting up..." : (
              <>
                <Columns3 className="mr-1.5 h-4 w-4" /> Setup Task Board
              </>
            )}
          </Button>
          {setupWorkflowMutation.error && (
            <p className="mt-3 text-sm text-destructive">{parseApiError(setupWorkflowMutation.error)}</p>
          )}
        </div>
      )}

      <CreateTaskModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateFromModal}
        isSubmitting={createMutation.isPending}
        error={createMutation.error ? (isRateLimited(createMutation.error) ? "Too many requests. Try again later." : parseApiError(createMutation.error)) : null}
        projectId={selectedProjectId ?? ""}
        projectName={selectedProject?.name}
        statuses={statuses}
        defaultStatusId={defaultStatusId}
        showRecurrence
      />

      {orgId && selectedProjectId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          projectId={selectedProjectId}
          organizationId={orgId}
          statuses={statuses}
          open={selectedTaskId !== null}
          onOpenChange={(open) => !open && setSelectedTaskId(null)}
          readOnly={!permissions.canEditTask}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete task"
        description={
          deleteTarget
            ? `Permanently delete "${deleteTarget.title}"? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

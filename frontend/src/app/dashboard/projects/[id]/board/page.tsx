"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProject } from "@/services/api/projects.api";
import { fetchWorkflowsByProject, fetchWorkflowStatuses, createDefaultWorkflow } from "@/services/api/workflows.api";
import { fetchTasksByProject, updateTaskStatus, updateTaskStatusAndSprint, createTask, deleteTask } from "@/services/api/tasks.api";
import { fetchSprintsByProject, createSprint } from "@/services/api/sprints.api";
import { fetchOrgMembers, fetchProjectMembers } from "@/services/api/members.api";
import { fetchCommentCounts } from "@/services/api/comments.api";
import { fetchSubscription } from "@/services/api/billing.api";
import { parseApiError, isRateLimited, getStoredToken } from "@/services/api/client";
import {
  completeRecurringTaskWithAction,
  skipNextRecurringOccurrence,
} from "@/services/api/recurring-tasks.api";
import { createTaskWithDescriptionImages } from "@/lib/upload-task-description-images";
import { useTenant } from "@/context/tenant-context";
import {
  KanbanBoard,
  computeBoardStats,
  computeSubtaskMap,
  DEFAULT_FILTERS,
  type AssigneeMap,
  type BoardFilters,
} from "@/components/kanban/kanban-board";
import { ScrumBoard, type Swimlane } from "@/components/kanban/scrum-board";
import { BoardToolbar, type ViewMode, type SavedView } from "@/components/kanban/board-toolbar";
import { BoardStatsBar } from "@/components/kanban/board-stats";
import { BoardTableView } from "@/components/kanban/board-table-view";
import { BoardSettingsModal, type BoardSettings } from "@/components/kanban/board-settings-modal";
import { BoardSkeleton } from "@/components/kanban/board-skeleton";
import { BulkActionBar } from "@/components/kanban/bulk-action-bar";
import { CreateTaskModal, type CreateTaskFormData } from "@/components/tasks/create-task-modal";
import { useTaskCreatedCelebration } from "@/components/tasks/task-create-celebration";
import { CreateSprintModal, type CreateSprintFormData } from "@/components/sprints/create-sprint-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useSavedViews } from "@/hooks/use-saved-views";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useBoardPermissions } from "@/hooks/use-board-permissions";
import { useRetentionTracking } from "@/hooks/use-retention-tracking";
import type { Task } from "@/types/api";
import { exportTasksToZipFile } from "@/lib/export-tasks-zip";
import { ImportTasksZipModal } from "@/components/tasks/import-tasks-zip-modal";
import { Plus, Columns3, Settings, Sparkles, Keyboard, Shield, Crown, Rocket, Download, Upload } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Extract user ID from the stored JWT without a library */
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

export default function ProjectBoardPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { orgId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { trackFirstTaskCreated } = useRetentionTracking();
  const { triggerTaskCreatedCelebration, celebrationLayer } = useTaskCreatedCelebration();
  const currentUserId = useMemo(() => getCurrentUserId(), []);

  // ─── UI state ──────────────────────────────────────────────

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [defaultStatusId, setDefaultStatusId] = useState<string | undefined>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [boardSettings, setBoardSettings] = useState<BoardSettings>({ wipLimits: {} });
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<Record<string, boolean>>({});
  const [createSprintModalOpen, setCreateSprintModalOpen] = useState(false);
  const [importZipOpen, setImportZipOpen] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  // ─── Hooks ─────────────────────────────────────────────────

  const { savedViews, saveView, deleteView } = useSavedViews(id);
  const bulk = useBulkSelection();

  // ─── Queries ───────────────────────────────────────────────

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id),
    enabled: !!id && !!orgId,
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows", id],
    queryFn: () => fetchWorkflowsByProject(id),
    enabled: !!id && !!orgId,
  });

  const defaultWorkflow = useMemo(() => workflows.find((w) => w.isDefault) ?? workflows[0], [workflows]);

  const { data: statuses = [], isLoading: statusesLoading } = useQuery({
    queryKey: ["workflow-statuses", defaultWorkflow?.id],
    queryFn: () => fetchWorkflowStatuses(defaultWorkflow!.id),
    enabled: !!defaultWorkflow?.id,
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", id],
    queryFn: () => fetchTasksByProject(id, 1, 200),
    enabled: !!id && !!orgId,
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ["project-members", id],
    queryFn: () => fetchProjectMembers(id),
    enabled: !!id && !!orgId,
    staleTime: 60_000,
  });

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org-members", orgId ?? ""],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId,
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ["sprints", id],
    queryFn: () => fetchSprintsByProject(id),
    enabled: !!id && !!orgId,
  });

  // Comment counts for all tasks — fetched once, refreshed when tasks change
  const taskIds = useMemo(() => (tasksData?.data ?? []).map((t) => t.id), [tasksData]);
  const { data: commentCountMap = {} } = useQuery({
    queryKey: ["comment-counts", id, taskIds.join(",")],
    queryFn: () => fetchCommentCounts(taskIds),
    enabled: taskIds.length > 0 && taskIds.length <= 50,
    staleTime: 60_000,
  });

  // Subscription for plan enforcement
  const { data: subscription } = useQuery({
    queryKey: ["subscription", orgId ?? ""],
    queryFn: fetchSubscription,
    enabled: !!orgId,
    staleTime: 300_000,
  });

  // ─── Permissions ───────────────────────────────────────────

  const permissions = useBoardPermissions(orgMembers, currentUserId);

  // ─── Derived data ─────────────────────────────────────────

  const tasks = tasksData?.data ?? [];
  const isTrialOrFree = !subscription || subscription.status === "TRIAL" || subscription.status === "FREE";

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
    for (const t of tasks) {
      if (t.assigneeId && t.assignee && !map[t.assigneeId]) {
        map[t.assigneeId] = {
          name: t.assignee.fullName ?? t.assignee.email ?? t.assigneeId,
          avatarUrl: t.assignee.avatarUrl,
        };
      }
    }
    return map;
  }, [projectMembers, orgMembers, tasks]);

  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const s of statuses) map[s.id] = [];
    for (const t of tasks) {
      const key = t.statusId ?? statuses[0]?.id ?? "none";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    if (statuses.length && !map[statuses[0].id]) map[statuses[0].id] = [];
    return map;
  }, [tasks, statuses]);

  const boardStats = useMemo(() => computeBoardStats(tasks, statuses), [tasks, statuses]);

  const doneStatusId = useMemo(
    () => statuses.find((s) => s.type === "DONE" || s.name.toLowerCase() === "done")?.id,
    [statuses]
  );

  const subtaskMap = useMemo(() => computeSubtaskMap(tasks, doneStatusId), [tasks, doneStatusId]);

  const filteredTaskCount = useMemo(() => {
    const hasFilter =
      filters.search ||
      filters.priority.length > 0 ||
      filters.assignee.length > 0 ||
      filters.recurrence !== "all";
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
        if (filters.recurrence === "normal" && t.recurrenceType && t.recurrenceType !== "NONE") return false;
        if (filters.recurrence === "recurring" && (!t.recurrenceType || t.recurrenceType === "NONE")) return false;
        return true;
      }).length;
    }
    return count;
  }, [tasksByStatus, filters]);

  const allTasksFlat = useMemo(() => {
    const all: Task[] = [];
    for (const s of statuses) all.push(...(tasksByStatus[s.id] ?? []));
    return all;
  }, [statuses, tasksByStatus]);

  const swimlanes: Swimlane[] = useMemo(() => {
    const sorted = [...sprints].sort((a, b) => {
      if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
      if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
      const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
      return aStart - bStart;
    });
    const lanes: Swimlane[] = sorted.map((s) => ({
      id: s.id,
      name: s.name,
      sprint: s,
      isBacklog: false,
    }));
    lanes.push({ id: "__backlog__", name: "Backlog", isBacklog: true });
    return lanes;
  }, [sprints]);

  const tasksByCell = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const lane of swimlanes) {
      for (const s of statuses) {
        const key = `${lane.id}::${s.id}`;
        map[key] = tasks.filter((t) => {
          const matchSprint = lane.isBacklog ? !t.sprintId : t.sprintId === lane.id;
          const matchStatus = (t.statusId ?? statuses[0]?.id) === s.id;
          return matchSprint && matchStatus;
        });
      }
    }
    return map;
  }, [swimlanes, statuses, tasks]);

  // ─── Mutations ────────────────────────────────────────────

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, statusId }: { taskId: string; statusId: string | null }) =>
      updateTaskStatus(taskId, statusId),
    onMutate: async ({ taskId, statusId: toStatusId }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", id] });
      const prev = queryClient.getQueryData<{ data: Task[] }>(["tasks", id]);
      queryClient.setQueryData<{ data: Task[] }>(["tasks", id], (old) => {
        if (!old) return old;
        return { ...old, data: old.data.map((t) => (t.id === taskId ? { ...t, statusId: toStatusId ?? undefined } : t)) };
      });
      return { previous: prev };
    },
    onSuccess: (updated, vars) => {
      if (updated?.id) {
        queryClient.setQueryData<{ data: Task[] }>(["tasks", id], (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((t) => (t.id === vars.taskId ? { ...t, ...updated } : t)),
          };
        });
        queryClient.setQueryData(["task", vars.taskId], updated);
      }
      const toName = statuses.find((s) => s.id === vars.statusId)?.name ?? "new column";
      toast({ title: "Task moved", description: `Moved to ${toName}`, variant: "success" });
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["tasks", id], context.previous);
      toast({ title: "Failed to move task", description: "Returned to original column.", variant: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: (_data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      if (selectedTaskId === taskId) setSelectedTaskId(null);
      setDeleteTarget(null);
      toast({ title: "Task deleted", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Failed to delete task",
        description: isRateLimited(err) ? "Too many requests." : parseApiError(err),
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
    onMutate: async ({ payload }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", id] });
      const prev = queryClient.getQueryData<{ data: Task[]; meta?: unknown }>(["tasks", id]);
      const optimistic: Task = {
        id: `temp-${Date.now()}`,
        projectId: id,
        organizationId: orgId!,
        title: payload.title,
        description: payload.description,
        statusId: payload.statusId,
        priority: payload.priority ?? "MEDIUM",
        reporterId: "",
        loggedMinutes: 0,
        storyPoints: payload.storyPoints,
        dueDate: payload.dueDate,
        tags: payload.tags ?? [],
        subtasks: (payload.subtasks ?? []) as Task["subtasks"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData<{ data: Task[]; meta?: unknown }>(["tasks", id], (old) =>
        !old ? { data: [optimistic] } : { ...old, data: [...old.data, optimistic] }
      );
      return { previous: prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["tasks", id], context.previous);
      toast({ title: "Failed to create task", variant: "error" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", id] }),
    onSuccess: (result) => {
      setCreateModalOpen(false);
      const uploadWarning =
        result.subtaskUploadWarning ??
        result.taskAttachmentWarning ??
        result.imageUploadWarning;
      if (uploadWarning) {
        toast({
          title: "Task created",
          description: uploadWarning,
          variant: "error",
        });
      } else {
        toast({ title: "Task created", variant: "success" });
      }
      trackFirstTaskCreated();
      triggerTaskCreatedCelebration();
    },
  });

  const scrumMoveMutation = useMutation({
    mutationFn: ({ taskId, statusId, sprintId }: { taskId: string; statusId: string; sprintId: string | null }) =>
      updateTaskStatusAndSprint(taskId, statusId, sprintId),
    onMutate: async ({ taskId, statusId: toStatusId, sprintId: toSprintId }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", id] });
      const prev = queryClient.getQueryData<{ data: Task[] }>(["tasks", id]);
      queryClient.setQueryData<{ data: Task[] }>(["tasks", id], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((t) =>
            t.id === taskId ? { ...t, statusId: toStatusId, sprintId: toSprintId ?? undefined } : t
          ),
        };
      });
      return { previous: prev };
    },
    onSuccess: (updated, vars) => {
      if (!updated?.id) return;
      queryClient.setQueryData<{ data: Task[] }>(["tasks", id], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((t) => (t.id === vars.taskId ? { ...t, ...updated } : t)),
        };
      });
      queryClient.setQueryData(["task", vars.taskId], updated);
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["tasks", id], context.previous);
      toast({ title: "Failed to move task", description: "Returned to original position.", variant: "error" });
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
      const doneStatusId = statuses.find((s) => s.type === "DONE")?.id;
      await completeRecurringTaskWithAction(task.id, {
        action: "ONLY_THIS",
        doneStatusId,
      });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
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

  const createSprintMutation = useMutation({
    mutationFn: (payload: CreateSprintFormData) =>
      createSprint({ projectId: id, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", id] });
      setCreateSprintModalOpen(false);
      toast({ title: "Sprint created", variant: "success" });
    },
  });

  const setupWorkflowMutation = useMutation({
    mutationFn: (projectId: string) => createDefaultWorkflow(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", id] });
      queryClient.invalidateQueries({ queryKey: ["workflow-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    },
  });

  // ─── Handlers ─────────────────────────────────────────────

  const handleMoveTask = useCallback((taskId: string, _from: string | null, toStatusId: string) => {
    updateStatusMutation.mutate({ taskId, statusId: toStatusId });
  }, [updateStatusMutation]);

  const handleScrumMoveTask = useCallback(
    (taskId: string, toStatusId: string, toSprintId: string | null) => {
      scrumMoveMutation.mutate({ taskId, statusId: toStatusId, sprintId: toSprintId });
    },
    [scrumMoveMutation]
  );

  const handleQuickAdd = useCallback(
    (title: string, statusId: string) => {
      if (!orgId) return;
      createMutation.mutate({
        payload: { projectId: id, organizationId: orgId, title, statusId, priority: "MEDIUM" },
      });
    },
    [orgId, id, createMutation]
  );

  const handleExportZip = useCallback(async () => {
    if (tasks.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Create at least one task in this project first.",
        variant: "error",
      });
      return;
    }
    const assigneeNameById: Record<string, string> = {};
    for (const [userId, info] of Object.entries(assigneeMap)) {
      assigneeNameById[userId] = info.name;
    }
    const hasActiveFilters =
      filters.search.length > 0 ||
      filters.priority.length > 0 ||
      filters.assignee.length > 0 ||
      filters.recurrence !== "all";
    setExportingZip(true);
    try {
      const { count, filename, mediaFiles } = await exportTasksToZipFile(tasks, {
        projectName: project?.name,
        statuses,
        assigneeNameById,
        filters,
        onlyFiltered: hasActiveFilters,
      });
      toast({
        title: "ZIP exported",
        description: `Downloaded ${filename} (${count} task${count === 1 ? "" : "s"}, ${mediaFiles} file${mediaFiles === 1 ? "" : "s"}).`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Could not create ZIP file",
        variant: "error",
      });
    } finally {
      setExportingZip(false);
    }
  }, [tasks, assigneeMap, statuses, filters, project?.name, toast]);

  const handleCreateFromModal = useCallback(
    (
      data: CreateTaskFormData,
      descriptionImageFiles?: File[],
      subtaskPendingAttachments?: import("@/lib/upload-subtask-attachments").SubtaskPendingUploadMap,
      taskPendingAttachments?: import("@/components/tasks/subtasks/subtask-attachments-section").PendingSubtaskAttachment[]
    ) => {
      if (!orgId) return;
      createMutation.mutate({
        payload: {
          projectId: id,
          organizationId: orgId,
          title: data.title,
          description: data.description,
          statusId: data.statusId ?? statuses[0]?.id,
          priority: data.priority,
          assigneeIds: data.assigneeIds?.length ? data.assigneeIds : undefined,
          assigneeId: data.assigneeIds?.[0] || undefined,
          storyPoints: data.storyPoints,
          dueDate: data.dueDate,
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
    },
    [orgId, id, statuses, createMutation]
  );

  const quickActions = useMemo(() => ({
    onEdit: (task: Task) => setSelectedTaskId(task.id),
    onChangeStatus: (task: Task, statusId: string) => {
      updateStatusMutation.mutate({ taskId: task.id, statusId });
    },
    onCompleteOccurrence: (task: Task) =>
      recurringActionMutation.mutate({ type: "complete", task }),
    onSkipNextOccurrence: (task: Task) =>
      recurringActionMutation.mutate({ type: "skip", task }),
    ...(permissions.canDeleteTask && {
      onDelete: (task: Task) => setDeleteTarget(task),
    }),
  }), [updateStatusMutation, recurringActionMutation, permissions.canDeleteTask]);

  const toggleColumnCollapse = useCallback((statusId: string) => {
    setCollapsedColumns((prev) => ({ ...prev, [statusId]: !prev[statusId] }));
  }, []);

  const handleSetWipLimit = useCallback((statusId: string, limit: number | undefined) => {
    setBoardSettings((prev) => {
      const wipLimits = { ...prev.wipLimits };
      if (limit === undefined) delete wipLimits[statusId];
      else wipLimits[statusId] = limit;
      return { ...prev, wipLimits };
    });
    toast({ title: limit ? `WIP limit set to ${limit}` : "WIP limit removed", variant: "default" });
  }, [toast]);

  // Bulk actions
  const handleBulkMove = useCallback(async (toStatusId: string) => {
    const ids = Array.from(bulk.state.selectedIds);
    if (ids.length === 0) return;
    setIsBulkMoving(true);
    const toName = statuses.find((s) => s.id === toStatusId)?.name ?? "column";

    try {
      await Promise.all(ids.map((taskId) => updateTaskStatus(taskId, toStatusId)));
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      toast({ title: `${ids.length} tasks moved`, description: `Moved to ${toName}`, variant: "success" });
      bulk.deselectAll();
    } catch {
      toast({ title: "Some tasks failed to move", variant: "error" });
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    } finally {
      setIsBulkMoving(false);
    }
  }, [bulk, statuses, id, queryClient, toast]);

  const handleSelectColumnTasks = useCallback((statusId: string) => {
    const columnTasks = tasksByStatus[statusId] ?? [];
    if (columnTasks.length === 0) return;
    if (!bulk.state.isSelectionMode) bulk.enterSelectionMode();
    bulk.selectAll(columnTasks.map((t) => t.id));
  }, [tasksByStatus, bulk]);

  const handleToggleSelectionMode = useCallback(() => {
    if (bulk.state.isSelectionMode) bulk.exitSelectionMode();
    else bulk.enterSelectionMode();
  }, [bulk]);

  // Saved views
  const handleSaveView = useCallback((name: string, viewFilters: BoardFilters) => {
    saveView(name, viewFilters);
    toast({ title: "View saved", variant: "success" });
  }, [saveView, toast]);

  const handleLoadView = useCallback((view: SavedView) => {
    setFilters(view.filters);
    toast({ title: `Loaded "${view.name}"`, variant: "default" });
  }, [toast]);

  const handleDeleteView = useCallback((viewId: string) => {
    deleteView(viewId);
    toast({ title: "View deleted", variant: "default" });
  }, [deleteView, toast]);

  // ─── Keyboard shortcuts ───────────────────────────────────

  useKeyboardShortcuts(
    useMemo(() => [
      {
        key: "n",
        ctrl: true,
        handler: () => {
          if (!permissions.canCreateTask) return;
          setDefaultStatusId(statuses[0]?.id);
          setCreateModalOpen(true);
        },
        description: "Create new task",
      },
      {
        key: "/",
        handler: () => {
          const el = document.querySelector('[data-cy="board-search"]') as HTMLElement;
          if (el) el.focus();
          else (document.querySelector('button:has(.lucide-search)') as HTMLElement)?.click();
        },
        description: "Focus search",
      },
      {
        key: "b",
        handler: () => setViewMode((m) => (m === "kanban" ? "scrum" : m === "scrum" ? "table" : "kanban")),
        description: "Cycle view (Kanban/Scrum/Table)",
      },
      {
        key: "Escape",
        handler: () => {
          if (bulk.state.isSelectionMode) bulk.exitSelectionMode();
          else if (selectedTaskId) setSelectedTaskId(null);
          else if (createModalOpen) setCreateModalOpen(false);
        },
        description: "Close / exit",
      },
      {
        key: "s",
        ctrl: true,
        shift: true,
        handler: () => {
          if (permissions.canBulkSelect) handleToggleSelectionMode();
        },
        description: "Toggle selection mode",
      },
    ], [statuses, selectedTaskId, createModalOpen, bulk, permissions, handleToggleSelectionMode])
  );

  // ─── Render ───────────────────────────────────────────────

  if (!project) return null;

  if ((statusesLoading || tasksLoading) && statuses.length === 0) {
    return <BoardSkeleton />;
  }

  if (statuses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/10 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Columns3 className="h-8 w-8 text-primary" />
        </div>
        <p className="mt-5 text-lg font-semibold">Board not set up yet</p>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">
          Create a task board with statuses to get started.
        </p>
        <Button
          className="mt-6"
          onClick={() => setupWorkflowMutation.mutate(id)}
          disabled={setupWorkflowMutation.isPending}
        >
          {setupWorkflowMutation.isPending ? "Setting up..." : <><Columns3 className="h-4 w-4 mr-1.5" /> Setup Task Board</>}
        </Button>
        {setupWorkflowMutation.error && (
          <p className="mt-3 text-sm text-destructive">{parseApiError(setupWorkflowMutation.error)}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 basis-0 flex-col gap-4 overflow-hidden">
      {celebrationLayer}
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            Board
            {!permissions.canEditTask && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Shield className="h-3 w-3" /> View only — owner can edit
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {!permissions.canEditTask
              ? "You can view tasks; only the workspace owner can edit or move them."
              : "Drag tasks between columns, use filters to find what you need."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground">
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs space-y-1">
                <p><kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">Ctrl+N</kbd> New task</p>
                <p><kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">/</kbd> Search</p>
                <p><kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">B</kbd> Cycle Kanban/Scrum/Table</p>
                <p><kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">Ctrl+Shift+S</kbd> Select mode</p>
                <p><kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">Esc</kbd> Close / exit</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {viewMode === "scrum" && permissions.canManageBoard && (
            <Button variant="outline" size="sm" onClick={() => setCreateSprintModalOpen(true)} className="h-9 gap-1.5">
              <Rocket className="h-3.5 w-3.5" />
              New Sprint
            </Button>
          )}
          {permissions.canManageBoard && (
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="h-9 gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={tasks.length === 0 || exportingZip}
            onClick={() => void handleExportZip()}
            data-cy="export-tasks-zip"
          >
            <Download className="h-4 w-4" />
            {exportingZip ? "Exporting…" : "Export ZIP"}
          </Button>
          {permissions.canCreateTask && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setImportZipOpen(true)}
              data-cy="import-tasks-zip"
            >
              <Upload className="h-4 w-4" />
              Import ZIP
            </Button>
          )}
          {permissions.canCreateTask && (
            <Button
              onClick={() => {
                setDefaultStatusId(statuses[0]?.id);
                setCreateModalOpen(true);
              }}
              data-cy="create-task-button"
              className="shadow-lg shadow-primary/20"
            >
              <Plus className="mr-1.5 h-4 w-4" /> New Task
            </Button>
          )}
        </div>
      </div>

      {/* Plan enforcement banner */}
      {isTrialOrFree && tasks.length > 25 && (
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 animate-in fade-in duration-300">
          <Crown className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="flex-1 text-sm text-amber-700 dark:text-amber-400">
            You have <strong>{tasks.length} tasks</strong>. Upgrade your plan for unlimited tasks, advanced analytics, and priority support.
          </p>
          <Link href="/dashboard/billing">
            <Button size="sm" variant="outline" className="shrink-0 border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
              Upgrade
            </Button>
          </Link>
        </div>
      )}

      <div className="shrink-0 space-y-4">
        {/* Stats */}
        {tasks.length > 0 && (
          <BoardStatsBar
            stats={boardStats}
            onRecurringFilterClick={() =>
              setFilters((prev) => ({ ...prev, recurrence: "recurring" }))
            }
          />
        )}

        {/* Toolbar */}
        <BoardToolbar
          filters={filters}
          onFiltersChange={setFilters}
          assigneeMap={assigneeMap}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          taskCount={tasks.length}
          filteredCount={filteredTaskCount}
          recurringCount={boardStats.recurring}
          savedViews={savedViews}
          onSaveView={handleSaveView}
          onLoadView={handleLoadView}
          onDeleteView={handleDeleteView}
          isSelectionMode={bulk.state.isSelectionMode}
          onToggleSelectionMode={handleToggleSelectionMode}
          canBulkSelect={permissions.canBulkSelect}
        />
      </div>

      {/* Board / Table */}
      <div className="flex min-h-0 flex-1 basis-0 flex-col overflow-hidden">
      {viewMode === "kanban" ? (
        <KanbanBoard
          className="min-h-0 flex-1 basis-0"
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
          wipLimits={boardSettings.wipLimits}
          collapsedColumns={collapsedColumns}
          onToggleColumnCollapse={toggleColumnCollapse}
          isSelectionMode={bulk.state.isSelectionMode}
          selectedIds={bulk.state.selectedIds}
          onToggleSelect={bulk.toggle}
          onSelectColumnTasks={handleSelectColumnTasks}
          onSetWipLimit={handleSetWipLimit}
          permissions={permissions}
          currentUserId={currentUserId}
          aria-label={`Tasks for ${project.name}`}
        />
      ) : viewMode === "scrum" ? (
        <ScrumBoard
          className="min-h-0 flex-1 basis-0"
          swimlanes={swimlanes}
          statuses={statuses}
          tasksByCell={tasksByCell}
          onMoveTask={handleScrumMoveTask}
          onTaskClick={(task) => setSelectedTaskId(task.id)}
          assigneeMap={assigneeMap}
          commentCountMap={commentCountMap}
          subtaskMap={subtaskMap}
          filters={filters}
          quickActions={quickActions}
          wipLimits={boardSettings.wipLimits}
          collapsedSwimlanes={collapsedSwimlanes}
          onToggleSwimlaneCollapse={(swimlaneId) =>
            setCollapsedSwimlanes((prev) => ({ ...prev, [swimlaneId]: !prev[swimlaneId] }))
          }
          isSelectionMode={bulk.state.isSelectionMode}
          selectedIds={bulk.state.selectedIds}
          onToggleSelect={bulk.toggle}
          permissions={permissions}
          currentUserId={currentUserId}
          aria-label={`Scrum board for ${project.name}`}
        />
      ) : (
        <div className="min-h-0 flex-1 basis-0 overflow-y-auto">
          <BoardTableView
            tasks={allTasksFlat}
            statuses={statuses}
            assigneeMap={assigneeMap}
            subtaskMap={subtaskMap}
            onTaskClick={(task) => setSelectedTaskId(task.id)}
            isSelectionMode={bulk.state.isSelectionMode}
            selectedIds={bulk.state.selectedIds}
            onToggleSelect={bulk.toggle}
            permissions={permissions}
          />
        </div>
      )}
      </div>

      {/* Bulk action bar */}
      {bulk.state.isSelectionMode && (
        <BulkActionBar
          selectedCount={bulk.state.count}
          statuses={statuses}
          onBulkMove={handleBulkMove}
          onDeselectAll={bulk.deselectAll}
          onExitSelection={bulk.exitSelectionMode}
          isMoving={isBulkMoving}
        />
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/10 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <p className="mt-4 text-lg font-semibold">No tasks yet</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {permissions.canCreateTask
              ? "Create your first task with the button above or quick-add in each column."
              : "No tasks have been created for this project yet."}
          </p>
          {permissions.canCreateTask && (
            <>
              <p className="mt-2 text-xs text-muted-foreground">
                Press <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">Ctrl+N</kbd> to quickly create a task
              </p>
              <Button
                className="mt-5 shadow-lg shadow-primary/20"
                onClick={() => {
                  setDefaultStatusId(statuses[0]?.id);
                  setCreateModalOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Create First Task
              </Button>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateTaskModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateFromModal}
        isSubmitting={createMutation.isPending}
        error={
          createMutation.error
            ? isRateLimited(createMutation.error)
              ? "Too many requests."
              : parseApiError(createMutation.error)
            : null
        }
        projectId={id}
        statuses={statuses}
        defaultStatusId={defaultStatusId ?? statuses[0]?.id}
        onExportCsv={() => void handleExportZip()}
        exportCsvDisabled={tasks.length === 0 || exportingZip}
      />

      {orgId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          projectId={id}
          organizationId={orgId}
          statuses={statuses}
          open={selectedTaskId !== null}
          onOpenChange={(open) => !open && setSelectedTaskId(null)}
          readOnly={!permissions.canEditTask}
        />
      )}

      <BoardSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        statuses={statuses}
        settings={boardSettings}
        onSettingsChange={setBoardSettings}
      />

      {createSprintModalOpen && (
        <CreateSprintModal
          open={createSprintModalOpen}
          onClose={() => setCreateSprintModalOpen(false)}
          onSubmit={(data) => createSprintMutation.mutate(data)}
          isSubmitting={createSprintMutation.isPending}
          error={createSprintMutation.error ? parseApiError(createSprintMutation.error) : null}
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

      {orgId && permissions.canCreateTask && (
        <ImportTasksZipModal
          open={importZipOpen}
          onOpenChange={setImportZipOpen}
          projectId={id}
          organizationId={orgId}
          projectName={project?.name ?? "this project"}
          statuses={statuses}
          assigneeNameById={Object.fromEntries(
            Object.entries(assigneeMap).map(([uid, info]) => [uid, info.name]),
          )}
          onImported={() => {
            queryClient.invalidateQueries({ queryKey: ["tasks", id] });
          }}
        />
      )}
    </div>
  );
}

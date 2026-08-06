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
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from "@/services/api/tasks.api";
import { fetchOrgMembers, fetchProjectMembers } from "@/services/api/members.api";
import { fetchCommentCounts } from "@/services/api/comments.api";
import {
  archiveRecurringTemplate,
  duplicateRecurringTemplate,
  completeRecurringTaskWithAction,
  deleteRecurringSeries,
  fetchRecurringBoard,
  fetchRecurringSummary,
  fetchRecurringTemplates,
  pauseRecurringTemplate,
  resumeRecurringTemplate,
  skipNextRecurringOccurrence,
  syncRecurringBoard,
  updateRecurringTemplate,
} from "@/services/api/recurring-tasks.api";
import { parseApiError, isRateLimited, getStoredToken } from "@/services/api/client";
import { createTaskWithDescriptionImages } from "@/lib/upload-task-description-images";
import { useTenant } from "@/context/tenant-context";
import { useProjectSelection } from "@/context/project-selection-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { RecurringPremiumStats } from "@/components/recurring/recurring-premium-stats";
import { RecurringBoardToolbar, type RecurringViewMode } from "@/components/recurring/recurring-board-toolbar";
import { RecurringCalendarView } from "@/components/recurring/recurring-calendar-view";
import { RecurringAgendaView } from "@/components/recurring/recurring-agenda-view";
import { PlannerHeader } from "@/components/recurring/planner-header";
import { PlannerShelf, type ShelfCategory } from "@/components/recurring/planner-shelf";
import { RecurringTaskDrawer } from "@/components/recurring/recurring-task-drawer";
import { RecurringSeriesDrawer } from "@/components/recurring/recurring-series-drawer";
import { RecurringSeriesLibrary } from "@/components/recurring/recurring-series-library";
import { RecurringDayDrawer } from "@/components/recurring/recurring-day-drawer";
import {
  buildRecurringOverdueStatus,
  isRecurringOverdueColumn,
  partitionRecurringBoardTasks,
} from "@/lib/recurring-board-constants";
import type { RecurringBoardResponse } from "@/services/api/recurring-tasks.api";
import { RecurringExecutiveHealth } from "@/components/recurring/recurring-executive-health";
import { formatShortDate, computeExecutiveHealth, dedupeRecurringBoardTasks, pickBestOccurrence } from "@/lib/recurring-board-utils";
import { EXEC_PLANNER } from "@/lib/executive-planner-theme";
import {
  applyRecurringBoardFilters,
  DEFAULT_RECURRING_BOARD_FILTERS,
  type RecurringBoardFilters,
} from "@/lib/recurring-board-filters";
import {
  BoardCommandBar,
  BoardSelectorField,
  BOARD_COMMAND_ACTION_BTN,
} from "@/components/kanban/board-command-bar";
import {
  KanbanBoard,
  computeBoardStats,
  type AssigneeMap,
} from "@/components/kanban/kanban-board";
import {
  allOccurrenceSubtasksDone,
  computeOccurrenceSubtaskMap,
} from "@/lib/recurring-subtask-utils";
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
import type { Task, TaskRecurrenceConfig, RecurringTemplateSummary } from "@/types/api";
import { isRecurringTask, toRecurrenceLabel } from "@/lib/recurrence-display";
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
  const [fullDetailTaskId, setFullDetailTaskId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<RecurringViewMode>("calendar");
  const [filters, setFilters] = useState<RecurringBoardFilters>(DEFAULT_RECURRING_BOARD_FILTERS);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [shelfCategory, setShelfCategory] = useState<ShelfCategory>("all");
  const [seriesDetailId, setSeriesDetailId] = useState<string | null>(null);
  const [seriesDrawerOpen, setSeriesDrawerOpen] = useState(false);
  const [seriesDrawerStartEdit, setSeriesDrawerStartEdit] = useState(false);
  const [deleteSeriesTarget, setDeleteSeriesTarget] = useState<RecurringTemplateSummary | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false);
  const [overdueTaskIds, setOverdueTaskIds] = useState<string[]>([]);
  const autoOpenedTodayRef = useRef(false);

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
    setFilters(DEFAULT_RECURRING_BOARD_FILTERS);
    setSelectedTaskId(null);
    setFullDetailTaskId(null);
    setCreateModalOpen(false);
    setSelectedTemplateId(null);
    setShelfCategory("all");
    setSeriesDetailId(null);
    setSeriesDrawerOpen(false);
    setDeleteSeriesTarget(null);
    setSelectedDayKey(null);
    setDayDrawerOpen(false);
    autoOpenedTodayRef.current = false;
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

  const statusIds = useMemo(() => statuses.map((s) => s.id), [statuses]);

  const { data: boardData, isLoading: boardTasksLoading, isError: boardError, failureCount: boardFailureCount } = useQuery({
    queryKey: ["recurring-board", selectedProjectId, statusIds.join(",")],
    queryFn: () => fetchRecurringBoard(selectedProjectId!, statusIds),
    enabled: !!selectedProjectId && !!orgId && statuses.length > 0,
    retry: 1,
    // Peer checklist toggles (other users marking items done) need a live board.
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!boardError || boardFailureCount < 1) return;
    toast({
      title: "Could not load recurring board",
      description: "Restart the API server so GET /recurring-tasks/board is available, then refresh.",
      variant: "error",
    });
  }, [boardError, boardFailureCount, toast]);

  useEffect(() => {
    setOverdueTaskIds(boardData?.overdueTaskIds ?? []);
  }, [boardData?.overdueTaskIds]);

  const tasksLoading = boardTasksLoading;

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

  const tasks = boardData?.tasks ?? [];
  const isBoardRecurringTask = useCallback(
    (task: Task) => isRecurringTask(task) || !!task.recurringTemplateId,
    []
  );
  const recurringTasks = useMemo(() => {
    let list = tasks.filter(
      (task) => task.projectId === selectedProjectId && isBoardRecurringTask(task)
    );
    if (selectedTemplateId) {
      list = list.filter((t) => t.recurringTemplateId === selectedTemplateId);
    } else if (shelfCategory !== "all") {
      const matchingIds = new Set(
        recurringTemplates
          .filter((t) => t.repeatType === shelfCategory)
          .map((t) => t.id)
      );
      list = list.filter(
        (t) => t.recurringTemplateId && matchingIds.has(t.recurringTemplateId)
      );
    }
    return dedupeRecurringBoardTasks(list);
  }, [tasks, selectedProjectId, selectedTemplateId, shelfCategory, recurringTemplates, isBoardRecurringTask]);

  const filteredRecurringTasks = useMemo(
    () =>
      applyRecurringBoardFilters(
        recurringTasks,
        filters,
        currentUserId,
        overdueTaskIds,
        recurringTemplates
      ),
    [recurringTasks, filters, currentUserId, overdueTaskIds, recurringTemplates]
  );

  const boardStatuses = useMemo(() => {
    if (overdueTaskIds.length > 0) {
      return [buildRecurringOverdueStatus(), ...statuses];
    }
    return statuses;
  }, [statuses, overdueTaskIds]);

  const taskIds = useMemo(() => recurringTasks.map((t) => t.id), [recurringTasks]);
  const { data: commentCountMap = {} } = useQuery({
    queryKey: ["comment-counts", selectedProjectId, taskIds.join(",")],
    queryFn: () => fetchCommentCounts(taskIds),
    enabled: !!selectedProjectId && taskIds.length > 0 && taskIds.length <= 50,
    staleTime: 60_000,
  });

  const permissions = useBoardPermissions(orgMembers, currentUserId);
  // Recurring planners (series templates) are manageable by OWNER + ADMIN.
  // The board itself (task editing/moves) is more restrictive, so we keep it
  // tied to `permissions.canEditTask` elsewhere.
  const canManageSeries =
    permissions.role === "OWNER" || permissions.role === "ADMIN";

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
  const subtaskMap = useMemo(
    () => computeOccurrenceSubtaskMap(recurringTasks),
    [recurringTasks]
  );

  const boardQueryKey = useMemo(
    () => ["recurring-board", selectedProjectId, statusIds.join(",")] as const,
    [selectedProjectId, statusIds]
  );

  const handleOccurrenceTaskUpdated = useCallback(
    (updated: Task) => {
      queryClient.setQueryData<RecurringBoardResponse>(boardQueryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            t.id === updated.id ? { ...t, subtasks: updated.subtasks } : t
          ),
        };
      });
    },
    [queryClient, boardQueryKey]
  );

  const openDayDrawer = useCallback((dateKey: string) => {
    setSelectedDayKey(dateKey);
    setDayDrawerOpen(true);
  }, []);

  const todayDateKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDayKey) return [];
    return filteredRecurringTasks.filter((t) => {
      if (!t.dueDate) return false;
      const match = String(t.dueDate).match(/^(\d{4}-\d{2}-\d{2})/);
      return match?.[1] === selectedDayKey;
    });
  }, [selectedDayKey, filteredRecurringTasks]);

  const executiveHealth = useMemo(
    () =>
      computeExecutiveHealth(
        summaryQuery.data,
        recurringTasks,
        recurringTemplates,
        boardStats.completedPercent,
        doneStatusId
      ),
    [summaryQuery.data, recurringTasks, recurringTemplates, boardStats.completedPercent, doneStatusId]
  );

  const tasksByStatus = useMemo(() => {
    const filteredOverdue = overdueTaskIds.filter((id) =>
      filteredRecurringTasks.some((t) => t.id === id)
    );
    return partitionRecurringBoardTasks(filteredRecurringTasks, filteredOverdue, statuses);
  }, [filteredRecurringTasks, overdueTaskIds, statuses]);

  const allTasksFlat = useMemo(() => {
    const all: Task[] = [];
    for (const s of boardStatuses) all.push(...(tasksByStatus[s.id] ?? []));
    return all;
  }, [boardStatuses, tasksByStatus]);

  const visibleBoardStatuses = useMemo(() => {
    const populated = boardStatuses.filter(
      (s) => (tasksByStatus[s.id] ?? []).length > 0
    );
    if (populated.length > 0) return populated;
    const overdueCol = boardStatuses.find((s) => s.id === "__recurring_overdue__");
    if (overdueCol && overdueTaskIds.length > 0) return [overdueCol];
    const fallback = boardStatuses.filter((s) => s.id !== "__recurring_overdue__").slice(0, 2);
    return fallback.length > 0 ? fallback : boardStatuses.slice(0, 1);
  }, [boardStatuses, tasksByStatus, overdueTaskIds]);

  const filteredTaskCount = useMemo(() => {
    const hasFilter =
      filters.search ||
      filters.priority.length > 0 ||
      filters.assignee.length > 0 ||
      filters.statusIds.length > 0 ||
      filters.recurrenceTypes.length > 0 ||
      filters.missedOnly ||
      filters.dueTodayOnly ||
      filters.overdueOnly ||
      filters.assignedToMe ||
      filters.pausedSeriesOnly;
    if (!hasFilter) return undefined;
    return filteredRecurringTasks.length;
  }, [filteredRecurringTasks, filters]);

  const updateMutation = useMutation({
    mutationFn: ({ taskId, statusId }: { taskId: string; statusId: string | null }) =>
      updateTaskStatus(taskId, statusId),
    onMutate: async ({ taskId, statusId: toStatusId }) => {
      await queryClient.cancelQueries({ queryKey: boardQueryKey });
      const prev = queryClient.getQueryData<RecurringBoardResponse>(boardQueryKey);
      queryClient.setQueryData<RecurringBoardResponse>(boardQueryKey, (old) => {
        if (!old) return old;
        const overdueTaskIds = old.overdueTaskIds.filter((id) => id !== taskId);
        return {
          ...old,
          overdueTaskIds,
          tasks: old.tasks.map((t) =>
            t.id === taskId ? { ...t, statusId: toStatusId ?? undefined } : t
          ),
        };
      });
      setOverdueTaskIds((ids) => ids.filter((id) => id !== taskId));
      return { previous: prev };
    },
    onSuccess: (updated, { taskId }) => {
      if (!updated?.id) return;
      queryClient.setQueryData<RecurringBoardResponse>(boardQueryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
        };
      });
      queryClient.setQueryData(["task", taskId], updated);
      queryClient.invalidateQueries({ queryKey: ["recurring-summary"] });
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(boardQueryKey, ctx.previous);
      if (ctx?.previous?.overdueTaskIds) setOverdueTaskIds(ctx.previous.overdueTaskIds);
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
      queryClient.invalidateQueries({ queryKey: ["recurring-board", selectedProjectId] });
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
      queryClient.invalidateQueries({ queryKey: ["recurring-board", selectedProjectId] });
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

  const resumeSeriesMutation = useMutation({
    mutationFn: async (templateId: string) => {
      await resumeRecurringTemplate(templateId);
      // Immediately trigger a catch-up sync so the calendar fills in
      if (selectedProjectId) {
        await syncRecurringBoard(selectedProjectId).catch(() => undefined);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-board", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["recurring-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      toast({ title: "Series resumed — generating new runs", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not resume series",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const deleteSeriesMutation = useMutation({
    mutationFn: (templateId: string) => deleteRecurringSeries(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-board", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["recurring-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      setDeleteSeriesTarget(null);
      setSeriesDrawerOpen(false);
      setSeriesDetailId(null);
      toast({ title: "Series deleted", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not delete series",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const archiveSeriesMutation = useMutation({
    mutationFn: (templateId: string) => archiveRecurringTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-board", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["recurring-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      toast({ title: "Series archived", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not archive series",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const duplicateSeriesMutation = useMutation({
    mutationFn: (templateId: string) => duplicateRecurringTemplate(templateId),
    onSuccess: async () => {
      if (selectedProjectId) {
        await syncRecurringBoard(selectedProjectId).catch(() => undefined);
      }
      queryClient.invalidateQueries({ queryKey: ["recurring-board", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["recurring-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      toast({ title: "Planner duplicated", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not duplicate planner",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({
      templateId,
      payload,
    }: {
      templateId: string;
      payload: {
        title?: string;
        description?: string;
        recurrence?: TaskRecurrenceConfig;
        subtasks?: Array<{
          id?: string;
          title: string;
          completed?: boolean;
          dueTime?: string;
          priority?: string;
          status?: string;
        }>;
      };
    }) => updateRecurringTemplate(templateId, payload),
    onSuccess: async () => {
      if (selectedProjectId) {
        await syncRecurringBoard(selectedProjectId).catch(() => undefined);
      }
      queryClient.invalidateQueries({ queryKey: ["recurring-board", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["recurring-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      toast({ title: "Planner updated", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not update planner",
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
      if (!allOccurrenceSubtasksDone(task.subtasks)) {
        throw new Error("Finish all subtasks before marking this run done.");
      }
      const doneStatus = statuses.find((s) => s.type === "DONE")?.id;
      await completeRecurringTaskWithAction(task.id, {
        action: "ONLY_THIS",
        doneStatusId: doneStatus,
      });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["recurring-board", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["task", vars.task.id] });
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-summary"] });
      toast({
        title: vars.type === "skip" ? "Next run skipped" : "Run completed",
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

  const completeDayMutation = useMutation({
    mutationFn: async (tasksToComplete: Task[]) => {
      const doneStatus = statuses.find((s) => s.type === "DONE")?.id;
      for (const task of tasksToComplete) {
        const status = statuses.find((s) => s.id === task.statusId);
        const isDone =
          status?.type === "DONE" || status?.name?.toLowerCase() === "done";
        if (isDone) continue;
        if (!allOccurrenceSubtasksDone(task.subtasks)) {
          throw new Error("Finish all subtasks before completing the day.");
        }
        await completeRecurringTaskWithAction(task.id, {
          action: "ONLY_THIS",
          doneStatusId: doneStatus,
        });
      }
    },
    onSuccess: (_data, tasksToComplete) => {
      queryClient.invalidateQueries({ queryKey: ["recurring-board", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["recurring-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      for (const task of tasksToComplete) {
        queryClient.invalidateQueries({ queryKey: ["task", task.id] });
      }
      toast({ title: "Day completed", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not complete day",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const handleCompleteDay = useCallback(
    (tasksToComplete: Task[]) => {
      completeDayMutation.mutate(tasksToComplete);
    },
    [completeDayMutation]
  );

  useEffect(() => {
    if (
      viewMode !== "calendar" ||
      workflowsLoading ||
      statusesLoading ||
      tasksLoading ||
      autoOpenedTodayRef.current
    ) {
      return;
    }
    const todayTasks = filteredRecurringTasks.filter((t) => {
      if (!t.dueDate) return false;
      const match = String(t.dueDate).match(/^(\d{4}-\d{2}-\d{2})/);
      return match?.[1] === todayDateKey;
    });
    if (todayTasks.length > 0) {
      openDayDrawer(todayDateKey);
      autoOpenedTodayRef.current = true;
    }
  }, [
    viewMode,
    workflowsLoading,
    statusesLoading,
    tasksLoading,
    filteredRecurringTasks,
    todayDateKey,
    openDayDrawer,
  ]);

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
      queryClient.invalidateQueries({ queryKey: ["recurring-board", selectedProjectId] });
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
        queryClient.invalidateQueries({ queryKey: ["recurring-board", selectedProjectId] });
        queryClient.invalidateQueries({ queryKey: ["workflow-statuses"] });
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
    (taskId: string, from: string | null, toStatusId: string) => {
      if (isRecurringOverdueColumn(toStatusId)) return;
      updateMutation.mutate({ taskId, statusId: toStatusId });
    },
    [updateMutation]
  );

  const handleQuickAdd = useCallback((title: string, statusId: string) => {
    if (isRecurringOverdueColumn(statusId)) return;
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
        requireLocation: data.requireLocation === true,
        assigneeIds: data.assigneeIds?.length ? data.assigneeIds : undefined,
        assigneeId: data.assigneeIds?.[0] || undefined,
        storyPoints: data.storyPoints,
        dueDate: data.dueDate || undefined,
        dueTime: data.dueDate ? data.dueTime || undefined : undefined,
        tags: data.labels?.length ? data.labels.map((l) => ({ name: l.name, color: l.color })) : undefined,
        subtasks: data.subtasks
          .map((s) => ({
            id: s.id,
            title: s.title.trim(),
            description: s.description?.trim() || undefined,
            completed: s.completed,
            assigneeId: s.assigneeId || undefined,
            dueOffsetDays: s.dueOffsetDays ?? 0,
            dueTime: s.dueTime || undefined,
            status: s.status ?? (s.completed ? "DONE" : "TODO"),
            priority: s.priority || undefined,
            requireLocation:
              s.requireLocation === true || data.requireLocation === true || undefined,
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

  const snoozeMutation = useMutation({
    mutationFn: async (task: Task) => {
      const base = task.dueDate ? new Date(task.dueDate) : new Date();
      base.setDate(base.getDate() + 1);
      return updateTask(task.id, { dueDate: base.toISOString() });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["recurring-board", selectedProjectId] });
      queryClient.setQueryData(["task", updated.id], updated);
      toast({ title: "Snoozed until tomorrow", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Could not snooze",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const quickActions = useMemo(() => ({
    onEdit: (task: Task) => setSelectedTaskId(task.id),
    onChangeStatus: (task: Task, statusId: string) => updateMutation.mutate({ taskId: task.id, statusId }),
    onCompleteOccurrence: (task: Task) =>
      recurringActionMutation.mutate({ type: "complete", task }),
    onSkipNextOccurrence: (task: Task) =>
      recurringActionMutation.mutate({ type: "skip", task }),
    onSnoozeOccurrence: (task: Task) => snoozeMutation.mutate(task),
    onPauseSeries: (task: Task) => {
      if (!task.recurringTemplateId) return;
      pauseSeriesMutation.mutate(task.recurringTemplateId);
    },
    onDelete: (task: Task) => setDeleteTarget(task),
  }), [updateMutation, recurringActionMutation, pauseSeriesMutation, snoozeMutation]);

  const selectedDrawerTask = useMemo(
    () => recurringTasks.find((t) => t.id === selectedTaskId) ?? tasks.find((t) => t.id === selectedTaskId),
    [recurringTasks, tasks, selectedTaskId]
  );

  const seriesDetailTemplate = useMemo(
    () => (seriesDetailId ? recurringTemplateMap[seriesDetailId] ?? null : null),
    [seriesDetailId, recurringTemplateMap]
  );

  const seriesOccurrences = useMemo(() => {
    if (!seriesDetailId) return [];
    return dedupeRecurringBoardTasks(
      tasks.filter((t) => t.recurringTemplateId === seriesDetailId)
    );
  }, [tasks, seriesDetailId]);

  const openSeriesDrawer = useCallback(
    (template: RecurringTemplateSummary, startEdit = false) => {
      setSeriesDetailId(template.id);
      setSeriesDrawerStartEdit(startEdit);
      setSeriesDrawerOpen(true);
    },
    []
  );

  const doneStatusIds = useMemo(
    () =>
      new Set(
        statuses
          .filter((s) => s.type === "DONE" || s.name.toLowerCase() === "done")
          .map((s) => s.id)
      ),
    [statuses]
  );

  const openEditRecurringTask = useCallback(
    (template: RecurringTemplateSummary) => {
      const occurrences = dedupeRecurringBoardTasks(
        tasks.filter((t) => t.recurringTemplateId === template.id)
      );
      const pick = pickBestOccurrence(occurrences, overdueTaskIds, doneStatusIds);
      if (!pick) {
        toast({
          title: "No run to edit yet",
          description: "This planner has no runs on the board. Open the series to check schedule or wait for the next run.",
          variant: "error",
        });
        openSeriesDrawer(template);
        return;
      }
      setSeriesDrawerOpen(false);
      setSelectedTaskId(null);
      setFullDetailTaskId(pick.id);
    },
    [tasks, overdueTaskIds, doneStatusIds, toast, openSeriesDrawer]
  );

  const isSeriesMutating =
    pauseSeriesMutation.isPending ||
    resumeSeriesMutation.isPending ||
    deleteSeriesMutation.isPending ||
    archiveSeriesMutation.isPending ||
    duplicateSeriesMutation.isPending ||
    updateTemplateMutation.isPending;

  const nextUpcomingTemplate = useMemo(() => {
    const active = recurringTemplates.filter((t) => !t.isPaused && t.nextDueDate);
    if (!active.length) return null;
    return [...active].sort((a, b) =>
      String(a.nextDueDate).localeCompare(String(b.nextDueDate))
    )[0];
  }, [recurringTemplates]);

  const showBoardEmptyState =
    recurringTasks.length === 0 &&
    overdueTaskIds.length === 0 &&
    !boardTasksLoading &&
    !summaryQuery.data?.overdue;

  useKeyboardShortcuts(useMemo(() => [
    { key: "n", ctrl: true, handler: () => { if (permissions.canCreateTask && selectedProjectId) setCreateModalOpen(true); }, description: "Create recurring task" },
    { key: "b", handler: () => setViewMode((m) => (m === "calendar" ? "shelf" : "calendar")), description: "Toggle calendar/series" },
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
    <div className={cn(EXEC_PLANNER.page, "flex h-0 min-h-0 flex-1 flex-col gap-3 overflow-hidden animate-slide-up")}>
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
                  Ctrl+N create · B cycle views
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
                <Plus className="h-3 w-3" /> New recurring planner
              </Button>
            )}
          </>
        }
      />

      {viewMode === "shelf" ? (
        <PlannerHeader
          summary={summaryQuery.data}
          tasks={recurringTasks}
          projectName={selectedProject.name}
          className="shrink-0"
        />
      ) : null}

      {!isBoardLoading && selectedProjectId ? (
        <RecurringPremiumStats
          summary={summaryQuery.data}
          tasks={recurringTasks}
          templates={recurringTemplates}
          completedPercent={boardStats.completedPercent}
          doneStatusId={doneStatusId}
          healthStatus={executiveHealth.healthStatus}
          isLoading={summaryQuery.isLoading}
          className="shrink-0"
        />
      ) : null}

      {!isBoardLoading && statuses.length > 0 ? (
        <div className="flex h-0 min-h-0 flex-1 gap-3 overflow-hidden">
          {viewMode !== "shelf" && viewMode !== "calendar" ? (
            <PlannerShelf
              templates={recurringTemplates}
              selectedTemplateId={selectedTemplateId}
              selectedCategory={shelfCategory}
              onSelectTemplate={setSelectedTemplateId}
              onSelectCategory={setShelfCategory}
              variant="sidebar"
            />
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
            <RecurringBoardToolbar
              filters={filters}
              onFiltersChange={setFilters}
              assigneeMap={assigneeMap}
              statuses={statuses}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              taskCount={recurringTasks.length}
              filteredCount={filteredTaskCount}
            />

            <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
              {viewMode === "agenda" ? (
                <RecurringAgendaView
                  className="min-h-0 flex-1"
                  tasks={filteredRecurringTasks}
                  statuses={boardStatuses}
                  overdueTaskIds={overdueTaskIds}
                  recurringTemplateMap={recurringTemplateMap}
                  assigneeMap={assigneeMap}
                  subtaskMap={subtaskMap}
                  commentCountMap={commentCountMap}
                  doneStatusId={doneStatusId}
                  readOnly={!permissions.canEditTask}
                  onTaskClick={(task) => setSelectedTaskId(task.id)}
                  onMarkDone={(task) => recurringActionMutation.mutate({ type: "complete", task })}
                  onSkip={(task) => recurringActionMutation.mutate({ type: "skip", task })}
                  onSnooze={(task) => snoozeMutation.mutate(task)}
                />
              ) : viewMode === "calendar" ? (
                <RecurringCalendarView
                  className="min-h-0 flex-1"
                  tasks={filteredRecurringTasks}
                  statuses={boardStatuses}
                  overdueTaskIds={overdueTaskIds}
                  selectedDateKey={selectedDayKey}
                  onDateClick={(dateKey) => openDayDrawer(dateKey)}
                  onTaskClick={(task) => {
                    const match = task.dueDate ? String(task.dueDate).match(/^(\d{4}-\d{2}-\d{2})/) : null;
                    if (match?.[1]) openDayDrawer(match[1]);
                  }}
                />
              ) : viewMode === "shelf" ? (
                <RecurringSeriesLibrary
                  className="min-h-0 flex-1"
                  templates={recurringTemplates}
                  assigneeMap={assigneeMap}
                  canManage={canManageSeries}
                  isMutating={isSeriesMutating}
                  onOpen={(t) => openSeriesDrawer(t)}
                  onEdit={(t) => openEditRecurringTask(t)}
                  onViewHistory={(t) => openSeriesDrawer(t)}
                  onPause={(id) => pauseSeriesMutation.mutate(id)}
                  onResume={(id) => resumeSeriesMutation.mutate(id)}
                  onArchive={(t) => archiveSeriesMutation.mutate(t.id)}
                  onDuplicate={(t) => duplicateSeriesMutation.mutate(t.id)}
                  onDelete={(t) => setDeleteSeriesTarget(t)}
                  onCreate={
                    permissions.canCreateTask
                      ? () => {
                          setDefaultStatusId(statuses[0]?.id);
                          setCreateModalOpen(true);
                        }
                      : undefined
                  }
                />
              ) : viewMode === "board" ? (
                <KanbanBoard
                  className="min-h-0 flex-1"
                  statuses={visibleBoardStatuses}
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
                <div className="min-h-0 flex-1 basis-0 overflow-y-auto rounded-xl border border-border/45 bg-card/50 p-2">
                  <BoardTableView
                    tasks={allTasksFlat}
                    statuses={boardStatuses}
                    assigneeMap={assigneeMap}
                    subtaskMap={subtaskMap}
                    onTaskClick={(task) => setSelectedTaskId(task.id)}
                    permissions={permissions}
                  />
                </div>
              )}
            </div>

            {recurringTasks.length > 0 &&
            viewMode !== "calendar" &&
            viewMode !== "shelf" ? (
              <RecurringExecutiveHealth metrics={executiveHealth} className="shrink-0" />
            ) : null}

            {showBoardEmptyState && viewMode !== "shelf" && viewMode !== "calendar" && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/10 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <p className="mt-4 text-lg font-semibold">
                  {recurringTemplates.length > 0 ? "No open occurrences" : "Start your planner library"}
                </p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {nextUpcomingTemplate ? (
                    <>
                      Next up: <span className="font-medium text-foreground">{nextUpcomingTemplate.title}</span>
                      {" "}on {formatShortDate(String(nextUpcomingTemplate.nextDueDate).slice(0, 10))}
                      {" "}({toRecurrenceLabel(nextUpcomingTemplate.repeatType)}).
                    </>
                  ) : (
                    "Create a recurring planner series to schedule repeating work for this project."
                  )}
                </p>
                {permissions.canCreateTask && (
                  <Button
                    className="mt-5 shadow-lg shadow-primary/20"
                    onClick={() => {
                      setDefaultStatusId(statuses[0]?.id);
                      setCreateModalOpen(true);
                    }}
                  >
                    <Sparkles className="mr-1.5 h-4 w-4" />{" "}
                    {recurringTemplates.length > 0 ? "Add planner series" : "Create first planner"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : isBoardLoading ? (
        <BoardSkeleton />
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
        <>
          <RecurringDayDrawer
            dateKey={selectedDayKey}
            open={dayDrawerOpen}
            onOpenChange={setDayDrawerOpen}
            tasks={selectedDayTasks}
            recurringTemplateMap={recurringTemplateMap}
            statuses={statuses}
            overdueTaskIds={overdueTaskIds}
            readOnly={!permissions.canEditTask}
            boardQueryKey={boardQueryKey}
            onTaskUpdated={handleOccurrenceTaskUpdated}
            onMarkDone={(task) => recurringActionMutation.mutate({ type: "complete", task })}
            onSkip={(task) => recurringActionMutation.mutate({ type: "skip", task })}
            onSnooze={(task) => snoozeMutation.mutate(task)}
            onOpenDetails={(id) => {
              setDayDrawerOpen(false);
              setSelectedTaskId(id);
            }}
            onCompleteDay={handleCompleteDay}
            isLoading={tasksLoading}
            isCompletingDay={completeDayMutation.isPending}
          />
          <RecurringSeriesDrawer
            template={seriesDetailTemplate}
            open={seriesDrawerOpen && seriesDetailTemplate !== null}
            onOpenChange={(open) => {
              setSeriesDrawerOpen(open);
              if (!open) setSeriesDetailId(null);
            }}
            occurrences={seriesOccurrences}
            statuses={statuses}
            overdueTaskIds={overdueTaskIds}
            readOnly={!canManageSeries}
            isMutating={isSeriesMutating}
            startInEdit={seriesDrawerStartEdit}
            onPause={(id) => pauseSeriesMutation.mutate(id)}
            onResume={(id) => resumeSeriesMutation.mutate(id)}
            onDelete={(tpl) => setDeleteSeriesTarget(tpl)}
            onEditRecurringTask={(tpl) => openEditRecurringTask(tpl)}
            onSaveCadence={(templateId, payload) =>
              updateTemplateMutation.mutate({ templateId, payload })
            }
            onOpenOccurrence={(task) => {
              setSeriesDrawerOpen(false);
              setSelectedTaskId(task.id);
            }}
          />
          <RecurringTaskDrawer
            taskId={selectedTaskId}
            open={selectedTaskId !== null && fullDetailTaskId === null}
            onOpenChange={(open) => !open && setSelectedTaskId(null)}
            template={
              selectedDrawerTask?.recurringTemplateId
                ? recurringTemplateMap[selectedDrawerTask.recurringTemplateId]
                : undefined
            }
            assigneeMap={assigneeMap}
            statuses={statuses}
            overdueTaskIds={overdueTaskIds}
            boardQueryKey={boardQueryKey}
            onTaskUpdated={handleOccurrenceTaskUpdated}
            commentCount={selectedTaskId ? commentCountMap[selectedTaskId] : 0}
            readOnly={!permissions.canEditTask}
            onMarkDone={(task) => recurringActionMutation.mutate({ type: "complete", task })}
            onSkip={(task) => recurringActionMutation.mutate({ type: "skip", task })}
            onSnooze={(task) => snoozeMutation.mutate(task)}
            onPauseSeries={(task) => {
              if (task.recurringTemplateId) pauseSeriesMutation.mutate(task.recurringTemplateId);
            }}
            onOpenFullDetails={(id) => setFullDetailTaskId(id)}
          />
          <TaskDetailModal
            taskId={fullDetailTaskId}
            projectId={selectedProjectId}
            organizationId={orgId}
            statuses={statuses}
            open={fullDetailTaskId !== null}
            onOpenChange={(open) => !open && setFullDetailTaskId(null)}
            onTaskUpdated={(task) => {
              handleOccurrenceTaskUpdated(task);
              queryClient.invalidateQueries({ queryKey: ["recurring-board", selectedProjectId] });
              queryClient.invalidateQueries({ queryKey: ["recurring-summary"] });
              queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
            }}
            readOnly={!permissions.canEditTask}
          />
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete run"
        description={
          deleteTarget
            ? `Permanently delete this run for "${deleteTarget.title}"? The recurring series will continue creating future runs.`
            : undefined
        }
        confirmLabel="Delete run"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />

      <ConfirmDialog
        open={deleteSeriesTarget !== null}
        onOpenChange={(open) => !open && setDeleteSeriesTarget(null)}
        title="Delete series"
        description={
          deleteSeriesTarget
            ? `Permanently delete the recurring series "${deleteSeriesTarget.title}"? All generated runs on the calendar will also be removed.`
            : undefined
        }
        confirmLabel="Delete series"
        variant="destructive"
        loading={deleteSeriesMutation.isPending}
        onConfirm={() => {
          if (deleteSeriesTarget) deleteSeriesMutation.mutate(deleteSeriesTarget.id);
        }}
      />
    </div>
  );
}

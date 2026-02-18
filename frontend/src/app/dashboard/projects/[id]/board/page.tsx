"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProject } from "@/services/api/projects.api";
import { fetchWorkflowsByProject, fetchWorkflowStatuses, createDefaultWorkflow } from "@/services/api/workflows.api";
import { fetchTasksByProject, updateTaskStatus, createTask } from "@/services/api/tasks.api";
import { fetchOrgMembers } from "@/services/api/members.api";
import { fetchCommentCounts } from "@/services/api/comments.api";
import { fetchSubscription } from "@/services/api/billing.api";
import { parseApiError, isRateLimited, getStoredToken } from "@/services/api/client";
import { useTenant } from "@/context/tenant-context";
import {
  KanbanBoard,
  computeBoardStats,
  computeSubtaskMap,
  DEFAULT_FILTERS,
  type AssigneeMap,
  type BoardFilters,
} from "@/components/kanban/kanban-board";
import { BoardToolbar, type ViewMode, type SavedView } from "@/components/kanban/board-toolbar";
import { BoardStatsBar } from "@/components/kanban/board-stats";
import { BoardTableView } from "@/components/kanban/board-table-view";
import { BoardSettingsModal, type BoardSettings } from "@/components/kanban/board-settings-modal";
import { BoardSkeleton } from "@/components/kanban/board-skeleton";
import { BulkActionBar } from "@/components/kanban/bulk-action-bar";
import { CreateTaskModal, type CreateTaskFormData } from "@/components/tasks/create-task-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useSavedViews } from "@/hooks/use-saved-views";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useBoardPermissions } from "@/hooks/use-board-permissions";
import type { Task } from "@/types/api";
import { Plus, Columns3, Settings, Sparkles, Keyboard, Shield, Crown } from "lucide-react";
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
  const currentUserId = useMemo(() => getCurrentUserId(), []);

  // ─── UI state ──────────────────────────────────────────────

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [defaultStatusId, setDefaultStatusId] = useState<string | undefined>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [boardSettings, setBoardSettings] = useState<BoardSettings>({ wipLimits: {} });
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
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

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org-members", orgId ?? ""],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId,
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
    for (const m of orgMembers) {
      map[m.userId] = {
        name: m.user?.fullName ?? m.user?.email ?? m.userId,
        avatarUrl: m.user?.avatarUrl,
      };
    }
    return map;
  }, [orgMembers]);

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
    const hasFilter = filters.search || filters.priority.length > 0 || filters.assignee.length > 0;
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

  const allTasksFlat = useMemo(() => {
    const all: Task[] = [];
    for (const s of statuses) all.push(...(tasksByStatus[s.id] ?? []));
    return all;
  }, [statuses, tasksByStatus]);

  // ─── Mutations ────────────────────────────────────────────

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, statusId }: { taskId: string; statusId: string | null }) =>
      updateTaskStatus(taskId, statusId),
    onMutate: async ({ taskId, statusId: toStatusId }) => {
      setMovingTaskId(taskId);
      await queryClient.cancelQueries({ queryKey: ["tasks", id] });
      const prev = queryClient.getQueryData<{ data: Task[] }>(["tasks", id]);
      queryClient.setQueryData<{ data: Task[] }>(["tasks", id], (old) => {
        if (!old) return old;
        return { ...old, data: old.data.map((t) => (t.id === taskId ? { ...t, statusId: toStatusId ?? undefined } : t)) };
      });
      return { previous: prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["tasks", id], context.previous);
      toast({ title: "Failed to move task", description: "Returned to original column.", variant: "error" });
    },
    onSettled: () => {
      setMovingTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    },
    onSuccess: (_data, vars) => {
      const toName = statuses.find((s) => s.id === vars.statusId)?.name ?? "new column";
      toast({ title: "Task moved", description: `Moved to ${toName}`, variant: "success" });
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createTask>[0]) => createTask(payload),
    onMutate: async (payload) => {
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
    onSuccess: () => {
      setCreateModalOpen(false);
      toast({ title: "Task created", variant: "success" });
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

  const handleQuickAdd = useCallback(
    (title: string, statusId: string) => {
      if (!orgId) return;
      createMutation.mutate({ projectId: id, organizationId: orgId, title, statusId, priority: "MEDIUM" });
    },
    [orgId, id, createMutation]
  );

  const handleCreateFromModal = useCallback(
    (data: CreateTaskFormData) => {
      if (!orgId) return;
      createMutation.mutate({
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
        subtasks: data.subtasks
          .map((s) => ({
            title: s.title.trim(),
            completed: s.completed,
            assigneeId: s.assigneeId || undefined,
            dueDate: s.dueDate || undefined,
            priority: s.priority ?? "MEDIUM",
          }))
          .filter((s) => s.title.length > 0),
      });
    },
    [orgId, id, statuses, createMutation]
  );

  const quickActions = useMemo(() => ({
    onEdit: (task: Task) => setSelectedTaskId(task.id),
    onChangeStatus: (task: Task, statusId: string) => {
      updateStatusMutation.mutate({ taskId: task.id, statusId });
    },
  }), [updateStatusMutation]);

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
        handler: () => setViewMode((m) => m === "kanban" ? "table" : "kanban"),
        description: "Toggle view",
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            Board
            {permissions.isViewer && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Shield className="h-3 w-3" /> View only
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {permissions.isViewer
              ? "You have read-only access to this board."
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
                <p><kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">B</kbd> Toggle view</p>
                <p><kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">Ctrl+Shift+S</kbd> Select mode</p>
                <p><kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono">Esc</kbd> Close / exit</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {permissions.canManageBoard && (
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="h-9 gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Settings
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
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 animate-in fade-in duration-300">
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

      {/* Stats */}
      {tasks.length > 0 && <BoardStatsBar stats={boardStats} />}

      {/* Toolbar */}
      <BoardToolbar
        filters={filters}
        onFiltersChange={setFilters}
        assigneeMap={assigneeMap}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        taskCount={tasks.length}
        filteredCount={filteredTaskCount}
        savedViews={savedViews}
        onSaveView={handleSaveView}
        onLoadView={handleLoadView}
        onDeleteView={handleDeleteView}
        isSelectionMode={bulk.state.isSelectionMode}
        onToggleSelectionMode={handleToggleSelectionMode}
        canBulkSelect={permissions.canBulkSelect}
      />

      {/* Board / Table */}
      {viewMode === "kanban" ? (
        <KanbanBoard
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
          movingTaskId={movingTaskId}
          collapsedColumns={collapsedColumns}
          onToggleColumnCollapse={toggleColumnCollapse}
          isSelectionMode={bulk.state.isSelectionMode}
          selectedIds={bulk.state.selectedIds}
          onToggleSelect={bulk.toggle}
          onSelectColumnTasks={handleSelectColumnTasks}
          onSetWipLimit={handleSetWipLimit}
          permissions={permissions}
          aria-label={`Tasks for ${project.name}`}
        />
      ) : (
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
      )}

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
      />

      {orgId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          projectId={id}
          organizationId={orgId}
          statuses={statuses}
          open={selectedTaskId !== null}
          onOpenChange={(open) => !open && setSelectedTaskId(null)}
        />
      )}

      <BoardSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        statuses={statuses}
        settings={boardSettings}
        onSettingsChange={setBoardSettings}
      />
    </div>
  );
}

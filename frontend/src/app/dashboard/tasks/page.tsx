"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
  updateTaskStatusAndSprint,
} from "@/services/api/tasks.api";
import { fetchSprintsByProject, createSprint } from "@/services/api/sprints.api";
import { fetchOrgMembers } from "@/services/api/members.api";
import { fetchCommentCounts } from "@/services/api/comments.api";
import { parseApiError, isRateLimited, getStoredToken } from "@/services/api/client";
import { useTenant } from "@/context/tenant-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  KanbanBoard,
  computeBoardStats,
  computeSubtaskMap,
  DEFAULT_FILTERS,
  type AssigneeMap,
  type BoardFilters,
} from "@/components/kanban/kanban-board";
import {
  ScrumBoard,
  type Swimlane,
} from "@/components/kanban/scrum-board";
import {
  BoardToolbar,
  type ViewMode,
  type SavedView,
} from "@/components/kanban/board-toolbar";
import { BoardStatsBar } from "@/components/kanban/board-stats";
import { BoardTableView } from "@/components/kanban/board-table-view";
import { BoardSkeleton } from "@/components/kanban/board-skeleton";
import {
  BoardSettingsModal,
  type BoardSettings,
} from "@/components/kanban/board-settings-modal";
import { BulkActionBar } from "@/components/kanban/bulk-action-bar";
import {
  CreateTaskModal,
  type CreateTaskFormData,
} from "@/components/tasks/create-task-modal";
import { CreateSprintModal } from "@/components/sprints/create-sprint-modal";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { useTaskCreatedCelebration } from "@/components/tasks/task-create-celebration";
import { ProjectSwitcher } from "@/components/tasks/project-switcher";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useSavedViews } from "@/hooks/use-saved-views";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useBoardPermissions } from "@/hooks/use-board-permissions";
import { useRetentionTracking } from "@/hooks/use-retention-tracking";
import type { Task } from "@/types/api";
import { Building2, Plus, Sparkles, Columns3, Keyboard, Shield, Rocket } from "lucide-react";

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

export default function TasksPage() {
  const { orgId } = useTenant();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { trackFirstTaskCreated } = useRetentionTracking();
  const { triggerTaskCreatedCelebration, celebrationLayer } = useTaskCreatedCelebration();
  const currentUserId = useMemo(() => getCurrentUserId(), []);

  // URL-driven project selection
  const selectedProjectIdFromUrl = searchParams.get("projectId");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSprintModalOpen, setCreateSprintModalOpen] = useState(false);
  const [defaultStatusId, setDefaultStatusId] = useState<string | undefined>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [boardSettings, setBoardSettings] = useState<BoardSettings>({ wipLimits: {} });
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<Record<string, boolean>>({});
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", orgId ?? ""],
    queryFn: fetchProjects,
    enabled: !!orgId,
  });

  const selectableProjects = useMemo(
    () => projects.filter((p) => !p.id.startsWith("temp-")),
    [projects]
  );

  const selectedProject = useMemo(
    () => selectableProjects.find((p) => p.id === selectedProjectIdFromUrl) ?? null,
    [selectableProjects, selectedProjectIdFromUrl]
  );
  const selectedProjectId = selectedProject?.id ?? null;

  const { savedViews, saveView, deleteView } = useSavedViews(selectedProjectId ?? "__none__");
  const bulk = useBulkSelection();

  const setProjectInUrl = useCallback(
    (projectId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("projectId", projectId);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  // Auto-select first project if URL is empty/invalid.
  useEffect(() => {
    if (projectsLoading || selectableProjects.length === 0) return;
    const hasValidProject =
      !!selectedProjectIdFromUrl &&
      selectableProjects.some((p) => p.id === selectedProjectIdFromUrl);
    if (!hasValidProject) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("projectId", selectableProjects[0].id);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [selectableProjects, projectsLoading, selectedProjectIdFromUrl, searchParams, router, pathname]);

  // Reset board-local UI state when project changes.
  useEffect(() => {
    setFilters(DEFAULT_FILTERS);
    setCollapsedColumns({});
    setCollapsedSwimlanes({});
    setMovingTaskId(null);
    setSelectedTaskId(null);
    setCreateModalOpen(false);
    bulk.exitSelectionMode();
  }, [selectedProjectId, bulk.exitSelectionMode]);

  const { data: workflows = [] } = useQuery({
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

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org-members", orgId ?? ""],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId,
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ["sprints", selectedProjectId],
    queryFn: () => fetchSprintsByProject(selectedProjectId!),
    enabled: !!selectedProjectId && !!orgId,
  });

  const tasks = tasksData?.data ?? [];
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const { data: commentCountMap = {} } = useQuery({
    queryKey: ["comment-counts", selectedProjectId, taskIds.join(",")],
    queryFn: () => fetchCommentCounts(taskIds),
    enabled: !!selectedProjectId && taskIds.length > 0 && taskIds.length <= 50,
    staleTime: 60_000,
  });

  const permissions = useBoardPermissions(orgMembers, currentUserId);

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

  const projectTasks = useMemo(
    () => tasks.filter((task) => task.projectId === selectedProjectId),
    [tasks, selectedProjectId]
  );
  const boardStats = useMemo(() => computeBoardStats(projectTasks, statuses), [projectTasks, statuses]);
  const doneStatusId = useMemo(
    () => statuses.find((s) => s.type === "DONE" || s.name.toLowerCase() === "done")?.id,
    [statuses]
  );
  const subtaskMap = useMemo(() => computeSubtaskMap(projectTasks, doneStatusId), [projectTasks, doneStatusId]);

  // Project-specific board columns: projectId + status.
  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const s of statuses) map[s.id] = [];
    for (const t of projectTasks) {
      const key = t.statusId ?? statuses[0]?.id ?? "none";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    if (statuses.length && !map[statuses[0].id]) map[statuses[0].id] = [];
    return map;
  }, [projectTasks, statuses]);

  const allTasksFlat = useMemo(() => {
    const all: Task[] = [];
    for (const s of statuses) all.push(...(tasksByStatus[s.id] ?? []));
    return all;
  }, [statuses, tasksByStatus]);

  // Scrum: swimlanes = sprints (sorted) + Backlog
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

  // Scrum: tasksByCell keyed by swimlaneId::statusId
  const tasksByCell = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const lane of swimlanes) {
      for (const s of statuses) {
        const key = `${lane.id}::${s.id}`;
        map[key] = projectTasks.filter((t) => {
          const matchSprint =
            lane.isBacklog ? !t.sprintId : t.sprintId === lane.id;
          const matchStatus = (t.statusId ?? statuses[0]?.id) === s.id;
          return matchSprint && matchStatus;
        });
      }
    }
    return map;
  }, [swimlanes, statuses, projectTasks]);

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

  const updateMutation = useMutation({
    mutationFn: ({ taskId, statusId }: { taskId: string; statusId: string | null }) =>
      updateTaskStatus(taskId, statusId),
    onMutate: async ({ taskId, statusId: toStatusId }) => {
      setMovingTaskId(taskId);
      const qk = ["tasks", selectedProjectId];
      await queryClient.cancelQueries({ queryKey: qk });
      const prev = queryClient.getQueryData<{ data: Task[] }>(qk);
      queryClient.setQueryData<{ data: Task[] }>(qk, (old) => {
        if (!old) return old;
        return { ...old, data: old.data.map((t) => (t.id === taskId ? { ...t, statusId: toStatusId ?? undefined } : t)) };
      });
      return { previous: prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["tasks", selectedProjectId], ctx.previous);
      toast({ title: "Failed to move task", description: "Returned to original column.", variant: "error" });
    },
    onSettled: () => {
      setMovingTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
    },
  });

  const scrumMoveMutation = useMutation({
    mutationFn: ({ taskId, statusId, sprintId }: { taskId: string; statusId: string; sprintId: string | null }) =>
      updateTaskStatusAndSprint(taskId, statusId, sprintId),
    onMutate: async ({ taskId, statusId: toStatusId, sprintId: toSprintId }) => {
      setMovingTaskId(taskId);
      const qk = ["tasks", selectedProjectId];
      await queryClient.cancelQueries({ queryKey: qk });
      const prev = queryClient.getQueryData<{ data: Task[] }>(qk);
      queryClient.setQueryData<{ data: Task[] }>(qk, (old) => {
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
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["tasks", selectedProjectId], ctx.previous);
      toast({ title: "Failed to move task", description: "Returned to original position.", variant: "error" });
    },
    onSettled: () => {
      setMovingTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createTask>[0]) => createTask(payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] }),
    onSuccess: () => {
      setCreateModalOpen(false);
      toast({ title: "Task created", variant: "success" });
      trackFirstTaskCreated();
      triggerTaskCreatedCelebration();
    },
  });

  const createSprintMutation = useMutation({
    mutationFn: (payload: { name: string; startDate?: string; endDate?: string }) =>
      createSprint({ projectId: selectedProjectId!, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", selectedProjectId] });
      setCreateSprintModalOpen(false);
      toast({ title: "Sprint created", variant: "success" });
    },
  });

  const setupWorkflowMutation = useMutation({
    mutationFn: (projectId: string) => createDefaultWorkflow(projectId),
    onSuccess: () => {
      if (selectedProjectId) {
        queryClient.invalidateQueries({ queryKey: ["workflows", selectedProjectId] });
        queryClient.invalidateQueries({ queryKey: ["workflow-statuses"] });
        queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
      }
    },
  });

  const handleMoveTask = useCallback(
    (taskId: string, _from: string | null, toStatusId: string) => {
      updateMutation.mutate({ taskId, statusId: toStatusId });
    },
    [updateMutation]
  );

  const handleScrumMoveTask = useCallback(
    (taskId: string, toStatusId: string, toSprintId: string | null) => {
      scrumMoveMutation.mutate({ taskId, statusId: toStatusId, sprintId: toSprintId });
    },
    [scrumMoveMutation]
  );

  const handleQuickAdd = useCallback((title: string, statusId: string) => {
    if (!orgId || !selectedProjectId) return;
    createMutation.mutate({ projectId: selectedProjectId, organizationId: orgId, title, statusId, priority: "MEDIUM" });
  }, [orgId, selectedProjectId, createMutation]);

  const handleScrumQuickAdd = useCallback(
    (title: string, statusId: string, sprintId: string | null) => {
      if (!orgId || !selectedProjectId) return;
      createMutation.mutate({
        projectId: selectedProjectId,
        organizationId: orgId,
        title,
        statusId,
        sprintId: sprintId ?? undefined,
        priority: "MEDIUM",
      });
    },
    [orgId, selectedProjectId, createMutation]
  );

  const handleCreateFromModal = useCallback((data: CreateTaskFormData) => {
    if (!orgId || !selectedProjectId) return;
    createMutation.mutate({
      projectId: selectedProjectId,
      organizationId: orgId,
      title: data.title,
      description: data.description || undefined,
      statusId: data.statusId || undefined,
      priority: data.priority,
      assigneeIds: data.assigneeIds?.length ? data.assigneeIds : undefined,
      assigneeId: data.assigneeIds?.[0] || undefined,
      storyPoints: data.storyPoints,
      dueDate: data.dueDate || undefined,
      tags: data.labels?.length ? data.labels.map((l) => ({ name: l.name, color: l.color })) : undefined,
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
  }, [orgId, selectedProjectId, createMutation]);

  const quickActions = useMemo(() => ({
    onEdit: (task: Task) => setSelectedTaskId(task.id),
    onChangeStatus: (task: Task, statusId: string) => updateMutation.mutate({ taskId: task.id, statusId }),
  }), [updateMutation]);

  const handleToggleSelectionMode = useCallback(() => {
    if (bulk.state.isSelectionMode) bulk.exitSelectionMode();
    else bulk.enterSelectionMode();
  }, [bulk]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "n", ctrl: true, handler: () => { if (permissions.canCreateTask && selectedProjectId) setCreateModalOpen(true); }, description: "Create task" },
    { key: "b", handler: () => setViewMode((m) => (m === "kanban" ? "scrum" : m === "scrum" ? "table" : "kanban")), description: "Cycle view (Kanban/Scrum/Table)" },
  ], [permissions.canCreateTask, selectedProjectId]));

  if (!orgId) {
    return (
      <div className="space-y-8 animate-slide-up">
        <div><h1 className="text-2xl font-bold tracking-tight">Tasks</h1><p className="mt-1 text-muted-foreground">Manage all your tasks in one place.</p></div>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0"><Building2 className="h-6 w-6 text-primary" /></div>
            <div className="flex-1">
              <p className="font-semibold">No workspace selected</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Select a workspace first to see your projects and tasks.</p>
              <Button asChild size="sm" className="mt-3"><Link href="/dashboard/workspaces">Select workspace</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (projectsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between"><Skeleton className="h-8 w-56" /><Skeleton className="h-9 w-56" /></div>
        <BoardSkeleton />
      </div>
    );
  }

  if (selectableProjects.length === 0) {
    return (
      <Card className="max-w-lg border-dashed border-2">
        <CardContent className="py-10 text-center">
          <p className="font-semibold">Create your first project</p>
          <p className="mt-1 text-sm text-muted-foreground">Projects are required before you can manage tasks.</p>
          <Button asChild className="mt-4"><Link href="/dashboard/projects">Create Project</Link></Button>
        </CardContent>
      </Card>
    );
  }

  if (!selectedProject) return <BoardSkeleton />;

  const isBoardLoading = statusesLoading || tasksLoading;

  return (
    <div className="space-y-4 animate-slide-up">
      {celebrationLayer}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:max-w-[280px]">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Select workspace
              </p>
              <OrgSwitcher
                variant="navbar"
                contentAlign="start"
                className="h-10 w-full justify-between rounded-xl border border-slate-200 bg-white px-3 text-slate-900 shadow-sm hover:bg-white"
              />
            </div>
            <div className="min-w-0 flex-1">
              <ProjectSwitcher
                projects={selectableProjects}
                selectedProjectId={selectedProjectId}
                selectedTaskCount={projectTasks.length}
                onProjectChange={setProjectInUrl}
                disabled={projectsLoading}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {permissions.isViewer && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Shield className="h-3 w-3" /> View only
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground"><Keyboard className="h-4 w-4" /></Button></TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Ctrl+N create, B cycle Kanban/Scrum/Table</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {permissions.canManageBoard && (
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="h-9 gap-1.5">
              Settings
            </Button>
          )}
          {viewMode === "scrum" && permissions.canManageBoard && (
            <Button variant="outline" size="sm" onClick={() => setCreateSprintModalOpen(true)} className="h-9 gap-1.5">
              <Rocket className="h-4 w-4" /> New Sprint
            </Button>
          )}
          {permissions.canCreateTask && (
            <Button onClick={() => { setDefaultStatusId(statuses[0]?.id); setCreateModalOpen(true); }} data-cy="create-task-button" className="shadow-lg shadow-primary/20">
              <Plus className="mr-1.5 h-4 w-4" /> New Task
            </Button>
          )}
        </div>
      </div>

      {isBoardLoading ? (
        <BoardSkeleton />
      ) : statuses.length > 0 ? (
        <>
          {projectTasks.length > 0 && <BoardStatsBar stats={boardStats} />}
          <BoardToolbar
            filters={filters}
            onFiltersChange={setFilters}
            assigneeMap={assigneeMap}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            taskCount={projectTasks.length}
            filteredCount={filteredTaskCount}
            savedViews={savedViews}
            onSaveView={(name: string, viewFilters: BoardFilters) => saveView(name, viewFilters)}
            onLoadView={(view: SavedView) => setFilters(view.filters)}
            onDeleteView={(viewId: string) => deleteView(viewId)}
            isSelectionMode={bulk.state.isSelectionMode}
            onToggleSelectionMode={handleToggleSelectionMode}
            canBulkSelect={permissions.canBulkSelect}
          />

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
              onToggleColumnCollapse={(statusId) => setCollapsedColumns((prev) => ({ ...prev, [statusId]: !prev[statusId] }))}
              isSelectionMode={bulk.state.isSelectionMode}
              selectedIds={bulk.state.selectedIds}
              onToggleSelect={bulk.toggle}
              onSelectColumnTasks={(statusId) => {
                const columnTasks = tasksByStatus[statusId] ?? [];
                if (columnTasks.length === 0) return;
                if (!bulk.state.isSelectionMode) bulk.enterSelectionMode();
                bulk.selectAll(columnTasks.map((t) => t.id));
              }}
              onSetWipLimit={(statusId, limit) => {
                setBoardSettings((prev) => {
                  const wipLimits = { ...prev.wipLimits };
                  if (limit === undefined) delete wipLimits[statusId];
                  else wipLimits[statusId] = limit;
                  return { ...prev, wipLimits };
                });
              }}
              permissions={permissions}
              aria-label={`Tasks for ${selectedProject.name}`}
            />
          ) : viewMode === "scrum" ? (
            <ScrumBoard
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
              movingTaskId={movingTaskId}
              collapsedSwimlanes={collapsedSwimlanes}
              onToggleSwimlaneCollapse={(id) => setCollapsedSwimlanes((prev) => ({ ...prev, [id]: !prev[id] }))}
              isSelectionMode={bulk.state.isSelectionMode}
              selectedIds={bulk.state.selectedIds}
              onToggleSelect={bulk.toggle}
              permissions={permissions}
              aria-label={`Scrum board for ${selectedProject.name}`}
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

          {bulk.state.isSelectionMode && (
            <BulkActionBar
              selectedCount={bulk.state.count}
              statuses={statuses}
              onBulkMove={async (toStatusId) => {
                const ids = Array.from(bulk.state.selectedIds);
                if (ids.length === 0) return;
                setIsBulkMoving(true);
                try {
                  await Promise.all(ids.map((taskId) => updateTaskStatus(taskId, toStatusId)));
                  queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
                  bulk.deselectAll();
                } finally {
                  setIsBulkMoving(false);
                }
              }}
              onDeselectAll={bulk.deselectAll}
              onExitSelection={bulk.exitSelectionMode}
              isMoving={isBulkMoving}
            />
          )}

          {projectTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/10 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><Sparkles className="h-7 w-7 text-primary" /></div>
              <p className="mt-4 text-lg font-semibold">No tasks yet for this project</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">Create your first task to start tracking work.</p>
              {permissions.canCreateTask && (
                <Button className="mt-5 shadow-lg shadow-primary/20" onClick={() => { setDefaultStatusId(statuses[0]?.id); setCreateModalOpen(true); }}>
                  <Sparkles className="mr-1.5 h-4 w-4" /> Create First Task
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/10 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><Columns3 className="h-8 w-8 text-primary" /></div>
          <p className="mt-5 text-lg font-semibold">Board not set up yet</p>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">This project needs a task board before you can add tasks.</p>
          <Button className="mt-6 shadow-lg shadow-primary/20" onClick={() => setupWorkflowMutation.mutate(selectedProject.id)} disabled={setupWorkflowMutation.isPending}>
            <Columns3 className="h-4 w-4 mr-1.5" /> Setup Task Board
          </Button>
          {setupWorkflowMutation.error && <p className="mt-3 text-sm text-destructive">{parseApiError(setupWorkflowMutation.error)}</p>}
        </div>
      )}

      <CreateTaskModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateFromModal}
        isSubmitting={createMutation.isPending}
        error={createMutation.error ? (isRateLimited(createMutation.error) ? "Too many requests. Try again later." : parseApiError(createMutation.error)) : null}
        projectId={selectedProjectId ?? ""}
        statuses={statuses}
        defaultStatusId={defaultStatusId}
      />

      {orgId && selectedProjectId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          projectId={selectedProjectId}
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

      {createSprintModalOpen && selectedProjectId && (
        <CreateSprintModal
          open={createSprintModalOpen}
          onClose={() => setCreateSprintModalOpen(false)}
          onSubmit={(data) => createSprintMutation.mutate(data)}
          isSubmitting={createSprintMutation.isPending}
          error={createSprintMutation.error ? parseApiError(createSprintMutation.error) : null}
        />
      )}
    </div>
  );
}

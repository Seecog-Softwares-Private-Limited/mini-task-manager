"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { updateTask } from "@/services/api/tasks.api";
import { ensureRecurringOccurrenceSubtasks } from "@/services/api/recurring-tasks.api";
import { parseApiError } from "@/services/api/client";
import { generateClientId } from "@/lib/generate-client-id";
import {
  allOccurrenceSubtasksDone,
  formatSubtaskProgressLabel,
  getOccurrenceSubtaskProgress,
} from "@/lib/recurring-subtask-utils";
import {
  resolveSubtaskStatus,
  subtaskWithCompleted,
  subtaskWithStatus,
  type SubtaskStatus,
} from "@/lib/subtask-status";
import { EXEC_PLANNER } from "@/lib/executive-planner-theme";
import { SubtaskAssigneeSelector } from "@/components/tasks/subtask-assignee-selector";
import { getSubtaskAssigneeIds, withSubtaskAssignees } from "@/lib/subtask-assignees";
import {
  SubtaskPrioritySelector,
  type SubtaskPriority,
} from "@/components/tasks/subtask-priority-selector";
import { SubtaskCompactRow } from "@/components/tasks/subtasks/subtask-compact-row";
import {
  SubtaskDetailPanel,
  type SubtaskDraft,
} from "@/components/tasks/subtasks/subtask-detail-panel";
import { useTenant } from "@/context/tenant-context";
import type { Task, TaskSubtask } from "@/types/api";
import { CalendarDays, Check, ListChecks, Plus } from "lucide-react";

interface RecurringSubtaskChecklistProps {
  task: Task | undefined;
  taskId: string | null;
  open: boolean;
  readOnly?: boolean;
  allowAdd?: boolean;
  showWhenEmpty?: boolean;
  stickyAdd?: boolean;
  boardQueryKey?: readonly unknown[];
  onTaskUpdated?: (task: Task) => void;
}

export function RecurringSubtaskChecklist({
  task,
  taskId,
  open,
  readOnly,
  allowAdd,
  showWhenEmpty,
  stickyAdd,
  boardQueryKey,
  onTaskUpdated,
}: RecurringSubtaskChecklistProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { orgId } = useTenant();
  const ensureAttemptedRef = useRef<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftAssigneeIds, setDraftAssigneeIds] = useState<string[]>([]);
  const [draftDueDate, setDraftDueDate] = useState("");
  const [draftPriority, setDraftPriority] = useState<SubtaskPriority>("MEDIUM");
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);
  const [subtaskDraftDirty, setSubtaskDraftDirty] = useState(false);

  const ensureMutation = useMutation({
    mutationFn: () => ensureRecurringOccurrenceSubtasks(taskId!),
    onSuccess: (updated) => {
      queryClient.setQueryData(["task", taskId], updated);
      onTaskUpdated?.(updated);
    },
  });

  useEffect(() => {
    if (!open || !taskId || readOnly || !task) return;
    if ((task.subtasks?.length ?? 0) > 0) return;
    if (!task.recurringTemplateId) return;
    if (ensureAttemptedRef.current === taskId) return;
    ensureAttemptedRef.current = taskId;
    ensureMutation.mutate();
  }, [open, taskId, task, readOnly, ensureMutation]);

  const updateMutation = useMutation({
    mutationFn: (subtasks: TaskSubtask[]) => updateTask(taskId!, { subtasks }),
    onMutate: async (subtasks) => {
      await queryClient.cancelQueries({ queryKey: ["task", taskId ?? ""] });
      const previous = queryClient.getQueryData<Task>(["task", taskId ?? ""]);
      if (previous) {
        const optimistic = { ...previous, subtasks };
        queryClient.setQueryData(["task", taskId], optimistic);
        onTaskUpdated?.(optimistic);
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["task", taskId], ctx.previous);
        onTaskUpdated?.(ctx.previous);
      }
      toast({
        title: "Could not update subtask",
        description: parseApiError(err),
        variant: "error",
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["task", taskId], updated);
      onTaskUpdated?.(updated);
      if (boardQueryKey) {
        queryClient.invalidateQueries({ queryKey: boardQueryKey as string[] });
      }
    },
  });

  const subtasks = task?.subtasks ?? [];
  const progress = useMemo(() => getOccurrenceSubtaskProgress(subtasks), [subtasks]);
  const allDone = allOccurrenceSubtasksDone(subtasks);
  const projectId = task?.projectId ?? "";

  if (ensureMutation.isPending && subtasks.length === 0) {
    return (
      <section>
        <Skeleton className="h-24 w-full rounded-xl" />
      </section>
    );
  }

  if (subtasks.length === 0 && !showWhenEmpty) {
    return null;
  }

  function toggleSubtask(subtaskId: string) {
    if (readOnly || !task) return;
    const next = subtasks.map((s) =>
      s.id === subtaskId ? subtaskWithCompleted(s, !s.completed) : s
    );
    updateMutation.mutate(next);
  }

  function patchSubtasks(mapper: (s: TaskSubtask) => TaskSubtask) {
    if (readOnly || !task) return;
    updateMutation.mutate(subtasks.map(mapper));
  }

  function resetComposer() {
    setDraftTitle("");
    setDraftDescription("");
    setDraftAssigneeIds([]);
    setDraftDueDate("");
    setDraftPriority("MEDIUM");
    setComposerOpen(false);
  }

  function addSubtask() {
    const title = draftTitle.trim();
    if (readOnly || !task || !title) return;
    const description = draftDescription.trim();
    const next: TaskSubtask[] = [
      ...subtasks,
      withSubtaskAssignees(
        {
          id: generateClientId(),
          title,
          completed: false,
          status: "TODO",
          ...(description ? { description } : {}),
          ...(draftDueDate ? { dueDate: draftDueDate } : {}),
          priority: draftPriority,
        },
        draftAssigneeIds
      ),
    ];
    updateMutation.mutate(next);
    resetComposer();
  }

  function deleteSubtask(subtaskId: string) {
    if (readOnly || !task) return;
    if (expandedSubtaskId === subtaskId) setExpandedSubtaskId(null);
    updateMutation.mutate(subtasks.filter((s) => s.id !== subtaskId));
  }

  function saveSubtaskDetail(draft: SubtaskDraft) {
    if (readOnly || !task) return;
    const next = subtasks.map((s) =>
      s.id === draft.id
        ? withSubtaskAssignees(
            {
              ...s,
              title: draft.title,
              description: draft.description,
              completed: draft.completed,
              dueDate: draft.dueDate,
              dueTime: draft.dueTime,
              status: draft.status,
              priority: draft.priority,
              requireLocation: draft.requireLocation,
            },
            getSubtaskAssigneeIds(draft)
          )
        : s
    );
    updateMutation.mutate(next);
    setSubtaskDraftDirty(false);
    setExpandedSubtaskId(null);
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" />
          Subtasks
        </h3>
        {progress.total > 0 ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
              allDone
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-muted text-muted-foreground"
            )}
          >
            {formatSubtaskProgressLabel(progress)}
          </span>
        ) : null}
      </div>
      <div className={cn(EXEC_PLANNER.paperCard, "space-y-2 p-3")}>
        {progress.total > 0 ? (
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        ) : null}
        {subtasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No subtasks yet — add steps for this run below.
          </p>
        ) : (
          <ul className="space-y-1.5" aria-label="Occurrence subtasks">
            {subtasks.map((s) => {
              const done = s.completed || resolveSubtaskStatus(s) === "DONE";
              const expanded = expandedSubtaskId === s.id;
              return (
                <li key={s.id} className="space-y-0">
                  <SubtaskCompactRow
                    title={s.title}
                    completed={done}
                    status={resolveSubtaskStatus(s)}
                    dueDate={s.dueDate}
                    dueTime={s.dueTime}
                    assigneeId={s.assigneeId}
                    assigneeIds={s.assigneeIds}
                    projectId={projectId}
                    organizationId={orgId ?? undefined}
                    expanded={expanded}
                    editDisabled={readOnly || updateMutation.isPending}
                    onToggleComplete={() => toggleSubtask(s.id)}
                    onStatusChange={(nextStatus: SubtaskStatus) => {
                      patchSubtasks((item) =>
                        item.id === s.id ? subtaskWithStatus(item, nextStatus) : item
                      );
                    }}
                    onAssigneeChange={(nextAssigneeIds) => {
                      patchSubtasks((item) =>
                        item.id === s.id ? withSubtaskAssignees(item, nextAssigneeIds) : item
                      );
                    }}
                    onDueDateChange={(dueDate, dueTime) => {
                      patchSubtasks((item) =>
                        item.id === s.id ? { ...item, dueDate, dueTime } : item
                      );
                    }}
                    onRowClick={() => {
                      if (subtaskDraftDirty && expandedSubtaskId && expandedSubtaskId !== s.id) {
                        toast({
                          title: "Save or cancel the open subtask first",
                          variant: "error",
                        });
                        return;
                      }
                      setExpandedSubtaskId(expanded ? null : s.id);
                      setSubtaskDraftDirty(false);
                    }}
                    onDelete={() => deleteSubtask(s.id)}
                  />
                  {expanded ? (
                    <SubtaskDetailPanel
                      draft={{
                        id: s.id,
                        title: s.title,
                        description: s.description,
                        completed: done,
                        assigneeId: s.assigneeId,
                        assigneeIds: s.assigneeIds ?? getSubtaskAssigneeIds(s),
                        dueDate: s.dueDate,
                        dueTime: s.dueTime,
                        status: resolveSubtaskStatus(s),
                        priority: s.priority,
                        requireLocation: s.requireLocation === true,
                      }}
                      projectId={projectId}
                      organizationId={orgId ?? undefined}
                      taskId={taskId ?? undefined}
                      persistAttachments
                      disabled={readOnly || updateMutation.isPending}
                      readOnly={readOnly}
                      saving={updateMutation.isPending}
                      onSave={saveSubtaskDetail}
                      onDirtyChange={setSubtaskDraftDirty}
                      onCancel={() => {
                        setSubtaskDraftDirty(false);
                        setExpandedSubtaskId(null);
                      }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {allowAdd && !readOnly ? (
          <div
            className={cn(
              "pt-1",
              stickyAdd &&
                "sticky bottom-0 -mx-1 border-t border-border/30 bg-card/95 px-1 py-2 backdrop-blur-sm"
            )}
          >
            {composerOpen ? (
              <form
                className="space-y-2 rounded-lg border border-border/40 bg-background/70 p-2.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  addSubtask();
                }}
              >
                <Input
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Subtask title"
                  disabled={updateMutation.isPending}
                  className="h-9 text-sm"
                />
                <Textarea
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  placeholder="Description (optional)"
                  disabled={updateMutation.isPending}
                  rows={3}
                  className="min-h-[72px] resize-y text-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <SubtaskPrioritySelector
                    value={draftPriority}
                    onChange={setDraftPriority}
                    disabled={updateMutation.isPending}
                    variant="field"
                  />
                  <span className="text-[11px] text-muted-foreground">Assignee</span>
                  <SubtaskAssigneeSelector
                    projectId={projectId}
                    value={draftAssigneeIds}
                    onChange={setDraftAssigneeIds}
                    disabled={updateMutation.isPending}
                  />
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="date"
                      value={draftDueDate}
                      onChange={(e) => setDraftDueDate(e.target.value)}
                      disabled={updateMutation.isPending}
                      className="h-9 w-[150px] pl-7 text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={resetComposer}
                    disabled={updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 gap-1"
                    disabled={!draftTitle.trim() || updateMutation.isPending}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 gap-1 px-3"
                onClick={() => setComposerOpen(true)}
                disabled={updateMutation.isPending}
              >
                <Plus className="h-3.5 w-3.5" />
                Add subtask
              </Button>
            )}
          </div>
        ) : null}
        {!readOnly && progress.total > 0 && !allDone ? (
          <p className="text-[10px] text-muted-foreground">
            Complete all subtasks to enable Mark done.
          </p>
        ) : null}
        {!readOnly && allDone && progress.total > 0 ? (
          <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
            All subtasks complete — you can mark this run done.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export { allOccurrenceSubtasksDone, getOccurrenceSubtaskProgress };

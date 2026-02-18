"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchTask, updateTask } from "@/services/api/tasks.api";
import { fetchComments, addComment, deleteComment } from "@/services/api/comments.api";
import { fetchOrgMembers } from "@/services/api/members.api";
import { fetchActivityLogs } from "@/services/api/activity-logs.api";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { SubtaskAssigneeSelector } from "@/components/tasks/subtask-assignee-selector";
import { SubtaskDueDatePicker } from "@/components/tasks/subtask-due-date-picker";
import { SubtaskPrioritySelector } from "@/components/tasks/subtask-priority-selector";
import type {
  Task,
  WorkflowStatus,
  OrgMember,
  TaskComment,
  ActivityLog,
  TaskSubtask,
  PaginatedResult,
} from "@/types/api";
import {
  Calendar,
  Flag,
  MessageSquare,
  Paperclip,
  Hash,
  User,
  Activity,
  Loader2,
  Send,
  Trash2,
  CheckSquare,
  Pencil,
  Check,
  ChevronDown,
} from "lucide-react";

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-emerald-500", border: "border-l-emerald-400/50" },
  { value: "MEDIUM", label: "Medium", color: "bg-amber-500", border: "border-l-amber-400/50" },
  { value: "HIGH", label: "High", color: "bg-red-500", border: "border-l-red-400/50" },
  { value: "CRITICAL", label: "Critical", color: "bg-purple-500", border: "border-l-purple-400/50" },
];

const STATUS_DOT_FALLBACK = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
];

function formatRelativeTime(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
  if (absMs < day) return rtf.format(Math.round(diffMs / hour), "hour");
  return rtf.format(Math.round(diffMs / day), "day");
}

export interface TaskDetailModalProps {
  taskId: string | null;
  projectId: string;
  organizationId: string;
  statuses: WorkflowStatus[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated?: (task: Task) => void;
}

export function TaskDetailModal({
  taskId,
  projectId,
  organizationId,
  statuses,
  open,
  onOpenChange,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const queryClient = useQueryClient();
  const syncTaskIntoListCache = React.useCallback(
    (nextTask: Task) => {
      queryClient.setQueryData<PaginatedResult<Task> | undefined>(
        ["tasks", projectId],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.map((item) => (item.id === nextTask.id ? { ...item, ...nextTask } : item)),
          };
        }
      );
    },
    [projectId, queryClient]
  );
  const { toast } = useToast();
  const [commentText, setCommentText] = React.useState("");
  const [newCheckItem, setNewCheckItem] = React.useState("");
  const [editingSubtaskId, setEditingSubtaskId] = React.useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = React.useState("");
  const editingInitialTitleRef = React.useRef("");
  const subtaskInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editingTitle, setEditingTitle] = React.useState("");
  const titleInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [editingDescription, setEditingDescription] = React.useState("");
  const [isDescriptionExpanded, setIsDescriptionExpanded] = React.useState(false);
  const descriptionInputRef = React.useRef<HTMLTextAreaElement | null>(null);

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchTask(taskId!),
    enabled: open && !!taskId,
  });

  React.useEffect(() => {
    if (!task) return;
    setEditingTitle(task.title);
    setIsEditingTitle(false);
    setEditingDescription(task.description ?? "");
    setIsEditingDescription(false);
    setIsDescriptionExpanded(false);
  }, [task?.id, task?.title, task?.description]);

  // task data is rendered directly — no local editing state needed for read-only fields

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org-members", organizationId],
    queryFn: () => fetchOrgMembers(organizationId),
    enabled: open && !!organizationId,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: () => fetchComments(taskId!),
    enabled: open && !!taskId,
  });

  const { data: activityData } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => fetchActivityLogs(1, 50),
    enabled: open && !!taskId,
  });

  const activityLogs = React.useMemo(() => {
    const list = activityData?.data ?? [];
    return list.filter(
      (log: ActivityLog) => log.entityType === "task" && log.entityId === taskId
    );
  }, [activityData?.data, taskId]);
  const checklist = task?.subtasks ?? [];
  const checklistStats = React.useMemo(() => {
    const total = checklist.length;
    const completed = checklist.filter((item) => item.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [checklist]);

  const subtaskCompletionMeta = React.useMemo(() => {
    const map = new Map<string, { userLabel: string; relative: string }>();
    const relevant = activityLogs
      .filter((log) => {
        const action = log.action.toLowerCase();
        return action.includes("subtask") && action.includes("complet");
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    for (const log of relevant) {
      const metadata = (log.metadata ?? {}) as Record<string, unknown>;
      const subtaskId =
        (typeof metadata.subtaskId === "string" && metadata.subtaskId) ||
        (typeof metadata.subtask_id === "string" && metadata.subtask_id) ||
        (typeof metadata.itemId === "string" && metadata.itemId) ||
        "";
      const subtaskTitle =
        (typeof metadata.subtaskTitle === "string" && metadata.subtaskTitle) ||
        (typeof metadata.subtask_title === "string" && metadata.subtask_title) ||
        (typeof metadata.title === "string" && metadata.title) ||
        "";

      const matchedId =
        subtaskId ||
        checklist.find((item) => item.title.trim().toLowerCase() === subtaskTitle.trim().toLowerCase())?.id;

      if (!matchedId || map.has(matchedId)) continue;

      const user = orgMembers.find((m) => m.userId === log.userId);
      const userLabel = user?.user?.fullName ?? user?.user?.email ?? "Someone";
      const relative = formatRelativeTime(log.createdAt);
      if (!relative) continue;
      map.set(matchedId, { userLabel, relative });
    }

    return map;
  }, [activityLogs, checklist, orgMembers]);

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateTask>[1]) =>
      updateTask(taskId!, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(["task", taskId], updated);
      syncTaskIntoListCache(updated);
      onTaskUpdated?.(updated);
      toast({ title: "Task updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "error" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (text: string) => addComment(taskId!, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      setCommentText("");
      toast({ title: "Comment added", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "error" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(taskId!, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      toast({ title: "Comment removed", variant: "default" });
    },
    onError: () => {
      toast({ title: "Failed to remove comment", variant: "error" });
    },
  });

  const updateSubtasksMutation = useMutation({
    mutationFn: (subtasks: TaskSubtask[]) => updateTask(taskId!, { subtasks }),
    onMutate: async (subtasks) => {
      await queryClient.cancelQueries({ queryKey: ["task", taskId] });
      const previous = queryClient.getQueryData<Task>(["task", taskId]);
      if (previous) {
        const optimisticTask = {
          ...previous,
          subtasks,
        };
        queryClient.setQueryData<Task>(["task", taskId], optimisticTask);
        syncTaskIntoListCache(optimisticTask);
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["task", taskId], ctx.previous);
      }
      toast({ title: "Failed to update subtasks", variant: "error" });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["task", taskId], updated);
      syncTaskIntoListCache(updated);
      onTaskUpdated?.(updated);
    },
  });

  const handleFieldChange = (field: keyof Task, value: unknown) => {
    if (!task) return;
    if (field === "statusId") {
      updateMutation.mutate({ statusId: value as string | null });
    }
  };

  const isOverdue =
    task?.dueDate && new Date(task.dueDate) < new Date() && task.statusId !== statuses.find((s) => s.type === "DONE")?.id;
  const selectedPriority = PRIORITIES.find((pr) => pr.value === task?.priority) ?? PRIORITIES[1];
  const selectedStatus =
    statuses.find((s) => s.id === (task?.statusId ?? statuses[0]?.id)) ?? statuses[0] ?? null;
  const statusColorById = React.useMemo(() => {
    const map = new Map<string, string>();
    statuses.forEach((s, index) => {
      map.set(s.id, s.color || STATUS_DOT_FALLBACK[index % STATUS_DOT_FALLBACK.length]);
    });
    return map;
  }, [statuses]);

  React.useEffect(() => {
    if (!editingSubtaskId) return;
    requestAnimationFrame(() => {
      const input = subtaskInputRefs.current[editingSubtaskId];
      input?.focus();
      input?.select();
    });
  }, [editingSubtaskId]);

  const startSubtaskInlineEdit = React.useCallback((subtaskId: string, currentTitle: string) => {
    editingInitialTitleRef.current = currentTitle;
    setEditingSubtaskTitle(currentTitle);
    setEditingSubtaskId(subtaskId);
  }, []);

  const saveSubtaskInlineEdit = React.useCallback(
    (subtaskId: string) => {
      if (editingSubtaskId !== subtaskId) return;
      const nextTitle = editingSubtaskTitle.trim();
      const previousTitle = editingInitialTitleRef.current.trim();
      setEditingSubtaskId(null);
      if (!nextTitle || nextTitle === previousTitle) return;
      updateSubtasksMutation.mutate(
        checklist.map((item) => (item.id === subtaskId ? { ...item, title: nextTitle } : item))
      );
    },
    [checklist, editingSubtaskId, editingSubtaskTitle, updateSubtasksMutation]
  );

  React.useEffect(() => {
    if (!isEditingTitle) return;
    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  }, [isEditingTitle]);

  const commitTitleEdit = React.useCallback(() => {
    if (!task) return;
    const next = editingTitle.trim();
    setIsEditingTitle(false);
    if (!next || next === task.title) {
      setEditingTitle(task.title);
      return;
    }
    updateMutation.mutate({ title: next });
  }, [editingTitle, task, updateMutation]);

  React.useEffect(() => {
    if (!isEditingDescription) return;
    requestAnimationFrame(() => {
      descriptionInputRef.current?.focus();
      const length = descriptionInputRef.current?.value.length ?? 0;
      descriptionInputRef.current?.setSelectionRange(length, length);
    });
  }, [isEditingDescription]);

  const commitDescriptionEdit = React.useCallback(() => {
    if (!task) return;
    const next = editingDescription.trim();
    const current = (task.description ?? "").trim();
    setIsEditingDescription(false);
    if (next === current) return;
    updateMutation.mutate({ description: next || "" });
  }, [editingDescription, task, updateMutation]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={!updateMutation.isPending}
        className={cn(
          "max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-l-2",
          selectedPriority.border
        )}
        aria-labelledby="task-detail-title"
        aria-describedby="task-detail-desc"
        aria-modal="true"
      >
        {taskLoading || !task ? (
          <div className="flex items-center justify-center min-h-[200px] p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DialogHeader className="p-6 pb-2 shrink-0">
              <div className="flex items-start gap-3 pr-8">
                <div className="flex flex-1 flex-col gap-2">
                  {isEditingTitle ? (
                    <Input
                      ref={titleInputRef}
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={commitTitleEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitTitleEdit();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setIsEditingTitle(false);
                          setEditingTitle(task.title);
                        }
                      }}
                      className="h-10 flex-1 text-xl font-semibold"
                      aria-label="Edit task title"
                    />
                  ) : (
                    <button
                      id="task-detail-title"
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      className="group flex flex-1 items-center gap-2 rounded-md px-1 py-1 text-left"
                    >
                      <span className="text-xl font-semibold">{task.title}</span>
                      <Pencil className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-70" />
                    </button>
                  )}
                  {selectedStatus && (
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          statusColorById.get(selectedStatus.id) ?? STATUS_DOT_FALLBACK[0]
                        )}
                      />
                      {selectedStatus.name}
                    </span>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6 p-6 pt-2">
                {/* Left column: Description, Checklist, Comments */}
                <div className="space-y-6">
                  <div>
                    <Label className="text-muted-foreground text-xs">Description</Label>
                    {isEditingDescription ? (
                      <Textarea
                        ref={descriptionInputRef}
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        onBlur={commitDescriptionEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setIsEditingDescription(false);
                            setEditingDescription(task.description ?? "");
                          }
                        }}
                        className="mt-1.5 min-h-[96px] text-sm"
                        placeholder="Add description..."
                        aria-label="Edit description"
                      />
                    ) : (
                      <div
                        onClick={() => setIsEditingDescription(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setIsEditingDescription(true);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className="group mt-1.5 w-full rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/40"
                      >
                        <div
                          className={cn(
                            "text-sm whitespace-pre-wrap text-foreground",
                            !isDescriptionExpanded && "max-h-[4.5rem] overflow-hidden"
                          )}
                        >
                          {task.description || (
                            <span className="italic text-muted-foreground">No description</span>
                          )}
                        </div>
                        {!!task.description && task.description.length > 180 && (
                          <span
                            className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDescriptionExpanded((prev) => !prev);
                            }}
                          >
                            {isDescriptionExpanded ? "Show less" : "Show more"}
                          </span>
                        )}
                        <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground/80 opacity-0 transition-opacity group-hover:opacity-100">
                          <Pencil className="h-3 w-3" /> Click to edit
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                      <CheckSquare className="h-3.5 w-3.5" /> Checklist
                    </Label>
                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{checklistStats.completed}/{checklistStats.total} completed</span>
                        <span>{checklistStats.percent}%</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                          style={{ width: `${checklistStats.percent}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-1.5 space-y-2">
                      {checklist.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "group flex items-center gap-2 rounded-md px-1 py-1 transition-colors duration-150 hover:bg-muted/45",
                            item.completed && "opacity-70"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() =>
                              updateSubtasksMutation.mutate(
                                checklist.map((i) =>
                                  i.id === item.id ? { ...i, completed: !i.completed } : i
                                )
                              )
                            }
                            className="h-4 w-4 shrink-0 rounded border-input accent-primary"
                          />
                          {editingSubtaskId === item.id ? (
                            <Input
                              value={editingSubtaskTitle}
                              onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                              onBlur={() => saveSubtaskInlineEdit(item.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  (e.currentTarget as HTMLInputElement).blur();
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  setEditingSubtaskId(null);
                                  setEditingSubtaskTitle(editingInitialTitleRef.current);
                                }
                              }}
                              ref={(node) => {
                                subtaskInputRefs.current[item.id] = node;
                              }}
                              className={cn(
                                "h-8 border-primary/30 bg-background/90 text-sm transition-all duration-200",
                                item.completed && "text-muted-foreground line-through decoration-1"
                              )}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => startSubtaskInlineEdit(item.id, item.title)}
                              className={cn(
                                "flex-1 rounded-sm px-1 py-0.5 text-left text-sm transition-[color,text-decoration-color] duration-200 hover:bg-muted/50",
                                item.completed &&
                                  "text-muted-foreground line-through decoration-1 [text-decoration-color:currentColor]"
                              )}
                            >
                              <span>{item.title}</span>
                              {item.completed && subtaskCompletionMeta.get(item.id) && (
                                <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground/80">
                                  Completed by {subtaskCompletionMeta.get(item.id)?.userLabel} {"\u2022"}{" "}
                                  {subtaskCompletionMeta.get(item.id)?.relative}
                                </span>
                              )}
                            </button>
                          )}
                          <SubtaskAssigneeSelector
                            projectId={projectId}
                            value={item.assigneeId}
                            onChange={(assigneeId) => {
                              updateSubtasksMutation.mutate(
                                checklist.map((i) =>
                                  i.id === item.id ? { ...i, assigneeId } : i
                                )
                              );
                            }}
                            disabled={updateSubtasksMutation.isPending}
                          />
                          <SubtaskPrioritySelector
                            value={item.priority ?? "MEDIUM"}
                            onChange={(priority) => {
                              updateSubtasksMutation.mutate(
                                checklist.map((i) =>
                                  i.id === item.id ? { ...i, priority } : i
                                )
                              );
                            }}
                            disabled={updateSubtasksMutation.isPending}
                          />
                          <SubtaskDueDatePicker
                            value={item.dueDate}
                            completed={item.completed}
                            onChange={(dueDate) => {
                              updateSubtasksMutation.mutate(
                                checklist.map((i) =>
                                  i.id === item.id ? { ...i, dueDate } : i
                                )
                              );
                            }}
                            disabled={updateSubtasksMutation.isPending}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-6 w-6 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                            onClick={() =>
                              updateSubtasksMutation.mutate(checklist.filter((i) => i.id !== item.id))
                            }
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add an item..."
                          value={newCheckItem}
                          onChange={(e) => setNewCheckItem(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newCheckItem.trim()) {
                              updateSubtasksMutation.mutate([
                                ...checklist,
                                {
                                  id: crypto.randomUUID(),
                                  title: newCheckItem.trim(),
                                  completed: false,
                                  priority: "MEDIUM",
                                  dueDate: undefined,
                                },
                              ]);
                              setNewCheckItem("");
                            }
                          }}
                          className="h-8 text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!newCheckItem.trim()}
                          onClick={() => {
                            if (newCheckItem.trim()) {
                              updateSubtasksMutation.mutate([
                                ...checklist,
                                {
                                  id: crypto.randomUUID(),
                                  title: newCheckItem.trim(),
                                  completed: false,
                                  priority: "MEDIUM",
                                  dueDate: undefined,
                                },
                              ]);
                              setNewCheckItem("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" /> Comments
                      <span className="text-muted-foreground/70 font-normal">(use @ to mention)</span>
                    </Label>
                    <div className="mt-1.5 flex gap-2">
                      <Textarea
                        placeholder="Write a comment... Use @ to mention a teammate"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="min-h-[80px]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (commentText.trim()) addCommentMutation.mutate(commentText.trim());
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        className="shrink-0 h-10 w-10"
                        onClick={() => commentText.trim() && addCommentMutation.mutate(commentText.trim())}
                        disabled={!commentText.trim() || addCommentMutation.isPending}
                        aria-label="Send comment"
                      >
                        {addCommentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                    {commentsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-2">No comments yet.</p>
                    ) : (
                      <ul className="space-y-3 mt-2" role="list">
                        {comments.map((c: TaskComment) => (
                          <li key={c.id} className="flex gap-3 rounded-lg border bg-muted/30 p-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={c.user?.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {(c.user?.fullName ?? c.user?.email ?? "?").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{c.user?.fullName ?? c.user?.email ?? "User"}</p>
                              <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</p>
                              <p className="mt-1 text-sm whitespace-pre-wrap">{c.body}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteCommentMutation.mutate(c.id)} disabled={deleteCommentMutation.isPending} aria-label="Delete comment">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Right column: Assignee, Due date, Priority, Status, Tags, Attachments, Activity */}
                <div className="space-y-4 lg:border-l lg:pl-6">
                  <div>
                    <Label className="text-muted-foreground text-xs flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Assignee</Label>
                    {(() => {
                      const member = orgMembers.find((m) => m.userId === task.assigneeId);
                      return (
                        <div className="mt-1.5 flex items-center gap-2 text-sm">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member?.user?.avatarUrl} />
                            <AvatarFallback className="text-[10px]">
                              {(member?.user?.fullName ?? member?.user?.email ?? "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {member?.user?.fullName ?? member?.user?.email ?? (task.assigneeId ? "Assigned" : "Unassigned")}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Due date</Label>
                    <p className={cn("mt-1.5 text-sm", isOverdue && "text-destructive font-medium")}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}
                    </p>
                    {isOverdue && <p className="text-xs text-destructive mt-1">Overdue</p>}
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs flex items-center gap-1.5"><Flag className="h-3.5 w-3.5" /> Priority</Label>
                    <div className="mt-1.5 flex items-center gap-2 text-sm">
                      <span className={cn("h-3.5 w-3.5 rounded-full shadow-sm", selectedPriority.color)} />
                      <span className="font-medium">{selectedPriority.label}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-1.5 h-9 w-full justify-between border-border/70 bg-background/80 px-3 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2.5 w-2.5 rounded-full",
                                selectedStatus ? statusColorById.get(selectedStatus.id) : "bg-muted-foreground"
                              )}
                            />
                            <span>{selectedStatus?.name ?? "Select status"}</span>
                          </span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px] p-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-150"
                        sideOffset={6}
                      >
                        {statuses.map((s) => {
                          const isCurrent = s.id === selectedStatus?.id;
                          return (
                            <DropdownMenuItem
                              key={s.id}
                              onSelect={() => handleFieldChange("statusId", s.id)}
                              className="rounded-md text-sm"
                            >
                              <span className="mr-2 flex items-center gap-2">
                                <span
                                  className={cn(
                                    "h-2.5 w-2.5 rounded-full",
                                    statusColorById.get(s.id) ?? STATUS_DOT_FALLBACK[0]
                                  )}
                                />
                              </span>
                              <span className="flex-1">{s.name}</span>
                              {isCurrent && <Check className="h-3.5 w-3.5 text-primary" />}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> Story points</Label>
                    <p className="mt-1.5 text-sm">{task.storyPoints ?? "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Tags</Label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs">+ Add tag</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" /> Attachments</Label>
                    <div className="mt-1.5 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      Drag files or click to upload. (Coming soon.)
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Activity</Label>
                    {activityLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-1.5">No recent activity.</p>
                    ) : (
                      <ul className="space-y-2 mt-1.5" role="list">
                        {activityLogs.slice(0, 8).map((log: ActivityLog) => (
                          <li key={log.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Activity className="h-4 w-4 shrink-0 mt-0.5" />
                            <span className="flex-1 min-w-0">
                              {log.action}
                              {log.metadata && typeof log.metadata === "object" && "details" in log.metadata ? ` — ${String((log.metadata as { details?: string }).details ?? "")}` : ""}
                            </span>
                            <span className="shrink-0 text-xs">{new Date(log.createdAt).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t px-6 py-3 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>Created {task.createdAt && new Date(task.createdAt).toLocaleString()}</span>
              <span>Updated {task.updatedAt && new Date(task.updatedAt).toLocaleString()}</span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

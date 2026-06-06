"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStoredToken, parseApiError } from "@/services/api/client";
import { fetchTask, updateTask, updateTaskAssignee, deleteTask } from "@/services/api/tasks.api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fetchComments, addComment, deleteComment } from "@/services/api/comments.api";
import { fetchOrgMembers, fetchProjectMembers } from "@/services/api/members.api";
import { fetchActivityLogs } from "@/services/api/activity-logs.api";
import { fetchAttachments } from "@/services/api/attachments.api";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { generateClientId } from "@/lib/generate-client-id";

import {
  defaultDoneStatusId,
  defaultTodoStatusId,
  isDoneWorkflowStatus,
} from "@/components/tasks/subtask-status-selector";
import { SubtaskCompactRow } from "@/components/tasks/subtasks/subtask-compact-row";
import {
  SubtaskDetailPanel,
  type SubtaskDraft,
} from "@/components/tasks/subtasks/subtask-detail-panel";
import { fetchEntityAttachments } from "@/services/api/entity-attachments.api";
import { CommentInputWithMentions } from "@/components/tasks/comment-input-with-mentions";
import {
  normalizeDescriptionHtml,
  sanitizeTaskDescriptionHtml,
  taskDescriptionLooksLikeHtml,
  taskDescriptionPlainLength,
} from "@/lib/task-description-html";
import { filterTaskImageAttachments } from "@/lib/task-image-attachments";
import { isTinyMceUiTarget } from "@/lib/tinymce-dialog";
import { TaskAttachmentsSection } from "@/components/tasks/task-attachments-section";

const TaskDescriptionEditor = dynamic(
  () =>
    import("@/components/tasks/task-description-tinymce").then((mod) => mod.TaskDescriptionEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[320px] animate-pulse rounded-[0.875rem] bg-muted/30 ring-1 ring-border/20"
        aria-hidden
      />
    ),
  }
);
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
  Check,
  Flag,
  MessageSquare,
  Hash,
  Search,
  UserRoundPlus,
  UserRoundX,
  User,
  Activity,
  Loader2,
  Send,
  Trash2,
  CheckSquare,
  Pencil,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Tag,
  X,
  FileText,
} from "lucide-react";

const TAG_COLORS = [
  "#2563EB",
  "#16A34A",
  "#DC2626",
  "#7C3AED",
  "#EA580C",
  "#0891B2",
  "#E11D48",
  "#4B5563",
];

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-emerald-500", border: "border-l-emerald-400/50" },
  { value: "MEDIUM", label: "Medium", color: "bg-amber-500", border: "border-l-amber-400/50" },
  { value: "HIGH", label: "High", color: "bg-red-500", border: "border-l-red-400/50" },
  { value: "CRITICAL", label: "Critical", color: "bg-purple-500", border: "border-l-purple-400/50" },
];

/** Dropdowns inside task detail dialog must sit above the modal (z-50). */
const TASK_MODAL_DROPDOWN_Z = "z-[110]";
const ACTIVITY_PAGE_SIZE = 5;

/** Sidebar priority row — warm tint per level (visually distinct from status / primary actions). */
const PRIORITY_SIDEBAR_SHELL: Record<string, string> = {
  LOW: "bg-emerald-500/[0.07] ring-1 ring-emerald-600/15 dark:bg-emerald-500/[0.11] dark:ring-emerald-400/22",
  MEDIUM: "bg-amber-500/[0.08] ring-1 ring-amber-600/18 dark:bg-amber-500/[0.12] dark:ring-amber-400/25",
  HIGH: "bg-red-500/[0.07] ring-1 ring-red-600/18 dark:bg-red-500/[0.12] dark:ring-red-400/22",
  CRITICAL: "bg-purple-500/[0.08] ring-1 ring-purple-600/18 dark:bg-purple-500/[0.12] dark:ring-purple-400/25",
};

const STATUS_DOT_FALLBACK = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
];

/** Task detail — typography + surfaces (see globals `.td-*` for depth). */
const tdEyebrow =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/48";
const tdMainSectionHeading =
  "text-[0.9375rem] font-semibold tracking-[-0.01em] text-foreground/95";
const tdMainSurface = cn("td-main-card rounded-2xl p-6 sm:p-8");
const tdWorkUnified = cn("td-main-card overflow-hidden rounded-2xl");
const tdWorkSection = "px-6 py-6 sm:px-8 sm:py-7";
const tdWorkSectionDivider = "h-px bg-[#E5E7EB] dark:bg-border";
const tdSidebarSurface = cn(
  "td-sidebar-card rounded-2xl p-5",
  "transition-[box-shadow] duration-200 hover:shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)]",
  "dark:hover:bg-muted/25"
);
const tdSidebarHeading = cn(tdEyebrow, "mb-3 block");
const tdSubtleDivider = "my-5 h-px bg-[#E5E7EB] dark:bg-border/35";

/** `YYYY-MM-DD` for native date input from API ISO / Date-only strings. */
function taskDueDateToInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseTaskDueDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Compare due date to today in local time (avoids UTC off-by-one). */
function isTaskDueDateOverdue(iso?: string | null): boolean {
  if (!iso) return false;
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const due = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(iso);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

/** Primary due date label, e.g. `30 May 2026`. */
function formatTaskDueDatePrimary(iso?: string | null): string {
  const d = parseTaskDueDate(iso);
  if (!d) return "Select a date";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Helper line with weekday, e.g. `Sat, 30 May 2026`. */
function formatTaskDueDateHelper(iso?: string | null): string | null {
  const d = parseTaskDueDate(iso);
  if (!d) return null;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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

/** Renders DOMPurify-sanitized description HTML (XSS-safe when fed sanitized input). */
function SanitizedDescriptionHtml({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export interface TaskDetailModalProps {
  taskId: string | null;
  projectId: string;
  organizationId: string;
  statuses: WorkflowStatus[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated?: (task: Task) => void;
  /** When true, task fields cannot be edited (non-owner members). */
  /** @deprecated Modal computes permissions from org role + assignee; kept for API compat. */
  readOnly?: boolean;
}

export function TaskDetailModal({
  taskId,
  projectId,
  organizationId,
  statuses,
  open,
  onOpenChange,
  onTaskUpdated,
  readOnly: _readOnly = false,
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
  const currentUserId = React.useMemo(() => {
    const token = getStoredToken();
    if (!token) return "";
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.sub ?? "";
    } catch {
      return "";
    }
  }, []);
  const [commentText, setCommentText] = React.useState("");
  const [commentMentionedIds, setCommentMentionedIds] = React.useState<string[]>([]);
  const [newCheckItem, setNewCheckItem] = React.useState("");
  const [expandedSubtaskId, setExpandedSubtaskId] = React.useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editingTitle, setEditingTitle] = React.useState("");
  const titleInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [editingDescription, setEditingDescription] = React.useState("");
  const editingDescriptionRef = React.useRef(editingDescription);
  editingDescriptionRef.current = editingDescription;
  const [isDescriptionExpanded, setIsDescriptionExpanded] = React.useState(false);
  const [isEditingStoryPoints, setIsEditingStoryPoints] = React.useState(false);
  const [editingStoryPointsValue, setEditingStoryPointsValue] = React.useState("");
  const storyPointsInputRef = React.useRef<HTMLInputElement | null>(null);
  const [addTagOpen, setAddTagOpen] = React.useState(false);
  const [newTagName, setNewTagName] = React.useState("");
  const [newTagColor, setNewTagColor] = React.useState(TAG_COLORS[0]);
  const commentTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [activityExpanded, setActivityExpanded] = React.useState(true);
  const [activityPage, setActivityPage] = React.useState(1);
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = React.useState(false);
  const [assigneeSearch, setAssigneeSearch] = React.useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [subtaskDeleteTarget, setSubtaskDeleteTarget] = React.useState<{
    id: string;
    title: string;
  } | null>(null);
  const [subtaskDraftDirty, setSubtaskDraftDirty] = React.useState(false);
  const [subtaskCollapseConfirmOpen, setSubtaskCollapseConfirmOpen] = React.useState(false);
  const [pendingSubtaskExpandId, setPendingSubtaskExpandId] = React.useState<string | null>(null);

  const isOnline = React.useCallback((lastSeenAt: string | undefined) => {
    if (!lastSeenAt) return false;
    return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;
  }, []);

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
    setIsEditingStoryPoints(false);
    setAddTagOpen(false);
    setNewTagName("");
    setNewTagColor(TAG_COLORS[0]);
    setActivityExpanded((prev) => prev);
  }, [task?.id, task?.title, task?.description]);

  // task data is rendered directly — no local editing state needed for read-only fields

  const { data: projectMembers = [] } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: open && !!projectId,
    staleTime: 60_000,
  });

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org-members", organizationId],
    queryFn: () => fetchOrgMembers(organizationId),
    enabled: open && !!organizationId,
    refetchInterval: 30_000,
  });

  /** Project members first; org roster as fallback (all roles can list teammates). */
  const assignableMembers = React.useMemo(() => {
    const byUserId = new Map<
      string,
      {
        id: string;
        userId: string;
        user?: { fullName?: string; email?: string; avatarUrl?: string; lastSeenAt?: string };
      }
    >();
    for (const m of projectMembers) {
      byUserId.set(m.userId, { id: m.id, userId: m.userId, user: m.user });
    }
    if (byUserId.size === 0) {
      for (const m of orgMembers) {
        if (m.status?.toLowerCase() !== "active") continue;
        byUserId.set(m.userId, { id: m.id, userId: m.userId, user: m.user });
      }
    }
    return Array.from(byUserId.values());
  }, [projectMembers, orgMembers]);

  const assigneeFilteredMembers = React.useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return assignableMembers;
    return assignableMembers.filter(
      (m) =>
        (m.user?.fullName ?? "").toLowerCase().includes(q) ||
        (m.user?.email ?? "").toLowerCase().includes(q)
    );
  }, [assignableMembers, assigneeSearch]);

  const resolvedAssignee = React.useMemo(() => {
    if (!task?.assigneeId) return null;
    const member = assignableMembers.find((m) => m.userId === task.assigneeId);
    if (member?.user) {
      return {
        name: member.user.fullName ?? member.user.email ?? "User",
        avatarUrl: member.user.avatarUrl,
        lastSeenAt: member.user.lastSeenAt,
      };
    }
    if (task.assignee) {
      return {
        name: task.assignee.fullName ?? task.assignee.email ?? "User",
        avatarUrl: task.assignee.avatarUrl,
        lastSeenAt: undefined as string | undefined,
      };
    }
    return { name: "User", avatarUrl: undefined, lastSeenAt: undefined };
  }, [task?.assigneeId, task?.assignee, assignableMembers]);

  const isOwner = React.useMemo(
    () => orgMembers.find((m) => m.userId === currentUserId)?.role?.toUpperCase() === "OWNER",
    [orgMembers, currentUserId]
  );

  const isAssignee = React.useMemo(() => {
    if (!task || !currentUserId) return false;
    const uid = currentUserId.toLowerCase();
    const ids = (
      task.assigneeIds?.length
        ? task.assigneeIds
        : task.assigneeId
          ? [task.assigneeId]
          : []
    ).map((id) => id.toLowerCase());
    if (ids.includes(uid)) return true;
    return (task.assignee?.id?.toLowerCase() ?? "") === uid;
  }, [task, currentUserId]);

  /** Owner can edit every field; assignees can update status, priority, and subtasks only. */
  const canEditAll = isOwner;
  const canEditWorkflowFields = isOwner || isAssignee;
  const isViewOnly = !canEditWorkflowFields;

  const subtaskMemberHints = React.useMemo(() => {
    const byId = new Map<
      string,
      { id: string; name: string; email?: string; avatarUrl?: string }
    >();
    for (const m of assignableMembers) {
      byId.set(m.userId, {
        id: m.userId,
        name: m.user?.fullName ?? m.user?.email ?? "User",
        email: m.user?.email,
        avatarUrl: m.user?.avatarUrl,
      });
    }
    if (task?.assignee) {
      const a = task.assignee;
      if (!byId.has(a.id)) {
        byId.set(a.id, {
          id: a.id,
          name: a.fullName ?? a.email ?? "User",
          email: a.email,
          avatarUrl: a.avatarUrl,
        });
      }
    }
    return Array.from(byId.values());
  }, [assignableMembers, task?.assignee]);

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: () => fetchComments(taskId!),
    enabled: open && !!taskId,
  });

  // Auto-expand comment textarea while typing
  React.useEffect(() => {
    const ta = commentTextareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, 80), 240)}px`;
  }, [commentText]);

  const { data: activityData } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => fetchActivityLogs(1, 50),
    enabled: open && !!taskId,
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["task-attachments", taskId],
    queryFn: () => fetchAttachments(taskId!),
    enabled: open && !!taskId,
  });

  const imageAttachments = React.useMemo(
    () => filterTaskImageAttachments(attachments),
    [attachments]
  );

  const activityLogs = React.useMemo(() => {
    const list = activityData?.data ?? [];
    return list.filter(
      (log: ActivityLog) => log.entityType === "task" && log.entityId === taskId
    );
  }, [activityData?.data, taskId]);

  const activityPageCount = Math.max(1, Math.ceil(activityLogs.length / ACTIVITY_PAGE_SIZE));
  const paginatedActivityLogs = React.useMemo(() => {
    const start = (activityPage - 1) * ACTIVITY_PAGE_SIZE;
    return activityLogs.slice(start, start + ACTIVITY_PAGE_SIZE);
  }, [activityLogs, activityPage]);

  React.useEffect(() => {
    setActivityPage(1);
  }, [taskId]);

  React.useEffect(() => {
    if (activityPage > activityPageCount) {
      setActivityPage(activityPageCount);
    }
  }, [activityPage, activityPageCount]);

  const checklist = task?.subtasks ?? [];

  React.useEffect(() => {
    if (!open || !taskId) return;
    void queryClient.invalidateQueries({ queryKey: ["entity-attachments", "SUBTASK"] });
    void queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] });
  }, [open, taskId, queryClient]);

  const subtaskAttachmentQueries = useQueries({
    queries: checklist.map((item) => ({
      queryKey: ["entity-attachments", "SUBTASK", item.id],
      queryFn: () => fetchEntityAttachments("SUBTASK", item.id, taskId ?? undefined),
      enabled: Boolean(taskId && item.id),
      staleTime: 30_000,
    })),
  });

  const attachmentCountBySubtaskId = React.useMemo(() => {
    const map = new Map<string, number>();
    checklist.forEach((item, index) => {
      map.set(item.id, subtaskAttachmentQueries[index]?.data?.length ?? 0);
    });
    return map;
  }, [checklist, subtaskAttachmentQueries]);

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
    mutationFn: (payload: Parameters<typeof updateTask>[1]) => {
      const keys = Object.keys(payload);
      const assigneeAllowed = new Set(["statusId", "priority"]);
      if (!canEditAll) {
        if (!canEditWorkflowFields) {
          return Promise.reject(new Error("You do not have permission to edit this task"));
        }
        if (keys.some((k) => !assigneeAllowed.has(k))) {
          return Promise.reject(new Error("Only the workspace owner can edit this field"));
        }
      }
      return updateTask(taskId!, payload);
    },
    onMutate: async (payload) => {
      if (payload.priority === undefined && payload.statusId === undefined) return undefined;
      await queryClient.cancelQueries({ queryKey: ["task", taskId] });
      const previous = queryClient.getQueryData<Task>(["task", taskId]);
      if (previous) {
        const optimistic = { ...previous, ...payload } as Task;
        queryClient.setQueryData(["task", taskId], optimistic);
        syncTaskIntoListCache(optimistic);
      }
      return { previous };
    },
    onSuccess: (updated) => {
      if (!updated?.id) {
        toast({
          title: "Could not update task",
          description: "The server returned an empty task. Check workspace context and try again.",
          variant: "error",
        });
        return;
      }
      queryClient.setQueryData(["task", taskId], updated);
      syncTaskIntoListCache(updated);
      onTaskUpdated?.(updated);
      toast({ title: "Task updated", variant: "success" });
    },
    onError: (err, _payload, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["task", taskId], ctx.previous);
      }
      toast({
        title: "Failed to update task",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const assigneeMutation = useMutation({
    mutationFn: (assigneeId: string | null) => {
      if (!canEditAll) {
        return Promise.reject(new Error("Only the workspace owner can change the assignee"));
      }
      return updateTaskAssignee(taskId!, assigneeId);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["task", taskId], updated);
      syncTaskIntoListCache(updated);
      onTaskUpdated?.(updated);
      toast({ title: "Assignee updated", variant: "success" });
    },
    onError: () => {
      toast({ title: "Failed to update assignee", variant: "error" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: () => deleteTask(taskId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.removeQueries({ queryKey: ["task", taskId] });
      setDeleteConfirmOpen(false);
      onOpenChange(false);
      toast({ title: "Task deleted", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Failed to delete task",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ text, mentionedUserIds }: { text: string; mentionedUserIds: string[] }) =>
      addComment(taskId!, text, mentionedUserIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      setCommentText("");
      setCommentMentionedIds([]);
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
    mutationFn: (subtasks: TaskSubtask[]) => {
      if (!canEditWorkflowFields) {
        return Promise.reject(new Error("You do not have permission to update subtasks"));
      }
      return updateTask(taskId!, { subtasks });
    },
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
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["task", taskId], ctx.previous);
      }
      toast({
        title: "Failed to update subtasks",
        description: parseApiError(err),
        variant: "error",
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["task", taskId], updated);
      syncTaskIntoListCache(updated);
      onTaskUpdated?.(updated);
    },
  });

  const appendSubtask = React.useCallback(
    (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      updateSubtasksMutation.mutate([
        ...checklist,
        {
          id: generateClientId(),
          title: trimmed,
          completed: false,
          priority: "MEDIUM",
          statusId: defaultTodoStatusId(statuses),
          dueDate: undefined,
        },
      ]);
      setNewCheckItem("");
    },
    [checklist, statuses, updateSubtasksMutation]
  );

  const handleFieldChange = (field: keyof Task, value: unknown) => {
    if (!task || !canEditWorkflowFields) return;
    if (field === "statusId") {
      updateMutation.mutate({ statusId: value as string | null });
    }
  };

  const handlePriorityChange = React.useCallback(
    (priority: string) => {
      if (!canEditWorkflowFields) return;
      updateMutation.mutate({ priority });
    },
    [canEditWorkflowFields, updateMutation]
  );

  const isOverdue =
    Boolean(task?.dueDate) &&
    isTaskDueDateOverdue(task?.dueDate) &&
    task?.statusId !== statuses.find((s) => s.type === "DONE")?.id;
  const selectedPriority =
    PRIORITIES.find((pr) => pr.value === (task?.priority ?? "").toUpperCase()) ?? PRIORITIES[1];
  const selectedStatus =
    statuses.find((s) => s.id === (task?.statusId ?? statuses[0]?.id)) ?? statuses[0] ?? null;
  const statusColorById = React.useMemo(() => {
    const map = new Map<string, string>();
    statuses.forEach((s, index) => {
      map.set(s.id, s.color || STATUS_DOT_FALLBACK[index % STATUS_DOT_FALLBACK.length]);
    });
    return map;
  }, [statuses]);

  const saveSubtaskDetail = React.useCallback(
    (draft: SubtaskDraft) => {
      const status = statuses.find((s) => s.id === draft.statusId);
      updateSubtasksMutation.mutate(
        checklist.map((item) =>
          item.id === draft.id
            ? {
                ...item,
                ...draft,
                completed: status ? isDoneWorkflowStatus(status) : draft.completed,
              }
            : item
        ),
        {
          onSuccess: () => {
            setSubtaskDraftDirty(false);
            toast({ title: "Subtask saved", variant: "success" });
          },
        }
      );
    },
    [checklist, statuses, updateSubtasksMutation, toast]
  );

  const confirmRemoveSubtask = React.useCallback(() => {
    if (!subtaskDeleteTarget) return;
    if (expandedSubtaskId === subtaskDeleteTarget.id) {
      setExpandedSubtaskId(null);
      setSubtaskDraftDirty(false);
    }
    updateSubtasksMutation.mutate(checklist.filter((i) => i.id !== subtaskDeleteTarget.id));
    setSubtaskDeleteTarget(null);
  }, [checklist, expandedSubtaskId, subtaskDeleteTarget, updateSubtasksMutation]);

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
    if (!isEditingStoryPoints) return;
    requestAnimationFrame(() => {
      storyPointsInputRef.current?.focus();
      storyPointsInputRef.current?.select();
    });
  }, [isEditingStoryPoints]);

  const startStoryPointsEdit = React.useCallback(() => {
    setEditingStoryPointsValue(task?.storyPoints != null ? String(task.storyPoints) : "");
    setIsEditingStoryPoints(true);
  }, [task?.storyPoints]);

  const commitStoryPointsEdit = React.useCallback(() => {
    if (!task) return;
    setIsEditingStoryPoints(false);
    const raw = editingStoryPointsValue.trim();
    if (raw === "") {
      updateMutation.mutate({ storyPoints: null });
      return;
    }
    const num = parseInt(raw, 10);
    if (!Number.isNaN(num) && num >= 0 && num <= 100) {
      updateMutation.mutate({ storyPoints: num });
    } else {
      setEditingStoryPointsValue(task.storyPoints != null ? String(task.storyPoints) : "");
    }
  }, [task, editingStoryPointsValue, updateMutation]);

  const cancelStoryPointsEdit = React.useCallback(() => {
    setIsEditingStoryPoints(false);
    setEditingStoryPointsValue(task?.storyPoints != null ? String(task.storyPoints) : "");
  }, [task?.storyPoints]);

  const tagsList = task?.tags ?? [];
  const addTag = React.useCallback(() => {
    const name = newTagName.trim();
    if (!name || !task) return;
    if (tagsList.some((t) => t.name.toLowerCase() === name.toLowerCase())) return;
    const next = [...tagsList, { name, color: newTagColor }];
    updateMutation.mutate({ tags: next });
    setNewTagName("");
    setNewTagColor(TAG_COLORS[0]);
    setAddTagOpen(false);
  }, [task, newTagName, newTagColor, tagsList, updateMutation]);
  const removeTag = React.useCallback(
    (name: string) => {
      if (!task) return;
      const next = (task.tags ?? []).filter((t) => t.name !== name);
      updateMutation.mutate({ tags: next });
    },
    [task, updateMutation]
  );

  const commitDescriptionEdit = React.useCallback(() => {
    if (!task) return;
    const next = normalizeDescriptionHtml(editingDescriptionRef.current);
    const current = normalizeDescriptionHtml(task.description ?? "");
    setIsEditingDescription(false);
    if (next === current) return;
    updateMutation.mutate({ description: next || "" });
  }, [task, updateMutation]);

  const cancelDescriptionEdit = React.useCallback(() => {
    if (!task) return;
    setIsEditingDescription(false);
    setEditingDescription(task.description ?? "");
  }, [task]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="td-modal-overlay"
        showClose={!updateMutation.isPending}
        closeButtonClassName="h-10 w-10 rounded-xl bg-white/90 text-muted-foreground shadow-sm ring-1 ring-[#E5E7EB] backdrop-blur-sm transition-all hover:bg-white hover:text-foreground hover:shadow-md dark:bg-card/90 dark:ring-border"
        onEscapeKeyDown={() => onOpenChange(false)}
        onFocusOutside={(event) => {
          if (isTinyMceUiTarget(event.target)) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (isTinyMceUiTarget(event.target)) {
            event.preventDefault();
          }
        }}
        className={cn(
          "td-modal-shell max-w-6xl max-h-[92vh] overflow-hidden flex flex-col gap-0 border-0 p-0 rounded-[18px]",
          "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:zoom-out-95",
          "border-l-[5px]",
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
            {isViewOnly && (
              <div className="mx-6 mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-900 dark:text-amber-100 sm:mx-8">
                View only — only the workspace <strong>owner</strong> or task <strong>assignee</strong> can edit this task. You can still read details and add comments.
              </div>
            )}
            {canEditWorkflowFields && !canEditAll && (
              <div className="mx-6 mt-4 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm text-sky-950 dark:text-sky-100 sm:mx-8">
                Assigned to you — you can update <strong>status</strong>, <strong>priority</strong>, and <strong>subtasks</strong>. Other fields are owner-only.
              </div>
            )}
            <DialogHeader className="td-modal-header-shade shrink-0 px-6 pb-6 pt-7 sm:px-8 sm:pb-7 sm:pt-8">
              <div className="flex items-start gap-4 pr-12">
                <div className="flex min-w-0 flex-1 flex-col gap-3">
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
                      className="h-14 flex-1 rounded-xl border-0 bg-background/95 text-2xl font-semibold tracking-[-0.02em] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.07)] placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-primary/25 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] md:text-[1.75rem]"
                      aria-label="Edit task title"
                    />
                  ) : (
                    <div
                      id="task-detail-title"
                      className={cn(
                        "flex max-w-full items-start gap-3 rounded-xl px-1 py-1 text-left",
                        canEditAll && "group cursor-pointer transition-colors hover:bg-background/50"
                      )}
                      role={canEditAll ? "button" : undefined}
                      tabIndex={canEditAll ? 0 : undefined}
                      onClick={canEditAll ? () => setIsEditingTitle(true) : undefined}
                      onKeyDown={
                        canEditAll
                          ? undefined
                          : (e) => {
                              if (e.key === "Enter") setIsEditingTitle(true);
                            }
                      }
                    >
                      <span className="min-w-0 text-balance text-2xl font-semibold leading-[1.2] tracking-[-0.025em] text-foreground md:text-[1.875rem] md:leading-[1.12]">
                        {task.title}
                      </span>
                      {canEditAll && (
                        <Pencil className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {task.dueDate && (
                      <span
                        className={cn(
                          "td-meta-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-foreground",
                          isOverdue && "border-destructive/30 bg-destructive/5 text-destructive"
                        )}
                      >
                        <Calendar className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                        {new Date(task.dueDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    <span className="td-meta-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      <span
                        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", selectedPriority.color)}
                        aria-hidden
                      />
                      {selectedPriority.label}
                    </span>
                    <span
                      id="task-detail-desc"
                      className="text-[11px] font-medium tabular-nums text-muted-foreground/55"
                    >
                      {task.projectId ? `ID ${task.id.slice(0, 8).toUpperCase()}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="td-modal-body-scroll min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-6 p-5 pb-10 lg:grid-cols-[minmax(0,1fr),minmax(280px,320px)] lg:gap-x-8 lg:gap-y-6 lg:p-8">
                {/* Left: unified work + comments + activity */}
                <div className="flex min-w-0 flex-col gap-6">
                  <div className={tdWorkUnified}>
                    <div className={tdWorkSection}>
                      <h3 className={cn(tdMainSectionHeading, "mb-4 flex items-center gap-2")}>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                          <FileText className="h-4 w-4" aria-hidden />
                        </span>
                        Description
                      </h3>
                    {isEditingDescription ? (
                      <TaskDescriptionEditor
                        key={`${task.id}-desc-edit`}
                        value={editingDescription}
                        onChange={setEditingDescription}
                        onCommit={commitDescriptionEdit}
                        onCancel={cancelDescriptionEdit}
                        disabled={updateMutation.isPending}
                        taskId={task.id}
                        existingImageAttachments={imageAttachments}
                        onAttachmentUploaded={() => {
                          queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] });
                        }}
                        onPasteError={(message) =>
                          toast({
                            title: "Could not paste image",
                            description: message,
                            variant: "error",
                          })
                        }
                      />
                    ) : (
                      <>
                      <div
                        onClick={canEditAll ? () => setIsEditingDescription(true) : undefined}
                        onKeyDown={
                          canEditAll
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setIsEditingDescription(true);
                                }
                              }
                            : undefined
                        }
                        role={canEditAll ? "button" : undefined}
                        tabIndex={canEditAll ? 0 : undefined}
                        className={cn(
                          "group -mx-1 min-h-[7.5rem] w-full rounded-xl border border-dashed border-transparent px-4 py-4 text-left transition-all",
                          canEditAll &&
                            "hover:border-[#E5E7EB] hover:bg-white dark:hover:border-border/50 dark:hover:bg-muted/20"
                        )}
                      >
                        {(() => {
                          const raw = task.description ?? "";
                          const isHtml = taskDescriptionLooksLikeHtml(raw);
                          const safeHtml = isHtml ? sanitizeTaskDescriptionHtml(raw) : "";
                          const plainLen = taskDescriptionPlainLength(raw);
                          const showToggle = plainLen > 180;
                          return (
                            <>
                              {raw ? (
                                isHtml ? (
                                  <SanitizedDescriptionHtml
                                    html={safeHtml}
                                    className={cn(
                                      "task-desc-html text-[15px] leading-[1.75] text-foreground/90 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm",
                                      !isDescriptionExpanded && "max-h-[5.5rem] overflow-hidden"
                                    )}
                                  />
                                ) : (
                                  <div
                                    className={cn(
                                      "whitespace-pre-wrap text-[15px] leading-[1.75] text-foreground/90",
                                      !isDescriptionExpanded && "max-h-[5.5rem] overflow-hidden"
                                    )}
                                  >
                                    {raw}
                                  </div>
                                )
                              ) : (
                                <span className="text-[15px] italic text-muted-foreground/75">
                                  No description yet
                                </span>
                              )}
                              {!!raw && showToggle && (
                                <button
                                  type="button"
                                  className="mt-4 text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-primary/90 hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDescriptionExpanded((prev) => !prev);
                                  }}
                                >
                                  {isDescriptionExpanded ? "Show less" : "Show more"}
                                </button>
                              )}
                            </>
                          );
                        })()}
                        <span className={cn("mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 transition-opacity", canEditAll && "opacity-0 group-hover:opacity-100")}>
                          {canEditAll ? (
                            <>
                              <Pencil className="h-3.5 w-3.5" /> Click to edit
                            </>
                          ) : null}
                        </span>
                      </div>
                      </>
                    )}
                    </div>

                    <div className={tdWorkSectionDivider} aria-hidden />

                    <div className={tdWorkSection}>
                      <TaskAttachmentsSection
                        taskId={taskId ?? undefined}
                        disabled={!canEditAll}
                      />
                    </div>

                    <div className={tdWorkSectionDivider} aria-hidden />

                    <div className={tdWorkSection}>
                    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 shadow-sm ring-1 ring-violet-500/15 dark:text-violet-400">
                          <CheckSquare className="h-4 w-4" aria-hidden />
                        </span>
                        <div>
                          <h3 className={tdMainSectionHeading}>Checklist</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground/75">
                            Subtasks, owners, and dates
                          </p>
                        </div>
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:max-w-[220px] sm:flex-none">
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                          <span>
                            {checklistStats.completed}/{checklistStats.total} done
                          </span>
                          <span className="tabular-nums text-foreground/85">{checklistStats.percent}%</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60 shadow-inner dark:bg-muted/30">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-[width] duration-500 ease-out"
                            style={{ width: `${checklistStats.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {checklist.map((item) => {
                        const expanded = expandedSubtaskId === item.id;
                        return (
                          <div key={item.id} className="space-y-0">
                            <SubtaskCompactRow
                              title={item.title}
                              completed={item.completed}
                              priority={item.priority ?? "MEDIUM"}
                              dueDate={item.dueDate}
                              assigneeId={item.assigneeId}
                              attachmentCount={attachmentCountBySubtaskId.get(item.id) ?? 0}
                              projectId={projectId}
                              organizationId={organizationId}
                              prefetchedOrgMembers={orgMembers}
                              knownMembers={subtaskMemberHints}
                              expanded={expanded}
                              disabled={!canEditWorkflowFields || updateSubtasksMutation.isPending}
                              onToggleComplete={() => {
                                const nextCompleted = !item.completed;
                                const doneId = defaultDoneStatusId(statuses);
                                const todoId = defaultTodoStatusId(statuses);
                                updateSubtasksMutation.mutate(
                                  checklist.map((i) =>
                                    i.id === item.id
                                      ? {
                                          ...i,
                                          completed: nextCompleted,
                                          statusId: nextCompleted
                                            ? (doneId ?? i.statusId)
                                            : (todoId ?? i.statusId),
                                        }
                                      : i
                                  )
                                );
                              }}
                              onRowClick={() => {
                                const isCurrent = expandedSubtaskId === item.id;
                                if (subtaskDraftDirty) {
                                  setPendingSubtaskExpandId(isCurrent ? null : item.id);
                                  setSubtaskCollapseConfirmOpen(true);
                                  return;
                                }
                                setExpandedSubtaskId(isCurrent ? null : item.id);
                                setSubtaskDraftDirty(false);
                              }}
                              onDelete={() => {
                                setSubtaskDeleteTarget({
                                  id: item.id,
                                  title: item.title || "Untitled subtask",
                                });
                              }}
                            />
                            {item.completed && subtaskCompletionMeta.get(item.id) && !expanded ? (
                              <p className="ml-9 mt-0.5 text-[11px] text-muted-foreground/80">
                                Completed by {subtaskCompletionMeta.get(item.id)?.userLabel} {"\u2022"}{" "}
                                {subtaskCompletionMeta.get(item.id)?.relative}
                              </p>
                            ) : null}
                            {expanded ? (
                              <SubtaskDetailPanel
                                draft={{
                                  id: item.id,
                                  title: item.title,
                                  description: item.description,
                                  completed: item.completed,
                                  assigneeId: item.assigneeId,
                                  dueDate: item.dueDate,
                                  priority: item.priority ?? "MEDIUM",
                                  statusId: item.statusId,
                                }}
                                projectId={projectId}
                                organizationId={organizationId}
                                taskId={taskId ?? undefined}
                                statuses={statuses}
                                prefetchedOrgMembers={orgMembers}
                                knownMembers={subtaskMemberHints}
                                persistAttachments
                                disabled={!canEditWorkflowFields}
                                saving={updateSubtasksMutation.isPending}
                                onSave={saveSubtaskDetail}
                                onDirtyChange={setSubtaskDraftDirty}
                                onCancel={() => {
                                  setSubtaskDraftDirty(false);
                                  setExpandedSubtaskId(null);
                                }}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                      <div className="flex gap-2 pt-4">
                        <div className="td-input-shell flex min-h-11 flex-1 items-center gap-2 rounded-2xl px-1 pl-3 transition-[box-shadow,ring-color] focus-within:ring-2 focus-within:ring-primary/20">
                          <Plus className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
                          <Input
                            placeholder="Add an item…"
                            value={newCheckItem}
                            disabled={!canEditWorkflowFields || updateSubtasksMutation.isPending}
                            onChange={(e) => setNewCheckItem(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newCheckItem.trim()) {
                                e.preventDefault();
                                appendSubtask(newCheckItem);
                              }
                            }}
                            className="h-10 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        </div>
                        <Button
                          type="button"
                          size="default"
                          className="h-11 shrink-0 rounded-xl px-6 font-semibold shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.45)] transition-[transform,box-shadow] hover:shadow-[0_8px_22px_-4px_hsl(var(--primary)/0.5)] active:scale-[0.98]"
                          disabled={!canEditWorkflowFields || !newCheckItem.trim() || updateSubtasksMutation.isPending}
                          onClick={() => appendSubtask(newCheckItem)}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                    </div>
                  </div>

                  <div className={tdMainSurface}>
                    <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/15 dark:text-sky-400">
                          <MessageSquare className="h-4 w-4" aria-hidden />
                        </span>
                        <div>
                          <h3 className={tdMainSectionHeading}>Comments</h3>
                          <p className="text-xs text-muted-foreground/75">Type @ to mention someone</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 sm:gap-4">
                      <div className="td-input-shell min-w-0 flex-1 rounded-2xl p-1 transition-[box-shadow,ring-color] focus-within:ring-2 focus-within:ring-primary/20">
                        <CommentInputWithMentions
                          value={commentText}
                          onChange={(v, ids) => {
                            setCommentText(v);
                            setCommentMentionedIds(ids);
                          }}
                          onSubmit={(text, ids) =>
                            addCommentMutation.mutate({ text, mentionedUserIds: ids })
                          }
                          placeholder="Write a comment… Enter to send, Shift+Enter for new line"
                          disabled={!taskId}
                          isSubmitting={addCommentMutation.isPending}
                          orgMembers={orgMembers}
                          currentUserId={currentUserId}
                          textareaRef={commentTextareaRef}
                          rows={2}
                          textareaClassName="min-h-[88px] rounded-xl border-0 bg-transparent px-3 py-3 text-[15px] leading-relaxed shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0"
                        />
                      </div>
                      <Button
                        size="icon"
                        className="h-12 w-12 shrink-0 self-end rounded-xl shadow-[0_6px_20px_-4px_hsl(var(--primary)/0.5)] ring-1 ring-primary/25 transition-all hover:scale-[1.02] hover:shadow-[0_10px_28px_-4px_hsl(var(--primary)/0.55)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
                        onClick={() =>
                          commentText.trim() &&
                          addCommentMutation.mutate({
                            text: commentText.trim(),
                            mentionedUserIds: commentMentionedIds,
                          })
                        }
                        disabled={!commentText.trim() || addCommentMutation.isPending}
                        aria-label="Send comment"
                      >
                        {addCommentMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {commentsLoading ? (
                      <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading comments…
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="td-inner-surface mt-6 flex min-h-[6.5rem] items-center justify-center rounded-xl border-dashed px-5 py-6 text-center text-sm leading-relaxed text-muted-foreground">
                        No comments yet. Be the first to share an update.
                      </p>
                    ) : (
                      <ul className="mt-8 space-y-4" role="list">
                        {comments.map((c: TaskComment) => (
                          <li
                            key={c.id}
                            className="td-inner-surface flex gap-4 rounded-2xl px-4 py-4 transition-shadow duration-200 hover:shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] dark:hover:bg-muted/20"
                          >
                            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background/80 shadow-sm">
                              <AvatarImage src={c.user?.avatarUrl} alt="" />
                              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                {(c.user?.fullName ?? c.user?.email ?? "?").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 pt-0.5">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <span className="text-sm font-semibold text-foreground">
                                  {c.user?.fullName ?? c.user?.email ?? "User"}
                                </span>
                                <time
                                  dateTime={c.createdAt}
                                  className="text-[11px] font-medium tabular-nums text-muted-foreground/65"
                                >
                                  {new Date(c.createdAt).toLocaleString(undefined, {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })}
                                </time>
                              </div>
                              <p className="mt-2.5 text-[15px] leading-[1.65] whitespace-pre-wrap text-foreground/88">
                                {c.body}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground opacity-60 transition-opacity hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                              onClick={() => deleteCommentMutation.mutate(c.id)}
                              disabled={deleteCommentMutation.isPending}
                              aria-label="Delete comment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className={tdMainSurface}>
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/15 dark:text-amber-400">
                          <Activity className="h-4 w-4" aria-hidden />
                        </span>
                        <div>
                          <h3 className={tdMainSectionHeading}>Activity</h3>
                          <p className="text-xs text-muted-foreground/75">Recent changes on this task</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 rounded-lg text-xs text-muted-foreground"
                        onClick={() => setActivityExpanded((e) => !e)}
                        aria-expanded={activityExpanded}
                        aria-controls="task-activity-content-main"
                      >
                        {activityExpanded ? "Collapse" : "Expand"}
                      </Button>
                    </div>
                    <div
                      id="task-activity-content-main"
                      className={cn(!activityExpanded && "hidden")}
                    >
                      {activityLogs.length === 0 ? (
                        <div className="td-inner-surface flex min-h-[5rem] flex-col items-center justify-center gap-2 rounded-xl border-dashed px-4 py-6 text-center">
                          <Activity className="h-8 w-8 text-muted-foreground/25" aria-hidden />
                          <p className="text-sm text-muted-foreground">No activity logged yet</p>
                        </div>
                      ) : (
                        <>
                        <ul className="grid gap-2 lg:grid-cols-2" role="list">
                          {paginatedActivityLogs.map((log: ActivityLog) => (
                            <li
                              key={log.id}
                              className="td-inner-surface flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:border-primary/20 hover:shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] dark:hover:bg-muted/20"
                            >
                              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                                <Activity className="h-3.5 w-3.5" aria-hidden />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] leading-snug text-foreground/85">
                                  {log.action}
                                  {log.metadata && typeof log.metadata === "object" && "details" in log.metadata
                                    ? ` — ${String((log.metadata as { details?: string }).details ?? "")}`
                                    : ""}
                                </p>
                                <time
                                  dateTime={log.createdAt}
                                  className="mt-1 block text-[11px] tabular-nums text-muted-foreground/65"
                                >
                                  {new Date(log.createdAt).toLocaleString(undefined, {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })}
                                </time>
                              </div>
                            </li>
                          ))}
                        </ul>
                        {activityLogs.length > ACTIVITY_PAGE_SIZE ? (
                          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3 dark:border-border/40">
                            <p className="text-xs text-muted-foreground">
                              Showing {(activityPage - 1) * ACTIVITY_PAGE_SIZE + 1}–
                              {Math.min(activityPage * ACTIVITY_PAGE_SIZE, activityLogs.length)} of{" "}
                              {activityLogs.length}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 rounded-lg px-2.5 text-xs"
                                disabled={activityPage <= 1}
                                onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                                aria-label="Previous activity page"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                Previous
                              </Button>
                              <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-muted-foreground">
                                {activityPage} / {activityPageCount}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 rounded-lg px-2.5 text-xs"
                                disabled={activityPage >= activityPageCount}
                                onClick={() =>
                                  setActivityPage((p) => Math.min(activityPageCount, p + 1))
                                }
                                aria-label="Next activity page"
                              >
                                Next
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right column: metadata modules */}
                <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-0 lg:self-start lg:border-l lg:border-[#E5E7EB] lg:pl-8 dark:lg:border-border/40">
                  <div className={tdSidebarSurface}>
                    <span className={tdSidebarHeading}>Assignee</span>
                    <DropdownMenu open={assigneeDropdownOpen} onOpenChange={(o) => { setAssigneeDropdownOpen(o); if (!o) setAssigneeSearch(""); }}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={!canEditAll}
                          className="flex w-full items-center gap-3 rounded-xl bg-white/85 px-4 py-3.5 text-left text-sm font-medium outline-none shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] transition-[box-shadow,background-color] hover:bg-white hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.09),0_4px_14px_-6px_rgba(15,23,42,0.1)] focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.06] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] dark:hover:bg-white/[0.1]"
                          aria-label="Change assignee"
                        >
                          {(() => {
                            const name = resolvedAssignee?.name ?? (task.assigneeId ? "User" : "Unassigned");
                            const online = resolvedAssignee?.lastSeenAt ? isOnline(resolvedAssignee.lastSeenAt) : false;
                            return (
                              <>
                                <div className="relative shrink-0">
                                  <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                                    <AvatarImage src={resolvedAssignee?.avatarUrl} />
                                    <AvatarFallback className="text-xs">
                                      {name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span
                                    className={cn(
                                      "absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-background",
                                      online ? "bg-emerald-500" : "bg-muted-foreground/50"
                                    )}
                                    title={online ? "Online" : "Offline"}
                                    aria-hidden
                                  />
                                </div>
                                <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                              </>
                            );
                          })()}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-72 p-0" sideOffset={6} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                        <div className="p-3">
                          <DropdownMenuLabel className="px-0 pb-2 text-xs font-semibold">Reassign</DropdownMenuLabel>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                            <Input
                              placeholder="Search members..."
                              value={assigneeSearch}
                              onChange={(e) => setAssigneeSearch(e.target.value)}
                              className="h-9 pl-8 text-xs"
                              aria-label="Search members"
                            />
                          </div>
                        </div>
                        <DropdownMenuSeparator />
                        <div className="max-h-72 overflow-y-auto p-1">
                          <DropdownMenuItem
                            onSelect={(e) => { e.preventDefault(); assigneeMutation.mutate(null); setAssigneeDropdownOpen(false); }}
                            className="rounded-md text-xs"
                          >
                            <UserRoundX className="mr-2 h-3.5 w-3.5" />
                            Unassigned
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {assigneeFilteredMembers.map((m) => {
                            const checked = m.userId === task.assigneeId;
                            const online = m.user?.lastSeenAt ? isOnline(m.user.lastSeenAt) : false;
                            const displayName = m.user?.fullName ?? m.user?.email ?? "User";
                            return (
                              <DropdownMenuItem
                                key={m.id}
                                onSelect={(e) => { e.preventDefault(); assigneeMutation.mutate(m.userId); setAssigneeDropdownOpen(false); }}
                                className="rounded-md py-2"
                              >
                                <div className="flex w-full items-center gap-2.5">
                                  <div className="relative shrink-0">
                                    <Avatar className="h-7 w-7">
                                      <AvatarImage src={m.user?.avatarUrl} />
                                      <AvatarFallback className="text-[10px]">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span
                                      className={cn(
                                        "absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-background",
                                        online ? "bg-emerald-500" : "bg-muted-foreground/50"
                                      )}
                                      aria-hidden
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium">{displayName}</p>
                                    <p className="truncate text-[11px] text-muted-foreground">{m.user?.email ?? ""}</p>
                                  </div>
                                  <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors", checked ? "border-primary bg-primary text-white" : "border-border bg-background text-transparent")} aria-label={checked ? "Selected" : "Not selected"}>
                                    <Check className="h-3 w-3" />
                                  </span>
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                          {assigneeFilteredMembers.length === 0 && (
                            <div className="px-2 py-3 text-center text-xs text-muted-foreground">No matching members</div>
                          )}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className={tdSidebarSurface}>
                    <span className={tdSidebarHeading}>Schedule</span>
                    <div className="space-y-3">
                      <Label className="mb-0 block text-xs font-medium text-[#6B7280]" htmlFor="task-detail-due-date">
                        Due date
                      </Label>

                      {canEditAll ? (
                        <label
                          htmlFor="task-detail-due-date"
                          className={cn(
                            "relative block cursor-pointer",
                            (updateMutation.isPending || !canEditAll) && "cursor-default"
                          )}
                        >
                          <Input
                            id="task-detail-due-date"
                            type="date"
                            disabled={updateMutation.isPending}
                            value={taskDueDateToInputValue(task.dueDate)}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateMutation.mutate({ dueDate: v ? v : null });
                            }}
                            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                            aria-label="Due date"
                          />
                          <div
                            className={cn(
                              "pointer-events-none flex h-11 w-full items-center gap-3 rounded-xl border px-3.5 transition-colors",
                              isOverdue && task.dueDate
                                ? "border-[#FECACA] bg-[#FEF2F2]"
                                : "border-[#E5E7EB] bg-white dark:border-border dark:bg-white/[0.06]"
                            )}
                          >
                            <Calendar className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden />
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-sm font-medium",
                                task.dueDate ? "text-[#111827] dark:text-foreground" : "text-[#6B7280]"
                              )}
                            >
                              {formatTaskDueDatePrimary(task.dueDate)}
                            </span>
                            <Calendar className="h-4 w-4 shrink-0 text-[#6B7280]/70" aria-hidden />
                          </div>
                        </label>
                      ) : (
                        <div
                          className={cn(
                            "flex h-11 w-full items-center gap-3 rounded-xl border px-3.5",
                            isOverdue && task.dueDate
                              ? "border-[#FECACA] bg-[#FEF2F2]"
                              : "border-[#E5E7EB] bg-white dark:border-border dark:bg-white/[0.06]"
                          )}
                        >
                          <Calendar className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#111827] dark:text-foreground">
                            {task.dueDate ? formatTaskDueDatePrimary(task.dueDate) : "No date selected"}
                          </span>
                        </div>
                      )}

                      {task.dueDate ? (
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-[#6B7280]">{formatTaskDueDateHelper(task.dueDate)}</p>
                          {canEditAll ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 shrink-0 rounded-lg px-2 text-xs font-normal text-[#6B7280] hover:text-[#111827]"
                              disabled={updateMutation.isPending}
                              onClick={() => updateMutation.mutate({ dueDate: null })}
                            >
                              Clear
                            </Button>
                          ) : null}
                        </div>
                      ) : !canEditAll ? (
                        <p className="text-xs text-[#6B7280]">No date selected</p>
                      ) : null}

                      {isOverdue && task.dueDate ? (
                        <span className="inline-flex w-fit items-center rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-[11px] font-semibold text-[#DC2626]">
                          Overdue
                        </span>
                      ) : null}
                    </div>

                    <div className={tdSubtleDivider} />

                    <div className="space-y-2">
                      <span className="block text-xs font-medium text-muted-foreground/75">Task status</span>
                      {selectedStatus ? (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={!canEditWorkflowFields || updateMutation.isPending}
                              className="h-11 w-full justify-between rounded-xl border-0 bg-white/85 px-4 text-sm font-semibold tracking-tight text-foreground shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] transition-[background-color,box-shadow] hover:bg-white hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.12),0_4px_12px_-6px_rgba(15,23,42,0.12)] dark:bg-white/[0.06] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] dark:hover:bg-white/[0.1]"
                              aria-label="Change task status"
                            >
                              <span className="flex items-center gap-2.5">
                                <span
                                  className={cn(
                                    "h-2.5 w-2.5 rounded-full shadow-sm ring-2 ring-white/80 dark:ring-black/40",
                                    statusColorById.get(selectedStatus.id) ?? STATUS_DOT_FALLBACK[0]
                                  )}
                                />
                                <span>{selectedStatus.name}</span>
                              </span>
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            className={cn(
                              "w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px] p-1",
                              TASK_MODAL_DROPDOWN_Z
                            )}
                            sideOffset={6}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            {statuses.map((s) => {
                              const isCurrent = s.id === selectedStatus?.id;
                              return (
                                <DropdownMenuItem
                                  key={s.id}
                                  disabled={updateMutation.isPending}
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    handleFieldChange("statusId", s.id);
                                  }}
                                  className="rounded-lg text-sm"
                                >
                                  <span
                                    className={cn(
                                      "mr-2 h-2.5 w-2.5 shrink-0 rounded-full",
                                      statusColorById.get(s.id) ?? STATUS_DOT_FALLBACK[0]
                                    )}
                                    aria-hidden
                                  />
                                  <span className="flex-1">{s.name}</span>
                                  {isCurrent ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>

                    <div className={tdSubtleDivider} />

                    <div className="space-y-2">
                      <span className="block text-xs font-medium text-muted-foreground/75">Priority</span>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!canEditWorkflowFields || updateMutation.isPending}
                            className={cn(
                              "h-11 w-full justify-between rounded-xl border-0 px-4 text-sm font-semibold tracking-tight text-foreground transition-[background-color,box-shadow]",
                              PRIORITY_SIDEBAR_SHELL[selectedPriority.value] ?? PRIORITY_SIDEBAR_SHELL.MEDIUM
                            )}
                            aria-label="Change task priority"
                          >
                            <span className="flex items-center gap-2.5">
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 rounded-full shadow-sm ring-2 ring-white/80 dark:ring-black/40",
                                  selectedPriority.color
                                )}
                              />
                              <span>{selectedPriority.label}</span>
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className={cn(
                            "w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px] p-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-150",
                            TASK_MODAL_DROPDOWN_Z
                          )}
                          sideOffset={6}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {PRIORITIES.map((p) => {
                            const isCurrent = p.value === selectedPriority.value;
                            return (
                              <DropdownMenuItem
                                key={p.value}
                                disabled={updateMutation.isPending}
                                onSelect={(event) => {
                                  event.preventDefault();
                                  handlePriorityChange(p.value);
                                }}
                                className="rounded-lg text-sm"
                              >
                                <span
                                  className={cn("mr-2 h-2.5 w-2.5 shrink-0 rounded-full", p.color)}
                                  aria-hidden
                                />
                                <span className="flex-1">{p.label}</span>
                                {isCurrent ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                  </div>

                  <div className={tdSidebarSurface}>
                    <span className={tdSidebarHeading}>Planning</span>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80">
                        <Hash className="h-3.5 w-3.5 opacity-60" aria-hidden /> Story points
                      </Label>
                    {isEditingStoryPoints ? (
                      <Input
                        ref={storyPointsInputRef}
                        type="number"
                        min={0}
                        max={100}
                        value={editingStoryPointsValue}
                        onChange={(e) => setEditingStoryPointsValue(e.target.value)}
                        onBlur={commitStoryPointsEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitStoryPointsEdit();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            cancelStoryPointsEdit();
                          }
                        }}
                        className="mt-1 h-11 w-full max-w-[7.5rem] rounded-xl border-0 bg-white/90 px-3 font-mono text-sm shadow-[inset_0_1px_2px_rgba(15,23,42,0.04),inset_0_0_0_1px_rgba(15,23,42,0.08)] transition-shadow focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35),0_0_0_3px_hsl(var(--primary)/0.12)] focus-visible:ring-0 dark:bg-white/[0.06] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                        aria-label="Edit story points"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={canEditAll ? startStoryPointsEdit : undefined}
                        disabled={!canEditAll}
                        className="group mt-1 flex w-full items-center justify-between gap-2 rounded-xl bg-white/70 px-4 py-3 text-left shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] transition-all hover:bg-white hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08),0_4px_14px_-8px_rgba(15,23,42,0.08)] dark:bg-white/[0.05] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] dark:hover:bg-white/[0.09]"
                      >
                        <span className="flex items-center gap-2">
                          {task.storyPoints != null && task.storyPoints >= 0 ? (
                            <Badge variant="secondary" className="rounded-lg px-2 py-0.5 font-mono text-sm tabular-nums font-medium shadow-none">
                              {task.storyPoints}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not set</span>
                          )}
                        </span>
                        <Pencil className="h-4 w-4 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    )}
                    </div>
                  </div>
                  <div className={tdSidebarSurface}>
                    <span className={tdSidebarHeading}>Tags</span>
                    <div>
                    <Label className="sr-only">Tags</Label>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {tagsList.map((tag) => (
                        <span
                          key={tag.name}
                          className="inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-1 text-xs font-medium text-foreground shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            borderColor: "transparent",
                            boxShadow: `inset 0 0 0 1px ${tag.color}40`,
                          }}
                        >
                          <span className="min-w-0 truncate max-w-[120px]">{tag.name}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(tag.name)}
                            disabled={!canEditAll || updateMutation.isPending}
                            className="shrink-0 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-transparent focus:ring-primary"
                            aria-label={`Remove tag ${tag.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                      <DropdownMenu open={addTagOpen} onOpenChange={setAddTagOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!canEditAll || updateMutation.isPending}
                            className="h-8 gap-1.5 rounded-full border-dashed text-xs"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add tag
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="w-72 p-3"
                          sideOffset={6}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuLabel className="px-0 pt-0 text-xs font-semibold">
                            New tag
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <div className="space-y-3 pt-2">
                            <Input
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              placeholder="Tag name"
                              className="h-9 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addTag();
                                }
                              }}
                              aria-label="Tag name"
                            />
                            <div className="flex flex-wrap gap-2" role="group" aria-label="Tag color">
                              {TAG_COLORS.map((hex) => (
                                <button
                                  key={hex}
                                  type="button"
                                  onClick={() => setNewTagColor(hex)}
                                  className="h-6 w-6 rounded-full border-2 transition-colors"
                                  style={{
                                    backgroundColor: hex,
                                    borderColor: newTagColor === hex ? "hsl(var(--foreground))" : "transparent",
                                  }}
                                  aria-label={`Pick color ${hex}`}
                                  aria-pressed={newTagColor === hex}
                                />
                              ))}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 w-full text-xs"
                              onClick={addTag}
                              disabled={!newTagName.trim()}
                            >
                              Add tag
                            </Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    </div>
                  </div>
                  {isOwner && (
                    <div className={tdSidebarSurface}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deleteTaskMutation.isPending}
                        onClick={() => setDeleteConfirmOpen(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete task
                      </Button>
                    </div>
                  )}
                </aside>
              </div>
            </div>

            <div className="td-modal-footer flex shrink-0 flex-wrap justify-end gap-x-8 gap-y-1 px-6 py-3.5 text-[11px] font-medium tracking-wide text-muted-foreground/60 sm:px-8">
              {task.createdAt && (
                <span>Created {formatRelativeTime(task.createdAt) || new Date(task.createdAt).toLocaleString()}</span>
              )}
              {task.updatedAt && (
                <span>Updated {formatRelativeTime(task.updatedAt) || new Date(task.updatedAt).toLocaleString()}</span>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={deleteConfirmOpen}
      onOpenChange={setDeleteConfirmOpen}
      title="Delete task"
      description={
        task
          ? `Permanently delete "${task.title}"? This cannot be undone.`
          : undefined
      }
      confirmLabel="Delete"
      variant="destructive"
      loading={deleteTaskMutation.isPending}
      onConfirm={() => deleteTaskMutation.mutate()}
    />

    <ConfirmDialog
      open={Boolean(subtaskDeleteTarget)}
      onOpenChange={(next) => {
        if (!next) setSubtaskDeleteTarget(null);
      }}
      title="Remove subtask?"
      description={
        subtaskDeleteTarget
          ? `Remove "${subtaskDeleteTarget.title}" from this checklist? Subtask attachments remain stored unless deleted separately.`
          : undefined
      }
      confirmLabel="Remove"
      variant="destructive"
      loading={updateSubtasksMutation.isPending}
      onConfirm={confirmRemoveSubtask}
    />

    <ConfirmDialog
      open={subtaskCollapseConfirmOpen}
      onOpenChange={(next) => {
        setSubtaskCollapseConfirmOpen(next);
        if (!next) setPendingSubtaskExpandId(null);
      }}
      title="Discard unsaved changes?"
      description="Title, description, and other field edits have not been saved. Attachments already uploaded will remain."
      confirmLabel="Discard"
      variant="destructive"
      onConfirm={() => {
        setSubtaskDraftDirty(false);
        setExpandedSubtaskId(pendingSubtaskExpandId);
        setPendingSubtaskExpandId(null);
      }}
    />
    </>
  );
}

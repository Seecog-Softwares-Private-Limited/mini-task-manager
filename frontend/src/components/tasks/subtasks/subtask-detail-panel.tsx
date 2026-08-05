"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubtaskAssigneeSelector } from "@/components/tasks/subtask-assignee-selector";
import { SubtaskDueDatePicker } from "@/components/tasks/subtask-due-date-picker";
import { SubtaskStatusSelector } from "@/components/tasks/subtask-status-selector";
import {
  SubtaskPrioritySelector,
  resolveSubtaskPriority,
  type SubtaskPriority,
} from "@/components/tasks/subtask-priority-selector";
import {
  SubtaskAttachmentsSection,
  type PendingSubtaskAttachment,
} from "@/components/tasks/subtasks/subtask-attachments-section";
import { getClipboardImageFile, validateTaskPasteImageFile } from "@/lib/task-clipboard-image";
import { normalizePastedScreenshotFile } from "@/lib/screenshot-filename";
import { resolveSubtaskStatus, subtaskWithStatus, type SubtaskStatus } from "@/lib/subtask-status";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { TaskSubtask, OrgMember } from "@/types/api";
import { generateClientId } from "@/lib/generate-client-id";
import { uploadEntityAttachment } from "@/services/api/entity-attachments.api";
import { useQueryClient } from "@tanstack/react-query";
import { parseApiError } from "@/services/api/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SUBTASK_TITLE_MAX_LENGTH, clampSubtaskTitle } from "@/lib/subtask-limits";
import { cn } from "@/lib/utils";
import { getSubtaskAssigneeIds, subtaskAssigneesEqual, withSubtaskAssignees } from "@/lib/subtask-assignees";
import { MessageSquare, StickyNote } from "lucide-react";

type MemberHint = { id: string; name: string; email?: string; avatarUrl?: string };

function formatDailyDueSummary(dueDate?: string, dueTime?: string): string {
  const timePart = dueTime?.trim() ? ` · ${dueTime.trim()}` : "";
  if (!dueDate?.trim()) {
    return dueTime?.trim() ? `Due ${dueTime.trim()}` : "No due date";
  }
  const parsed = new Date(`${dueDate.trim()}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return `Due ${dueDate}${timePart}`;
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const dayMs = 24 * 60 * 60 * 1000;
  if (day.getTime() === today.getTime()) return `Due today${timePart}`;
  if (day.getTime() === today.getTime() + dayMs) return `Due tomorrow${timePart}`;
  return `Due ${parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" })}${timePart}`;
}

function formatDailyStatusLabel(status: SubtaskStatus): string {
  switch (status) {
    case "DONE":
      return "Done";
    case "IN_PROGRESS":
      return "In progress";
    default:
      return "To Do";
  }
}

export type SubtaskDraft = Pick<
  TaskSubtask,
  | "id"
  | "title"
  | "description"
  | "completed"
  | "assigneeId"
  | "assigneeIds"
  | "dueDate"
  | "dueTime"
  | "notifyMinutesBefore"
  | "status"
  | "priority"
  | "requireLocation"
  | "completionRecord"
>;

interface SubtaskDetailPanelProps {
  draft: SubtaskDraft;
  projectId: string;
  organizationId?: string;
  taskId?: string;
  prefetchedOrgMembers?: OrgMember[];
  knownMembers?: MemberHint[];
  taskAssigneesOnly?: boolean;
  persistAttachments?: boolean;
  pendingAttachments?: PendingSubtaskAttachment[];
  onPendingAttachmentsChange?: (items: PendingSubtaskAttachment[]) => void;
  disabled?: boolean;
  /** View-only: fields read-only, attachments viewable, no save. */
  readOnly?: boolean;
  /** Owner/admin or task/subtask creator may change require location. */
  canEditRequireLocation?: boolean;
  saving?: boolean;
  onSave: (draft: SubtaskDraft) => void;
  /** Sync draft to parent form/state while editing (e.g. create-task flow). */
  onDraftChange?: (draft: SubtaskDraft) => void;
  /** Notifies parent when unsaved field edits exist (edit-task flow). */
  onDirtyChange?: (dirty: boolean) => void;
  onCancel?: () => void;
  /** Opens threaded checklist comments (planner notes). */
  onOpenNotes?: () => void;
  /** Preview text when notes exist on this checklist item. */
  notePreview?: string | null;
  /**
   * Daily recurring run: hide setup fields; completion ritual only.
   * Title/priority/assignees/due/location stay on the series template.
   */
  dailyRunMode?: boolean;
  /** Optional assignee names for the daily summary strip. */
  assigneeLabels?: string[];
}

export function SubtaskDetailPanel({
  draft: initialDraft,
  projectId,
  organizationId,
  taskId,
  prefetchedOrgMembers,
  knownMembers,
  taskAssigneesOnly,
  persistAttachments = true,
  pendingAttachments = [],
  onPendingAttachmentsChange,
  disabled,
  readOnly,
  canEditRequireLocation = false,
  saving,
  onSave,
  onDraftChange,
  onDirtyChange,
  onCancel,
  onOpenNotes,
  notePreview,
  dailyRunMode = false,
  assigneeLabels,
}: SubtaskDetailPanelProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = React.useState(initialDraft);
  const [discardConfirmOpen, setDiscardConfirmOpen] = React.useState(false);
  const baselineRef = React.useRef(initialDraft);
  const descriptionRef = React.useRef<HTMLTextAreaElement>(null);
  const attachmentQueryKey = ["entity-attachments", "SUBTASK", initialDraft.id];
  const fieldsDisabled = Boolean(disabled || readOnly);
  const locationDisabled = Boolean(fieldsDisabled || !canEditRequireLocation);
  const attachmentsManageDisabled = Boolean(disabled || readOnly);

  const draftsEqual = React.useCallback((a: SubtaskDraft, b: SubtaskDraft) => {
    return (
      a.title === b.title &&
      (a.description ?? "") === (b.description ?? "") &&
      a.completed === b.completed &&
      subtaskAssigneesEqual(a, b) &&
      a.dueDate === b.dueDate &&
      (a.dueTime ?? "") === (b.dueTime ?? "") &&
      (a.notifyMinutesBefore ?? null) === (b.notifyMinutesBefore ?? null) &&
      resolveSubtaskStatus(a) === resolveSubtaskStatus(b) &&
      resolveSubtaskPriority(a.priority) === resolveSubtaskPriority(b.priority) &&
      Boolean(a.requireLocation) === Boolean(b.requireLocation)
    );
  }, []);

  React.useEffect(() => {
    const normalized = {
      ...initialDraft,
      title: clampSubtaskTitle(initialDraft.title),
      status: resolveSubtaskStatus(initialDraft),
      completed: resolveSubtaskStatus(initialDraft) === "DONE",
      priority: resolveSubtaskPriority(initialDraft.priority),
      requireLocation: initialDraft.requireLocation === true,
    };
    // Only reset from props when switching subtasks or when local draft is clean.
    const dirty = !draftsEqual(draft, baselineRef.current);
    if (initialDraft.id !== baselineRef.current.id || !dirty) {
      setDraft(normalized);
      baselineRef.current = normalized;
    }
    // Intentionally omit `draft` from deps — we only react to parent prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialDraft.id,
    initialDraft.title,
    initialDraft.description,
    initialDraft.completed,
    initialDraft.assigneeId,
    initialDraft.assigneeIds,
    initialDraft.dueDate,
    initialDraft.dueTime,
    initialDraft.notifyMinutesBefore,
    initialDraft.status,
    initialDraft.priority,
    initialDraft.requireLocation,
    draftsEqual,
  ]);

  React.useEffect(() => {
    onDirtyChange?.(!draftsEqual(draft, baselineRef.current));
  }, [draft, draftsEqual, onDirtyChange]);

  const update = <K extends keyof SubtaskDraft>(key: K, value: SubtaskDraft[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      onDraftChange?.(next);
      return next;
    });
  };

  const handleStatusChange = (status: SubtaskStatus) => {
    setDraft((prev) => {
      const next = subtaskWithStatus(prev, status, {
        id: user?.id ?? "",
        name: user?.fullName ?? user?.email ?? "",
      });
      onDraftChange?.(next);
      return next;
    });
  };

  const handleDescriptionPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const image = getClipboardImageFile(event.clipboardData);
    if (!image) return;
    event.preventDefault();
    const err = validateTaskPasteImageFile(image);
    if (err) {
      toast({ title: "Paste failed", description: err, variant: "error" });
      return;
    }
    const file = normalizePastedScreenshotFile(image);

    if (persistAttachments) {
      void uploadEntityAttachment("SUBTASK", draft.id, file, taskId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: attachmentQueryKey });
          toast({ title: "Screenshot attached", variant: "success" });
        })
        .catch((uploadErr) => {
          toast({
            title: "Paste upload failed",
            description: parseApiError(uploadErr),
            variant: "error",
          });
        });
      return;
    }

    if (!onPendingAttachmentsChange) return;
    const clientId = generateClientId();
    const previewUrl = URL.createObjectURL(file);
    onPendingAttachmentsChange([
      ...pendingAttachments,
      { clientId, file, previewUrl },
    ]);
  };

  const status = resolveSubtaskStatus(draft);
  const isDone = status === "DONE";
  const assigneeSummary =
    assigneeLabels && assigneeLabels.length > 0
      ? assigneeLabels.length === 1
        ? assigneeLabels[0]
        : `${assigneeLabels[0]} +${assigneeLabels.length - 1}`
      : getSubtaskAssigneeIds(draft).length > 0
        ? `${getSubtaskAssigneeIds(draft).length} assigned`
        : "Unassigned";
  const dailySummary = `${formatDailyStatusLabel(status)} · ${formatDailyDueSummary(draft.dueDate, draft.dueTime)} · ${assigneeSummary}`;

  const commitDraft = (next: SubtaskDraft = draft) => {
    onSave({
      ...next,
      title: clampSubtaskTitle(next.title.trim() || initialDraft.title),
      status: resolveSubtaskStatus(next),
      completed: resolveSubtaskStatus(next) === "DONE",
      priority: resolveSubtaskPriority(next.priority),
      requireLocation: next.requireLocation === true,
    });
  };

  const markDone = () => {
    const next = subtaskWithStatus(draft, "DONE", {
      id: user?.id ?? "",
      name: user?.fullName ?? user?.email ?? "",
    });
    setDraft(next);
    onDraftChange?.(next);
    commitDraft(next);
  };

  if (dailyRunMode) {
    return (
      <div className="mt-2 space-y-4 rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.04] to-background p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground">
            Status & schedule
          </Label>
          <p className="text-sm font-semibold leading-snug text-foreground">{dailySummary}</p>
        </div>

        {onOpenNotes && taskId ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 w-full justify-start gap-2"
            onClick={onOpenNotes}
            disabled={Boolean(disabled)}
          >
            <StickyNote className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {notePreview?.trim() ? notePreview.trim() : "Add a note"}
            </span>
          </Button>
        ) : null}

        <SubtaskAttachmentsSection
          subtaskId={draft.id}
          taskId={taskId}
          persist={persistAttachments}
          pendingAttachments={pendingAttachments}
          onPendingChange={onPendingAttachmentsChange}
          disabled={attachmentsManageDisabled}
          sectionLabel="Proof"
          emptyLabel="No proof attached yet"
          persistHelpText="Optional photo or file before you mark done."
          collapseEmpty
        />

        <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={saving}
            >
              Close
            </Button>
          ) : null}
          {!readOnly ? (
            <Button
              type="button"
              size="sm"
              className="min-w-[7.5rem]"
              disabled={disabled || saving || isDone}
              onClick={markDone}
            >
              {saving ? "Saving…" : isDone ? "Done" : "Mark done"}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-4 rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.04] to-background p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold text-muted-foreground">Title</Label>
          <span
            className={cn(
              "text-[11px] tabular-nums",
              draft.title.length >= SUBTASK_TITLE_MAX_LENGTH
                ? "font-medium text-destructive"
                : "text-muted-foreground"
            )}
            aria-live="polite"
          >
            {draft.title.length}/{SUBTASK_TITLE_MAX_LENGTH}
          </span>
        </div>
        <Input
          value={draft.title}
          maxLength={SUBTASK_TITLE_MAX_LENGTH}
          onChange={(e) => update("title", clampSubtaskTitle(e.target.value))}
          disabled={fieldsDisabled}
          className="h-10 bg-background/90"
          placeholder="Subtask title"
          aria-describedby="subtask-title-limit-hint"
        />
        <p id="subtask-title-limit-hint" className="text-[11px] text-muted-foreground">
          Maximum {SUBTASK_TITLE_MAX_LENGTH} characters.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
        <Textarea
          ref={descriptionRef}
          value={draft.description ?? ""}
          onChange={(e) => update("description", e.target.value)}
          onPaste={handleDescriptionPaste}
          disabled={fieldsDisabled}
          rows={5}
          className="min-h-[120px] resize-y bg-background/90 text-sm leading-relaxed"
          placeholder="Add a description…"
        />
      </div>

      {onOpenNotes && taskId ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full justify-start gap-2"
          onClick={onOpenNotes}
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {notePreview?.trim()
              ? `Comments · ${notePreview.trim()}`
              : "Comments & notes"}
          </span>
        </Button>
      ) : null}

      <SubtaskAttachmentsSection
        subtaskId={draft.id}
        taskId={taskId}
        persist={persistAttachments}
        pendingAttachments={pendingAttachments}
        onPendingChange={onPendingAttachmentsChange}
        disabled={attachmentsManageDisabled}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="min-w-[160px] flex-1">
            <SubtaskStatusSelector
              value={resolveSubtaskStatus(draft)}
              completed={draft.completed}
              onChange={handleStatusChange}
              disabled={fieldsDisabled}
              variant="field"
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <SubtaskPrioritySelector
              value={resolveSubtaskPriority(draft.priority)}
              onChange={(priority: SubtaskPriority) => update("priority", priority)}
              disabled={fieldsDisabled}
              variant="field"
            />
          </div>
        </div>
        <SubtaskDueDatePicker
          value={draft.dueDate}
          dueTime={draft.dueTime}
          completed={draft.completed}
          onChange={(dueDate, nextDueTime) => {
            setDraft((prev) => {
              const next = {
                ...prev,
                dueDate,
                dueTime: nextDueTime,
                ...(nextDueTime
                  ? {}
                  : { notifyMinutesBefore: undefined }),
              };
              onDraftChange?.(next);
              return next;
            });
          }}
          disabled={fieldsDisabled}
        />
        {draft.dueTime ? (
          <div className="w-full min-w-[180px] flex-1 sm:max-w-[240px]">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Notify checklist members
            </label>
            <select
              value={
                draft.notifyMinutesBefore == null
                  ? ""
                  : String(draft.notifyMinutesBefore)
              }
              disabled={fieldsDisabled}
              onChange={(e) => {
                const raw = e.target.value;
                update(
                  "notifyMinutesBefore",
                  raw === "" ? undefined : Number(raw)
                );
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Off</option>
              <option value="0">At due time</option>
              <option value="5">5 minutes before</option>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
              <option value="120">2 hours before</option>
            </select>
          </div>
        ) : null}
        <SubtaskAssigneeSelector
          projectId={projectId}
          organizationId={organizationId}
          prefetchedOrgMembers={prefetchedOrgMembers}
          knownMembers={knownMembers}
          taskAssigneesOnly={taskAssigneesOnly}
          value={getSubtaskAssigneeIds(draft)}
          onChange={(assigneeIds) =>
            setDraft((prev) => {
              const next = withSubtaskAssignees(prev, assigneeIds);
              onDraftChange?.(next);
              return next;
            })
          }
          disabled={fieldsDisabled}
        />
      </div>

      <label
        className={cn(
          "flex items-start gap-2 rounded-md border border-border/50 bg-muted/10 px-2.5 py-2",
          locationDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
        )}
      >
        <input
          type="checkbox"
          className="mt-0.5 h-3.5 w-3.5 rounded border-border"
          checked={draft.requireLocation === true}
          disabled={locationDisabled}
          onChange={(e) => update("requireLocation", e.target.checked)}
        />
        <span className="space-y-0.5">
          <span className="block text-[12px] font-medium text-foreground">Require location</span>
          <span className="block text-[10px] text-muted-foreground">
            {canEditRequireLocation
              ? "Ask for GPS when this subtask is completed"
              : "Only the owner or creator can change this"}
          </span>
        </span>
      </label>

      <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
        {readOnly ? (
          onCancel ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Close
            </Button>
          ) : null
        ) : (
          <>
            {onCancel ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!draftsEqual(draft, baselineRef.current)) {
                    setDiscardConfirmOpen(true);
                    return;
                  }
                  onCancel();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={
                disabled ||
                saving ||
                !draft.title.trim() ||
                draft.title.length > SUBTASK_TITLE_MAX_LENGTH
              }
              onClick={() => commitDraft()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={discardConfirmOpen}
        onOpenChange={setDiscardConfirmOpen}
        title="Discard unsaved changes?"
        description="Title, description, and other field edits have not been saved. Attachments already uploaded will remain."
        confirmLabel="Discard"
        variant="destructive"
        icon="warning"
        elevated
        onConfirm={() => {
          setDraft(baselineRef.current);
          onDirtyChange?.(false);
          onCancel?.();
        }}
      />
    </div>
  );
}

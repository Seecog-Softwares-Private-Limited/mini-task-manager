"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubtaskAssigneeSelector } from "@/components/tasks/subtask-assignee-selector";
import { SubtaskDueDatePicker } from "@/components/tasks/subtask-due-date-picker";
import { SubtaskPrioritySelector } from "@/components/tasks/subtask-priority-selector";
import {
  SubtaskStatusSelector,
  resolveSubtaskStatusId,
} from "@/components/tasks/subtask-status-selector";
import {
  SubtaskAttachmentsSection,
  type PendingSubtaskAttachment,
} from "@/components/tasks/subtasks/subtask-attachments-section";
import { getClipboardImageFile, validateTaskPasteImageFile } from "@/lib/task-clipboard-image";
import { normalizePastedScreenshotFile } from "@/lib/screenshot-filename";
import { useToast } from "@/components/ui/use-toast";
import type { TaskSubtask, WorkflowStatus, OrgMember } from "@/types/api";
import { generateClientId } from "@/lib/generate-client-id";
import { uploadEntityAttachment } from "@/services/api/entity-attachments.api";
import { useQueryClient } from "@tanstack/react-query";
import { parseApiError } from "@/services/api/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type MemberHint = { id: string; name: string; email?: string; avatarUrl?: string };

export type SubtaskDraft = Pick<
  TaskSubtask,
  "id" | "title" | "description" | "completed" | "assigneeId" | "dueDate" | "priority" | "statusId"
>;

interface SubtaskDetailPanelProps {
  draft: SubtaskDraft;
  projectId: string;
  organizationId?: string;
  taskId?: string;
  statuses?: WorkflowStatus[];
  prefetchedOrgMembers?: OrgMember[];
  knownMembers?: MemberHint[];
  persistAttachments?: boolean;
  pendingAttachments?: PendingSubtaskAttachment[];
  onPendingAttachmentsChange?: (items: PendingSubtaskAttachment[]) => void;
  disabled?: boolean;
  /** View-only: fields read-only, attachments viewable, no save. */
  readOnly?: boolean;
  saving?: boolean;
  onSave: (draft: SubtaskDraft) => void;
  /** Sync draft to parent form/state while editing (e.g. create-task flow). */
  onDraftChange?: (draft: SubtaskDraft) => void;
  /** Notifies parent when unsaved field edits exist (edit-task flow). */
  onDirtyChange?: (dirty: boolean) => void;
  onCancel?: () => void;
}

export function SubtaskDetailPanel({
  draft: initialDraft,
  projectId,
  organizationId,
  taskId,
  statuses = [],
  prefetchedOrgMembers,
  knownMembers,
  persistAttachments = true,
  pendingAttachments = [],
  onPendingAttachmentsChange,
  disabled,
  readOnly,
  saving,
  onSave,
  onDraftChange,
  onDirtyChange,
  onCancel,
}: SubtaskDetailPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = React.useState(initialDraft);
  const [discardConfirmOpen, setDiscardConfirmOpen] = React.useState(false);
  const baselineRef = React.useRef(initialDraft);
  const descriptionRef = React.useRef<HTMLTextAreaElement>(null);
  const attachmentQueryKey = ["entity-attachments", "SUBTASK", initialDraft.id];
  const fieldsDisabled = Boolean(disabled || readOnly);
  const attachmentsManageDisabled = Boolean(disabled || readOnly);

  const draftsEqual = React.useCallback((a: SubtaskDraft, b: SubtaskDraft) => {
    return (
      a.title === b.title &&
      (a.description ?? "") === (b.description ?? "") &&
      a.completed === b.completed &&
      a.assigneeId === b.assigneeId &&
      a.dueDate === b.dueDate &&
      (a.priority ?? "MEDIUM") === (b.priority ?? "MEDIUM") &&
      a.statusId === b.statusId
    );
  }, []);

  // Reset local draft when switching subtasks or when parent syncs saved data.
  React.useEffect(() => {
    setDraft(initialDraft);
    baselineRef.current = initialDraft;
  }, [
    initialDraft.id,
    initialDraft.title,
    initialDraft.description,
    initialDraft.completed,
    initialDraft.assigneeId,
    initialDraft.dueDate,
    initialDraft.priority,
    initialDraft.statusId,
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

  return (
    <div className="mt-2 space-y-4 rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.04] to-background p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">Title</Label>
        <Input
          value={draft.title}
          onChange={(e) => update("title", e.target.value)}
          disabled={fieldsDisabled}
          className="h-10 bg-background/90"
          placeholder="Subtask title"
        />
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
          placeholder="Add detailed notes…"
        />
      </div>

      <SubtaskAttachmentsSection
        subtaskId={draft.id}
        taskId={taskId}
        persist={persistAttachments}
        pendingAttachments={pendingAttachments}
        onPendingChange={onPendingAttachmentsChange}
        disabled={attachmentsManageDisabled}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SubtaskPrioritySelector
          value={draft.priority ?? "MEDIUM"}
          onChange={(priority) => update("priority", priority)}
          disabled={fieldsDisabled}
        />
        <SubtaskDueDatePicker
          value={draft.dueDate}
          completed={draft.completed}
          onChange={(dueDate) => update("dueDate", dueDate)}
          disabled={fieldsDisabled}
        />
        <SubtaskAssigneeSelector
          projectId={projectId}
          organizationId={organizationId}
          prefetchedOrgMembers={prefetchedOrgMembers}
          knownMembers={knownMembers}
          value={draft.assigneeId}
          onChange={(assigneeId) => update("assigneeId", assigneeId)}
          disabled={fieldsDisabled}
        />
        {statuses.length > 0 ? (
          <SubtaskStatusSelector
            statuses={statuses}
            value={resolveSubtaskStatusId(draft, statuses)}
            completed={draft.completed}
            onChange={(statusId) => update("statusId", statusId)}
            disabled={fieldsDisabled}
          />
        ) : null}
      </div>

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
              disabled={disabled || saving || !draft.title.trim()}
              onClick={() => onSave({ ...draft, title: draft.title.trim() })}
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
        onConfirm={() => {
          setDraft(baselineRef.current);
          onDirtyChange?.(false);
          onCancel?.();
        }}
      />
    </div>
  );
}

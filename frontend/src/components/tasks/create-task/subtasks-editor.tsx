"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { CheckSquare2, Plus } from "lucide-react";
import { SubtaskCompactRow } from "@/components/tasks/subtasks/subtask-compact-row";
import {
  SubtaskDetailPanel,
  type SubtaskDraft,
} from "@/components/tasks/subtasks/subtask-detail-panel";
import type { PendingSubtaskAttachment } from "@/components/tasks/subtasks/subtask-attachments-section";
import {
  resolveSubtaskStatus,
  subtaskWithCompleted,
  subtaskWithStatus,
  type SubtaskStatus,
} from "@/lib/subtask-status";
import { generateClientId } from "@/lib/generate-client-id";

export interface SubtaskItem {
  id?: string;
  title: string;
  completed: boolean;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  status?: SubtaskStatus;
}

interface SubtasksEditorProps {
  projectId: string;
  fields: Array<{ id: string } & SubtaskItem>;
  values?: SubtaskItem[];
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  append: UseFieldArrayAppend<any, any>;
  remove: UseFieldArrayRemove;
  errors: FieldErrors<any>;
  disabled?: boolean;
  pendingAttachmentsBySubtask?: Record<string, PendingSubtaskAttachment[]>;
  onPendingAttachmentsChange?: (
    subtaskKey: string,
    items: PendingSubtaskAttachment[]
  ) => void;
  hideQuickAdd?: boolean;
}

export function SubtasksEditor({
  projectId,
  fields,
  values,
  register,
  setValue,
  append,
  remove,
  errors,
  disabled,
  pendingAttachmentsBySubtask = {},
  onPendingAttachmentsChange,
  hideQuickAdd = false,
}: SubtasksEditorProps) {
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const pendingFocusIndexRef = useRef<number | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const subtaskErrors =
    (errors.subtasks as Array<{ title?: { message?: string } } | undefined> | undefined) ?? [];

  const progress = useMemo(() => {
    const list = values ?? [];
    const total = list.filter((s) => s.title.trim().length > 0).length;
    const completed = list.filter(
      (s) => s.title.trim().length > 0 && resolveSubtaskStatus(s) === "DONE"
    ).length;
    return { completed, total };
  }, [values]);

  useEffect(() => {
    if (pendingFocusIndexRef.current === null) return;
    const index = pendingFocusIndexRef.current;
    pendingFocusIndexRef.current = null;
    requestAnimationFrame(() => {
      inputRefs.current[index]?.focus();
    });
  }, [fields.length]);

  const syncDraftToForm = (index: number, draft: SubtaskDraft) => {
    const status = resolveSubtaskStatus(draft);
    setValue(`subtasks.${index}.title`, draft.title, { shouldDirty: true, shouldTouch: true });
    setValue(`subtasks.${index}.description`, draft.description ?? "", {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue(`subtasks.${index}.status`, status, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue(`subtasks.${index}.completed`, status === "DONE", {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue(`subtasks.${index}.dueDate`, draft.dueDate, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue(`subtasks.${index}.assigneeId`, draft.assigneeId, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const saveDraft = (index: number, draft: SubtaskDraft) => {
    syncDraftToForm(index, draft);
    setExpandedKey(null);
  };

  const applySubtaskPatch = (index: number, patch: Partial<SubtaskItem>) => {
    const current = values?.[index];
    if (!current) return;
    const next = { ...current, ...patch };
    if (patch.status !== undefined || patch.completed !== undefined) {
      const normalized = patch.status
        ? subtaskWithStatus(next, patch.status)
        : subtaskWithCompleted(next, Boolean(patch.completed));
      setValue(`subtasks.${index}.status`, normalized.status, {
        shouldDirty: true,
        shouldTouch: true,
      });
      setValue(`subtasks.${index}.completed`, normalized.completed, {
        shouldDirty: true,
        shouldTouch: true,
      });
      return;
    }
    Object.entries(patch).forEach(([key, value]) => {
      setValue(`subtasks.${index}.${key}` as const, value, {
        shouldDirty: true,
        shouldTouch: true,
      });
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/10 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CheckSquare2 className="h-3.5 w-3.5" /> Subtasks
          </Label>
          <span className="inline-flex h-5 items-center rounded-full border border-border bg-background px-2 text-[11px] font-medium text-muted-foreground">
            {progress.completed}/{progress.total} completed
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            const clientId = generateClientId();
            append({
              id: clientId,
              title: "",
              completed: false,
              description: "",
              assigneeId: undefined,
              dueDate: undefined,
              status: "TODO",
            });
            setExpandedKey(clientId);
          }}
          disabled={disabled}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Break larger work into actionable subtasks with notes and attachments.
          </p>
        ) : (
          fields.map((field, index) => {
            const message = subtaskErrors[index]?.title?.message ?? "";
            const value = values?.[index];
            const completed = resolveSubtaskStatus(value ?? { completed: false }) === "DONE";
            const subtaskKey = value?.id ?? field.id;
            const attachmentCount = (pendingAttachmentsBySubtask[subtaskKey] ?? []).length;
            const expanded = expandedKey === subtaskKey;

            return (
              <div key={field.id} className="space-y-0">
                <input type="hidden" {...register(`subtasks.${index}.id` as const)} />
                <input type="hidden" {...register(`subtasks.${index}.description` as const)} />
                <input type="hidden" {...register(`subtasks.${index}.status` as const)} />
                <SubtaskCompactRow
                  title={value?.title ?? ""}
                  completed={completed}
                  status={resolveSubtaskStatus(value ?? { status: "TODO" })}
                  dueDate={value?.dueDate}
                  assigneeId={value?.assigneeId}
                  attachmentCount={attachmentCount}
                  projectId={projectId}
                  expanded={expanded}
                  editDisabled={disabled}
                  onToggleComplete={() =>
                    applySubtaskPatch(index, { completed: !completed })
                  }
                  onStatusChange={(status) => applySubtaskPatch(index, { status })}
                  onRowClick={() =>
                    setExpandedKey((prev) => (prev === subtaskKey ? null : subtaskKey))
                  }
                  onDelete={() => {
                    if (expandedKey === subtaskKey) setExpandedKey(null);
                    remove(index);
                  }}
                  onAssigneeChange={(assigneeId) =>
                    applySubtaskPatch(index, { assigneeId })
                  }
                />
                {expanded ? (
                  <SubtaskDetailPanel
                    draft={{
                      id: subtaskKey,
                      title: value?.title ?? "",
                      description: value?.description,
                      completed,
                      assigneeId: value?.assigneeId,
                      dueDate: value?.dueDate,
                      status: resolveSubtaskStatus(value ?? { status: "TODO" }),
                    }}
                    projectId={projectId}
                    persistAttachments={false}
                    pendingAttachments={pendingAttachmentsBySubtask[subtaskKey] ?? []}
                    onPendingAttachmentsChange={(items) =>
                      onPendingAttachmentsChange?.(subtaskKey, items)
                    }
                    disabled={disabled}
                    onDraftChange={(draft) => syncDraftToForm(index, draft)}
                    onSave={(draft) => saveDraft(index, draft)}
                    onCancel={() => setExpandedKey(null)}
                  />
                ) : null}
                {message ? <p className="text-xs text-destructive">{message}</p> : null}
              </div>
            );
          })
        )}
      </div>

      {fields.length > 0 && !hideQuickAdd ? (
        <div className="flex gap-2 pt-1">
          <div className="td-input-shell flex min-h-10 flex-1 items-center gap-2 rounded-xl px-3">
            <Plus className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
            <Input
              placeholder="Quick add subtask…"
              className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              disabled={disabled}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || disabled) return;
                event.preventDefault();
                const clientId = generateClientId();
                append({
                  id: clientId,
                  title: "",
                  completed: false,
                  description: "",
                  assigneeId: undefined,
                  dueDate: undefined,
                  status: "TODO",
                });
                pendingFocusIndexRef.current = fields.length;
                setExpandedKey(clientId);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

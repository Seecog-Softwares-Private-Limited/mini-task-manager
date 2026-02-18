"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { CheckSquare2, Plus, Trash2 } from "lucide-react";
import { SubtaskAssigneeSelector } from "@/components/tasks/subtask-assignee-selector";
import { SubtaskDueDatePicker } from "@/components/tasks/subtask-due-date-picker";
import { SubtaskPrioritySelector } from "@/components/tasks/subtask-priority-selector";

export interface SubtaskItem {
  title: string;
  completed: boolean;
  assigneeId?: string;
  dueDate?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
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
}: SubtasksEditorProps) {
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const pendingFocusIndexRef = useRef<number | null>(null);
  const subtaskErrors =
    (errors.subtasks as Array<{ title?: { message?: string } } | undefined> | undefined) ?? [];
  const progress = useMemo(() => {
    const list = values ?? [];
    const total = list.filter((s) => s.title.trim().length > 0).length;
    const completed = list.filter((s) => s.title.trim().length > 0 && s.completed).length;
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
          onClick={() =>
            append({
              title: "",
              completed: false,
              assigneeId: undefined,
              dueDate: undefined,
              priority: "MEDIUM",
            })
          }
          disabled={disabled}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">Break larger work into actionable subtasks.</p>
        ) : (
          fields.map((field, index) => {
            const message = subtaskErrors[index]?.title?.message ?? "";
            const completed = Boolean(values?.[index]?.completed);
            const titleRegistration = register(`subtasks.${index}.title` as const);
            return (
              <div key={field.id} className="space-y-1.5">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md transition-opacity",
                    completed && "opacity-70"
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 rounded border-input accent-primary"
                    {...register(`subtasks.${index}.completed` as const)}
                    disabled={disabled}
                    aria-label={`Mark subtask ${index + 1} complete`}
                  />
                  <Input
                    placeholder={`Subtask ${index + 1}`}
                    className={cn(
                      "h-9 text-sm",
                      completed && "line-through text-muted-foreground"
                    )}
                    {...titleRegistration}
                    ref={(node) => {
                      titleRegistration.ref(node);
                      inputRefs.current[index] = node;
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || disabled) return;
                      event.preventDefault();
                      // Persists instantly in RHF state and appends next row for rapid entry.
                      append({
                        title: "",
                        completed: false,
                        assigneeId: undefined,
                        dueDate: undefined,
                        priority: "MEDIUM",
                      });
                      pendingFocusIndexRef.current = fields.length;
                    }}
                    disabled={disabled}
                  />
                  <SubtaskPrioritySelector
                    value={values?.[index]?.priority ?? "MEDIUM"}
                    onChange={(priority) =>
                      setValue(`subtasks.${index}.priority`, priority, {
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                    disabled={disabled}
                  />
                  <SubtaskDueDatePicker
                    value={values?.[index]?.dueDate}
                    completed={completed}
                    onChange={(dueDate) =>
                      setValue(`subtasks.${index}.dueDate`, dueDate, {
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                    disabled={disabled}
                  />
                  <SubtaskAssigneeSelector
                    projectId={projectId}
                    value={values?.[index]?.assigneeId}
                    onChange={(assigneeId) =>
                      setValue(`subtasks.${index}.assigneeId`, assigneeId, {
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    disabled={disabled}
                    aria-label={`Remove subtask ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {message && <p className="text-xs text-destructive">{message}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


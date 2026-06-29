"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { WorkflowStatus } from "@/types/api";
import { cn } from "@/lib/utils";
import { AssigneeSelector } from "@/components/tasks/create-task/assignee-selector";
import {
  LabelsMultiSelect,
  type TaskLabelDraft,
} from "@/components/tasks/create-task/labels-multi-select";
import {
  SubtasksEditor,
  type SubtaskItem,
} from "@/components/tasks/create-task/subtasks-editor";
import {
  CreateTaskFormSection,
  CREATE_FIELD_LABEL,
} from "@/components/tasks/create-task/form-section";
import { TaskAttachmentsSection } from "@/components/tasks/task-attachments-section";
import type { PendingSubtaskAttachment } from "@/components/tasks/subtasks/subtask-attachments-section";
import { DueDateField } from "@/components/tasks/create-task/due-date-field";
import {
  TaskDescriptionField,
  type TaskDescriptionFieldHandle,
} from "@/components/tasks/task-description-field";
import { useToast } from "@/components/ui/use-toast";
import { getWorkflowStatusCategory } from "@/components/kanban/task-card";
import {
  X,
  ArrowRight,
  Flag,
  Layers,
  AlertCircle,
  Repeat,
  FileText,
  Users,
  Settings2,
  CalendarRange,
} from "lucide-react";
import type { TaskRecurrenceConfig } from "@/types/api";
import { recurrenceSummary } from "@/lib/recurrence-display";
import { formatShortDate } from "@/lib/recurring-board-utils";
import {
  PlannerSectionCard,
  PlannerCollapsibleCard,
  RepeatScheduleControl,
  RecurrencePreviewCard,
  PlannerChecklist,
} from "@/components/tasks/create-task/recurring-planner-sections";

const PRIORITIES = [
  {
    value: "LOW",
    label: "Low",
    color: "bg-emerald-500",
    selected: "border-emerald-500/35 bg-emerald-500/8 ring-emerald-500/20",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    color: "bg-amber-500",
    selected: "border-amber-500/35 bg-amber-500/8 ring-amber-500/20",
  },
  {
    value: "HIGH",
    label: "High",
    color: "bg-orange-500",
    selected: "border-orange-500/35 bg-orange-500/8 ring-orange-500/20",
  },
  {
    value: "CRITICAL",
    label: "Critical",
    color: "bg-purple-600",
    selected: "border-purple-500/35 bg-purple-500/8 ring-purple-500/20",
  },
] as const;

const CHIP_BASE = cn(
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium",
  "transition-all duration-200 border-border/50 bg-background hover:bg-muted/30"
);

function getStatusChipStyles(status: WorkflowStatus) {
  const cat = getWorkflowStatusCategory(status);
  switch (cat) {
    case "todo":
      return {
        dot: "bg-blue-500",
        selected: "border-blue-500/35 bg-blue-500/8 ring-1 ring-blue-500/20",
      };
    case "in_progress":
      return {
        dot: "bg-amber-500",
        selected: "border-amber-500/35 bg-amber-500/8 ring-1 ring-amber-500/20",
      };
    case "done":
      return {
        dot: "bg-emerald-500",
        selected: "border-emerald-500/35 bg-emerald-500/8 ring-1 ring-emerald-500/20",
      };
    default:
      return {
        dot: "bg-violet-500",
        selected: "border-violet-500/35 bg-violet-500/8 ring-1 ring-violet-500/20",
      };
  }
}

const schema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  priority: z.string().default("MEDIUM"),
  statusId: z.string().optional(),
  assigneeIds: z.array(z.string().uuid()).default([]),
  storyPoints: z.coerce.number().min(0).max(100).optional(),
  dueDate: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
      message: "Due date must be a valid date",
    }),
  labels: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Label name is required").max(24),
        color: z.string().trim().min(4).max(16),
      })
    )
    .default([]),
  subtasks: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().trim().min(1, "Subtask title is required").max(200),
        description: z.string().max(10000).optional(),
        completed: z.boolean().default(false),
        assigneeId: z.string().uuid().optional(),
        assigneeIds: z.array(z.string().uuid()).optional(),
        status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        dueDate: z
          .string()
          .optional()
          .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
            message: "Subtask due date must be valid",
          }),
        dueOffsetDays: z.coerce.number().min(0).max(365).optional(),
        dueTime: z.string().optional(),
      })
    )
    .default([]),
  recurrence: z.custom<TaskRecurrenceConfig>().optional(),
});

export type CreateTaskFormData = z.infer<typeof schema>;

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: CreateTaskFormData,
    descriptionImageFiles?: File[],
    subtaskPendingAttachments?: Record<string, PendingSubtaskAttachment[]>,
    taskPendingAttachments?: PendingSubtaskAttachment[]
  ) => void;
  isSubmitting: boolean;
  error?: string | null;
  projectId: string;
  projectName?: string;
  statuses: WorkflowStatus[];
  defaultStatusId?: string;
  defaultRecurrenceRepeat?: TaskRecurrenceConfig["repeat"];
  showRecurrence?: boolean;
}

export function CreateTaskModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  projectId,
  projectName,
  statuses,
  defaultStatusId,
  defaultRecurrenceRepeat = "NONE",
  showRecurrence = false,
}: CreateTaskModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const descriptionFieldRef = useRef<TaskDescriptionFieldHandle>(null);
  const { toast } = useToast();
  const [pendingSubtaskAttachments, setPendingSubtaskAttachments] = useState<
    Record<string, PendingSubtaskAttachment[]>
  >({});
  const [pendingTaskAttachments, setPendingTaskAttachments] = useState<PendingSubtaskAttachment[]>([]);
  const [recurrenceError, setRecurrenceError] = useState<string | null>(null);

  const initialRecurrence = useMemo(
    () =>
      showRecurrence && !defaultRecurrenceRepeat
        ? { repeat: undefined as TaskRecurrenceConfig["repeat"] | undefined }
        : { repeat: defaultRecurrenceRepeat },
    [showRecurrence, defaultRecurrenceRepeat]
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      statusId: defaultStatusId || statuses[0]?.id || "",
      assigneeIds: [],
      storyPoints: undefined,
      dueDate: "",
      labels: [],
      subtasks: [],
      recurrence: initialRecurrence,
    },
  });

  const { fields, prepend, append, remove } = useFieldArray({
    control,
    name: "subtasks",
  });

  const selectedPriority = watch("priority");
  const selectedStatusId = watch("statusId");
  const watchedTitle = watch("title");
  const watchedSubtasks = watch("subtasks");
  const watchedRecurrence = watch("recurrence");

  const selectedStatus = useMemo(
    () => statuses.find((s) => s.id === selectedStatusId) ?? statuses[0],
    [statuses, selectedStatusId]
  );

  const dueDateValue = watch("dueDate");
  const titleValid = (watchedTitle ?? "").trim().length > 0;
  const frequencyValid = Boolean(
    watchedRecurrence?.repeat && watchedRecurrence.repeat !== "NONE"
  );
  const startDateValid = Boolean(dueDateValue);
  const canSubmit = showRecurrence
    ? titleValid && frequencyValid && startDateValid && !isSubmitting
    : titleValid && !isSubmitting;

  const checklistCount = (watchedSubtasks ?? []).filter(
    (s) => (s?.title ?? "").trim().length > 0
  ).length;
  const footerBlocker = useMemo(() => {
    if (!showRecurrence) return null;
    if (!titleValid) return "Planner name is required.";
    if (!frequencyValid) return "Pick a frequency to continue.";
    if (!startDateValid) return "Select a start date to create the planner.";
    return null;
  }, [showRecurrence, titleValid, frequencyValid, startDateValid]);
  const footerSummary = useMemo(() => {
    if (!showRecurrence) return "";
    const parts: string[] = [];
    const cadence = recurrenceSummary(watchedRecurrence);
    parts.push(cadence ? cadence.split(" • ")[0] : "Pick a frequency");
    if (dueDateValue) parts.push(`Starts ${formatShortDate(dueDateValue)}`);
    parts.push(
      `${checklistCount} checklist ${checklistCount === 1 ? "item" : "items"}`
    );
    return parts.join(" · ");
  }, [showRecurrence, watchedRecurrence, checklistCount, dueDateValue]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) {
      reset({
        title: "",
        description: "",
        priority: "MEDIUM",
        statusId: defaultStatusId || statuses[0]?.id || "",
        assigneeIds: [],
        storyPoints: undefined,
        dueDate: "",
        labels: [],
        subtasks: [],
        recurrence: initialRecurrence,
      });
      descriptionFieldRef.current?.resetPendingImages();
      setPendingSubtaskAttachments({});
      setPendingTaskAttachments([]);
      setRecurrenceError(null);
    }
  }, [open, defaultStatusId, defaultRecurrenceRepeat, showRecurrence, statuses, reset, initialRecurrence]);

  function handleFormSubmit(data: CreateTaskFormData) {
    if (showRecurrence) {
      if (!data.recurrence?.repeat || data.recurrence.repeat === "NONE") {
        setRecurrenceError("please select frequency for the recurring task");
        return;
      }
      setRecurrenceError(null);
    }
    if (
      showRecurrence &&
      data.recurrence?.repeat &&
      data.recurrence.repeat !== "NONE" &&
      !data.dueDate
    ) {
      toast({
        title: "Due date required for recurring task",
        description: "Set a due date so the recurring series can generate occurrences accurately.",
        variant: "error",
      });
      return;
    }
    const imageFiles = descriptionFieldRef.current?.getPendingImageFiles() ?? [];
    const hasSubtaskFiles = Object.values(pendingSubtaskAttachments).some((list) => list.length > 0);
    onSubmit(
      data,
      imageFiles.length ? imageFiles : undefined,
      hasSubtaskFiles ? pendingSubtaskAttachments : undefined,
      pendingTaskAttachments.length ? pendingTaskAttachments : undefined
    );
  }

  const submitForm = () => {
    if (canSubmit) void handleSubmit(handleFormSubmit)();
  };

  function handleFormKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      submitForm();
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <SheetContent
        side="right"
        showClose={false}
        overlayClassName="bg-black/28 backdrop-blur-[1px]"
        className="flex w-full flex-col gap-0 overflow-hidden border-l border-border/50 p-0 shadow-premium-lg duration-200 sm:max-w-[520px]"
        data-cy="create-task-modal"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          closeRef.current?.focus();
        }}
      >
        <SheetHeader className="sticky top-0 z-10 shrink-0 space-y-0 border-b border-border/50 bg-card/95 px-6 py-3.5 text-left backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <SheetTitle id="create-task-title" className="text-base font-semibold tracking-tight">
                {showRecurrence ? "Create recurring planner" : "Create task"}
              </SheetTitle>
              {projectName ? (
                <p className="truncate text-[13px] text-muted-foreground">
                  {showRecurrence ? "New recurring series in " : "in "}
                  <span className="font-medium text-foreground/90">{projectName}</span>
                </p>
              ) : null}
              {!showRecurrence && selectedStatus ? (
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    className={cn("h-1.5 w-1.5 shrink-0 rounded-full", getStatusChipStyles(selectedStatus).dot)}
                    aria-hidden
                  />
                  Status: <span className="font-medium text-foreground/85">{selectedStatus.name}</span>
                </p>
              ) : null}
            </div>
            <Button
              ref={closeRef}
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground transition-colors duration-200 hover:text-foreground"
              onClick={onClose}
              type="button"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          onKeyDown={handleFormKeyDown}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div
            className={cn(
              "flex-1 overflow-y-auto",
              showRecurrence ? "space-y-3 px-5 py-4 pb-5" : "space-y-0 px-6 py-4 pb-5"
            )}
          >
            {showRecurrence ? (
              <>
                <PlannerSectionCard
                  icon={<Repeat className="h-4 w-4" />}
                  title="Repeat schedule"
                  description="How often this planner generates a new run."
                >
                  <Controller
                    control={control}
                    name="recurrence"
                    render={({ field }) => (
                      <RepeatScheduleControl
                        value={field.value}
                        onChange={(next) => {
                          field.onChange(next);
                          if (next?.repeat && next.repeat !== "NONE") {
                            setRecurrenceError(null);
                          }
                        }}
                        disabled={isSubmitting}
                        error={recurrenceError}
                      />
                    )}
                  />
                </PlannerSectionCard>

                <RecurrencePreviewCard
                  recurrence={watchedRecurrence}
                  startDate={dueDateValue}
                />

                <PlannerSectionCard
                  icon={<FileText className="h-4 w-4" />}
                  title="Routine details"
                  description="Name and describe what should happen each run."
                >
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="planner-name" className={CREATE_FIELD_LABEL}>
                        Planner name <span className="text-destructive/80">*</span>
                      </Label>
                      <Input
                        id="planner-name"
                        placeholder="e.g. Daily standup, Weekly report…"
                        data-cy="task-title-input"
                        {...register("title")}
                        autoFocus
                        className={cn(
                          "h-11 rounded-lg border-border/55 bg-background px-3 text-[15px] font-medium shadow-sm",
                          "transition-all duration-200 placeholder:font-normal placeholder:text-muted-foreground/55",
                          "focus-visible:border-violet-500/40 focus-visible:ring-2 focus-visible:ring-violet-500/15",
                          errors.title && "border-destructive/40 focus-visible:ring-destructive/15"
                        )}
                      />
                      {errors.title ? (
                        <p className="flex items-center gap-1 text-[11px] text-destructive">
                          <AlertCircle className="h-3 w-3" /> {errors.title.message}
                        </p>
                      ) : null}
                    </div>

                    <Controller
                      control={control}
                      name="description"
                      render={({ field }) => (
                        <TaskDescriptionField
                          ref={descriptionFieldRef}
                          id="planner-desc"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          disabled={isSubmitting}
                          onPasteError={(message) =>
                            toast({
                              title: "Could not paste image",
                              description: message,
                              variant: "error",
                            })
                          }
                        />
                      )}
                    />

                    <div className="space-y-2">
                      <Label className={cn(CREATE_FIELD_LABEL, "flex items-center gap-1.5")}>
                        <Flag className="h-3 w-3" /> Priority
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {PRIORITIES.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setValue("priority", p.value)}
                            className={cn(
                              CHIP_BASE,
                              selectedPriority === p.value
                                ? cn("border-transparent shadow-sm ring-1", p.selected)
                                : "text-muted-foreground"
                            )}
                          >
                            <span className={cn("h-2 w-2 rounded-full", p.color)} />
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {statuses.length > 0 ? (
                      <div className="space-y-2">
                        <Label className={cn(CREATE_FIELD_LABEL, "flex items-center gap-1.5")}>
                          <Layers className="h-3 w-3" /> Start status
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {statuses.map((s) => {
                            const styles = getStatusChipStyles(s);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setValue("statusId", s.id)}
                                className={cn(
                                  CHIP_BASE,
                                  selectedStatusId === s.id
                                    ? cn("shadow-sm", styles.selected)
                                    : "text-muted-foreground"
                                )}
                              >
                                <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
                                {s.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </PlannerSectionCard>

                <PlannerSectionCard
                  icon={<Users className="h-4 w-4" />}
                  title="Assignment"
                  description="Who owns each run and when the first run is due."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className={CREATE_FIELD_LABEL}>Assignee</Label>
                      <Controller
                        control={control}
                        name="assigneeIds"
                        render={({ field }) => (
                          <AssigneeSelector
                            projectId={projectId}
                            value={field.value ?? []}
                            onChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        )}
                      />
                    </div>
                    <Controller
                      control={control}
                      name="dueDate"
                      render={({ field }) => (
                        <DueDateField
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isSubmitting}
                          label="First run date"
                          hint="Anchor date — the series repeats from here."
                        />
                      )}
                    />
                  </div>
                </PlannerSectionCard>

                <PlannerSectionCard
                  icon={<CalendarRange className="h-4 w-4" />}
                  title="Checklist"
                  description="Items copied into every generated run."
                  action={
                    checklistCount > 0 ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {checklistCount}
                      </span>
                    ) : null
                  }
                >
                  <PlannerChecklist
                    projectId={projectId}
                    fields={fields as Array<{ id: string } & SubtaskItem>}
                    values={watchedSubtasks}
                    register={register}
                    setValue={setValue}
                    append={append}
                    remove={remove}
                    errors={errors}
                    disabled={isSubmitting}
                  />
                </PlannerSectionCard>

                <PlannerCollapsibleCard
                  icon={<Settings2 className="h-4 w-4" />}
                  title="Advanced options"
                  description="Lead time, labels, and attachments."
                >
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <Label className={CREATE_FIELD_LABEL}>Create run days before due</Label>
                      <Input
                        type="number"
                        min={0}
                        max={365}
                        value={watchedRecurrence?.createDaysBeforeDue ?? 0}
                        disabled={isSubmitting}
                        onChange={(e) =>
                          setValue("recurrence", {
                            ...(watchedRecurrence ?? {}),
                            createDaysBeforeDue: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="h-9 w-28"
                      />
                      <p className="text-[10px] text-muted-foreground/80">
                        Generate the run ahead of its due date so the team can prepare.
                      </p>
                    </div>

                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/50 bg-muted/15 px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-border"
                        checked={Boolean(watchedRecurrence?.skipWeekends)}
                        disabled={isSubmitting}
                        onChange={(e) =>
                          setValue("recurrence", {
                            ...(watchedRecurrence ?? {}),
                            skipWeekends: e.target.checked,
                          })
                        }
                      />
                      <span className="space-y-0.5">
                        <span className="block text-[12px] font-medium">Skip weekends</span>
                        <span className="block text-[10px] text-muted-foreground">
                          Working days only — runs land on the next weekday when a date falls on Sat/Sun.
                        </span>
                      </span>
                    </label>

                    <div className="space-y-1.5">
                      <Label className={CREATE_FIELD_LABEL}>Completion rule</Label>
                      <select
                        value={watchedRecurrence?.completionRule ?? "ALL_CHECKLIST"}
                        disabled={isSubmitting}
                        onChange={(e) =>
                          setValue("recurrence", {
                            ...(watchedRecurrence ?? {}),
                            completionRule: e.target.value as "ALL_CHECKLIST" | "MANUAL",
                          })
                        }
                        className="h-9 w-full rounded-lg border border-border/60 bg-background px-3 text-sm"
                      >
                        <option value="ALL_CHECKLIST">All checklist items required</option>
                        <option value="MANUAL">Allow manual completion</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className={CREATE_FIELD_LABEL}>Labels</Label>
                      <Controller
                        control={control}
                        name="labels"
                        render={({ field }) => (
                          <LabelsMultiSelect
                            value={(field.value ?? []) as TaskLabelDraft[]}
                            onChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        )}
                      />
                    </div>

                    <TaskAttachmentsSection
                      persist={false}
                      pendingAttachments={pendingTaskAttachments}
                      onPendingChange={setPendingTaskAttachments}
                      disabled={isSubmitting}
                      createDrawer
                    />
                  </div>
                </PlannerCollapsibleCard>
              </>
            ) : (
            <>
            <CreateTaskFormSection title="Basic details">
              <div className="space-y-2">
                <Label htmlFor="task-title" className={CREATE_FIELD_LABEL}>
                  Task title <span className="text-destructive/80">*</span>
                </Label>
                <Input
                  id="task-title"
                  placeholder="What needs to be done?"
                  data-cy="task-title-input"
                  {...register("title")}
                  autoFocus
                  className={cn(
                    "h-11 rounded-lg border-border/55 bg-background px-3 text-[15px] font-medium shadow-sm",
                    "transition-all duration-200 placeholder:font-normal placeholder:text-muted-foreground/55",
                    "focus-visible:border-violet-500/40 focus-visible:ring-2 focus-visible:ring-violet-500/15",
                    errors.title && "border-destructive/40 focus-visible:ring-destructive/15"
                  )}
                />
                {errors.title ? (
                  <p className="flex items-center gap-1 text-[11px] text-destructive">
                    <AlertCircle className="h-3 w-3" /> {errors.title.message}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    A clear title helps your team scan the board quickly.
                  </p>
                )}
              </div>

              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <TaskDescriptionField
                    ref={descriptionFieldRef}
                    id="task-desc"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                    data-cy="task-desc-input"
                    onPasteError={(message) =>
                      toast({
                        title: "Could not paste image",
                        description: message,
                        variant: "error",
                      })
                    }
                  />
                )}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label className={cn(CREATE_FIELD_LABEL, "flex items-center gap-1.5")}>
                    <Flag className="h-3 w-3" /> Priority
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setValue("priority", p.value)}
                        className={cn(
                          CHIP_BASE,
                          selectedPriority === p.value
                            ? cn("border-transparent shadow-sm ring-1", p.selected)
                            : "text-muted-foreground"
                        )}
                      >
                        <span className={cn("h-2 w-2 rounded-full", p.color)} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {statuses.length > 0 ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label className={cn(CREATE_FIELD_LABEL, "flex items-center gap-1.5")}>
                      <Layers className="h-3 w-3" /> Status
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {statuses.map((s) => {
                        const styles = getStatusChipStyles(s);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setValue("statusId", s.id)}
                            className={cn(
                              CHIP_BASE,
                              selectedStatusId === s.id
                                ? cn("shadow-sm", styles.selected)
                                : "text-muted-foreground"
                            )}
                          >
                            <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="sm:col-span-2 rounded-lg border border-border/50 bg-muted/15 px-3 py-2.5 text-[11px] text-muted-foreground">
                    No statuses configured for this project.
                  </div>
                )}
              </div>
            </CreateTaskFormSection>

            <CreateTaskFormSection title="Assignment & schedule">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className={CREATE_FIELD_LABEL}>Assignee</Label>
                  <Controller
                    control={control}
                    name="assigneeIds"
                    render={({ field }) => (
                      <AssigneeSelector
                        projectId={projectId}
                        value={field.value ?? []}
                        onChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </div>

                <Controller
                  control={control}
                  name="dueDate"
                  render={({ field }) => (
                    <DueDateField
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                      hint={
                        showRecurrence &&
                        watchedRecurrence?.repeat &&
                        watchedRecurrence.repeat !== "NONE"
                          ? "First occurrence due date — the series repeats from this anchor."
                          : undefined
                      }
                    />
                  )}
                />
              </div>
            </CreateTaskFormSection>

            <CreateTaskFormSection title="Labels & attachments">
              <Controller
                control={control}
                name="labels"
                render={({ field }) => (
                  <LabelsMultiSelect
                    value={(field.value ?? []) as TaskLabelDraft[]}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                  />
                )}
              />

              <TaskAttachmentsSection
                persist={false}
                pendingAttachments={pendingTaskAttachments}
                onPendingChange={setPendingTaskAttachments}
                disabled={isSubmitting}
                createDrawer
              />
            </CreateTaskFormSection>

            <CreateTaskFormSection title="Subtasks" hideTitle>
              <SubtasksEditor
                projectId={projectId}
                fields={fields as Array<{ id: string } & SubtaskItem>}
                values={watchedSubtasks}
                register={register}
                setValue={setValue}
                prepend={prepend}
                remove={remove}
                errors={errors}
                disabled={isSubmitting}
                pendingAttachmentsBySubtask={pendingSubtaskAttachments}
                onPendingAttachmentsChange={(subtaskKey, items) =>
                  setPendingSubtaskAttachments((prev) => ({ ...prev, [subtaskKey]: items }))
                }
              />
            </CreateTaskFormSection>

            </>
            )}

            {errors.dueDate && (
              <p className="flex items-center gap-1 text-[11px] text-destructive">
                <AlertCircle className="h-3 w-3" /> {errors.dueDate.message}
              </p>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5">
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </p>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/50 bg-card/95 px-6 py-3 backdrop-blur-sm">
            {showRecurrence ? (
              <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-medium text-muted-foreground/90">
                <Repeat className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                <span className="truncate">
                  {footerBlocker ?? footerSummary}
                </span>
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground/90">
                Press{" "}
                <kbd className="rounded border border-border/50 bg-muted/25 px-1.5 py-0.5 font-mono text-[10px]">
                  Ctrl
                </kbd>
                {" + "}
                <kbd className="rounded border border-border/50 bg-muted/25 px-1.5 py-0.5 font-mono text-[10px]">
                  Enter
                </kbd>
                {" "}to create
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={onClose}
                type="button"
                className="h-9 px-3 text-sm transition-colors duration-200 hover:bg-muted/40"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                data-cy="task-create-submit"
                className={cn(
                  "h-9 gap-1.5 px-3.5 shadow-sm transition-all duration-200",
                  !canSubmit && "opacity-45 shadow-none"
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating…
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    {showRecurrence ? "Create planner" : "Create task"}{" "}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useTaskDescriptionImagePaste } from "@/hooks/use-task-description-image-paste";
import { TaskDescriptionImagePreviews } from "@/components/tasks/task-description-image-previews";

export interface TaskDescriptionFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
  "data-cy"?: string;
  onPasteError?: (message: string) => void;
}

export type TaskDescriptionFieldHandle = {
  getPendingImageFiles: () => File[];
  resetPendingImages: () => void;
};

export const TaskDescriptionField = React.forwardRef<
  TaskDescriptionFieldHandle,
  TaskDescriptionFieldProps
>(function TaskDescriptionField(props, ref) {
  const {
    id = "task-desc",
    value,
    onChange,
    disabled,
    placeholder = "Add a detailed description of what needs to be done...",
    rows = 3,
    className,
    "data-cy": dataCy,
    onPasteError,
  } = props;

  const { items, handlePaste, removeItem, getPendingFilesForCreate, resetItems } =
    useTaskDescriptionImagePaste({
      disabled,
      onError: onPasteError,
    });

  React.useImperativeHandle(ref, () => ({
    getPendingImageFiles: getPendingFilesForCreate,
    resetPendingImages: resetItems,
  }));

  return (
    <div className="space-y-3">
      <textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => handlePaste(e)}
        rows={rows}
        disabled={disabled}
        data-cy={dataCy}
        className={cn(
          "flex w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm shadow-sm transition-all duration-200 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
      />
      <TaskDescriptionImagePreviews items={items} onRemove={removeItem} />
    </div>
  );
});

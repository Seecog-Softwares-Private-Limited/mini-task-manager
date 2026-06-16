"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useTaskDescriptionImagePaste } from "@/hooks/use-task-description-image-paste";
import { TaskDescriptionImagePreviews } from "@/components/tasks/task-description-image-previews";
import { ImageIcon } from "lucide-react";

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
    placeholder = "Describe the work, acceptance criteria, links, or context for this task…",
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
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border/55 bg-background shadow-sm transition-all duration-200 focus-within:border-violet-500/35 focus-within:ring-2 focus-within:ring-violet-500/15">
        <div className="flex items-center gap-1 border-b border-border/40 bg-muted/15 px-2.5 py-1">
          <span className="text-[10px] font-medium text-muted-foreground">Description</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground/80">
            <ImageIcon className="h-3 w-3" />
            Paste images
          </span>
        </div>
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
            "flex min-h-[72px] w-full resize-none border-0 bg-transparent px-3 py-2 text-sm leading-relaxed",
            "transition-colors duration-200 placeholder:text-muted-foreground/55 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        />
      </div>
      <TaskDescriptionImagePreviews items={items} onRemove={removeItem} />
    </div>
  );
});

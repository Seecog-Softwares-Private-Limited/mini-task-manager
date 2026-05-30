"use client";

import * as React from "react";
import type { TaskAttachment } from "@/types/api";
import { filterTaskImageAttachments } from "@/lib/task-image-attachments";
import { useAttachmentImagePreviews } from "@/hooks/use-attachment-image-previews";
import { TaskDescriptionImagePreviews } from "@/components/tasks/task-description-image-previews";

interface TaskDescriptionAttachmentPreviewsProps {
  attachments: TaskAttachment[];
  className?: string;
}

/** Read-only pasted-image previews sourced from persisted task attachments. */
export function TaskDescriptionAttachmentPreviews({
  attachments,
  className,
}: TaskDescriptionAttachmentPreviewsProps) {
  const imageAttachments = React.useMemo(
    () => filterTaskImageAttachments(attachments),
    [attachments]
  );
  const { items } = useAttachmentImagePreviews(imageAttachments);

  return <TaskDescriptionImagePreviews items={items} className={className} />;
}

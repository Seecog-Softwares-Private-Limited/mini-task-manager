"use client";

import * as React from "react";
import {
  getCachedAttachmentPreviewUrl,
  releaseCachedAttachmentPreviewUrl,
  releaseCachedAttachmentPreviewUrls,
} from "@/lib/attachment-preview-cache";
import { parseApiError } from "@/services/api/client";
import type { TaskAttachment } from "@/types/api";
import type { DescriptionImagePreviewItem } from "@/components/tasks/task-description-image-previews";

/** Loads authenticated blob preview URLs for task image attachments. */
export function useAttachmentImagePreviews(attachments: TaskAttachment[]) {
  const [items, setItems] = React.useState<DescriptionImagePreviewItem[]>([]);
  const attachmentsRef = React.useRef(attachments);
  attachmentsRef.current = attachments;

  const attachmentKey = React.useMemo(
    () => attachments.map((a) => `${a.id}:${a.fileName}:${a.uploadedAt}`).join("|"),
    [attachments]
  );

  React.useEffect(() => {
    let cancelled = false;
    const acquiredRef: string[] = [];
    const list = attachmentsRef.current;

    if (!list.length) {
      setItems([]);
      return;
    }

    setItems(
      list.map((attachment) => ({
        id: attachment.id,
        attachmentId: attachment.id,
        previewUrl: "",
        fileName: attachment.fileName,
        status: "uploading" as const,
      }))
    );

    void (async () => {
      const results = await Promise.all(
        list.map(async (attachment) => {
          try {
            const previewUrl = await getCachedAttachmentPreviewUrl(attachment.id);
            if (cancelled) {
              releaseCachedAttachmentPreviewUrl(attachment.id);
              return {
                id: attachment.id,
                attachmentId: attachment.id,
                previewUrl: "",
                fileName: attachment.fileName,
                status: "error" as const,
                error: "Preview load cancelled",
              };
            }
            acquiredRef.push(attachment.id);
            return {
              id: attachment.id,
              attachmentId: attachment.id,
              previewUrl,
              fileName: attachment.fileName,
              status: "done" as const,
            };
          } catch (err) {
            return {
              id: attachment.id,
              attachmentId: attachment.id,
              previewUrl: "",
              fileName: attachment.fileName,
              status: "error" as const,
              error: parseApiError(err),
            };
          }
        })
      );

      if (!cancelled) {
        setItems(results);
      }
    })();

    return () => {
      cancelled = true;
      releaseCachedAttachmentPreviewUrls(acquiredRef);
    };
  }, [attachmentKey]);

  return { items };
}

"use client";

import * as React from "react";
import { parseApiError } from "@/services/api/client";
import { uploadAttachment } from "@/services/api/attachments.api";
import {
  getClipboardImageFile,
  normalizePastedImageFile,
  validateTaskPasteImageFile,
} from "@/lib/task-clipboard-image";
import { generateClientId } from "@/lib/generate-client-id";
import { isValidTaskId } from "@/lib/task-id";
import { filterTaskImageAttachments } from "@/lib/task-image-attachments";
import { useAttachmentImagePreviews } from "@/hooks/use-attachment-image-previews";
import type { DescriptionImagePreviewItem } from "@/components/tasks/task-description-image-previews";
import type { TaskAttachment } from "@/types/api";

function newPreviewId(): string {
  return generateClientId("paste-");
}

function mergeDescriptionImageItems(
  attachmentItems: DescriptionImagePreviewItem[],
  sessionItems: DescriptionImagePreviewItem[]
): DescriptionImagePreviewItem[] {
  const attachmentIds = new Set(
    attachmentItems.map((item) => item.attachmentId ?? item.id)
  );

  const pendingSessionItems = sessionItems.filter((item) => {
    if (item.attachmentId && attachmentIds.has(item.attachmentId)) {
      return false;
    }
    return item.status === "pending" || item.status === "uploading" || item.status === "error";
  });

  return [...attachmentItems, ...pendingSessionItems];
}

export function useTaskDescriptionImagePaste(options: {
  taskId?: string | null;
  disabled?: boolean;
  existingAttachments?: TaskAttachment[];
  onUploadSuccess?: () => void;
  onError?: (message: string) => void;
}) {
  const { taskId, disabled, existingAttachments = [], onUploadSuccess, onError } = options;
  const imageAttachments = React.useMemo(
    () => filterTaskImageAttachments(existingAttachments),
    [existingAttachments]
  );
  const { items: attachmentItems } = useAttachmentImagePreviews(imageAttachments);

  const [sessionItems, setSessionItems] = React.useState<DescriptionImagePreviewItem[]>([]);
  const sessionItemsRef = React.useRef(sessionItems);
  sessionItemsRef.current = sessionItems;
  const pendingFileRefs = React.useRef<Array<{ id: string; file: File }>>([]);

  const revokePreview = React.useCallback((previewUrl: string) => {
    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  }, []);

  React.useEffect(() => {
    return () => {
      sessionItemsRef.current.forEach((item) => revokePreview(item.previewUrl));
    };
  }, [revokePreview]);

  const items = React.useMemo(
    () => mergeDescriptionImageItems(attachmentItems, sessionItems),
    [attachmentItems, sessionItems]
  );

  const removeItem = React.useCallback(
    (id: string) => {
      pendingFileRefs.current = pendingFileRefs.current.filter((entry) => entry.id !== id);
      setSessionItems((prev) => {
        const target = prev.find((item) => item.id === id);
        if (target) revokePreview(target.previewUrl);
        return prev.filter((item) => item.id !== id);
      });
    },
    [revokePreview]
  );

  const resetItems = React.useCallback(() => {
    pendingFileRefs.current = [];
    setSessionItems((prev) => {
      prev.forEach((item) => revokePreview(item.previewUrl));
      return [];
    });
  }, [revokePreview]);

  const uploadForEdit = React.useCallback(
    async (file: File, previewId: string) => {
      if (!taskId || !isValidTaskId(taskId)) {
        setSessionItems((prev) =>
          prev.map((item) =>
            item.id === previewId
              ? {
                  ...item,
                  status: "error" as const,
                  error: "Save the task before uploading images.",
                }
              : item
          )
        );
        return;
      }
      setSessionItems((prev) =>
        prev.map((item) =>
          item.id === previewId ? { ...item, status: "uploading" as const } : item
        )
      );
      try {
        const uploaded = await uploadAttachment(taskId, file);
        setSessionItems((prev) => {
          const target = prev.find((item) => item.id === previewId);
          if (target) revokePreview(target.previewUrl);
          return prev.filter((item) => item.id !== previewId);
        });
        onUploadSuccess?.();
        return uploaded;
      } catch (err) {
        const message = parseApiError(err);
        setSessionItems((prev) =>
          prev.map((item) =>
            item.id === previewId
              ? { ...item, status: "error" as const, error: message }
              : item
          )
        );
        onError?.(message);
      }
    },
    [taskId, onUploadSuccess, onError, revokePreview]
  );

  const addPastedFile = React.useCallback(
    (rawFile: File): string | null => {
      if (disabled) return "Upload is disabled.";
      const file = normalizePastedImageFile(rawFile);
      const validationError = validateTaskPasteImageFile(file);
      if (validationError) {
        onError?.(validationError);
        return validationError;
      }

      const previewId = newPreviewId();
      const previewUrl = URL.createObjectURL(file);
      pendingFileRefs.current.push({ id: previewId, file });

      setSessionItems((prev) => [
        ...prev,
        {
          id: previewId,
          previewUrl,
          fileName: file.name,
          status: taskId ? "uploading" : "pending",
        },
      ]);

      if (taskId) {
        void uploadForEdit(file, previewId);
      }

      return null;
    },
    [disabled, taskId, uploadForEdit, onError]
  );

  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent) => {
      const rawFile = getClipboardImageFile(event.clipboardData);
      if (!rawFile) return false;

      event.preventDefault();
      addPastedFile(rawFile);
      return true;
    },
    [addPastedFile]
  );

  const getPendingFilesForCreate = React.useCallback((): File[] => {
    return pendingFileRefs.current.map((entry) => entry.file);
  }, []);

  return {
    items,
    handlePaste,
    addPastedFile,
    removeItem,
    resetItems,
    getPendingFilesForCreate,
  };
}

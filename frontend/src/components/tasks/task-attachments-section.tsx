"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { parseApiError } from "@/services/api/client";
import {
  deleteAttachment,
  downloadAttachment,
  fetchAttachmentBlob,
  fetchAttachments,
  uploadAttachment,
} from "@/services/api/attachments.api";
import { createLocalPreviewUrl, isImageMime } from "@/lib/attachment-file-meta";
import { getClipboardImageFile, validateTaskPasteImageFile } from "@/lib/task-clipboard-image";
import { normalizePastedScreenshotFile } from "@/lib/screenshot-filename";
import {
  EntityAttachmentCard,
  type AttachmentCardItem,
} from "@/components/tasks/subtasks/entity-attachment-card";
import {
  AttachmentPreviewModal,
  type AttachmentPreviewTarget,
} from "@/components/tasks/subtasks/attachment-preview-modal";
import { generateClientId } from "@/lib/generate-client-id";
import type { PendingSubtaskAttachment } from "@/components/tasks/subtasks/subtask-attachments-section";

function pendingToCard(item: PendingSubtaskAttachment): AttachmentCardItem {
  return {
    id: item.clientId,
    fileName: item.file.name,
    mimeType: item.file.type,
    fileSize: item.file.size,
    status: "queued",
    localPreviewUrl: item.previewUrl,
  };
}

interface TaskAttachmentsSectionProps {
  taskId?: string;
  /** When false, files stay queued locally until the task is created. */
  persist?: boolean;
  pendingAttachments?: PendingSubtaskAttachment[];
  onPendingChange?: (items: PendingSubtaskAttachment[]) => void;
  disabled?: boolean;
}

export function TaskAttachmentsSection({
  taskId,
  persist = true,
  pendingAttachments = [],
  onPendingChange,
  disabled,
}: TaskAttachmentsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const [previewTarget, setPreviewTarget] = React.useState<AttachmentPreviewTarget | null>(null);
  const [focused, setFocused] = React.useState(false);
  const [thumbById, setThumbById] = React.useState<Record<string, string>>({});
  const [uploadingFiles, setUploadingFiles] = React.useState<
    Array<{ tempId: string; file: File }>
  >([]);

  const queryKey = ["task-attachments", taskId];

  const { data: persisted = [], isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchAttachments(taskId!),
    enabled: persist && Boolean(taskId),
    staleTime: 30_000,
  });

  const persistedKey = React.useMemo(
    () => persisted.map((a) => a.id).join(","),
    [persisted]
  );

  const uploadMutation = useMutation({
    mutationFn: ({ file }: { file: File; tempId: string }) =>
      uploadAttachment(taskId!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      toast({
        title: "Upload failed",
        description: parseApiError(err),
        variant: "error",
      });
    },
    onSettled: (_data, _err, { tempId }) => {
      setUploadingFiles((prev) => prev.filter((item) => item.tempId !== tempId));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(taskId!, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      toast({
        title: "Delete failed",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const addPendingFiles = React.useCallback(
    (files: File[]) => {
      if (!onPendingChange) return;
      const next = [...pendingAttachments];
      for (const file of files) {
        const clientId = generateClientId();
        const previewUrl = createLocalPreviewUrl(file);
        next.push({ clientId, file, previewUrl });
      }
      onPendingChange(next);
    },
    [onPendingChange, pendingAttachments]
  );

  const handleFiles = React.useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;

      if (!persist) {
        addPendingFiles(list);
        return;
      }

      for (const file of list) {
        const tempId = generateClientId();
        setUploadingFiles((prev) => [...prev, { tempId, file }]);
        uploadMutation.mutate({ file, tempId });
      }
    },
    [addPendingFiles, persist, uploadMutation]
  );

  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent) => {
      if (!focused || disabled) return;
      const image = getClipboardImageFile(event.clipboardData);
      if (!image) return;
      event.preventDefault();
      const err = validateTaskPasteImageFile(image);
      if (err) {
        toast({ title: "Paste failed", description: err, variant: "error" });
        return;
      }
      const file = normalizePastedScreenshotFile(image);
      void handleFiles([file]);
    },
    [disabled, focused, handleFiles, toast]
  );

  React.useEffect(() => {
    if (!persist) return;
    let cancelled = false;
    const urls: string[] = [];

    void (async () => {
      const next: Record<string, string> = {};
      for (const attachment of persisted) {
        if (!isImageMime(attachment.mimeType, attachment.fileName)) continue;
        try {
          const blob = await fetchAttachmentBlob(attachment.id, attachment.fileName);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          next[attachment.id] = url;
        } catch {
          /* thumbnail optional */
        }
      }
      if (!cancelled) setThumbById(next);
    })();

    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [persist, persistedKey]);

  const persistedCards: AttachmentCardItem[] = persisted.map((a) => ({
    id: a.id,
    attachmentId: a.id,
    fileName: a.fileName,
    mimeType: a.mimeType,
    fileSize: a.fileSize,
    localPreviewUrl: thumbById[a.id],
    status: "done",
  }));

  const uploadingCards: AttachmentCardItem[] = uploadingFiles.map(({ tempId, file }) => ({
    id: tempId,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    localPreviewUrl: createLocalPreviewUrl(file),
    status: "uploading",
  }));

  const pendingCards = pendingAttachments.map(pendingToCard);
  const cards = persist ? [...persistedCards, ...uploadingCards] : pendingCards;

  const removePending = (clientId: string) => {
    if (!onPendingChange) return;
    const removed = pendingAttachments.find((p) => p.clientId === clientId);
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    onPendingChange(pendingAttachments.filter((p) => p.clientId !== clientId));
  };

  return (
    <div
      ref={sectionRef}
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!sectionRef.current?.contains(e.relatedTarget as Node)) {
          setFocused(false);
        }
      }}
      onPaste={handlePaste}
      className="space-y-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
    >
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
          Task attachments
        </Label>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {persist
          ? "Paste screenshots with Ctrl+V / Cmd+V while this section is focused."
          : "Files are queued locally and upload automatically when you create the task. Paste screenshots with Ctrl+V / Cmd+V while this section is focused."}
      </p>

      {isLoading && persist ? (
        <p className="text-xs text-muted-foreground">Loading attachments…</p>
      ) : isError && persist ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-center">
          <p className="text-xs text-destructive">
            Could not load attachments{error ? `: ${parseApiError(error)}` : "."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 h-7 text-xs"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </div>
      ) : cards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 bg-muted/10 px-3 py-4 text-center text-xs text-muted-foreground">
          No task attachments yet
        </p>
      ) : (
        <div className="space-y-2">
          {cards.map((card) => (
            <EntityAttachmentCard
              key={card.id}
              item={card}
              disabled={disabled}
              onPreview={(target) =>
                setPreviewTarget({
                  ...target,
                  source: card.attachmentId ? "task" : undefined,
                })
              }
              onDownload={
                card.attachmentId
                  ? (item) => void downloadAttachment(item.attachmentId!, item.fileName)
                  : undefined
              }
              onDelete={
                persist
                  ? (item) => {
                      if (item.attachmentId) deleteMutation.mutate(item.attachmentId);
                    }
                  : (item) => removePending(item.id)
              }
            />
          ))}
        </div>
      )}

      <AttachmentPreviewModal
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
}

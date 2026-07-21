"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic, Paperclip, Upload } from "lucide-react";
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
import { VoiceNoteRecorderDialog } from "@/components/tasks/voice-note-recorder-dialog";
import { generateClientId } from "@/lib/generate-client-id";
import { cn } from "@/lib/utils";
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
  /** Premium empty/drop styling for the create-task drawer */
  createDrawer?: boolean;
}

export function TaskAttachmentsSection({
  taskId,
  persist = true,
  pendingAttachments = [],
  onPendingChange,
  disabled,
  createDrawer = false,
}: TaskAttachmentsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const [previewTarget, setPreviewTarget] = React.useState<AttachmentPreviewTarget | null>(null);
  const [voiceOpen, setVoiceOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
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
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled || !e.dataTransfer.files?.length) return;
        void handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "space-y-2.5 rounded-lg outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-violet-500/15",
        createDrawer && cards.length === 0 && "border border-dashed border-border/45 bg-muted/10 px-2.5 py-2 transition-all duration-200 hover:border-violet-500/30 hover:bg-violet-500/[0.04]",
        createDrawer && dragOver && "border-violet-500/35 bg-violet-500/[0.05]",
        createDrawer && focused && cards.length === 0 && "ring-2 ring-violet-500/10"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Label className={cn(
          "flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground",
          !createDrawer && "text-xs font-semibold uppercase tracking-wider"
        )}>
          <Paperclip className="h-3.5 w-3.5" />
          {createDrawer ? "Attachments" : "Task attachments"}
        </Label>
        <div className="flex items-center gap-1.5">
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
            className={cn(
              "h-7 text-[11px] transition-all duration-200",
              createDrawer && "rounded-md border-border/55"
            )}
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-7 text-[11px] transition-all duration-200",
              createDrawer && "rounded-md border-border/55"
            )}
            disabled={disabled}
            onClick={() => setVoiceOpen(true)}
          >
            <Mic className="mr-1.5 h-3.5 w-3.5" />
            Voice
          </Button>
        </div>
      </div>
      {!createDrawer ? (
        <p className="text-[11px] text-muted-foreground">
          {persist
            ? "Paste screenshots with Ctrl+V / Cmd+V while this section is focused."
            : "Files are queued locally and upload automatically when you create the task. Paste screenshots with Ctrl+V / Cmd+V while this section is focused."}
        </p>
      ) : cards.length === 0 ? (
        <p className="text-[11px] leading-snug text-muted-foreground/90">
          Drop files, paste screenshots, or upload.
        </p>
      ) : null}

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
        !createDrawer ? (
          <p className="rounded-lg border border-dashed border-border/50 bg-muted/10 px-3 py-4 text-center text-xs text-muted-foreground">
            No task attachments yet
          </p>
        ) : null
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
      <VoiceNoteRecorderDialog
        open={voiceOpen}
        onOpenChange={setVoiceOpen}
        onRecorded={(file) => void handleFiles([file])}
      />
    </div>
  );
}

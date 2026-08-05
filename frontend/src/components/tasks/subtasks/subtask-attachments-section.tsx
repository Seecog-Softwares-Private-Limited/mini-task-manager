"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Mic, Paperclip, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { parseApiError } from "@/services/api/client";
import {
  deleteEntityAttachment,
  downloadEntityAttachment,
  fetchEntityAttachments,
  fetchEntityAttachmentPreviewBlob,
  uploadEntityAttachment,
} from "@/services/api/entity-attachments.api";
import { createLocalPreviewUrl, isImageMime } from "@/lib/attachment-file-meta";
import { getClipboardImageFile, validateTaskPasteImageFile } from "@/lib/task-clipboard-image";
import { normalizePastedScreenshotFile } from "@/lib/screenshot-filename";
import { EntityAttachmentCard, type AttachmentCardItem } from "@/components/tasks/subtasks/entity-attachment-card";
import {
  AttachmentPreviewModal,
  type AttachmentPreviewTarget,
} from "@/components/tasks/subtasks/attachment-preview-modal";
import { VoiceNoteRecorderDialog } from "@/components/tasks/voice-note-recorder-dialog";
import { generateClientId } from "@/lib/generate-client-id";

export type PendingSubtaskAttachment = {
  clientId: string;
  file: File;
  previewUrl?: string;
};

interface SubtaskAttachmentsSectionProps {
  subtaskId: string;
  taskId?: string;
  /** When false, attachments stay in local pending state (create flow). */
  persist?: boolean;
  pendingAttachments?: PendingSubtaskAttachment[];
  onPendingChange?: (items: PendingSubtaskAttachment[]) => void;
  disabled?: boolean;
  sectionLabel?: string;
  emptyLabel?: string;
  queueHelpText?: string;
  persistHelpText?: string;
  /**
   * Daily completion: empty state is a single “Attach proof” control;
   * upload actions appear after tap (or when files already exist).
   */
  collapseEmpty?: boolean;
}

function pendingToCard(item: PendingSubtaskAttachment): AttachmentCardItem {
  return {
    id: item.clientId,
    fileName: item.file.name,
    mimeType: item.file.type,
    fileSize: item.file.size,
    /** Queued locally — uploads after the task is created. */
    status: "queued",
    localPreviewUrl: item.previewUrl,
  };
}

export function SubtaskAttachmentsSection({
  subtaskId,
  taskId,
  persist = true,
  pendingAttachments = [],
  onPendingChange,
  disabled,
  sectionLabel = "Subtask attachments",
  emptyLabel = "No subtask attachments yet",
  queueHelpText = "Files are queued locally and upload automatically when you create the task. Paste screenshots with Ctrl+V / Cmd+V while this section is focused.",
  persistHelpText = "Paste screenshots with Ctrl+V / Cmd+V while this section is focused.",
  collapseEmpty = false,
}: SubtaskAttachmentsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const [previewTarget, setPreviewTarget] = React.useState<AttachmentPreviewTarget | null>(null);
  const [voiceOpen, setVoiceOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [proofPickerOpen, setProofPickerOpen] = React.useState(false);
  const [thumbById, setThumbById] = React.useState<Record<string, string>>({});

  const queryKey = ["entity-attachments", "SUBTASK", subtaskId];
  const [uploadingFiles, setUploadingFiles] = React.useState<
    Array<{ tempId: string; file: File }>
  >([]);

  const { data: persisted = [], isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchEntityAttachments("SUBTASK", subtaskId, taskId),
    enabled: persist && Boolean(subtaskId),
    staleTime: 30_000,
  });

  const persistedKey = React.useMemo(
    () => persisted.map((a) => a.id).join(","),
    [persisted]
  );

  const uploadMutation = useMutation({
    mutationFn: ({ file }: { file: File; tempId: string }) =>
      uploadEntityAttachment("SUBTASK", subtaskId, file, taskId),
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
    mutationFn: (attachmentId: string) => deleteEntityAttachment(attachmentId),
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
        if (!isImageMime(attachment.mimeType)) continue;
        try {
          const blob = await fetchEntityAttachmentPreviewBlob(attachment.id);
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
    fileName: a.originalFileName,
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
  const cards = persist
    ? [...persistedCards, ...uploadingCards]
    : pendingCards;

  React.useEffect(() => {
    setProofPickerOpen(false);
  }, [subtaskId]);

  const showUploadActions =
    !collapseEmpty || proofPickerOpen || cards.length > 0 || uploadingFiles.length > 0;

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
          {sectionLabel}
        </Label>
        {showUploadActions ? (
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
              className="h-8 text-xs"
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
              className="h-8 text-xs"
              disabled={disabled}
              onClick={() => setVoiceOpen(true)}
            >
              <Mic className="mr-1.5 h-3.5 w-3.5" />
              Voice
            </Button>
          </div>
        ) : null}
      </div>
      {showUploadActions ? (
        <p className="text-[11px] text-muted-foreground">
          {persist ? persistHelpText : queueHelpText}
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
      ) : cards.length === 0 && collapseEmpty && !proofPickerOpen ? (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-center gap-2 text-sm"
          disabled={disabled}
          onClick={() => setProofPickerOpen(true)}
        >
          <ImagePlus className="h-4 w-4" />
          Attach proof
        </Button>
      ) : cards.length === 0 && !(collapseEmpty && proofPickerOpen) ? (
        <p className="rounded-lg border border-dashed border-border/50 bg-muted/10 px-3 py-4 text-center text-xs text-muted-foreground">
          {emptyLabel}
        </p>
      ) : cards.length === 0 ? null : (
        <div className="space-y-2">
          {cards.map((card) => (
            <EntityAttachmentCard
              key={card.id}
              item={card}
              disabled={disabled}
              onPreview={setPreviewTarget}
              onDownload={
                card.attachmentId
                  ? (item) =>
                      void downloadEntityAttachment(
                        item.attachmentId!,
                        item.fileName
                      )
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

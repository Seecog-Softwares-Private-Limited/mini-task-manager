"use client";

import { useRef, useState } from "react";
import { Mic, Paperclip, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createLocalPreviewUrl,
  formatFileSize,
  getAttachmentFileIcon,
  isImageMime,
} from "@/lib/attachment-file-meta";
import {
  getClipboardImageFile,
  validateTaskPasteImageFile,
} from "@/lib/task-clipboard-image";
import { normalizePastedScreenshotFile } from "@/lib/screenshot-filename";
import { generateClientId } from "@/lib/generate-client-id";
import type { PendingSubtaskAttachment } from "@/components/tasks/subtasks/subtask-attachments-section";
import { VoiceNoteRecorderDialog } from "@/components/tasks/voice-note-recorder-dialog";

interface SubtaskComposerAttachmentsProps {
  attachments: PendingSubtaskAttachment[];
  onChange: (items: PendingSubtaskAttachment[]) => void;
  disabled?: boolean;
  pasteFlash?: boolean;
}

function appendAttachmentFiles(
  attachments: PendingSubtaskAttachment[],
  files: FileList | File[]
): PendingSubtaskAttachment[] {
  const list = Array.from(files);
  if (!list.length) return attachments;
  const next = [...attachments];
  for (const file of list) {
    next.push({
      clientId: generateClientId(),
      file,
      previewUrl: createLocalPreviewUrl(file),
    });
  }
  return next;
}

export function processSubtaskComposerPaste(
  event: React.ClipboardEvent,
  attachments: PendingSubtaskAttachment[],
  onChange: (items: PendingSubtaskAttachment[]) => void,
  options?: { disabled?: boolean; onError?: (message: string) => void; onSuccess?: () => void }
): boolean {
  if (options?.disabled) return false;
  const image = getClipboardImageFile(event.clipboardData);
  if (!image) return false;
  event.preventDefault();
  event.stopPropagation();
  const err = validateTaskPasteImageFile(image);
  if (err) {
    options?.onError?.(err);
    return true;
  }
  const file = normalizePastedScreenshotFile(image);
  onChange(appendAttachmentFiles(attachments, [file]));
  options?.onSuccess?.();
  return true;
}

export function SubtaskComposerAttachments({
  attachments,
  onChange,
  disabled,
  pasteFlash,
}: SubtaskComposerAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);

  function addFiles(files: FileList | File[]) {
    onChange(appendAttachmentFiles(attachments, files));
  }

  function removeAttachment(clientId: string) {
    const removed = attachments.find((a) => a.clientId === clientId);
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    onChange(attachments.filter((a) => a.clientId !== clientId));
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-7 gap-1 rounded-md px-2 text-[10px] transition-all duration-200"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-3 w-3" />
          Attach
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-7 gap-1 rounded-md px-2 text-[10px] transition-all duration-200"
          onClick={() => setVoiceOpen(true)}
        >
          <Mic className="h-3 w-3" />
          Voice
        </Button>
        <span className="text-[10px] text-muted-foreground/80">
          Paste screenshots, upload files, or record a voice note.
        </span>
        {pasteFlash ? (
          <span className="animate-in fade-in text-[10px] font-medium text-emerald-600 duration-200 dark:text-emerald-400">
            Screenshot added
          </span>
        ) : null}
      </div>

      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((item) => {
            const { Icon } = getAttachmentFileIcon(item.file.type, item.file.name);
            const showThumb =
              isImageMime(item.file.type, item.file.name) && item.previewUrl;
            return (
              <div
                key={item.clientId}
                className="group/chip inline-flex max-w-[160px] items-center gap-1 rounded-md border border-border/50 bg-background/90 py-0.5 pl-0.5 pr-1 shadow-sm transition-all duration-200 hover:border-violet-500/25"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-muted/50">
                  {showThumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Icon className="h-3 w-3 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-medium leading-tight">
                    {item.file.name}
                  </p>
                  <p className="text-[9px] tabular-nums text-muted-foreground">
                    {formatFileSize(item.file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeAttachment(item.clientId)}
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-destructive"
                  aria-label={`Remove ${item.file.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <VoiceNoteRecorderDialog
        open={voiceOpen}
        onOpenChange={setVoiceOpen}
        onRecorded={(file) => addFiles([file])}
      />
    </div>
  );
}

/** Compact attachment indicator for saved subtask rows */
export function SubtaskRowAttachmentPreview({
  attachments,
  className,
}: {
  attachments: PendingSubtaskAttachment[];
  className?: string;
}) {
  if (!attachments.length) return null;
  const firstImage = attachments.find((a) =>
    isImageMime(a.file.type, a.file.name) && a.previewUrl
  );

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded border border-border/45 bg-muted/30 px-1 py-0.5",
        className
      )}
      title={`${attachments.length} attachment${attachments.length !== 1 ? "s" : ""}`}
    >
      {firstImage?.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={firstImage.previewUrl}
          alt=""
          className="h-4 w-4 rounded-[3px] object-cover"
        />
      ) : (
        <Upload className="h-3 w-3 text-muted-foreground" aria-hidden />
      )}
      <span className="text-[9px] font-medium tabular-nums text-muted-foreground">
        {attachments.length}
      </span>
    </span>
  );
}

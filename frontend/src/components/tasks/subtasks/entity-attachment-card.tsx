"use client";

import * as React from "react";
import { Download, Eye, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatFileSize,
  formatAttachmentDisplayName,
  getAttachmentFileIcon,
  isImageMime,
} from "@/lib/attachment-file-meta";
import type { AttachmentPreviewTarget } from "@/components/tasks/subtasks/attachment-preview-modal";

export type AttachmentCardItem = {
  id: string;
  fileName: string;
  mimeType?: string;
  fileSize: number;
  status: "pending" | "queued" | "uploading" | "done" | "error";
  error?: string;
  /** Blob URL for local pending image thumbnails. */
  localPreviewUrl?: string;
  /** Persisted attachment id for download/preview. */
  attachmentId?: string;
};

interface EntityAttachmentCardProps {
  item: AttachmentCardItem;
  onPreview?: (target: AttachmentPreviewTarget) => void;
  onDownload?: (item: AttachmentCardItem) => void;
  onDelete?: (item: AttachmentCardItem) => void;
  /** When true, only delete is disabled — preview and download stay available. */
  disabled?: boolean;
}

export function EntityAttachmentCard({
  item,
  onPreview,
  onDownload,
  onDelete,
  disabled,
}: EntityAttachmentCardProps) {
  const { Icon, label } = getAttachmentFileIcon(item.mimeType, item.fileName);
  const displayName = formatAttachmentDisplayName(item.fileName, { mimeType: item.mimeType });
  const showThumb = isImageMime(item.mimeType) && item.localPreviewUrl;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/60 bg-background/80 p-2.5 shadow-sm",
        item.status === "error" && "border-destructive/40 bg-destructive/5"
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/50 ring-1 ring-border/30">
        {showThumb ? (
          <img
            src={item.localPreviewUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon className="h-5 w-5 text-muted-foreground" aria-label={label} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatFileSize(item.fileSize)}
          {item.status === "uploading" && (
            <span className="ml-2 inline-flex items-center gap-1 text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading…
            </span>
          )}
          {item.status === "queued" && (
            <span className="ml-2 text-muted-foreground">Saves with task</span>
          )}
          {item.status === "pending" && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">Pending</span>
          )}
          {item.status === "error" && (
            <span className="ml-2 text-destructive">{item.error ?? "Failed"}</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {onPreview ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={item.status === "uploading"}
            onClick={() =>
              onPreview({
                id: item.attachmentId ?? (item.status === "done" ? item.id : undefined),
                fileName: item.fileName,
                mimeType: item.mimeType,
                localPreviewUrl: item.localPreviewUrl,
              })
            }
            aria-label="Preview"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        {onDownload ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={item.status !== "done"}
            onClick={() => onDownload(item)}
            aria-label="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            disabled={disabled || item.status === "uploading"}
            onClick={() => onDelete(item)}
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

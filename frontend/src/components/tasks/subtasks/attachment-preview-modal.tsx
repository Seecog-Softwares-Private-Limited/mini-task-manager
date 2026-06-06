"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Download,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadAttachment, fetchAttachmentBlob } from "@/services/api/attachments.api";
import {
  downloadEntityAttachment,
  fetchEntityAttachmentPreviewBlob,
} from "@/services/api/entity-attachments.api";
import {
  ensurePreviewBlob,
  isImageMime,
  isPdfMime,
  isTextPreviewMime,
} from "@/lib/attachment-file-meta";

const PREVIEW_Z = "z-[270]";

export interface AttachmentPreviewTarget {
  id?: string;
  fileName: string;
  mimeType?: string;
  /** Local blob URL for pending (not yet uploaded) files. */
  localPreviewUrl?: string;
  /** Defaults to entity attachments API. */
  source?: "entity" | "task";
}

interface AttachmentPreviewModalProps {
  target: AttachmentPreviewTarget | null;
  onClose: () => void;
}

export function AttachmentPreviewModal({ target, onClose }: AttachmentPreviewModalProps) {
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [textContent, setTextContent] = React.useState<string | null>(null);
  const [unsupported, setUnsupported] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);

  const open = Boolean(target);
  const mimeType = target?.mimeType;
  const fileName = target?.fileName ?? "file";
  const isImage = isImageMime(mimeType, fileName);
  const isPdf = isPdfMime(mimeType, fileName);
  const isText = isTextPreviewMime(mimeType, fileName);

  React.useEffect(() => {
    if (!target) {
      setBlobUrl(null);
      setTextContent(null);
      setUnsupported(false);
      setError(null);
      setZoom(1);
      return;
    }

    let revoked: string | null = null;
    setLoading(true);
    setError(null);
    setUnsupported(false);
    setTextContent(null);
    setZoom(1);

    const load = async () => {
      try {
        if (target.localPreviewUrl) {
          if (isText) {
            const blob = await fetch(target.localPreviewUrl).then((r) => r.blob());
            setTextContent(await blob.text());
          } else if (isPdf) {
            const blob = await fetch(target.localPreviewUrl).then((r) => r.blob());
            const pdfBlob =
              blob.type === "application/pdf"
                ? blob
                : new Blob([blob], { type: "application/pdf" });
            const url = URL.createObjectURL(pdfBlob);
            revoked = url;
            setBlobUrl(url);
          } else {
            setBlobUrl(target.localPreviewUrl);
          }
          if (!isImage && !isPdf && !isText) setUnsupported(true);
          return;
        }
        if (!target.id) {
          setUnsupported(true);
          return;
        }

        if (!isImage && !isPdf && !isText) {
          setUnsupported(true);
          return;
        }

        const rawBlob =
          target.source === "task"
            ? await fetchAttachmentBlob(target.id, fileName)
            : await fetchEntityAttachmentPreviewBlob(target.id);
        if (isText) {
          const text = await rawBlob.text();
          setTextContent(text);
          return;
        }
        const blob = ensurePreviewBlob(rawBlob, mimeType, fileName);
        const url = URL.createObjectURL(blob);
        revoked = url;
        setBlobUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load preview");
      } finally {
        setLoading(false);
      }
    };

    void load();

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [target, isImage, isPdf, isText]);

  const handleDownload = async () => {
    if (target?.localPreviewUrl && !target.id) {
      const a = document.createElement("a");
      a.href = target.localPreviewUrl;
      a.download = fileName;
      a.click();
      return;
    }
    if (!target?.id) return;
    if (target.source === "task") {
      await downloadAttachment(target.id, fileName);
      return;
    }
    await downloadEntityAttachment(target.id, fileName);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            PREVIEW_Z,
            "fixed inset-0 bg-black/85 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <Dialog.Content
          className={cn(
            PREVIEW_Z,
            "fixed left-1/2 top-1/2 flex max-h-[min(92vh,calc(100dvh-1.5rem))] w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl outline-none"
          )}
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
            <Dialog.Title className="min-w-0 flex-1 truncate text-sm font-medium text-white">
              {fileName}
            </Dialog.Title>
            {isImage && blobUrl ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                  aria-label="Zoom out"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => setZoom(1)}
                  aria-label="Reset zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                  aria-label="Zoom in"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            {target?.id || target?.localPreviewUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => void handleDownload()}
                aria-label="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            ) : null}
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-auto p-4">
            {loading ? (
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            ) : error ? (
              <p className="text-sm text-red-300">{error}</p>
            ) : unsupported ? (
              <div className="max-w-md space-y-4 text-center">
                <p className="text-sm text-white/80">
                  Preview is not available for this file type.
                </p>
                {target?.id || target?.localPreviewUrl ? (
                  <Button type="button" variant="secondary" onClick={() => void handleDownload()}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                ) : null}
              </div>
            ) : isText && textContent != null ? (
              <pre className="max-h-full w-full overflow-auto rounded-lg bg-black/40 p-4 text-left text-xs leading-relaxed text-white/90">
                {textContent}
              </pre>
            ) : isPdf && blobUrl ? (
              <iframe
                src={blobUrl}
                title={fileName}
                className="h-[min(70vh,600px)] w-full rounded-lg bg-white"
              />
            ) : isImage && blobUrl ? (
              <img
                src={blobUrl}
                alt={fileName}
                className="max-h-[min(70vh,600px)] max-w-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

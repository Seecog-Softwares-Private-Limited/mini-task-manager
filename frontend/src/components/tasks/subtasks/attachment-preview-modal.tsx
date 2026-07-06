"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import DOMPurify from "dompurify";
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
import { parseApiError } from "@/services/api/client";
import {
  downloadAttachment,
  fetchAttachmentBlob,
  tryFetchTaskAttachmentRenderedPreview,
} from "@/services/api/attachments.api";
import {
  downloadEntityAttachment,
  fetchEntityAttachmentBlob,
  tryFetchEntityAttachmentRenderedPreview,
} from "@/services/api/entity-attachments.api";
import {
  isLegacyDocMime,
  isOfficeDocumentPreviewable,
  renderDocumentPreview,
} from "@/lib/attachment-document-preview";
import {
  ensurePreviewBlob,
  formatAttachmentDisplayName,
  friendlyAttachmentLoadError,
  inferMimeTypeFromFileName,
  isImageMime,
  isPdfMime,
  isTextPreviewMime,
} from "@/lib/attachment-file-meta";

const PREVIEW_Z = "z-[270]";

const OFFICE_HTML_PURIFY = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "caption", "colgroup", "col", "pre"],
  ADD_ATTR: ["colspan", "rowspan", "scope", "id", "class"],
};

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

async function fetchPreviewBlob(
  target: AttachmentPreviewTarget,
  fileName: string
): Promise<Blob> {
  if (target.localPreviewUrl) {
    return fetch(target.localPreviewUrl).then((r) => r.blob());
  }
  if (!target.id) {
    throw new Error("No attachment available to preview");
  }

  const id = target.id;
  const attempts: Array<() => Promise<Blob>> =
    target.source === "task"
      ? [
          () => fetchAttachmentBlob(id, fileName),
          () => fetchEntityAttachmentBlob(id),
        ]
      : target.source === "entity"
        ? [
            () => fetchEntityAttachmentBlob(id),
            () => fetchAttachmentBlob(id, fileName),
          ]
        : [
            () => fetchEntityAttachmentBlob(id),
            () => fetchAttachmentBlob(id, fileName),
          ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Could not load this attachment.");
}

async function tryFetchRenderedOfficePreview(
  target: AttachmentPreviewTarget
): Promise<string | null> {
  if (!target.id) return null;
  const rendered =
    target.source === "task"
      ? await tryFetchTaskAttachmentRenderedPreview(target.id)
      : await tryFetchEntityAttachmentRenderedPreview(target.id);
  if (!rendered?.content?.trim()) return null;
  return DOMPurify.sanitize(rendered.content, OFFICE_HTML_PURIFY);
}

function officePreviewFallbackMessage(fileName: string, mimeType: string): string {
  if (isLegacyDocMime(mimeType, fileName)) {
    return "Could not preview this .doc file. Download it to open in Word.";
  }
  return "Could not read this document. Try downloading the file instead.";
}

export function AttachmentPreviewModal({ target, onClose }: AttachmentPreviewModalProps) {
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [textContent, setTextContent] = React.useState<string | null>(null);
  const [htmlContent, setHtmlContent] = React.useState<string | null>(null);
  const [unsupported, setUnsupported] = React.useState(false);
  const [unsupportedReason, setUnsupportedReason] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);

  const open = Boolean(target);
  const rawFileName = target?.fileName ?? "file";
  const fileName = formatAttachmentDisplayName(rawFileName, {
    mimeType: target?.mimeType || inferMimeTypeFromFileName(rawFileName),
  });
  const resolvedMime = target?.mimeType || inferMimeTypeFromFileName(rawFileName);
  const isImage = isImageMime(resolvedMime, fileName);
  const isPdf = isPdfMime(resolvedMime, fileName);
  const isText = isTextPreviewMime(resolvedMime, fileName);
  const isOfficeDocument = isOfficeDocumentPreviewable(resolvedMime, fileName);

  React.useEffect(() => {
    if (!target) {
      setBlobUrl(null);
      setTextContent(null);
      setHtmlContent(null);
      setUnsupported(false);
      setUnsupportedReason(null);
      setError(null);
      setZoom(1);
      return;
    }

    let revoked: string | null = null;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setUnsupported(false);
    setUnsupportedReason(null);
    setTextContent(null);
    setHtmlContent(null);
    setBlobUrl(null);
    setZoom(1);

    const finishUnsupported = (reason: string) => {
      if (cancelled) return;
      setUnsupported(true);
      setUnsupportedReason(reason);
    };

    const load = async () => {
      try {
        if (!target.localPreviewUrl && !target.id) {
          finishUnsupported("Preview is not available for this file.");
          return;
        }

        if (isLegacyDocMime(resolvedMime, fileName)) {
          const html = await tryFetchRenderedOfficePreview(target);
          if (cancelled) return;
          if (html) {
            setHtmlContent(html);
            return;
          }
          finishUnsupported(officePreviewFallbackMessage(fileName, resolvedMime));
          return;
        }

        if (isOfficeDocument) {
          let rawBlob: Blob;
          try {
            rawBlob = await fetchPreviewBlob(target, fileName);
          } catch (blobErr) {
            finishUnsupported(friendlyAttachmentLoadError(parseApiError(blobErr)));
            return;
          }
          if (cancelled) return;

          const clientResult = await renderDocumentPreview(rawBlob, fileName, resolvedMime);
          if (clientResult.kind === "html") {
            setHtmlContent(clientResult.html);
            return;
          }

          const serverHtml = await tryFetchRenderedOfficePreview(target);
          if (cancelled) return;
          if (serverHtml) {
            setHtmlContent(serverHtml);
            return;
          }

          finishUnsupported(
            clientResult.kind === "unsupported"
              ? clientResult.reason
              : officePreviewFallbackMessage(fileName, resolvedMime)
          );
          return;
        }

        const rawBlob = await fetchPreviewBlob(target, fileName);
        if (cancelled) return;

        if (isText) {
          setTextContent(await rawBlob.text());
          return;
        }

        if (isPdf) {
          const blob = ensurePreviewBlob(rawBlob, resolvedMime, fileName);
          const url = URL.createObjectURL(blob);
          revoked = url;
          setBlobUrl(url);
          return;
        }

        if (isImage) {
          const blob = ensurePreviewBlob(rawBlob, resolvedMime, fileName);
          const url = URL.createObjectURL(blob);
          revoked = url;
          setBlobUrl(url);
          return;
        }

        finishUnsupported("Preview is not available for this file type.");
      } catch (err) {
        finishUnsupported(
          friendlyAttachmentLoadError(
            parseApiError(err) || officePreviewFallbackMessage(fileName, resolvedMime)
          )
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load().catch(() => {
      if (cancelled) return;
      finishUnsupported(officePreviewFallbackMessage(fileName, resolvedMime));
      setLoading(false);
    });

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [target, fileName, resolvedMime, isImage, isPdf, isText, isOfficeDocument]);

  const handleDownload = async () => {
    try {
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
    } catch (err) {
      setUnsupported(true);
      setUnsupportedReason(parseApiError(err));
    }
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
                  {unsupportedReason ?? "Preview is not available for this file type."}
                </p>
                {target?.id || target?.localPreviewUrl ? (
                  <Button type="button" variant="secondary" onClick={() => void handleDownload()}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                ) : null}
              </div>
            ) : htmlContent ? (
              <div
                className="max-h-full w-full overflow-auto rounded-lg bg-white p-6 text-left text-sm text-slate-900 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1 [&_p]:mb-2"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
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

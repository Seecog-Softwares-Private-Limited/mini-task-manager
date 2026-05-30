"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X, ImageIcon, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Above task modal (z-50) and upgrade modal (z-250). */
const LIGHTBOX_Z = "z-[260]";

export type DescriptionImagePreviewItem = {
  id: string;
  /** Set when the preview is backed by a persisted task attachment. */
  attachmentId?: string;
  previewUrl: string;
  fileName: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

interface TaskDescriptionImagePreviewsProps {
  items: DescriptionImagePreviewItem[];
  onRemove?: (id: string) => void;
  className?: string;
}

function ImageLightbox({
  items,
  activeId,
  onClose,
  onChange,
}: {
  items: DescriptionImagePreviewItem[];
  activeId: string;
  onClose: () => void;
  onChange: (id: string) => void;
}) {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const active = items[activeIndex];
  const open = Boolean(active?.previewUrl);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && activeIndex > 0) {
        event.preventDefault();
        onChange(items[activeIndex - 1].id);
      }
      if (event.key === "ArrowRight" && activeIndex < items.length - 1) {
        event.preventDefault();
        onChange(items[activeIndex + 1].id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, activeIndex, items, onChange]);

  if (!active?.previewUrl) return null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            LIGHTBOX_Z,
            "fixed inset-0 bg-black/90 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <Dialog.Content
          className={cn(
            LIGHTBOX_Z,
            "fixed left-1/2 top-1/2 flex max-h-[min(92vh,calc(100dvh-1.5rem))] w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          aria-label={`Image preview: ${active.fileName}`}
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate text-sm font-medium text-white">
                {active.fileName}
              </Dialog.Title>
              {items.length > 1 ? (
                <Dialog.Description className="text-xs text-white/50">
                  Image {activeIndex + 1} of {items.length}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 py-4 sm:px-6 sm:py-5">
            {activeIndex > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 sm:left-4"
                onClick={() => onChange(items[activeIndex - 1].id)}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : null}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.previewUrl}
              alt={active.fileName}
              className="max-h-[min(68vh,calc(100dvh-12rem))] w-auto max-w-full select-none rounded-lg object-contain"
              draggable={false}
            />

            {activeIndex < items.length - 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 sm:right-4"
                onClick={() => onChange(items[activeIndex + 1].id)}
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            ) : null}
          </div>

          <p className="shrink-0 border-t border-white/10 px-4 py-2.5 text-center text-[11px] text-white/45 sm:px-5">
            Press Esc to close · Use arrow keys to navigate
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function TaskDescriptionImagePreviews({
  items,
  onRemove,
  className,
}: TaskDescriptionImagePreviewsProps) {
  const [lightboxId, setLightboxId] = React.useState<string | null>(null);
  const viewableItems = React.useMemo(
    () => items.filter((item) => item.status === "done" && item.previewUrl),
    [items]
  );

  if (items.length === 0) return null;

  return (
    <>
      <div className={cn("space-y-2", className)}>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
          Pasted images
        </p>
        <ul className="flex flex-wrap gap-2" role="list">
          {items.map((item) => {
            const canOpen = item.status === "done" && Boolean(item.previewUrl);
            return (
              <li
                key={item.id}
                title={canOpen ? `${item.fileName} — click to enlarge` : item.fileName}
                className={cn(
                  "relative h-20 w-20 overflow-hidden rounded-lg ring-1 ring-border/40",
                  item.status === "error" && "ring-destructive/40",
                  canOpen && "cursor-zoom-in transition-shadow hover:ring-primary/40 hover:shadow-md"
                )}
              >
                {canOpen ? (
                  <button
                    type="button"
                    className="block h-full w-full appearance-none border-0 bg-transparent p-0 text-left"
                    onClick={() => setLightboxId(item.id)}
                    aria-label={`Open ${item.fileName}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt={item.fileName}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : item.previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.previewUrl}
                    alt={item.fileName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted/40">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
                  </div>
                )}
                {(item.status === "uploading" || item.status === "pending") && item.previewUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
                  </div>
                )}
                {item.status === "error" && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-destructive/10 p-1 text-center"
                    title={item.error}
                  >
                    <AlertCircle className="h-4 w-4 text-destructive" aria-hidden />
                    <span className="text-[9px] leading-tight text-destructive">Failed</span>
                  </div>
                )}
                {item.status === "done" && (
                  <span className="pointer-events-none absolute bottom-0 left-0 right-0 bg-emerald-600/90 px-1 py-0.5 text-center text-[9px] font-medium text-white">
                    Saved
                  </span>
                )}
                {onRemove && item.status !== "uploading" && !item.attachmentId && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-0.5 top-0.5 z-10 h-5 w-5 rounded-full bg-background/90 shadow-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(item.id);
                    }}
                    aria-label={`Remove ${item.fileName}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/75">
          <ImageIcon className="h-3 w-3 shrink-0" aria-hidden />
          Click a thumbnail to enlarge · Paste with Ctrl+V / ⌘V while the description field is focused
        </p>
      </div>

      {lightboxId ? (
        <ImageLightbox
          items={viewableItems}
          activeId={lightboxId}
          onClose={() => setLightboxId(null)}
          onChange={setLightboxId}
        />
      ) : null}
    </>
  );
}

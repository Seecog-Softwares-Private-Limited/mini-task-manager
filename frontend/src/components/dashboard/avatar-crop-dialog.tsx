"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AVATAR_CROP_CIRCLE,
  AVATAR_CROP_VIEWPORT,
  cropAvatarToBlob,
  getBaseFitScaleFromSize,
  loadImage,
  type AvatarCropState,
} from "@/lib/avatar-crop";
import { cn } from "@/lib/utils";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

interface AvatarCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File) => Promise<void>;
  isUploading?: boolean;
}

export function AvatarCropDialog({
  open,
  imageSrc,
  onOpenChange,
  onConfirm,
  isUploading,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState<AvatarCropState>({ zoom: 1, panX: 0, panY: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const maskId = useRef(`avatar-crop-mask-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    if (!open || !imageSrc) return;
    setCrop({ zoom: 1, panX: 0, panY: 0 });
    loadImage(imageSrc)
      .then((img) => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight }))
      .catch(() => setNaturalSize({ w: 0, h: 0 }));
  }, [open, imageSrc]);

  const scale =
    naturalSize.w > 0
      ? getBaseFitScaleFromSize(naturalSize.w, naturalSize.h, AVATAR_CROP_VIEWPORT) * crop.zoom
      : 1;
  const displayW = naturalSize.w * scale;
  const displayH = naturalSize.h * scale;

  const setZoom = useCallback((next: number) => {
    setCrop((prev) => ({
      ...prev,
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)),
    }));
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageSrc) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: crop.panX,
      panY: crop.panY,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setCrop((prev) => ({
      ...prev,
      panX: dragRef.current!.panX + (e.clientX - dragRef.current!.startX),
      panY: dragRef.current!.panY + (e.clientY - dragRef.current!.startY),
    }));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  async function handleSave() {
    if (!imageSrc) return;
    setIsSaving(true);
    try {
      const blob = await cropAvatarToBlob(imageSrc, crop);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      await onConfirm(file);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  const busy = isUploading || isSaving;
  const zoomPercent = Math.round(crop.zoom * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Adjust profile photo</DialogTitle>
          <DialogDescription>
            Drag to reposition, then zoom and crop before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div
            className={cn(
              "relative mx-auto touch-none select-none overflow-hidden rounded-xl bg-muted",
              "cursor-grab active:cursor-grabbing"
            )}
            style={{ width: AVATAR_CROP_VIEWPORT, height: AVATAR_CROP_VIEWPORT }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {imageSrc && naturalSize.w > 0 && (
              <img
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{
                  left: "50%",
                  top: "50%",
                  width: displayW,
                  height: displayH,
                  transform: `translate(calc(-50% + ${crop.panX}px), calc(-50% + ${crop.panY}px))`,
                }}
              />
            )}

            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden
            >
              <defs>
                <mask id={maskId.current}>
                  <rect width="100%" height="100%" fill="white" />
                  <circle
                    cx={AVATAR_CROP_VIEWPORT / 2}
                    cy={AVATAR_CROP_VIEWPORT / 2}
                    r={AVATAR_CROP_CIRCLE / 2}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.52)"
                mask={`url(#${maskId.current})`}
              />
              <circle
                cx={AVATAR_CROP_VIEWPORT / 2}
                cy={AVATAR_CROP_VIEWPORT / 2}
                r={AVATAR_CROP_CIRCLE / 2}
                fill="none"
                stroke="white"
                strokeWidth="2"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Zoom</span>
              <span className="tabular-nums font-medium text-foreground">{zoomPercent}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={busy || crop.zoom <= MIN_ZOOM}
                onClick={() => setZoom(crop.zoom - ZOOM_STEP)}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={ZOOM_STEP}
                value={crop.zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                disabled={busy}
                className="h-2 flex-1 cursor-pointer accent-primary"
                aria-label="Zoom level"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={busy || crop.zoom >= MAX_ZOOM}
                onClick={() => setZoom(crop.zoom + ZOOM_STEP)}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground"
              disabled={busy}
              onClick={() => setCrop({ zoom: 1, panX: 0, panY: 0 })}
            >
              Reset position & zoom
            </Button>
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/20 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={busy || !imageSrc} onClick={() => void handleSave()}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save photo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

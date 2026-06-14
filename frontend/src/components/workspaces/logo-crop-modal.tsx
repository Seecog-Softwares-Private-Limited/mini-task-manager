"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoCropModalProps {
  open: boolean;
  imageSrc: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const CANVAS_SIZE = 320; // output image size in px
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

export function LogoCropModal({
  open,
  imageSrc,
  onConfirm,
  onCancel,
}: LogoCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Reset whenever a new image is loaded
  useEffect(() => {
    if (open) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

  // Preload image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => { imageRef.current = img; };
    img.src = imageSrc;
  }, [imageSrc]);

  /* ── drag handlers ── */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  }, []);

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  /* ── zoom via wheel ── */
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - e.deltaY * 0.001)));
  }, []);

  /* ── crop & output ── */
  const handleConfirm = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // The viewport is square (VIEWPORT_PX × VIEWPORT_PX).
    // Image is drawn centered + offset + zoomed.
    const VIEWPORT_PX = 256;
    const scale = zoom * Math.min(VIEWPORT_PX / img.naturalWidth, VIEWPORT_PX / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const centerX = VIEWPORT_PX / 2 + offset.x;
    const centerY = VIEWPORT_PX / 2 + offset.y;

    // Map viewport crop to canvas output
    const ratio = CANVAS_SIZE / VIEWPORT_PX;
    ctx.drawImage(
      img,
      (centerX - drawW / 2) * ratio,
      (centerY - drawH / 2) * ratio,
      drawW * ratio,
      drawH * ratio,
    );

    onConfirm(canvas.toDataURL("image/png"));
  }, [zoom, offset, onConfirm]);

  const VIEWPORT_PX = 256;
  // Base scale: fit image inside viewport
  const naturalFit = imageRef.current
    ? Math.min(VIEWPORT_PX / imageRef.current.naturalWidth, VIEWPORT_PX / imageRef.current.naturalHeight)
    : 1;
  const displayScale = zoom * naturalFit;
  const imgW = imageRef.current ? imageRef.current.naturalWidth * displayScale : 0;
  const imgH = imageRef.current ? imageRef.current.naturalHeight * displayScale : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Adjust logo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Viewport */}
          <div className="flex flex-col items-center gap-3">
            <div
              ref={viewportRef}
              className={cn(
                "relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-muted/30",
                isDragging ? "cursor-grabbing" : "cursor-grab",
              )}
              style={{ width: VIEWPORT_PX, height: VIEWPORT_PX }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
            >
              {/* Image */}
              {imageSrc && (
                <img
                  src={imageSrc}
                  alt="Logo preview"
                  draggable={false}
                  style={{
                    position: "absolute",
                    width: imgW,
                    height: imgH,
                    left: VIEWPORT_PX / 2 - imgW / 2 + offset.x,
                    top: VIEWPORT_PX / 2 - imgH / 2 + offset.y,
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                />
              )}
              {/* Grid overlay */}
              <div className="pointer-events-none absolute inset-0 border border-white/20" />
              {/* Crosshair */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-px w-8 bg-white/40" />
              </div>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-px bg-white/40" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Drag to reposition · scroll to zoom</p>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <input
              type="range"
              min={MIN_ZOOM * 100}
              max={MAX_ZOOM * 100}
              step={5}
              value={Math.round(zoom * 100)}
              onChange={(e) => setZoom(Number(e.target.value) / 100)}
              className="flex-1 accent-primary"
              aria-label="Zoom level"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
              aria-label="Reset"
              title="Reset zoom & position"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <p className="text-center text-xs font-medium tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

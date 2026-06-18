"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogIconBadge, type DialogIconVariant } from "@/components/ui/dialog-icon-badge";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  icon?: DialogIconVariant | "none";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
  /** Renders above sheet/drawer overlays (e.g. task detail modal). */
  elevated?: boolean;
}

function resolveIcon(
  variant: ConfirmDialogProps["variant"],
  icon: ConfirmDialogProps["icon"]
): DialogIconVariant | null {
  if (icon === "none") return null;
  if (icon === "warning" || icon === "delete") return icon;
  if (variant === "destructive") return "delete";
  return null;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  icon,
  onConfirm,
  onCancel,
  loading = false,
  className,
  elevated = false,
}: ConfirmDialogProps) {
  const [isLoading, setLoading] = React.useState(false);
  const busy = loading || isLoading;
  const resolvedIcon = resolveIcon(variant, icon);
  const showHeaderText = Boolean(title?.trim() || description?.trim());
  const dialogLabel = title?.trim() || confirmLabel;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const headerTone =
    resolvedIcon === "delete"
      ? "border-red-100 bg-gradient-to-b from-red-50/80 to-white"
      : resolvedIcon === "warning"
        ? "border-amber-100 bg-gradient-to-b from-amber-50/80 to-white"
        : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={!busy}
        className={cn(
          resolvedIcon ? "gap-0 overflow-hidden p-0 sm:max-w-[425px]" : "sm:max-w-[425px]",
          elevated && "z-[120]",
          className
        )}
        overlayClassName={cn(
          resolvedIcon ? "bg-slate-900/55 backdrop-blur-sm" : undefined,
          elevated && "z-[120]"
        )}
        aria-labelledby={showHeaderText ? "confirm-dialog-title" : undefined}
        aria-label={!showHeaderText ? dialogLabel : undefined}
        aria-describedby={description?.trim() ? "confirm-dialog-desc" : undefined}
      >
        {resolvedIcon ? (
          <div className={cn("border-b px-6 pb-5 pt-6", headerTone)}>
            <DialogHeader className="space-y-0 text-left">
              <div
                className={cn(
                  "flex items-start gap-3.5",
                  !showHeaderText && "justify-center"
                )}
              >
                <DialogIconBadge variant={resolvedIcon} />
                {showHeaderText ? (
                  <div className="min-w-0 space-y-1.5 pt-0.5 pr-6">
                    {title?.trim() ? (
                      <DialogTitle id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
                        {title}
                      </DialogTitle>
                    ) : null}
                    {description?.trim() ? (
                      <DialogDescription
                        id="confirm-dialog-desc"
                        className="text-sm leading-relaxed text-slate-600"
                      >
                        {description}
                      </DialogDescription>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </DialogHeader>
          </div>
        ) : (
          <DialogHeader>
            {title?.trim() ? (
              <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
            ) : null}
            {description?.trim() ? (
              <DialogDescription id="confirm-dialog-desc">{description}</DialogDescription>
            ) : null}
          </DialogHeader>
        )}
        <DialogFooter className={cn("gap-2 sm:gap-0", resolvedIcon && "px-6 py-4")}>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={busy}
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={busy}
            aria-label={confirmLabel}
          >
            {busy ? "..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

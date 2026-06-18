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
import { DialogIconBadge } from "@/components/ui/dialog-icon-badge";
import { cn } from "@/lib/utils";

export interface NoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  actionLabel?: string;
  variant?: "warning";
  className?: string;
}

export function NoticeDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel = "OK",
  variant = "warning",
  className,
}: NoticeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose
        className={cn("gap-0 overflow-hidden p-0 sm:max-w-[425px]", className)}
        overlayClassName="bg-slate-900/55 backdrop-blur-sm"
        aria-labelledby="notice-dialog-title"
        aria-describedby={description ? "notice-dialog-desc" : undefined}
      >
        <div
          className={cn(
            "border-b px-6 pb-5 pt-6",
            variant === "warning" && "border-amber-100 bg-gradient-to-b from-amber-50/80 to-white"
          )}
        >
          <DialogHeader className="space-y-0 text-left">
            <div className="flex items-start gap-3.5">
              <DialogIconBadge variant="warning" />
              <div className="min-w-0 space-y-1.5 pt-0.5 pr-6">
                <DialogTitle id="notice-dialog-title" className="text-lg font-semibold text-slate-900">
                  {title}
                </DialogTitle>
                {description && (
                  <DialogDescription
                    id="notice-dialog-desc"
                    className="text-sm leading-relaxed text-slate-600"
                  >
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>
        <DialogFooter className="gap-2 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            aria-label={actionLabel}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface NoticeDialogState {
  open: boolean;
  title: string;
  description?: string;
}

export function useNoticeDialog() {
  const [state, setState] = React.useState<NoticeDialogState>({
    open: false,
    title: "",
    description: undefined,
  });

  const showNotice = React.useCallback((title: string, description?: string) => {
    setState({ open: true, title, description });
  }, []);

  const dismissNotice = React.useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const noticeDialogProps: NoticeDialogProps = {
    open: state.open,
    onOpenChange: (open) => {
      if (!open) dismissNotice();
    },
    title: state.title,
    description: state.description,
  };

  return { showNotice, dismissNotice, noticeDialogProps };
}

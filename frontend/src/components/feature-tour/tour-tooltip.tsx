"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getTourSeen, setTourSeen } from "@/lib/feature-tour-storage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TourStep = {
  id: string;
  target: string; // data-tour-id
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
};

type TourTooltipProps = {
  tourId: string;
  steps: TourStep[];
  onComplete?: () => void;
};

export function TourTooltip({ tourId, steps, onComplete }: TourTooltipProps) {
  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || getTourSeen(tourId) || steps.length === 0) return;
    setOpen(true);
  }, [mounted, tourId, steps.length]);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  function handleNext() {
    if (isLast) {
      setTourSeen(tourId);
      setOpen(false);
      onComplete?.();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function handleDismiss() {
    setTourSeen(tourId);
    setOpen(false);
    onComplete?.();
  }

  if (!mounted || !open || !step) return null;

  const el = typeof document !== "undefined" ? document.querySelector(`[data-tour-id="${step.target}"]`) : null;
  const rect = el?.getBoundingClientRect();

  const style = rect
    ? {
        left: Math.max(8, Math.min(rect.left + rect.width / 2 - 140, window.innerWidth - 280)),
        top: rect.bottom + 8,
      }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" as const };

  const tooltip = (
    <div
      className={cn(
        "fixed z-[100] w-72 max-w-[calc(100vw-16px)] rounded-lg border bg-card p-4 shadow-lg",
        "animate-in fade-in duration-200"
      )}
      style={style}
      role="dialog"
      aria-labelledby={`tour-title-${tourId}`}
      aria-describedby={`tour-body-${tourId}`}
    >
      <h4 id={`tour-title-${tourId}`} className="font-semibold">
        {step.title}
      </h4>
      <p id={`tour-body-${tourId}`} className="mt-1 text-sm text-muted-foreground">
        {step.body}
      </p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {stepIndex + 1} of {steps.length}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Skip
          </Button>
          <Button size="sm" onClick={handleNext}>
            {isLast ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(tooltip, document.body);
}

"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const SPARK_ANGLES = [0, 55, 110, 180, 235, 300];

type TaskCreateCelebrationProps = {
  /** Call when this burst should end (parent typically sets burst counter to 0). */
  onComplete: () => void;
  className?: string;
};

/**
 * Very light “celebration” on successful task create: soft center pulse, thin ring, micro sparks.
 * Renders in a portal; pointer-events none. Parent should mount with a changing `key` per trigger.
 */
export function TaskCreateCelebration({ onComplete, className }: TaskCreateCelebrationProps) {
  useEffect(() => {
    const t = window.setTimeout(() => onComplete(), 820);
    return () => window.clearTimeout(t);
  }, [onComplete]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-[200] flex items-center justify-center motion-reduce:hidden",
        className
      )}
      aria-hidden
    >
      {/* Barely-there vignette */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,hsl(var(--primary)/0.07)_0%,transparent_55%)] dark:bg-[radial-gradient(circle_at_50%_45%,hsl(var(--primary)/0.12)_0%,transparent_50%)]"
        style={{ animation: "fade-in 0.25s ease-out both" }}
      />

      <div className="relative flex h-14 w-14 items-center justify-center">
        {/* Expanding ring */}
        <span
          className="absolute inset-0 rounded-full border border-primary/25 animate-celebrate-micro-ring"
          style={{ animationDelay: "40ms" }}
        />
        <span
          className="absolute inset-0 rounded-full border border-primary/15 animate-celebrate-micro-ring"
          style={{ animationDelay: "120ms" }}
        />

        {/* Core check */}
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-primary shadow-sm ring-1 ring-primary/20 animate-celebrate-micro-core dark:bg-primary/20 dark:ring-primary/30">
          <Check className="h-4 w-4 stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round" />
        </span>

        {/* Fine sparks */}
        {SPARK_ANGLES.map((deg, i) => (
          <span
            key={deg}
            className="absolute h-1 w-1 rounded-full bg-primary/70 animate-celebrate-micro-spark dark:bg-primary/80"
            style={
              {
                "--celebrate-drift": `translate(${Math.cos((deg * Math.PI) / 180) * 28}px, ${Math.sin((deg * Math.PI) / 180) * 28}px)`,
                animationDelay: `${60 + i * 35}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>,
    document.body
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Returns a stable trigger and portal layer for task-created bursts.
 */
export function useTaskCreatedCelebration() {
  const [burst, setBurst] = useState(0);
  const reset = useCallback(() => setBurst(0), []);
  const triggerTaskCreatedCelebration = useCallback(() => {
    if (prefersReducedMotion()) return;
    setBurst((n) => n + 1);
  }, []);
  const celebrationLayer =
    burst > 0 ? <TaskCreateCelebration key={burst} onComplete={reset} /> : null;
  return { triggerTaskCreatedCelebration, celebrationLayer };
}

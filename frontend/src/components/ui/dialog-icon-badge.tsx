"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type DialogIconVariant = "warning" | "delete";

function PremiumWarningIcon({ className }: { className?: string }) {
  const id = React.useId().replace(/:/g, "");
  const strokeId = `warn-stroke-${id}`;
  const fillId = `warn-fill-${id}`;
  const glowId = `warn-glow-${id}`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={strokeId} x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="0.55" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id={fillId} x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF3C7" />
          <stop offset="1" stopColor="#FFEDD5" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M12 2.75 21.2 19.25c.35.64-.1 1.5-.85 1.5H3.65c-.75 0-1.2-.86-.85-1.5L11.15 2.75c.35-.64 1.35-.64 1.7 0Z"
        fill={`url(#${fillId})`}
        stroke={`url(#${strokeId})`}
        strokeWidth="1.5"
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
      />
      <path
        d="M12 8.25v5"
        stroke={`url(#${strokeId})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.25" r="1.15" fill={`url(#${strokeId})`} />
    </svg>
  );
}

const DELETE_CONFIG = {
  Icon: Trash2,
  glow: "from-red-400/30 to-rose-500/40",
  surface: "from-red-50 via-white to-rose-50",
  ring: "ring-red-200/80",
  icon: "text-red-600",
};

const WARNING_CONFIG = {
  glow: "from-amber-400/35 to-orange-500/45",
  surface: "from-amber-50 via-white to-orange-50",
  ring: "ring-amber-200/80",
};

export interface DialogIconBadgeProps {
  variant: DialogIconVariant;
  className?: string;
}

export function DialogIconBadge({ variant, className }: DialogIconBadgeProps) {
  const isWarning = variant === "warning";
  const config = isWarning ? WARNING_CONFIG : DELETE_CONFIG;

  return (
    <div className={cn("relative flex h-[52px] w-[52px] shrink-0 items-center justify-center", className)}>
      <div
        aria-hidden
        className={cn(
          "absolute -inset-1 rounded-[18px] bg-gradient-to-br opacity-80 blur-md",
          config.glow
        )}
      />
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-60 blur-[2px]",
          config.glow
        )}
      />
      <div
        className={cn(
          "relative flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-gradient-to-br shadow-[0_1px_2px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1",
          config.surface,
          config.ring
        )}
      >
        {isWarning ? (
          <PremiumWarningIcon className="h-[26px] w-[26px]" />
        ) : (
          <Trash2 className={cn("h-[22px] w-[22px]", DELETE_CONFIG.icon)} strokeWidth={2.1} aria-hidden />
        )}
      </div>
    </div>
  );
}

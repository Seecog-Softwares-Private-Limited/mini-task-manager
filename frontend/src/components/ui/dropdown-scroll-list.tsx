"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Scrollable list region inside a Radix DropdownMenu.
 * When the dropdown is portaled outside a Dialog, react-remove-scroll blocks
 * wheel events at the document level — trackpad/mouse wheel won't scroll, but
 * the scrollbar still works. Stopping propagation here restores normal scrolling.
 */
export function DropdownScrollList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("max-h-72 overflow-y-auto overscroll-contain p-1", className)}
      onWheel={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
}

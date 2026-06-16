"use client";

import { BookOpen, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarHelpFooter({ collapsed }: { collapsed: boolean }) {
  if (collapsed) return null;

  return (
    <div className="px-3 pb-2.5 pt-1">
      <button
        type="button"
        onClick={(e) => e.preventDefault()}
        className={cn(
          "group flex w-full items-center justify-between gap-2 rounded-lg border border-border/50",
          "bg-muted/15 px-2.5 py-1.5 text-left transition-all duration-200",
          "hover:border-violet-200/60 hover:bg-violet-500/[0.05] dark:hover:border-violet-500/25"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <BookOpen
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-violet-600 dark:group-hover:text-violet-400"
            aria-hidden
          />
          <span className="truncate text-[11px] font-medium text-foreground">
            Documentation
            <span className="font-normal text-muted-foreground"> — Browse guides</span>
          </span>
        </span>
        <ArrowRight
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-violet-600 dark:group-hover:text-violet-400"
          aria-hidden
        />
      </button>
    </div>
  );
}

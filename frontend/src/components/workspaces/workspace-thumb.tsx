"use client";

import type { Organization } from "@/types/api";
import { resolveWorkspaceLogoUrl } from "@/lib/workspace-avatar-presets";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-6 w-6 rounded-md text-[10px]",
  md: "h-8 w-8 rounded-lg text-xs",
  card: "h-14 w-14 rounded-xl text-sm",
  lg: "h-16 w-16 rounded-2xl text-lg sm:h-20 sm:w-20 md:h-[5.5rem] md:w-[5.5rem] md:text-xl",
} as const;

const sizeBorders = {
  sm: "border border-slate-200/80 dark:border-border/70",
  md: "border border-slate-200/80 dark:border-border/70",
  card: "border border-slate-200/90 shadow-sm dark:border-border/80",
  lg: "border border-slate-200/90 dark:border-border/80",
} as const;

export function WorkspaceThumb({
  workspace,
  size = "md",
  className,
  active,
}: {
  workspace: Pick<Organization, "name" | "logoUrl">;
  size?: keyof typeof sizeClasses;
  className?: string;
  active?: boolean;
}) {
  const logoSrc = resolveWorkspaceLogoUrl(workspace.logoUrl);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-white font-bold tracking-tight dark:bg-muted",
        sizeClasses[size],
        sizeBorders[size],
        active && "shadow-md shadow-violet-500/20",
        className
      )}
    >
      <img src={logoSrc} alt="" className="h-full w-full object-contain p-0.5" />
    </span>
  );
}

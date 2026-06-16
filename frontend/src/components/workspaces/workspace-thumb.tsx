"use client";

import type { Organization } from "@/types/api";
import { cn, getInitials, getWorkspaceAvatarGradient } from "@/lib/utils";

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
  const gradient = getWorkspaceAvatarGradient(workspace.name);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden font-bold tracking-tight",
        sizeClasses[size],
        sizeBorders[size],
        workspace.logoUrl
          ? "bg-white dark:bg-muted"
          : cn("bg-gradient-to-br text-white", gradient, active && "shadow-md shadow-violet-500/20"),
        className
      )}
    >
      {workspace.logoUrl ? (
        <img src={workspace.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
      ) : (
        getInitials(workspace.name)
      )}
    </span>
  );
}

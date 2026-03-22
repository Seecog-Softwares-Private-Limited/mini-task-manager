"use client";

import type { Organization } from "@/types/api";
import { cn, getInitials } from "@/lib/utils";

export function WorkspaceThumb({
  workspace,
  size = "md",
  className,
}: {
  workspace: Pick<Organization, "name" | "logoUrl">;
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "sm" ? "h-6 w-6 rounded-md text-[10px]" : "h-8 w-8 rounded-lg text-xs";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-muted font-semibold",
        dim,
        className
      )}
    >
      {workspace.logoUrl ? (
        <img src={workspace.logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-muted-foreground">{getInitials(workspace.name)}</span>
      )}
    </span>
  );
}

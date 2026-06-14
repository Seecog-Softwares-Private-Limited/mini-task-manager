"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { fetchOrganizations } from "@/services/api/organizations.api";
import { useTenant } from "@/context/tenant-context";
import { WorkspaceThumb } from "@/components/workspaces/workspace-thumb";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SidebarCompanyBrandProps {
  collapsed: boolean;
}

export function SidebarCompanyBrand({ collapsed }: SidebarCompanyBrandProps) {
  const { orgId } = useTenant();

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });

  const currentOrg = useMemo(
    () => organizations.find((o) => o.id === orgId),
    [organizations, orgId]
  );

  const displayName = currentOrg?.name ?? "Select workspace";
  const tooltip = currentOrg
    ? `Workspace: ${currentOrg.name}`
    : "No workspace selected — open Workspaces to choose one";

  if (isLoading) {
    return (
      <div className={cn("border-b border-border/50", collapsed ? "px-2 py-3" : "px-3 py-3")}>
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl border border-[#E7EAF0] bg-[#FCFCFD] p-2.5 dark:border-border dark:bg-muted/25",
            collapsed && "justify-center px-1.5 py-2"
          )}
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          {!collapsed && (
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-2 w-16 rounded" />
              <Skeleton className="h-3.5 w-full max-w-[140px] rounded" />
            </div>
          )}
        </div>
      </div>
    );
  }

  const brandInner = (
    <>
      {currentOrg ? (
        <WorkspaceThumb
          workspace={currentOrg}
          size="md"
          className={cn(
            "h-9 w-9 rounded-lg text-xs shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
            !currentOrg.logoUrl && "gradient-bg text-white"
          )}
        />
      ) : (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
          aria-hidden
        >
          <Building2 className="h-4 w-4" />
        </span>
      )}
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Workspace
          </p>
          <p className="truncate text-sm font-semibold leading-tight tracking-tight text-foreground">
            {displayName}
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className={cn("border-b border-border/50", collapsed ? "px-2 py-3" : "px-3 py-3")}>
      <Link
        href="/dashboard/workspaces"
        title={tooltip}
        className={cn(
          "flex items-center gap-2.5 rounded-xl border border-[#E7EAF0] bg-gradient-to-br from-[#FCFCFD] via-white to-primary/[0.03] p-2.5 shadow-sm transition-[box-shadow,background-color] hover:border-primary/20 hover:shadow-md dark:border-border dark:from-muted/30 dark:via-muted/20 dark:to-primary/[0.06] dark:hover:border-primary/25",
          collapsed && "justify-center px-1.5 py-2"
        )}
        aria-label={tooltip}
      >
        {brandInner}
      </Link>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Building2, Pencil, ChevronRight } from "lucide-react";
import { fetchOrganizations } from "@/services/api/organizations.api";
import { useTenant } from "@/context/tenant-context";
import { WorkspaceThumb } from "@/components/workspaces/workspace-thumb";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyBrandModal } from "@/components/dashboard/company-brand-modal";
import { useCompanyFontSize } from "@/hooks/use-company-font-size";
import { cn } from "@/lib/utils";

interface SidebarCompanyBrandProps {
  collapsed: boolean;
}

export function SidebarCompanyBrand({ collapsed }: SidebarCompanyBrandProps) {
  const { orgId } = useTenant();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });

  const currentOrg = useMemo(
    () => organizations.find((o) => o.id === orgId),
    [organizations, orgId]
  );

  const isOwner = currentOrg?.myRole?.toLowerCase() === "owner";
  const { option: fontOption } = useCompanyFontSize(currentOrg?.id);

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

  const inner = (
    <>
      {/* Logo / icon */}
      {currentOrg ? (
        <WorkspaceThumb
          workspace={currentOrg}
          size="md"
          className={cn(
            "h-9 w-9 shrink-0 rounded-lg text-xs shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
            !currentOrg.logoUrl && "gradient-bg text-white"
          )}
        />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <Building2 className="h-4 w-4" />
        </span>
      )}

      {/* Text */}
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Company
          </p>
          <p
            className={cn(
              "truncate font-semibold leading-tight tracking-tight",
              currentOrg ? "text-foreground" : "text-muted-foreground"
            )}
            style={{ fontSize: currentOrg ? fontOption.px : undefined }}
          >
            {currentOrg?.name ?? "Select workspace"}
          </p>
          {isOwner && currentOrg && (
            <p className="mt-0.5 text-[10px] text-primary/70 opacity-0 transition-opacity group-hover/brand:opacity-100">
              Click to edit logo &amp; name
            </p>
          )}
        </div>
      )}

      {/* Right icon */}
      {!collapsed && (
        <span className="shrink-0 text-muted-foreground/40 transition-colors group-hover/brand:text-primary/60">
          {isOwner && currentOrg ? (
            <Pencil className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover/brand:opacity-100" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
      )}
    </>
  );

  const sharedClass = cn(
    "group/brand flex items-center gap-2.5 rounded-xl border border-[#E7EAF0] bg-gradient-to-br from-[#FCFCFD] via-white to-primary/[0.03] p-2.5 shadow-sm transition-all duration-200",
    "hover:border-primary/30 hover:shadow-md",
    "dark:border-border dark:from-muted/30 dark:via-muted/20 dark:to-primary/[0.06] dark:hover:border-primary/30",
    collapsed && "justify-center px-1.5 py-2"
  );

  return (
    <div className={cn("border-b border-border/50", collapsed ? "px-2 py-3" : "px-3 py-3")}>
      {/* Owner with workspace → open modal */}
      {isOwner && currentOrg ? (
        <>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            title="Edit company logo & name"
            aria-label="Edit company logo & name"
            className={cn(sharedClass, "w-full cursor-pointer text-left")}
          >
            {inner}
          </button>
          <CompanyBrandModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            org={currentOrg}
          />
        </>
      ) : (
        /* Non-owner / no workspace → navigate to workspace list */
        <Link
          href="/dashboard/workspaces"
          title={currentOrg ? `Workspace: ${currentOrg.name}` : "Select a workspace"}
          aria-label={currentOrg ? `Workspace: ${currentOrg.name}` : "Select a workspace"}
          className={sharedClass}
        >
          {inner}
        </Link>
      )}
    </div>
  );
}

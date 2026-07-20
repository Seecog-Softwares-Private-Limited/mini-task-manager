"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Building2, Pencil } from "lucide-react";
import { fetchOrganizations } from "@/services/api/organizations.api";
import { useTenant } from "@/context/tenant-context";
import { WorkspaceThumb } from "@/components/workspaces/workspace-thumb";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyBrandModal } from "@/components/dashboard/company-brand-modal";
import { useCompanyFontSize } from "@/hooks/use-company-font-size";
import { resolveWorkspaceLogoUrl } from "@/lib/workspace-avatar-presets";
import { cn } from "@/lib/utils";

interface SidebarCompanyBrandProps {
  collapsed: boolean;
  /** When true, renders inside the unified identity panel without its own card chrome. */
  embedded?: boolean;
  planBadge?: React.ReactNode;
}

export function SidebarCompanyBrand({
  collapsed,
  embedded = false,
  planBadge,
}: SidebarCompanyBrandProps) {
  const { orgId, setOrgId } = useTenant();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });

  useEffect(() => {
    if (!orgId && organizations.length > 0) {
      const branded = organizations.find((o) => o.logoUrl);
      const owned = organizations.find((o) => o.myRole?.toLowerCase() === "owner");
      const best = branded ?? owned ?? organizations[0];
      setOrgId(best.id);
    }
  }, [orgId, organizations, setOrgId]);

  const companyOrg = useMemo(() => {
    const ownedWithLogo = organizations.find(
      (o) => o.myRole?.toLowerCase() === "owner" && o.logoUrl
    );
    const owned = organizations.find((o) => o.myRole?.toLowerCase() === "owner");
    const branded = organizations.find((o) => o.logoUrl);
    return ownedWithLogo ?? owned ?? branded ?? organizations[0];
  }, [organizations]);

  const isOwner = companyOrg?.myRole?.toLowerCase() === "owner";
  const { option: fontOption } = useCompanyFontSize(companyOrg?.id);

  const wrapperClass = embedded
    ? undefined
    : cn("border-b border-border/50", collapsed ? "px-3 py-3" : "px-4 pt-3 pb-0");

  const sharedClass = cn(
    "group/brand w-full transition-all duration-200",
    embedded
      ? collapsed
        ? "flex justify-center"
        : "px-3 pt-2.5 pb-2 text-left"
      : cn(
          "flex items-center gap-2.5 rounded-xl border border-[#E7EAF0] bg-gradient-to-br from-[#FCFCFD] via-white to-primary/[0.03] shadow-sm",
          "hover:border-primary/30 hover:shadow-md",
          "dark:border-border dark:from-muted/30 dark:via-muted/20 dark:to-primary/[0.06] dark:hover:border-primary/30",
          collapsed ? "justify-center px-1.5 py-2" : "px-2.5 pt-2.5 pb-1"
        )
  );

  if (isLoading) {
    const skeleton = collapsed ? (
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
    ) : embedded ? (
      <div className="px-3 pt-2.5 pb-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="mx-auto mt-1.5 h-3.5 w-24 rounded" />
      </div>
    ) : (
      <>
        <Skeleton className="w-full rounded-lg" style={{ aspectRatio: "16/9" }} />
        <div className="mt-1.5 pb-[2px] text-center">
          <Skeleton className="mx-auto h-3.5 w-full max-w-[140px] rounded" />
        </div>
      </>
    );

    return wrapperClass ? <div className={wrapperClass}>{skeleton}</div> : skeleton;
  }

  const inner = collapsed ? (
    companyOrg ? (
      <WorkspaceThumb
        workspace={companyOrg}
        size="md"
        className="h-9 w-9 shrink-0 rounded-lg text-xs shadow-sm"
      />
    ) : (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted text-muted-foreground">
        <Building2 className="h-4 w-4" />
      </span>
    )
  ) : (
    <div className="w-full">
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg border border-slate-200/80 bg-white dark:border-border/70 dark:bg-muted",
          embedded ? "h-12" : ""
        )}
        style={embedded ? undefined : { aspectRatio: "16/9" }}
      >
        {companyOrg ? (
          <img
            src={resolveWorkspaceLogoUrl(companyOrg.logoUrl)}
            alt={companyOrg.name}
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Building2 className="h-5 w-5" />
          </span>
        )}
        {isOwner && companyOrg && (
          <span className="absolute right-1 top-1 opacity-0 transition-opacity group-hover/brand:opacity-100">
            <Pencil className="h-3 w-3 text-primary/70" />
          </span>
        )}
      </div>

      <div className={cn("text-center", embedded ? "mt-1 pb-0" : "mt-1.5 pb-[2px]")}>
        <p
          className={cn(
            "truncate font-semibold leading-none tracking-tight",
            companyOrg ? "text-foreground" : "text-muted-foreground",
            embedded && companyOrg && "text-sm"
          )}
          style={{ fontSize: companyOrg && !embedded ? fontOption.px : undefined }}
        >
          {companyOrg?.name ?? "Select workspace"}
        </p>
        {embedded && planBadge && companyOrg && planBadge}
        {isOwner && companyOrg && !embedded && (
          <p className="mt-0.5 hidden text-[10px] text-primary/70 group-hover/brand:block">
            Click to edit logo &amp; name
          </p>
        )}
      </div>
    </div>
  );

  const trigger =
    isOwner && companyOrg ? (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title="Edit company logo & name"
          aria-label="Edit company logo & name"
          className={cn(sharedClass, "cursor-pointer")}
        >
          {inner}
        </button>
        <CompanyBrandModal open={modalOpen} onOpenChange={setModalOpen} org={companyOrg} />
      </>
    ) : (
      <Link
        href="/dashboard/workspaces"
        title={companyOrg ? `Company: ${companyOrg.name}` : "Select a workspace"}
        aria-label={companyOrg ? `Company: ${companyOrg.name}` : "Select a workspace"}
        className={sharedClass}
      >
        {inner}
      </Link>
    );

  return wrapperClass ? <div className={wrapperClass}>{trigger}</div> : trigger;
}

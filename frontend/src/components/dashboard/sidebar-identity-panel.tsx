"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Building2, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/context/tenant-context";
import { fetchOrganizations } from "@/services/api/organizations.api";
import { useWorkspacePlan } from "@/hooks/use-workspace-plan";
import { DashboardProfileAvatar } from "@/components/dashboard/dashboard-profile-avatar";
import { CompanyBrandModal } from "@/components/dashboard/company-brand-modal";
import { WorkspaceThumb } from "@/components/workspaces/workspace-thumb";
import { PlanBadge } from "@/components/PlanBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SidebarIdentityPanel({ collapsed }: { collapsed: boolean }) {
  const { user, mergeUser } = useAuth();
  const { orgId } = useTenant();
  const { data: planData } = useWorkspacePlan();
  const [modalOpen, setModalOpen] = useState(false);
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });

  const companyOrg = useMemo(() => {
    const ownedWithLogo = organizations.find(
      (o) => o.myRole?.toLowerCase() === "owner" && o.logoUrl
    );
    const owned = organizations.find((o) => o.myRole?.toLowerCase() === "owner");
    const branded = organizations.find((o) => o.logoUrl);
    return ownedWithLogo ?? owned ?? branded ?? organizations[0];
  }, [organizations]);

  const profileSubtitle = useMemo(() => {
    const activeOrg = orgId ? organizations.find((o) => o.id === orgId) : companyOrg;
    const role = activeOrg?.myRole
      ? activeOrg.myRole.charAt(0).toUpperCase() + activeOrg.myRole.slice(1).toLowerCase()
      : null;
    const company = companyOrg?.name;
    if (role && company) return `${role} · ${company}`;
    if (role) return role;
    if (company) return company;
    return user?.email ?? "";
  }, [orgId, organizations, companyOrg, user?.email]);

  const displayName =
    user?.fullName?.trim() && user.fullName !== user.email ? user.fullName : user?.email ?? "";

  const isOwner = companyOrg?.myRole?.toLowerCase() === "owner";

  if (isLoading) {
    return (
      <div className={cn("px-3", collapsed ? "pt-2 pb-1.5" : "pt-2 pb-2")}>
        <Skeleton className={cn("rounded-xl", collapsed ? "mx-auto h-10 w-10" : "h-[72px] w-full")} />
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="px-3 pt-2 pb-1.5">
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-[#E7EAF0]/90 bg-gradient-to-b from-white to-slate-50/50 p-1.5 shadow-sm transition-colors duration-200 dark:border-border/70 dark:from-card dark:to-muted/20">
          {companyOrg ? (
            <WorkspaceThumb
              workspace={companyOrg}
              size="md"
              className={cn(
                "h-8 w-8 shrink-0 rounded-lg text-[10px] shadow-sm",
                !companyOrg.logoUrl && "gradient-bg text-white"
              )}
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-muted text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
            </span>
          )}
          {planData && <PlanBadge plan={planData.plan} compact showIcon />}
          {user?.email && (
            <div className="relative">
              <DashboardProfileAvatar user={user} mergeUser={mergeUser} size="sm" />
              <span
                className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-white bg-emerald-500 dark:border-card"
                aria-label="Online"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const companyLogo = companyOrg ? (
    <WorkspaceThumb
      workspace={companyOrg}
      size="md"
      className={cn(
        "h-8 w-8 shrink-0 rounded-lg text-[10px] shadow-sm",
        !companyOrg.logoUrl && "gradient-bg text-white"
      )}
    />
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted text-muted-foreground">
      <Building2 className="h-3.5 w-3.5" />
    </span>
  );

  return (
    <div className="px-3 pt-1.5 pb-1.5">
      <div className="rounded-xl border border-[#E7EAF0]/90 bg-gradient-to-b from-white via-[#FCFCFD] to-violet-50/12 px-2 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors duration-200 dark:border-border/70 dark:from-card dark:via-card dark:to-violet-950/10">
        {/* Company + plan */}
        <div className="flex items-center gap-1.5">
          {isOwner && companyOrg ? (
            <>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="group/logo relative shrink-0 rounded-lg transition-opacity duration-200 hover:opacity-90"
                title="Edit company logo & name"
                aria-label="Edit company logo & name"
              >
                {companyLogo}
                <span className="absolute -right-0.5 -top-0.5 opacity-0 transition-opacity duration-200 group-hover/logo:opacity-100">
                  <Pencil className="h-2.5 w-2.5 text-primary/70" />
                </span>
              </button>
              <CompanyBrandModal open={modalOpen} onOpenChange={setModalOpen} org={companyOrg} />
            </>
          ) : (
            <Link href="/dashboard/workspaces" className="shrink-0">
              {companyLogo}
            </Link>
          )}
          <p
            className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight text-foreground"
            title={companyOrg?.name}
          >
            {companyOrg?.name ?? "Select workspace"}
          </p>
          {planData && <PlanBadge plan={planData.plan} compact showIcon />}
        </div>

        {/* User */}
        {user?.email && (
          <div className="mt-1.5 flex items-center gap-1.5 border-t border-border/30 pt-1.5">
            <div className="relative shrink-0">
              <DashboardProfileAvatar user={user} mergeUser={mergeUser} size="sm" />
              <span
                className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-emerald-500 dark:border-card"
                aria-label="Online"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight text-foreground" title={displayName}>
                {displayName}
              </p>
              <p
                className="truncate text-[10px] leading-tight text-muted-foreground"
                title={profileSubtitle}
              >
                {profileSubtitle}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

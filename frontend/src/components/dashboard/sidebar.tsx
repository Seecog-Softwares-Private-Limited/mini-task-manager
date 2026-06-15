"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/context/tenant-context";
import { fetchOrganizations } from "@/services/api/organizations.api";
import { DashboardProfileAvatar } from "@/components/dashboard/dashboard-profile-avatar";
import { SidebarCompanyBrand } from "@/components/dashboard/sidebar-company-brand";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  visibleNav: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; section?: string }[];
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile, visibleNav }: SidebarProps) {
  const pathname = usePathname();
  const { user, mergeUser } = useAuth();
  const { orgId } = useTenant();
  const { data: organizations = [] } = useQuery({
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

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileOpen, onCloseMobile]);

  const mainNav = visibleNav.filter((item) => !item.section);
  const billingNav = visibleNav.filter((item) => item.section === "billing");

  const renderNavItem = (item: typeof visibleNav[0]) => {
    const itemPath = item.href.split("?")[0];
    const isActive =
      pathname === itemPath ||
      (itemPath !== "/dashboard" && pathname.startsWith(itemPath));
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onCloseMobile}
        data-cy={item.href === "/dashboard/billing" ? "nav-billing" : item.href === "/dashboard/plans" ? "nav-plans" : undefined}
        className={cn(
          "group flex items-center gap-2.5 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
          collapsed ? "justify-center px-2" : "px-3",
          isActive
            ? "gradient-bg text-white shadow-md shadow-primary/20"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        )}
        aria-current={isActive ? "page" : undefined}
        title={collapsed ? item.label : undefined}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            !isActive && "group-hover:scale-110"
          )}
          aria-hidden
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const content = (
    <div className="flex h-full flex-col">
      <SidebarCompanyBrand collapsed={collapsed} />

      {/* Employee profile */}
      {user?.email && (
        <div className={cn("border-b border-border/50", collapsed ? "px-2 py-2.5" : "px-3 pt-0 pb-2")}>
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border border-[#E7EAF0] bg-[#FCFCFD] px-2.5 py-2 shadow-sm dark:border-border dark:bg-muted/25",
              collapsed && "justify-center px-1"
            )}
            title={collapsed ? user.fullName || user.email : undefined}
          >
            <DashboardProfileAvatar user={user} mergeUser={mergeUser} size="lg" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                  Your profile
                </p>
                <p className="truncate text-base font-semibold leading-tight text-foreground" title={displayName}>
                  {displayName}
                </p>
                <p className="truncate text-xs leading-tight text-muted-foreground" title={profileSubtitle}>
                  {profileSubtitle}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <div className={cn("px-3 pt-3", collapsed && "px-2")}>
        {!collapsed && (
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/90">
            Navigation
          </p>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-1" aria-label="Main navigation">
        {mainNav.map(renderNavItem)}
      </nav>

      {/* Billing Section - Separated with premium styling */}
      {billingNav.length > 0 && (
        <div className={cn("border-t border-border/40", collapsed ? "px-2 py-2" : "px-3 py-3")}>
          {!collapsed && (
            <div className="mb-2 flex items-center gap-1.5 px-1">
              <div className="flex h-4 w-4 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-orange-500">
                <Sparkles className="h-2.5 w-2.5 text-white" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Plans & Billing
              </p>
            </div>
          )}
          <div className="space-y-1">
            {billingNav.map(renderNavItem)}
          </div>
        </div>
      )}

      {/* Bottom help section */}
      <div className={cn("border-t border-border/40 px-3 py-4", collapsed && "px-2")}>
        {!collapsed && (
          <div className="rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 p-3">
            <p className="text-xs font-bold text-foreground">Need help?</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Check our documentation for guides and tips.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full border-r bg-card/95 backdrop-blur-xl transition-all duration-300 ease-in-out",
          "md:translate-x-0",
          collapsed ? "w-sidebar-collapsed" : "w-sidebar",
          mobileOpen ? "translate-x-0 w-sidebar" : "-translate-x-full md:translate-x-0"
        )}
        aria-label="Sidebar"
      >
        <div className={cn("flex h-full flex-col", collapsed ? "w-sidebar-collapsed" : "w-sidebar")}>
          {content}
        </div>
      </aside>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useTenant } from "@/context/tenant-context";
import { usePlanOptional } from "@/context/plan-context";
import { logout } from "@/services/api/auth.api";
import { clearAuth } from "@/services/api/client";
import { TenantGuard } from "@/components/tenant-guard";
import { Sidebar } from "@/components/dashboard/sidebar";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { WorkspaceProgressBadge } from "@/components/workspace-progress-badge";
import { StreakBadge } from "@/components/streak-badge";
import { TrialBanner } from "@/components/trial-banner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/hooks/use-auth";
import {
  LayoutDashboard, Building2, FolderKanban, ListTodo, Bell,
  CreditCard, Activity, BarChart3, ClipboardList, Settings,
  Menu, PanelLeftClose, PanelLeft, LogOut, User, Sparkles,
} from "lucide-react";

const nav: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: AppRole;
  billingOnly?: boolean;
  adminOnly?: boolean;
  section?: string;
}[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/organizations", label: "Organizations", icon: Building2 },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/tasks", label: "Tasks", icon: ListTodo },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/audit", label: "Audit log", icon: ClipboardList, adminOnly: true },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  // Billing section
  { href: "/dashboard/plans", label: "Plans & Pricing", icon: Sparkles, section: "billing" },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, section: "billing", billingOnly: true },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const { orgId } = useTenant();
  const { canManageBilling, canViewAudit } = usePermissions();
  const planContext = usePlanOptional();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = nav
    .filter((item) => {
      if (item.billingOnly) return canManageBilling;
      if (item.adminOnly) return canViewAudit; // audit + analytics: owner/admin only
      if (item.requiredRole) return hasRole(item.requiredRole);
      return true;
    })
    .map(({ href, label, icon, section }) => ({ href, label, icon, section }));

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearAuth();
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        visibleNav={visibleNav}
      />
      <div
        className={cn(
          "flex min-h-screen flex-1 flex-col transition-[margin] duration-300 ease-in-out",
          "md:ml-0",
          sidebarCollapsed ? "md:ml-sidebar-collapsed" : "md:ml-sidebar"
        )}
      >
        {/* Premium header */}
        <header className="sticky top-0 z-30 flex min-h-header items-center gap-3 border-b bg-background/80 backdrop-blur-xl px-4 md:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden md:flex h-9 w-9"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>

          <div className="hidden sm:block border-l border-border/60 pl-3 ml-1">
            <OrgSwitcher variant="navbar" />
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <WorkspaceProgressBadge className="hidden sm:inline-flex" />
            <StreakBadge className="hidden sm:inline-flex" />
            <CommandPalette />
            <NotificationCenter />
            {(planContext?.plan || planContext?.subscription?.planName) && (
              <Link
                href="/dashboard/billing"
                className="rounded-full gradient-bg px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
                title="Current plan"
              >
                {planContext.plan?.name ?? planContext.subscription?.planName ?? "Free"}
              </Link>
            )}
            {user?.email && (
              <div className="hidden items-center gap-2 rounded-full border bg-muted/30 pl-1 pr-3 py-1 sm:flex">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="text-[10px] font-bold rounded-full gradient-bg text-white">
                    {(user.fullName ?? user.email).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[120px] truncate text-xs font-medium text-muted-foreground">
                  {user.email}
                </span>
              </div>
            )}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-cy="logout-button"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <TrialBanner />
        <main className="flex-1 p-4 md:p-8 animate-fade-in">
          <TenantGuard>{children}</TenantGuard>
        </main>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { usePermissions } from "@/hooks/use-permissions";
import { usePlanOptional } from "@/context/plan-context";
import { logout } from "@/services/api/auth.api";
import { clearAuth } from "@/services/api/client";
import { TenantGuard } from "@/components/tenant-guard";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { WorkspaceProgressBadge } from "@/components/workspace-progress-badge";
import { StreakBadge } from "@/components/streak-badge";
import { TrialBanner } from "@/components/trial-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/hooks/use-auth";
import {
  LayoutDashboard, Building2, FolderKanban, ListTodo, Bell,
  CreditCard, Activity, BarChart3, ClipboardList, Settings,
  Menu, PanelLeftClose, PanelLeft, LogOut, Sparkles, Shield,
} from "lucide-react";

const nav: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: AppRole;
  billingOnly?: boolean;
  adminOnly?: boolean;
  platformAdminOnly?: boolean;
  section?: string;
}[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/workspaces", label: "Workspaces", icon: Building2 },
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
  { href: "/admin", label: "Platform Admin", icon: Shield, platformAdminOnly: true },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hasRole } = useAuth();
  const { isPlatformAdmin } = usePlatformAdmin();
  const { canManageBilling, canViewAudit } = usePermissions();
  const planContext = usePlanOptional();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = nav
    .filter((item) => {
      if (item.platformAdminOnly) return isPlatformAdmin;
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
            className="md:hidden h-9 w-9 shrink-0"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden md:flex h-9 w-9 shrink-0"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>

          <div className="flex-1 min-w-0" />

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

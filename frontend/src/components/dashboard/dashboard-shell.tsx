"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { usePermissions } from "@/hooks/use-permissions";
import { useProjectSelectionOptional } from "@/context/project-selection-context";
import { buildTasksPageHref } from "@/lib/tasks-page-href";
import { TenantGuard } from "@/components/tenant-guard";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { WorkspaceProgressBadge } from "@/components/workspace-progress-badge";
import { TrialBanner } from "@/components/trial-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeaderContextGreeting } from "@/components/dashboard/header-context-greeting";
import { HeaderAccountMenu } from "@/components/dashboard/header-account-menu";
import { FeedbackTriggerButton } from "@/components/feedbacks/feedback-trigger-button";
import type { AppRole } from "@/hooks/use-auth";
import {
  LayoutDashboard, Building2, FolderKanban, ListTodo, Bell,
  CreditCard, Activity, BarChart3, ClipboardList, Settings,
  Menu, PanelLeftClose, PanelLeft, Sparkles, Shield, Repeat,
} from "lucide-react";

const nav: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: AppRole;
  billingOnly?: boolean;
  adminOnly?: boolean;
  platformAdminOnly?: boolean;
  section?: "workspace" | "reporting" | "administration" | "billing";
}[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, section: "workspace" },
  { href: "/dashboard/workspaces", label: "Workspaces", icon: Building2, section: "workspace" },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, section: "workspace" },
  { href: "/dashboard/tasks", label: "Tasks", icon: ListTodo, section: "workspace" },
  { href: "/dashboard/recurring-tasks", label: "Recurring Tasks", icon: Repeat, section: "workspace" },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, section: "reporting" },
  { href: "/dashboard/activity", label: "Activity", icon: Activity, section: "reporting" },
  { href: "/dashboard/audit", label: "Audit Logs", icon: ClipboardList, adminOnly: true, section: "reporting" },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, adminOnly: true, section: "reporting" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, section: "administration" },
  { href: "/dashboard/plans", label: "Plans & Pricing", icon: Sparkles, section: "billing" },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, section: "billing", billingOnly: true },
  { href: "/super-admin", label: "Platform Admin", icon: Shield, platformAdminOnly: true, section: "administration" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isInternalScrollView =
    pathname === "/dashboard/tasks" ||
    pathname === "/dashboard/recurring-tasks" ||
    pathname === "/dashboard/activity" ||
    pathname === "/dashboard/audit" ||
    pathname === "/dashboard/notifications" ||
    pathname.includes("/board");
  const { hasRole } = useAuth();
  const { isPlatformAdmin } = usePlatformAdmin();
  const { canManageBilling, canViewAudit } = usePermissions();
  const projectSelection = useProjectSelectionOptional();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const tasksHref = buildTasksPageHref(projectSelection?.selectedProjectId);

  const visibleNav = nav
    .filter((item) => {
      if (item.platformAdminOnly) return isPlatformAdmin;
      if (item.billingOnly) return canManageBilling;
      if (item.adminOnly) return canViewAudit; // audit + analytics: owner/admin only
      if (item.requiredRole) return hasRole(item.requiredRole);
      return true;
    })
    .map(({ href, label, icon, section }) => ({
      href: href === "/dashboard/tasks" ? tasksHref : href,
      label,
      icon,
      section,
    }));

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
          "flex h-dvh min-h-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300 ease-in-out",
          "md:ml-0",
          sidebarCollapsed ? "md:ml-sidebar-collapsed" : "md:ml-sidebar"
        )}
      >
        {/* Premium header */}
        <header className="sticky top-0 z-30 flex min-h-header items-center gap-2 border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl md:gap-3 md:px-6">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-[18px] w-[18px]" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-9 w-9 shrink-0 md:inline-flex"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-[18px] w-[18px]" />
              ) : (
                <PanelLeftClose className="h-[18px] w-[18px]" />
              )}
            </Button>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3 pl-1">
            <HeaderContextGreeting />
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <WorkspaceProgressBadge className="hidden lg:inline-flex" />
            <FeedbackTriggerButton />
            <CommandPalette />
            <NotificationCenter />
            <ThemeToggle />
            <HeaderAccountMenu />
          </div>
        </header>
        <TrialBanner />
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col p-4 md:p-8 animate-fade-in",
            isInternalScrollView ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          <TenantGuard>{children}</TenantGuard>
        </main>
      </div>
    </div>
  );
}

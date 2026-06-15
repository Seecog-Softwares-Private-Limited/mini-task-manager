"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { SidebarIdentityPanel } from "@/components/dashboard/sidebar-identity-panel";
import { SidebarHelpFooter } from "@/components/dashboard/sidebar-help-footer";

export type NavSection = "workspace" | "reporting" | "administration" | "billing";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: NavSection;
}

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  visibleNav: SidebarNavItem[];
}

const NAV_GROUPS: { id: NavSection | "billing"; label: string }[] = [
  { id: "workspace", label: "Workspace" },
  { id: "reporting", label: "Reporting" },
  { id: "administration", label: "Administration" },
  { id: "billing", label: "Plans & Billing" },
];

export function Sidebar({ collapsed, mobileOpen, onCloseMobile, visibleNav }: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileOpen, onCloseMobile]);

  const renderNavItem = (item: SidebarNavItem) => {
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
          "group relative flex items-center gap-2.5 rounded-lg py-2 text-[13px] transition-all duration-200 ease-out",
          collapsed ? "justify-center px-2" : "pl-3 pr-3",
          isActive
            ? "bg-violet-500/[0.11] font-semibold text-violet-800 dark:bg-violet-500/15 dark:text-violet-200"
            : "font-medium text-muted-foreground hover:bg-violet-500/[0.06] hover:text-foreground"
        )}
        aria-current={isActive ? "page" : undefined}
        title={collapsed ? item.label : undefined}
      >
        {isActive && !collapsed && (
          <span
            className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.55)]"
            aria-hidden
          />
        )}
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-all duration-200",
            isActive
              ? "text-violet-600 dark:text-violet-400"
              : "text-muted-foreground/75 group-hover:text-foreground/90"
          )}
          aria-hidden
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const sectionLabel = (label: string, isFirst: boolean, icon?: React.ReactNode) =>
    !collapsed ? (
      <p
        className={cn(
          "mb-1 flex items-center gap-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50",
          isFirst ? "mt-0" : "mt-3.5"
        )}
      >
        {icon}
        {label}
      </p>
    ) : null;

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: visibleNav.filter((item) => item.section === group.id),
  })).filter((group) => group.items.length > 0);

  const content = (
    <div className="flex h-full flex-col">
      <SidebarIdentityPanel collapsed={collapsed} />

      <div className={cn("flex-1 overflow-y-auto py-1", collapsed ? "px-3" : "px-4")}>
        {groups.map((group, index) => (
          <div key={group.id}>
            {sectionLabel(
              group.label,
              index === 0,
              group.id === "billing" ? (
                <Sparkles className="h-3 w-3 text-amber-500/70" aria-hidden />
              ) : undefined
            )}
            <nav className="space-y-0.5" aria-label={group.label}>
              {group.items.map(renderNavItem)}
            </nav>
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-border/40">
        <SidebarHelpFooter collapsed={collapsed} />
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
          "fixed left-0 top-0 z-50 h-full border-r border-border/60 bg-card/95 backdrop-blur-xl transition-all duration-300 ease-in-out",
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

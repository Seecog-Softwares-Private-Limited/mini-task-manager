"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  visibleNav: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile, visibleNav }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileOpen, onCloseMobile]);

  const content = (
    <div className="flex h-full flex-col">
      {/* Org switcher (replaces logo area) */}
      <div className={cn("border-b border-border/50", collapsed ? "px-2 py-3" : "px-2 py-3")}>
        <OrgSwitcher collapsed={collapsed} />
      </div>

      {/* Quick action */}
      <div className={cn("px-3 pt-3 pb-3", collapsed && "px-2")}>
        {!collapsed && (
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/90">
            Quick Actions
          </p>
        )}
        <button
          type="button"
          onClick={() => { onCloseMobile(); router.push("/dashboard/tasks"); }}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg gradient-bg px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98]",
            collapsed && "justify-center px-2"
          )}
          data-cy="sidebar-new-task"
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>New Task</span>}
        </button>
      </div>

      {/* Navigation */}
      <div className={cn("border-t border-border/40 px-3 pt-3", collapsed && "px-2")}>
        {!collapsed && (
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/90">
            Navigation
          </p>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-1" aria-label="Main navigation">
        {visibleNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              data-cy={item.href === "/dashboard/billing" ? "nav-billing" : undefined}
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
        })}
      </nav>

      {/* Bottom section */}
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

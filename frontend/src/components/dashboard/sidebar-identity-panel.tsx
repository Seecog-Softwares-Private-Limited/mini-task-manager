"use client";

import Link from "next/link";
import { OpsPickLogo } from "@/components/brand/opspick-logo";
import { SidebarUserCard } from "@/components/dashboard/sidebar-user-card";
import { SidebarWorkspaceSwitcher } from "@/components/dashboard/sidebar-workspace-switcher";
import { cn } from "@/lib/utils";

/**
 * Sidebar identity stack. Product brand first, then the logged-in account,
 * with the active workspace shown as secondary context beneath it.
 */
export function SidebarIdentityPanel({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex flex-col">
      <Link
        href="/dashboard"
        className={cn(
          "flex items-center border-b border-border/60 transition-opacity hover:opacity-90",
          collapsed ? "justify-center px-2 py-3.5" : "gap-2.5 px-4 py-3.5"
        )}
        title="OpsPick"
      >
        <OpsPickLogo className="h-9 w-9 shadow-sm" />
        {!collapsed && (
          <span className="truncate text-[1.05rem] font-semibold tracking-tight text-foreground">
            OpsPick
          </span>
        )}
      </Link>
      <SidebarUserCard collapsed={collapsed} />
      <SidebarWorkspaceSwitcher collapsed={collapsed} />
    </div>
  );
}

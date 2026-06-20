"use client";

import { SidebarUserCard } from "@/components/dashboard/sidebar-user-card";
import { SidebarWorkspaceSwitcher } from "@/components/dashboard/sidebar-workspace-switcher";

/**
 * Sidebar identity stack. User-first: the logged-in account is the primary
 * identity, with the active workspace shown as secondary context beneath it.
 */
export function SidebarIdentityPanel({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex flex-col">
      <SidebarUserCard collapsed={collapsed} />
      <SidebarWorkspaceSwitcher collapsed={collapsed} />
    </div>
  );
}

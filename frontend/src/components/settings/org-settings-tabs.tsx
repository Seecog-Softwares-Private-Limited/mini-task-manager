"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building2, Users } from "lucide-react";

const TABS = [
  { href: "/dashboard/settings/workspace", label: "Workspace", icon: Building2 },
  { href: "/dashboard/settings/members", label: "Members", icon: Users },
] as const;

export function OrgSettingsTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-border mb-6" aria-label="Workspace settings">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

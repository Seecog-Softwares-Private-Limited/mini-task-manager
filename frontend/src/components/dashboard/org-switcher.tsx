"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { fetchOrganizations } from "@/services/api/organizations.api";
import { useTenant } from "@/context/tenant-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, getInitials } from "@/lib/utils";
import { resolveWorkspaceLogoUrl } from "@/lib/workspace-avatar-presets";
import { Building2, Check, ChevronDown } from "lucide-react";

export interface OrgSwitcherProps {
  collapsed?: boolean;
  /** Compact variant for navbar - always shows org name, no collapse behavior */
  variant?: "sidebar" | "navbar";
  /** Matches project selector height on board command bar (h-8, smaller avatar) */
  compact?: boolean;
  /** Menu alignment; use `start` when the trigger is on the left (e.g. above project picker) */
  contentAlign?: "start" | "end";
  className?: string;
}

export function OrgSwitcher({
  collapsed,
  variant = "sidebar",
  compact = false,
  contentAlign,
  className,
}: OrgSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { orgId, setOrgId } = useTenant();
  const [open, setOpen] = React.useState(false);

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });

  const currentOrg = React.useMemo(
    () => organizations.find((o) => o.id === orgId),
    [organizations, orgId]
  );

  const handleSelect = (id: string) => {
    setOrgId(id);
    setOpen(false);
    router.refresh();
  };

  const isNavbar = variant === "navbar";
  const dropdownAlign = contentAlign ?? (isNavbar ? "end" : "start");

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", isNavbar ? "px-0" : "px-2 py-2", className)}>
        <Skeleton className={cn("rounded-md shrink-0", compact ? "h-5 w-5" : "h-8 w-8")} />
        {(isNavbar || !collapsed) && (
          <Skeleton className={cn("flex-1 rounded", compact ? "h-3.5 min-w-[80px]" : "h-4 min-w-[100px]")} />
        )}
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "font-medium text-foreground hover:bg-muted/30",
            isNavbar
              ? compact
                ? "h-8 w-full justify-between gap-1.5 px-2 text-[13px] rounded-lg"
                : "h-9 gap-2 px-3 rounded-lg"
              : cn("w-full justify-between gap-2", collapsed ? "justify-center px-2" : "px-3"),
            className
          )}
          aria-label={currentOrg ? `Current workspace: ${currentOrg.name}. Switch workspace.` : "Switch workspace"}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Avatar
              className={cn(
                "shrink-0 rounded-md",
                compact ? "h-5 w-5" : "h-8 w-8 rounded-lg"
              )}
            >
              {currentOrg && (
                <AvatarImage src={resolveWorkspaceLogoUrl(currentOrg.logoUrl)} alt="" />
              )}
              <AvatarFallback
                className={cn(
                  "bg-violet-500/10 text-violet-700 dark:text-violet-300",
                  compact ? "rounded-md text-[8px] font-semibold" : "rounded-lg text-xs font-semibold"
                )}
              >
                {currentOrg ? getInitials(currentOrg.name) : <Building2 className={compact ? "h-3 w-3" : "h-4 w-4"} />}
              </AvatarFallback>
            </Avatar>
            {(isNavbar || !collapsed) && (
              <span
                className={cn(
                  "truncate font-medium",
                  compact ? "max-w-[120px] sm:max-w-[160px]" : "max-w-[160px] sm:max-w-[200px]"
                )}
              >
                {currentOrg?.name ?? "Select workspace"}
              </span>
            )}
          </div>
          {(isNavbar || !collapsed) && (
            <ChevronDown className={cn("shrink-0 opacity-45", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={dropdownAlign} className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px] max-w-[320px]">
        <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
        {organizations.length === 0 ? (
          <DropdownMenuItem disabled>No workspaces</DropdownMenuItem>
        ) : (
          organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSelect(org.id)}
              className="flex items-center gap-2"
            >
              {org.id === orgId ? (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <span className="w-4" />
              )}
              <Avatar className="h-6 w-6 shrink-0 rounded-md">
                <AvatarImage src={resolveWorkspaceLogoUrl(org.logoUrl)} alt="" />
                <AvatarFallback className="rounded-md bg-muted text-[10px] font-medium">
                  {getInitials(org.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{org.name}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
import { Building2, Check, ChevronDown } from "lucide-react";

export interface OrgSwitcherProps {
  collapsed?: boolean;
  /** Compact variant for navbar - always shows org name, no collapse behavior */
  variant?: "sidebar" | "navbar";
  className?: string;
}

export function OrgSwitcher({ collapsed, variant = "sidebar", className }: OrgSwitcherProps) {
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

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", isNavbar ? "px-2" : "px-2 py-2", className)}>
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        {(isNavbar || !collapsed) && <Skeleton className="h-4 flex-1 min-w-[100px] rounded" />}
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "font-medium text-foreground hover:bg-accent/50",
            isNavbar
              ? "h-9 gap-2 px-3 rounded-lg"
              : cn("w-full justify-between gap-2", collapsed ? "justify-center px-2" : "px-3"),
            className
          )}
          aria-label={currentOrg ? `Current organization: ${currentOrg.name}. Switch organization.` : "Switch organization"}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-8 w-8 shrink-0 rounded-lg">
              {currentOrg?.logoUrl && <AvatarImage src={currentOrg.logoUrl} alt="" />}
              <AvatarFallback className="rounded-lg bg-primary/20 text-primary text-xs font-semibold">
                {currentOrg ? getInitials(currentOrg.name) : <Building2 className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            {(isNavbar || !collapsed) && (
              <span className="truncate max-w-[160px] sm:max-w-[200px]">
                {currentOrg?.name ?? "Select org"}
              </span>
            )}
          </div>
          {(isNavbar || !collapsed) && <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isNavbar ? "end" : "start"} className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px] max-w-[320px]">
        <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
        {organizations.length === 0 ? (
          <DropdownMenuItem disabled>No organizations</DropdownMenuItem>
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
                {org.logoUrl && <AvatarImage src={org.logoUrl} alt="" />}
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

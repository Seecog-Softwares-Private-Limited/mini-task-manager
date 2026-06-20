"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { WorkspaceThumb } from "@/components/workspaces/workspace-thumb";
import { PlanBadge } from "@/components/PlanBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/context/tenant-context";
import { useWorkspacePlan } from "@/hooks/use-workspace-plan";
import { fetchOrganizations } from "@/services/api/organizations.api";
import { cn } from "@/lib/utils";
import { Building2, Check, ChevronsUpDown, Plus, Search, Settings2 } from "lucide-react";

function formatRole(role?: string): string | null {
  if (!role) return null;
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export function SidebarWorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const { orgId, setOrgId } = useTenant();
  const { data: planData } = useWorkspacePlan();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });

  const currentOrg = useMemo(
    () => organizations.find((o) => o.id === orgId) ?? organizations[0],
    [organizations, orgId]
  );

  const currentRole = formatRole(currentOrg?.myRole);
  const isOwnerOrAdmin =
    currentOrg?.myRole?.toLowerCase() === "owner" ||
    currentOrg?.myRole?.toLowerCase() === "admin";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((o) => o.name.toLowerCase().includes(q));
  }, [organizations, query]);

  function handleSelect(id: string) {
    setOrgId(id);
    setOpen(false);
    setQuery("");
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className={cn("px-3 pb-2", collapsed ? "pt-1.5" : "pt-1")}>
        <Skeleton className={cn("rounded-xl", collapsed ? "mx-auto h-9 w-9" : "h-12 w-full")} />
      </div>
    );
  }

  const switchPanel = (
    <DropdownMenuContent
      align={collapsed ? "center" : "start"}
      side={collapsed ? "right" : "bottom"}
      className="w-72 p-0"
    >
      <DropdownMenuLabel className="px-3 pt-2.5">Switch workspace</DropdownMenuLabel>
      <div className="px-2 pb-1.5 pt-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspaces…"
            className="h-8 pl-8 text-sm"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto px-1 pb-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            No workspaces found
          </p>
        ) : (
          filtered.map((org) => {
            const role = formatRole(org.myRole);
            const isActive = org.id === currentOrg?.id;
            return (
              <button
                key={org.id}
                type="button"
                onClick={() => handleSelect(org.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60",
                  isActive && "bg-violet-500/[0.08]"
                )}
              >
                <WorkspaceThumb workspace={org} size="md" active={isActive} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-tight">{org.name}</p>
                  {role ? (
                    <p className="truncate text-[10px] text-muted-foreground">{role}</p>
                  ) : null}
                </div>
                {isActive ? (
                  <Check className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
                ) : null}
              </button>
            );
          })
        )}
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => router.push("/dashboard/workspaces")}>
        <Plus className="mr-2 h-4 w-4" />
        Create or join workspace
      </DropdownMenuItem>
      {isOwnerOrAdmin ? (
        <DropdownMenuItem onSelect={() => router.push("/dashboard/settings/workspace")}>
          <Settings2 className="mr-2 h-4 w-4" />
          Workspace settings
        </DropdownMenuItem>
      ) : null}
    </DropdownMenuContent>
  );

  if (collapsed) {
    return (
      <div className="px-3 pb-2 pt-1.5">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full justify-center rounded-xl p-1 transition-colors hover:bg-violet-500/[0.06]"
              aria-label="Switch workspace"
              title={currentOrg?.name ?? "Select workspace"}
            >
              {currentOrg ? (
                <WorkspaceThumb workspace={currentOrg} size="md" className="h-8 w-8" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-muted text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          {switchPanel}
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="px-3 pb-2 pt-0.5">
      <p className="mb-1 px-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/55">
        Working in
      </p>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl border border-border/55 bg-card/70 px-2.5 py-2 text-left transition-colors hover:border-violet-500/30 hover:bg-violet-500/[0.04]"
            aria-label={
              currentOrg
                ? `Current workspace: ${currentOrg.name}. Switch workspace.`
                : "Select workspace"
            }
          >
            {currentOrg ? (
              <WorkspaceThumb workspace={currentOrg} size="md" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                {currentOrg?.name ?? "Select workspace"}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                {currentRole ? (
                  <span className="text-[10px] text-muted-foreground">{currentRole}</span>
                ) : null}
                {planData ? <PlanBadge plan={planData.plan} compact showIcon /> : null}
              </div>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          </button>
        </DropdownMenuTrigger>
        {switchPanel}
      </DropdownMenu>
    </div>
  );
}

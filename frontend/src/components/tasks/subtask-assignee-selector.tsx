"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrgMembers, fetchProjectMembers } from "@/services/api/members.api";
import { useTenant } from "@/context/tenant-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Loader2, Search, UserRound, UserRoundPlus, UserRoundX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgMember } from "@/types/api";

const DROPDOWN_Z = "z-[110]";

type MemberOption = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
};

interface SubtaskAssigneeSelectorProps {
  projectId: string;
  organizationId?: string;
  /** Reuse members already loaded by the task modal (avoids duplicate fetches). */
  prefetchedOrgMembers?: OrgMember[];
  value?: string;
  onChange: (assigneeId?: string) => void;
  disabled?: boolean;
  /** Pre-resolved members from the task modal (project + org + task assignee). */
  knownMembers?: MemberOption[];
}

function mergeMemberOptions(
  projectMembers: Awaited<ReturnType<typeof fetchProjectMembers>>,
  orgMembers: OrgMember[],
  knownMembers: MemberOption[] = []
): MemberOption[] {
  const byUserId = new Map<string, MemberOption>();

  for (const hint of knownMembers) {
    byUserId.set(hint.id, hint);
  }

  for (const m of projectMembers) {
    byUserId.set(m.userId, {
      id: m.userId,
      name: m.user?.fullName ?? m.user?.email ?? "User",
      email: m.user?.email ?? "",
      avatarUrl: m.user?.avatarUrl,
    });
  }

  for (const om of orgMembers) {
    if (om.status?.toLowerCase() !== "active") continue;
    if (byUserId.has(om.userId)) continue;
    byUserId.set(om.userId, {
      id: om.userId,
      name: om.user?.fullName ?? om.user?.email ?? "User",
      email: om.user?.email ?? "",
      avatarUrl: om.user?.avatarUrl,
    });
  }

  return Array.from(byUserId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function SubtaskAssigneeSelector({
  projectId,
  organizationId,
  prefetchedOrgMembers,
  value,
  onChange,
  disabled,
  knownMembers = [],
}: SubtaskAssigneeSelectorProps) {
  const { orgId: tenantOrgId } = useTenant();
  const orgId = organizationId ?? tenantOrgId ?? "";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: projectMembers = [], isLoading: projectLoading } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const { data: fetchedOrgMembers = [], isLoading: orgLoading } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: () => fetchOrgMembers(orgId),
    enabled: !!orgId && prefetchedOrgMembers === undefined,
    staleTime: 60_000,
  });

  const orgMembers = prefetchedOrgMembers ?? fetchedOrgMembers;
  const isLoading = projectLoading || (prefetchedOrgMembers === undefined && orgLoading);

  const options = useMemo(
    () => mergeMemberOptions(projectMembers, orgMembers, knownMembers),
    [projectMembers, orgMembers, knownMembers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((m) => m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q));
  }, [options, search]);

  const selected = value ? options.find((m) => m.id === value) : undefined;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-7 w-7 shrink-0 rounded-full p-0"
          aria-label={selected ? `Assignee ${selected.name}` : value ? "Assigned member" : "Assign subtask"}
        >
          {selected ? (
            <Avatar className="h-7 w-7 ring-1 ring-border/60">
              <AvatarImage src={selected.avatarUrl} />
              <AvatarFallback className="bg-muted text-[10px] font-semibold text-foreground">
                {selected.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : value ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/40 bg-muted/40">
              <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-foreground/35 bg-muted/50">
              <UserRoundPlus className="h-3.5 w-3.5 text-foreground/75" aria-hidden />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-72 p-0", DROPDOWN_Z)}
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="p-3">
          <DropdownMenuLabel className="px-0 pb-2 text-xs font-semibold">
            Assign Subtask
          </DropdownMenuLabel>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-xs"
              aria-label="Search project members"
            />
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-72 overflow-y-auto p-1">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onChange(undefined);
              setOpen(false);
            }}
            className="rounded-md text-xs"
          >
            <UserRoundX className="mr-2 h-3.5 w-3.5" />
            Clear assignee
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            filtered.map((member) => {
            const checked = member.id === value;
            return (
              <DropdownMenuItem
                key={member.id}
                onSelect={(event) => {
                  event.preventDefault();
                  onChange(member.id);
                  setOpen(false);
                }}
                className="rounded-md py-2"
              >
                <div className="flex w-full items-center gap-2.5">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback className="text-[10px]">
                      {member.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{member.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{member.email}</p>
                  </div>
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      checked ? "border-primary bg-primary text-white" : "border-border bg-background text-transparent"
                    )}
                    aria-label={checked ? "Selected" : "Not selected"}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                </div>
              </DropdownMenuItem>
            );
          })
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              {options.length === 0 ? "No members available" : "No matching members"}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

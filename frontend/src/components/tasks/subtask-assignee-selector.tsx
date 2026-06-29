"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrgMembers, fetchProjectMembers } from "@/services/api/members.api";
import { useTenant } from "@/context/tenant-context";
import { UserAvatar } from "@/components/ui/user-avatar";
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
import { DropdownScrollList } from "@/components/ui/dropdown-scroll-list";
import { AssigneeBulkActions } from "@/components/tasks/assignee-bulk-actions";
import { Check, Loader2, Search, UserRound, UserRoundPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgMember } from "@/types/api";
import {
  areAllFilteredAssigneesSelected,
  normalizeAssigneeUserId,
  toggleSelectAllFilteredAssignees,
} from "@/lib/task-assignees";

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
  value?: string[];
  onChange: (assigneeIds: string[]) => void;
  disabled?: boolean;
  /** Pre-resolved members from the task modal (project + org + task assignee). */
  knownMembers?: MemberOption[];
  /** When true, only parent task assignees appear in the dropdown. */
  taskAssigneesOnly?: boolean;
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
  taskAssigneesOnly = false,
}: SubtaskAssigneeSelectorProps) {
  const { orgId: tenantOrgId } = useTenant();
  const orgId = organizationId ?? tenantOrgId ?? "";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedIds = useMemo(() => value ?? [], [value]);

  const { data: projectMembers = [], isLoading: projectLoading } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: !!projectId && !taskAssigneesOnly,
    staleTime: 60_000,
  });

  const { data: fetchedOrgMembers = [], isLoading: orgLoading } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: () => fetchOrgMembers(orgId),
    enabled: !!orgId && !taskAssigneesOnly && prefetchedOrgMembers === undefined,
    staleTime: 60_000,
  });

  const orgMembers = prefetchedOrgMembers ?? fetchedOrgMembers;
  const isLoading = taskAssigneesOnly
    ? false
    : projectLoading || (prefetchedOrgMembers === undefined && orgLoading);

  const options = useMemo(
    () =>
      taskAssigneesOnly
        ? [...knownMembers].sort((a, b) => a.name.localeCompare(b.name))
        : mergeMemberOptions(projectMembers, orgMembers, knownMembers),
    [taskAssigneesOnly, projectMembers, orgMembers, knownMembers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((m) => m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q));
  }, [options, search]);

  const selected = useMemo(
    () => options.filter((m) =>
      selectedIds.some((id) => normalizeAssigneeUserId(id) === normalizeAssigneeUserId(m.id))
    ),
    [options, selectedIds]
  );

  const allFilteredSelected = useMemo(
    () => areAllFilteredAssigneesSelected(selectedIds, filtered.map((m) => m.id)),
    [selectedIds, filtered]
  );

  const selectedFilteredCount = useMemo(
    () =>
      filtered.filter((m) =>
        selectedIds.some((id) => normalizeAssigneeUserId(id) === normalizeAssigneeUserId(m.id))
      ).length,
    [filtered, selectedIds]
  );

  function toggle(memberId: string) {
    const isSelected = selectedIds.some(
      (id) => normalizeAssigneeUserId(id) === normalizeAssigneeUserId(memberId)
    );
    if (isSelected) {
      onChange(
        selectedIds.filter(
          (id) => normalizeAssigneeUserId(id) !== normalizeAssigneeUserId(memberId)
        )
      );
      return;
    }
    onChange([...selectedIds, memberId]);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-7 w-7 shrink-0 rounded-full p-0"
          aria-label={
            selected.length === 1
              ? `Assignee ${selected[0].name}`
              : selected.length > 1
                ? `${selected.length} assignees`
                : selectedIds.length
                  ? "Assigned members"
                  : "Assign subtask"
          }
        >
          {selected.length === 1 ? (
            <UserAvatar
              userId={selected[0].id}
              name={selected[0].name}
              avatarUrl={selected[0].avatarUrl}
              className="h-7 w-7 ring-1 ring-border/60"
              fallbackClassName="bg-muted text-[10px] font-semibold text-foreground"
            />
          ) : selected.length > 1 ? (
            <div className="flex h-7 w-7 items-center justify-center">
              <div className="flex -space-x-1.5">
                {selected.slice(0, 2).map((member) => (
                  <UserAvatar
                    key={member.id}
                    userId={member.id}
                    name={member.name}
                    avatarUrl={member.avatarUrl}
                    className="h-5 w-5 border border-background ring-1 ring-border/50"
                    fallbackClassName="text-[8px]"
                  />
                ))}
              </div>
            </div>
          ) : selectedIds.length > 0 ? (
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
            {taskAssigneesOnly ? "Assign to task member" : "Assign Subtask"}
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
        <AssigneeBulkActions
          filteredCount={filtered.length}
          allSelected={allFilteredSelected}
          selectedCount={selectedFilteredCount}
          isSearchActive={search.trim().length > 0}
          selectAllLabel="Select all"
          showPartialIndicator={false}
          onToggleSelectAll={() =>
            onChange(toggleSelectAllFilteredAssignees(selectedIds, filtered.map((m) => m.id)))
          }
          onClear={() => onChange([])}
          disabled={disabled || isLoading}
        />
        <DropdownScrollList>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            filtered.map((member) => {
              const checked = selectedIds.some(
                (id) => normalizeAssigneeUserId(id) === normalizeAssigneeUserId(member.id)
              );
              return (
                <DropdownMenuItem
                  key={member.id}
                  onSelect={(event) => {
                    event.preventDefault();
                    toggle(member.id);
                  }}
                  className="rounded-md py-2"
                >
                  <div className="flex w-full items-center gap-2.5">
                    <UserAvatar
                      userId={member.id}
                      name={member.name}
                      avatarUrl={member.avatarUrl}
                      className="h-7 w-7"
                      fallbackClassName="text-[10px]"
                    />
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
              {options.length === 0
                ? taskAssigneesOnly
                  ? "Assign members to the task first"
                  : "No members available"
                : "No matching members"}
            </div>
          )}
        </DropdownScrollList>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

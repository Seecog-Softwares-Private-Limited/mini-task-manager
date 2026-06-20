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
import { Check, Loader2, Search, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  areAllFilteredAssigneesSelected,
  toggleSelectAllFilteredAssignees,
} from "@/lib/task-assignees";

/** Above create-task modal overlay (z-[100]). */
const DROPDOWN_Z = "z-[110]";

interface AssigneeSelectorProps {
  projectId: string;
  value: string[];
  onChange: (assigneeIds: string[]) => void;
  disabled?: boolean;
}

export function AssigneeSelector({
  projectId,
  value,
  onChange,
  disabled,
}: AssigneeSelectorProps) {
  const { orgId } = useTenant();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: projectMembers = [], isLoading: projectLoading } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const { data: orgMembers = [], isLoading: orgLoading } = useQuery({
    queryKey: ["org-members", orgId ?? ""],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const isLoading = projectLoading || orgLoading;

  const list = useMemo(() => {
    const byUserId = new Map<
      string,
      { id: string; name: string; email: string; avatarUrl?: string }
    >();

    for (const m of projectMembers) {
      byUserId.set(m.userId, {
        id: m.userId,
        name: m.user?.fullName ?? m.user?.email ?? "User",
        email: m.user?.email ?? "",
        avatarUrl: m.user?.avatarUrl,
      });
    }

    if (byUserId.size === 0) {
      for (const om of orgMembers) {
        if (om.status?.toLowerCase() !== "active") continue;
        byUserId.set(om.userId, {
          id: om.userId,
          name: om.user?.fullName ?? om.user?.email ?? "User",
          email: om.user?.email ?? "",
          avatarUrl: om.user?.avatarUrl,
        });
      }
    }

    return Array.from(byUserId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [projectMembers, orgMembers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [list, search]);

  const selected = useMemo(
    () => list.filter((m) => value.includes(m.id)),
    [list, value]
  );

  const allFilteredSelected = useMemo(
    () => areAllFilteredAssigneesSelected(value, filtered.map((m) => m.id)),
    [value, filtered]
  );

  const selectedFilteredCount = useMemo(
    () => filtered.filter((m) => value.includes(m.id)).length,
    [filtered, value]
  );

  function toggle(memberId: string) {
    if (value.includes(memberId)) {
      onChange(value.filter((id) => id !== memberId));
      return;
    }
    onChange([...value, memberId]);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <div
        className={cn(
          "flex h-9 w-full items-stretch overflow-hidden rounded-lg border border-border/55 bg-background shadow-sm",
          "transition-all duration-200 hover:bg-muted/20",
          (disabled || !projectId) && "opacity-50"
        )}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || !projectId}
            className="h-full min-w-0 flex-1 justify-start gap-2 rounded-none border-0 px-2.5 shadow-none hover:bg-transparent"
          >
            {selected.length === 1 ? (
              <>
                <UserAvatar
                  userId={selected[0].id}
                  name={selected[0].name}
                  avatarUrl={selected[0].avatarUrl}
                  className="h-6 w-6 shrink-0"
                  fallbackClassName="text-[10px]"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{selected[0].name}</span>
              </>
            ) : selected.length > 1 ? (
              <>
                <div className="flex -space-x-1.5">
                  {selected.slice(0, 3).map((member) => (
                    <UserAvatar
                      key={member.id}
                      userId={member.id}
                      name={member.name}
                      avatarUrl={member.avatarUrl}
                      className="h-6 w-6 border-2 border-background"
                      fallbackClassName="text-[10px]"
                    />
                  ))}
                </div>
                <span className="truncate text-sm font-medium">{selected.length} assignees</span>
              </>
            ) : (
              <>
                <Users className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                <span className="text-sm text-muted-foreground">Assign member</span>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        {selected.length === 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="h-full w-9 shrink-0 rounded-none border-l border-border/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            onClick={() => onChange([])}
            aria-label={`Remove ${selected[0].name}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
      <DropdownMenuContent
        align="start"
        className={cn("w-80 p-0", DROPDOWN_Z)}
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="p-3">
          <DropdownMenuLabel className="px-0 pb-2 text-xs font-semibold">
            Assignee
          </DropdownMenuLabel>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-xs"
              aria-label="Search members"
            />
          </div>
        </div>
        <DropdownMenuSeparator />
        <AssigneeBulkActions
          filteredCount={filtered.length}
          allSelected={allFilteredSelected}
          selectedCount={selectedFilteredCount}
          isSearchActive={search.trim().length > 0}
          onToggleSelectAll={() =>
            onChange(toggleSelectAllFilteredAssignees(value, filtered.map((m) => m.id)))
          }
          onClear={() => onChange([])}
          disabled={disabled || isLoading}
        />
        <DropdownScrollList>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading members…
            </div>
          ) : (
            <>
              {filtered.map((member) => {
                const checked = value.includes(member.id);
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
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-200",
                          checked
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-background text-transparent"
                        )}
                        aria-label={checked ? "Selected" : "Not selected"}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {list.length === 0
                    ? "No workspace members found. Invite someone from Settings → Members."
                    : "No matching members"}
                </div>
              )}
            </>
          )}
        </DropdownScrollList>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

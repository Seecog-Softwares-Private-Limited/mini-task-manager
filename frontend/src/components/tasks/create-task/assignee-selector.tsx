"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProjectMembers } from "@/services/api/members.api";
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
import { Check, Search, UserRoundX, Users } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: open && !!projectId,
    staleTime: 60_000,
  });

  const list = useMemo(
    () =>
      members.map((m) => ({
        id: m.userId,
        name: m.user?.fullName ?? m.user?.email ?? "User",
        email: m.user?.email ?? "",
        avatarUrl: m.user?.avatarUrl,
      })),
    [members]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [list, search]);

  const selected = useMemo(
    () => list.filter((m) => value.includes(m.id)),
    [list, value]
  );

  function toggle(memberId: string) {
    if (value.includes(memberId)) {
      onChange(value.filter((id) => id !== memberId));
      return;
    }
    onChange([...value, memberId]);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-10 w-full justify-start gap-2"
        >
          {selected.length > 0 ? (
            <>
              <div className="flex -space-x-2">
                {selected.slice(0, 3).map((member) => (
                  <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback className="text-[10px]">
                      {member.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="truncate text-sm">
                {selected.length} assigned
              </span>
            </>
          ) : (
            <>
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Assign member</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-80 p-0"
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
        <div className="max-h-72 overflow-y-auto p-1">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onChange([]);
            }}
            className="rounded-md text-xs"
          >
            <UserRoundX className="mr-2 h-3.5 w-3.5" />
            Clear assignment
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {filtered.map((member) => {
            const checked = value.includes(member.id);
            return (
              <DropdownMenuItem
                key={member.id}
                onSelect={(event) => {
                  event.preventDefault(); // keep menu open for multi-select
                  toggle(member.id);
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
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">No matching members</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


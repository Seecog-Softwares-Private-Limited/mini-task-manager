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
import { Check, Search, UserRoundPlus, UserRoundX } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubtaskAssigneeSelectorProps {
  projectId: string;
  value?: string;
  onChange: (assigneeId?: string) => void;
  disabled?: boolean;
}

export function SubtaskAssigneeSelector({
  projectId,
  value,
  onChange,
  disabled,
}: SubtaskAssigneeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: open && !!projectId,
    staleTime: 60_000,
  });

  const options = useMemo(
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
    if (!q) return options;
    return options.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [options, search]);

  const selected = options.find((m) => m.id === value);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-7 w-7 rounded-full p-0"
          aria-label={selected ? `Assignee ${selected.name}` : "Assign subtask"}
        >
          {selected ? (
            <Avatar className="h-7 w-7">
              <AvatarImage src={selected.avatarUrl} />
              <AvatarFallback className="text-[10px]">
                {selected.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 bg-muted/30">
              <UserRoundPlus className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 p-0"
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
          {filtered.map((member) => {
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
          })}
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">No matching members</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


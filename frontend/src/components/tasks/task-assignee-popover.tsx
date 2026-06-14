"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProjectMembers } from "@/services/api/members.api";
import { updateTaskAssignee, updateTaskAssignees } from "@/services/api/tasks.api";
import { UserAvatar } from "@/components/ui/user-avatar";
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
import { Check, Search, UserRoundX } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskAssignee {
  id?: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface PopoverTask {
  id: string;
  projectId: string;
  assigneeId?: string;
  assigneeIds?: string[];
  assignees?: TaskAssignee[];
}

interface TaskAssigneePopoverProps {
  task: PopoverTask;
  trigger: ReactNode;
  multiAssign?: boolean;
  onAssigneesChange?: (assignees: TaskAssignee[]) => void;
}

export function TaskAssigneePopover({
  task,
  trigger,
  multiAssign = false,
  onAssigneesChange,
}: TaskAssigneePopoverProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["project-members", task.projectId],
    queryFn: () => fetchProjectMembers(task.projectId),
    enabled: open && !!task.projectId,
    staleTime: 60_000,
  });

  const normalizedMembers = useMemo(
    () =>
      members.map((m) => ({
        id: m.userId,
        name: m.user?.fullName ?? m.user?.email ?? "User",
        email: m.user?.email,
        avatarUrl: m.user?.avatarUrl,
      })),
    [members]
  );

  const selectedIds = useMemo(() => {
    if (task.assigneeIds?.length) {
      return new Set(task.assigneeIds);
    }
    if (task.assignees && task.assignees.length > 0) {
      return new Set(task.assignees.map((a) => a.id).filter(Boolean) as string[]);
    }
    return new Set(task.assigneeId ? [task.assigneeId] : []);
  }, [task.assigneeId, task.assigneeIds, task.assignees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return normalizedMembers;
    return normalizedMembers.filter((m) => {
      return m.name.toLowerCase().includes(q) || (m.email?.toLowerCase().includes(q) ?? false);
    });
  }, [normalizedMembers, search]);

  const assignMutation = useMutation({
    mutationFn: (assigneeIds: string[]) =>
      assigneeIds.length === 1 && !multiAssign
        ? updateTaskAssignee(task.id, assigneeIds[0])
        : updateTaskAssignees(task.id, assigneeIds),
    onMutate: async (assigneeIds) => {
      const nextAssignees = normalizedMembers.filter((m) => assigneeIds.includes(m.id));
      onAssigneesChange?.(nextAssignees);

      await queryClient.cancelQueries({ queryKey: ["tasks", task.projectId] });
      const previous = queryClient.getQueryData<{ data: Array<Record<string, unknown>> }>([
        "tasks",
        task.projectId,
      ]);
      queryClient.setQueryData<{ data: Array<Record<string, unknown>> }>(
        ["tasks", task.projectId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item) =>
              item.id === task.id
                ? {
                    ...item,
                    assigneeIds,
                    assigneeId: assigneeIds[0] ?? undefined,
                    assignees: nextAssignees,
                  }
                : item
            ),
          };
        }
      );
      return { previous };
    },
    onError: (_err, _assigneeIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tasks", task.projectId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", task.projectId] });
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
    },
  });

  function handleSelect(memberId: string) {
    const next = new Set(selectedIds);
    if (next.has(memberId)) next.delete(memberId);
    else next.add(memberId);
    const assigneeIds = Array.from(next);
    assignMutation.mutate(assigneeIds);
    if (!multiAssign) setOpen(false);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 p-0"
        sideOffset={8}
        data-quick-action
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="p-3">
          <DropdownMenuLabel className="px-0 pb-2 text-xs font-semibold">Assign task</DropdownMenuLabel>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="h-9 pl-8 text-xs"
              aria-label="Search members"
            />
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownScrollList>
          <DropdownMenuItem
            onClick={() => {
              assignMutation.mutate([]);
              setOpen(false);
            }}
            data-quick-action
            className="rounded-md text-xs"
          >
            <UserRoundX className="mr-2 h-3.5 w-3.5" />
            Clear assignment
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {filtered.map((member) => {
            const checked = selectedIds.has(member.id);
            return (
              <DropdownMenuItem
                key={member.id}
                onClick={() => handleSelect(member.id)}
                data-quick-action
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
                    <p className="truncate text-[11px] text-muted-foreground">{member.email ?? "No email"}</p>
                  </div>
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                    )}
                    aria-label={checked ? "Selected" : "Not selected"}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                </div>
              </DropdownMenuItem>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">No matching members</div>
          )}
        </DropdownScrollList>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


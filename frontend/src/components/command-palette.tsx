"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";
import { useQuery } from "@tanstack/react-query";
import { fetchProjects } from "@/services/api/projects.api";
import { useTenant } from "@/context/tenant-context";
import { useProjectSelectionOptional } from "@/context/project-selection-context";
import { buildTasksPageHref } from "@/lib/tasks-page-href";
import {
  LayoutDashboard, Building2, FolderKanban, ListTodo, Bell,
  CreditCard, Activity, BarChart3, ClipboardList, Settings, Search, Repeat,
} from "lucide-react";

const navItems: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/tasks", label: "Tasks", icon: ListTodo },
  { href: "/dashboard/recurring-tasks", label: "Recurring Tasks", icon: Repeat },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/audit", label: "Audit log", icon: ClipboardList },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function CommandPalette() {
  const router = useRouter();
  const { orgId } = useTenant();
  const projectSelection = useProjectSelectionOptional();
  const tasksHref = buildTasksPageHref(projectSelection?.selectedProjectId);
  const [open, setOpen] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId ?? ""],
    queryFn: fetchProjects,
    enabled: open && !!orgId,
  });

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:border-primary/20 hover:shadow-sm"
        aria-label="Open command palette (⌘K)"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded-md border bg-background px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
          ⌘K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} label="Command palette">
        <CommandInput placeholder="Search pages or projects..." aria-label="Search" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {navItems.map((item) => {
              const Icon = item.icon;
              const href = item.href === "/dashboard/tasks" ? tasksHref : item.href;
              return (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => {
                    router.push(href);
                    setOpen(false);
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" aria-hidden />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
          {projects.length > 0 && (
            <CommandGroup heading="Projects">
              {projects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.name}
                  onSelect={() => {
                    router.push(`/dashboard/projects/${p.id}`);
                    setOpen(false);
                  }}
                >
                  <FolderKanban className="mr-2 h-4 w-4" aria-hidden />
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

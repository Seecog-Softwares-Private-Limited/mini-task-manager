"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProject } from "@/services/api/projects.api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { Project, ProjectMember } from "@/types/api";
import {
  ArrowLeft,
  FolderKanban,
  Eye,
  Archive,
  ListTodo,
  LayoutDashboard,
  Columns3,
  Users,
  Settings,
} from "lucide-react";

const TAB_ROUTES = [
  { href: (id: string) => `/dashboard/projects/${id}`, label: "Overview", icon: LayoutDashboard },
  { href: (id: string) => `/dashboard/projects/${id}/board`, label: "Board", icon: Columns3 },
  { href: (id: string) => `/dashboard/projects/${id}/members`, label: "Members", icon: Users },
  { href: (id: string) => `/dashboard/projects/${id}/settings`, label: "Settings", icon: Settings },
] as const;

export interface ProjectHeaderProps {
  project: Project;
  projectId: string;
  members: ProjectMember[];
  taskCount: number;
  onProjectUpdate?: (project: Project) => void;
  className?: string;
}

export function ProjectHeader({
  project,
  projectId,
  members,
  taskCount,
  onProjectUpdate,
  className,
}: ProjectHeaderProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingName, setEditingName] = React.useState(false);
  const [localName, setLocalName] = React.useState(project.name);

  React.useEffect(() => {
    setLocalName(project.name);
  }, [project.name]);

  const updateMutation = useMutation({
    mutationFn: (name: string) => updateProject(projectId, { name }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["project", projectId], updated);
      onProjectUpdate?.(updated);
      setEditingName(false);
      toast({ title: "Project renamed", variant: "success" });
    },
    onError: () => toast({ title: "Failed to rename", variant: "error" }),
  });

  const handleBlur = () => {
    const trimmed = localName.trim();
    if (trimmed && trimmed !== project.name) updateMutation.mutate(trimmed);
    else setLocalName(project.name);
    setEditingName(false);
  };

  const isActive = (href: string) => {
    if (href === `/dashboard/projects/${projectId}`)
      return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="h-1.5 gradient-bg" aria-hidden />
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4 pb-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl gradient-bg text-white shadow-md shadow-primary/20">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setLocalName(project.name);
                    setEditingName(false);
                  }
                }}
                className="w-full text-xl font-semibold bg-transparent border-b border-primary/50 focus:outline-none focus:ring-0 px-0 py-0 rounded-none"
                autoFocus
                aria-label="Project name"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-xl font-semibold truncate text-left hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                title="Click to rename"
              >
                {project.name}
              </button>
            )}
            {project.description && (
              <p className="mt-1 text-sm text-muted-foreground truncate">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
            <Eye className="h-3 w-3" /> {project.visibility}
          </span>
          {project.isArchived && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 px-2.5 py-1 text-xs font-medium">
              <Archive className="h-3 w-3" /> Archived
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
            <ListTodo className="h-3 w-3" /> {taskCount} tasks
          </span>
          {members.length > 0 && (
            <div className="flex -space-x-2" role="group" aria-label="Project members">
              {members.slice(0, 5).map((m) => (
                <Avatar key={m.id} className="h-8 w-8 ring-2 ring-background">
                  <AvatarImage src={m.user?.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {(m.user?.fullName ?? m.user?.email ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {members.length > 5 && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
                  +{members.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <nav
        className="flex flex-wrap gap-1 px-6 pb-4"
        aria-label="Project sections"
      >
        {TAB_ROUTES.map((tab) => {
          const href = tab.href(projectId);
          const active = isActive(href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </Card>
  );
}

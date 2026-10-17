"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchProjects } from "@/services/api/projects.api";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

export interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (email: string, role: string, projectIds: string[]) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

export function InviteMemberModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  error,
}: InviteMemberModalProps) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("member");
  const [projectIds, setProjectIds] = React.useState<string[]>([]);
  const [inviteWithoutProjects, setInviteWithoutProjects] = React.useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    enabled: open,
  });

  React.useEffect(() => {
    if (!open) {
      setEmail("");
      setRole("member");
      setProjectIds([]);
      setInviteWithoutProjects(false);
    }
  }, [open]);

  const workspaceOnly = inviteWithoutProjects || projects.length === 0;

  const projectLabel = React.useMemo(() => {
    if (projectsLoading) return "Loading projects…";
    if (projects.length === 0) return "No projects yet";
    if (inviteWithoutProjects) return "No projects (workspace only)";
    if (projectIds.length === 0) return "Select projects…";
    const names = projects.filter((p) => projectIds.includes(p.id)).map((p) => p.name);
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]}, ${names[1]}`;
    return `${names.length} projects selected`;
  }, [projects, projectIds, projectsLoading, inviteWithoutProjects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !role.trim()) return;
    if (!workspaceOnly && projectIds.length === 0) return;
    onSubmit(trimmed, role, workspaceOnly ? [] : projectIds);
  };

  const canSubmit =
    !!email.trim() &&
    !!role.trim() &&
    !isSubmitting &&
    !projectsLoading &&
    (workspaceOnly || projectIds.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px]"
        aria-labelledby="invite-member-title"
        aria-describedby="invite-member-desc"
      >
        <DialogHeader>
          <DialogTitle id="invite-member-title">Invite member</DialogTitle>
          <DialogDescription id="invite-member-desc">
            Send an email invitation to join this workspace. Choose project access, or invite
            without a project for workspace-only membership.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
              required
              autoFocus
              disabled={isSubmitting}
              aria-required="true"
            />
          </div>
          <div>
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={isSubmitting} required>
              <SelectTrigger id="invite-role" className="mt-1.5" aria-required="true">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label id="invite-projects-label">
              Project access{projects.length > 0 && !inviteWithoutProjects ? " *" : ""}
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    isSubmitting ||
                    projectsLoading ||
                    projects.length === 0 ||
                    inviteWithoutProjects
                  }
                  className={cn(
                    "mt-1.5 w-full justify-between font-normal",
                    projectIds.length === 0 && "text-muted-foreground"
                  )}
                  aria-labelledby="invite-projects-label"
                  aria-required={projects.length > 0 && !inviteWithoutProjects}
                >
                  <span className="truncate">{projectLabel}</span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-64 overflow-y-auto"
              >
                {projects.map((project) => {
                  const checked = projectIds.includes(project.id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={project.id}
                      checked={checked}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={(next) => {
                        setInviteWithoutProjects(false);
                        setProjectIds((prev) =>
                          next ? [...prev, project.id] : prev.filter((id) => id !== project.id)
                        );
                      }}
                    >
                      {project.name}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            {projects.length === 0 && !projectsLoading && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                No projects yet — invite will be workspace-only until you grant access later.
              </p>
            )}
            {projects.length > 0 && (
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={inviteWithoutProjects}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setInviteWithoutProjects(next);
                    if (next) setProjectIds([]);
                  }}
                />
                <span>
                  <span className="font-medium">Invite without project</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Workspace only — they won&apos;t see projects until you grant access.
                  </span>
                </span>
              </label>
            )}
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrgMembers,
  removeProjectMember,
  updateProjectMemberRole,
  type ProjectMemberRole,
} from "@/services/api/members.api";
import { parseApiError } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProjectInviteMemberModal } from "@/components/projects/project-invite-member-modal";
import { ProjectInvitationList } from "@/components/projects/project-invitation-list";
import { useProjectMembers, useAddProjectMember, PROJECT_ROLE_OPTIONS } from "@/hooks/use-project-members";
import { useCreateProjectInvitation } from "@/hooks/use-project-invitations";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ProjectMember } from "@/types/api";
import {
  UserPlus,
  Trash2,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

/** Map project role to org invitation role (backend expects admin | member) */
function projectRoleToOrgRole(role: ProjectMemberRole): string {
  if (role === "ADMIN") return "admin";
  return "member";
}

export interface ProjectMembersProps {
  projectId: string;
  organizationId: string;
  projectName: string;
  className?: string;
}

export function ProjectMembers({
  projectId,
  organizationId,
  projectName,
  className,
}: ProjectMembersProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [addUserId, setAddUserId] = React.useState<string>("");
  const [addRole, setAddRole] = React.useState<ProjectMemberRole>("CONTRIBUTOR");
  const [removeMember, setRemoveMember] = React.useState<ProjectMember | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [addExistingExpanded, setAddExistingExpanded] = React.useState(false);

  const { members: projectMembers, isLoading: membersLoading } = useProjectMembers(projectId);
  const { addMember, isPending: addPending } = useAddProjectMember(projectId);
  const { createInvite, isPending: invitePending, error: inviteError } = useCreateProjectInvitation(organizationId);

  const {
    data: orgMembers = [],
    isLoading: orgMembersLoading,
    isError: orgMembersError,
    error: orgMembersQueryError,
    refetch: refetchOrgMembers,
  } = useQuery({
    queryKey: ["org-members", organizationId],
    queryFn: () => fetchOrgMembers(organizationId),
    enabled: !!organizationId,
  });
  const orgMembersErrorMessage = orgMembersQueryError ? parseApiError(orgMembersQueryError) : null;

  const alreadyInProject = React.useMemo(
    () => new Set(projectMembers.map((m) => m.userId)),
    [projectMembers]
  );
  const availableToAdd = orgMembers.filter((m) => !alreadyInProject.has(m.userId));
  const isDuplicate = Boolean(addUserId && alreadyInProject.has(addUserId));
  const canAdd = Boolean(addUserId && !addPending && !isDuplicate);
  const noOneToAdd = !orgMembersLoading && availableToAdd.length === 0;

  const currentMember = projectMembers.find((m) => m.userId === user?.id);
  const canInvite =
    projectMembers.length === 0 || currentMember?.role?.toUpperCase() === "ADMIN";

  const handleAdd = () => {
    if (!canAdd || !addUserId) return;
    addMember(
      { userId: addUserId, role: addRole },
      {
        onSuccess: () => {
          setAddUserId("");
        },
      }
    );
  };

  const handleInviteSubmit = (params: { email: string; role: string; message?: string }) => {
    createInvite(
      { email: params.email, role: projectRoleToOrgRole(params.role as ProjectMemberRole) },
      {
        onSuccess: () => {
          setInviteModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["org-members", organizationId] });
        },
      }
    );
  };

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      updateProjectMemberRole(projectId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
      toast({ title: "Role updated", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Failed to update role",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeProjectMember(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
      setRemoveMember(null);
      toast({ title: "Member removed from project", variant: "default" });
    },
    onError: (err) => {
      toast({
        title: "Failed to remove member",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Project members
            </CardTitle>
            <div className="flex items-center gap-2">
              {projectMembers.length > 0 && (
                <div className="flex -space-x-2" role="group" aria-label="Project members">
                  {projectMembers.slice(0, 5).map((m) => (
                    <Avatar key={m.id} className="h-8 w-8 ring-2 ring-background">
                      <AvatarImage src={m.user?.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {(m.user?.fullName ?? m.user?.email ?? "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {projectMembers.length > 5 && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
                      +{projectMembers.length - 5}
                    </span>
                  )}
                </div>
              )}
              {canInvite && (
                <Button
                  size="sm"
                  onClick={() => setInviteModalOpen(true)}
                  disabled={invitePending}
                  aria-label="Invite member by email"
                >
                  {invitePending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <UserPlus className="mr-1.5 h-4 w-4" />
                  )}
                  + Invite
                </Button>
              )}
            </div>
          </div>

          {/* Secondary: Add Existing Member (collapsible) */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddExistingExpanded(!addExistingExpanded)}
                aria-expanded={addExistingExpanded}
                aria-label="Add existing organization member"
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Add Existing Member
                {addExistingExpanded ? (
                  <ChevronUp className="ml-1.5 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-1.5 h-4 w-4" />
                )}
              </Button>
            </div>

            {addExistingExpanded && (
              <div
                className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center pt-2"
                role="region"
                aria-label="Add existing member form"
              >
                <Select
                  value={addUserId || "__placeholder__"}
                  onValueChange={(v) => setAddUserId(v === "__placeholder__" ? "" : v)}
                  disabled={addPending}
                >
                  <SelectTrigger className="w-full sm:w-[200px]" aria-label="Select member to add">
                    <SelectValue placeholder="Add org member..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__placeholder__">
                      {orgMembersLoading ? "Loading..." : "Add org member..."}
                    </SelectItem>
                    {orgMembersError && (
                      <SelectItem value="__error__" disabled>
                        Could not load members
                      </SelectItem>
                    )}
                    {!orgMembersError && availableToAdd.length === 0 && !orgMembersLoading && (
                      <SelectItem value="__empty__" disabled>
                        No other members to add
                      </SelectItem>
                    )}
                    {availableToAdd.map((m) => (
                      <SelectItem key={m.id} value={m.userId}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={m.user?.avatarUrl} />
                            <AvatarFallback className="text-[10px]">
                              {(m.user?.fullName ?? m.user?.email ?? "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {m.user?.fullName ?? m.user?.email ?? m.userId}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={addRole}
                  onValueChange={(v) => setAddRole(v as ProjectMemberRole)}
                  disabled={addPending}
                >
                  <SelectTrigger className="w-full sm:w-[130px]" aria-label="Role for new member">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!canAdd}
                  onClick={handleAdd}
                  aria-label="Add member"
                >
                  {addPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-1.5 h-4 w-4" /> Add
                    </>
                  )}
                </Button>
                {!addUserId && !isDuplicate && (
                  <p className="text-xs text-muted-foreground sm:w-full" role="status">
                    Select a member above to add
                  </p>
                )}
                {isDuplicate && (
                  <p className="text-xs text-muted-foreground sm:w-full" role="status">
                    User already added to project
                  </p>
                )}
                {noOneToAdd && !addUserId && !orgMembersError && (
                  <p className="text-xs text-muted-foreground sm:w-full" role="status">
                    No other organization members to add
                  </p>
                )}
                {orgMembersError && (
                  <div className="flex flex-wrap items-center gap-2 sm:w-full">
                    <p className="text-xs text-destructive" role="alert">
                      {orgMembersErrorMessage ?? "Could not load members"}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => refetchOrgMembers()}
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading members">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : projectMembers.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed bg-muted/30"
              role="status"
              aria-label="No members"
            >
              <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">No members yet</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                {canInvite
                  ? "Invite someone by email or add an existing organization member above."
                  : "Add someone from your organization using the dropdown above."}
              </p>
            </div>
          ) : (
            <ul className="divide-y" role="list">
              {projectMembers.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-4 py-4 first:pt-0"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={member.user?.avatarUrl} />
                    <AvatarFallback className="text-sm">
                      {(member.user?.fullName ?? member.user?.email ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {member.user?.fullName ?? member.user?.email ?? "—"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {member.user?.email ?? "—"}
                    </p>
                  </div>
                  <Select
                    value={member.role?.toUpperCase() ?? "VIEWER"}
                    onValueChange={(role) =>
                      updateRoleMutation.mutate({ memberId: member.id, role })
                    }
                    disabled={updateRoleMutation.isPending}
                  >
                    <SelectTrigger className="w-[130px]" aria-label={`Role for ${member.user?.email}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setRemoveMember(member)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Pending Invitations</CardTitle>
          <p className="text-sm text-muted-foreground">
            Email invitations sent to join your organization. Once accepted, add them to this project via &quot;Add Existing Member&quot;.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ProjectInvitationList organizationId={organizationId} />
        </CardContent>
      </Card>

      <ProjectInviteMemberModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onSubmit={handleInviteSubmit}
        isSubmitting={invitePending}
        error={inviteError ? parseApiError(inviteError) : null}
      />

      <ConfirmDialog
        open={!!removeMember}
        onOpenChange={(open) => !open && setRemoveMember(null)}
        title="Remove from project"
        description={
          removeMember
            ? `Remove ${removeMember.user?.fullName ?? removeMember.user?.email ?? "this member"} from ${projectName}?`
            : ""
        }
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (removeMember) removeMutation.mutate(removeMember.id);
        }}
        loading={removeMutation.isPending}
      />
    </div>
  );
}

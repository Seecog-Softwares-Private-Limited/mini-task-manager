"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/context/tenant-context";
import { usePermissions } from "@/hooks/use-permissions";
import { fetchOrganization } from "@/services/api/organizations.api";
import { transferOrganizationOwnership } from "@/services/api/organizations.api";
import {
  fetchOrgMembers,
  removeOrgMember,
  updateOrgMemberRole,
} from "@/services/api/members.api";
import { parseApiError } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InviteMemberModal } from "@/components/members/invite-member-modal";
import { InvitationList } from "@/components/members/invitation-list";
import { useCreateInvitation } from "@/hooks/use-invitations";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { OrgMember } from "@/types/api";
import {
  ArrowLeft,
  Building2,
  Mail,
  Search,
  UserPlus,
  MoreHorizontal,
  Trash2,
  Crown,
  Send,
  Loader2,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrgSettingsTabs } from "@/components/settings/org-settings-tabs";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

export default function SettingsMembersPage() {
  const { orgId } = useTenant();
  const { canInviteMembers, isLoading: permsLoading } = usePermissions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [removeMember, setRemoveMember] = React.useState<OrgMember | null>(null);
  const [transferTo, setTransferTo] = React.useState<OrgMember | null>(null);

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ["organization", orgId ?? ""],
    queryFn: () => fetchOrganization(orgId!),
    enabled: !!orgId,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["org-members", orgId ?? ""],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId,
  });

  const filteredMembers = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.user?.email?.toLowerCase().includes(q) ||
        m.user?.fullName?.toLowerCase().includes(q)
    );
  }, [members, search]);

  const { createInvite, isPending: invitePending, error: inviteError } = useCreateInvitation(orgId);

  const updateRoleMutation = useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: string;
    }) => updateOrgMemberRole(orgId!, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members", orgId!] });
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
    mutationFn: (memberId: string) => removeOrgMember(orgId!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members", orgId!] });
      setRemoveMember(null);
      toast({ title: "Member removed", variant: "default" });
    },
    onError: (err) => {
      toast({
        title: "Failed to remove member",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: (newOwnerUserId: string) =>
      transferOrganizationOwnership(orgId!, newOwnerUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId!] });
      queryClient.invalidateQueries({ queryKey: ["org-members", orgId!] });
      setTransferTo(null);
      toast({ title: "Ownership transferred", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Failed to transfer ownership",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const isOwner = (m: OrgMember) => org?.ownerId === m.userId;

  if (!permsLoading && !canInviteMembers) {
    return (
      <div className="space-y-6 animate-slide-up">
        <OrgSettingsTabs />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="mt-1 text-muted-foreground">Invite members, manage roles, transfer ownership.</p>
        </div>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
              <Shield className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold">Access Restricted</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Only owners and admins can manage members.</p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/dashboard/settings">Back to Settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-4 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Select a workspace</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Choose a workspace to manage members.
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/workspaces">Workspaces</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <OrgSettingsTabs />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="mt-1 text-muted-foreground">
            Manage workspace members, roles, and invitations.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} aria-label="Invite member">
          <UserPlus className="mr-1.5 h-4 w-4" /> Invite
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search members"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {membersLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {search.trim()
                ? "No members match your search."
                : "No members yet. Invite someone to get started."}
            </div>
          ) : (
            <ul className="divide-y" role="list">
              {filteredMembers.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-4 px-6 py-4"
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
                    <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3 shrink-0" />
                      {member.user?.email ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isOwner(member) ? (
                      <Badge variant="secondary" className="gap-1">
                        <Crown className="h-3 w-3" /> Owner
                      </Badge>
                    ) : (
                      <Select
                        value={member.role}
                        onValueChange={(role) =>
                          updateRoleMutation.mutate({ memberId: member.id, role })
                        }
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-[120px]" aria-label={`Role for ${member.user?.email}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Badge
                      variant={member.status === "active" ? "success" : "warning"}
                    >
                      {member.status === "active" ? "Active" : "Invited"}
                    </Badge>
                    {member.status !== "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        aria-label="Resend invite"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {!isOwner(member) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Actions"
                          >
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
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Invitations */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Pending Invitations</CardTitle>
          <p className="text-sm text-muted-foreground">
            Email invitations that have been sent to join this workspace.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <InvitationList orgId={orgId} />
        </CardContent>
      </Card>

      {/* Danger zone: Transfer ownership */}
      {org?.ownerId && members.some((m) => m.userId === org.ownerId) && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <p className="text-sm text-muted-foreground">
              Transfer workspace ownership to another member. This action cannot be undone.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => {
                const next = members.find(
                  (m) => m.userId !== org.ownerId && m.status === "active"
                );
                if (next) setTransferTo(next);
              }}
              disabled={members.filter((m) => m.userId !== org.ownerId && m.status === "active").length === 0}
            >
              Transfer ownership
            </Button>
          </CardContent>
        </Card>
      )}

      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/dashboard/settings">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Settings
        </Link>
      </Button>

      <InviteMemberModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={(email, role) => {
          createInvite({ email, role }, {
            onSuccess: () => {
              setInviteOpen(false);
              queryClient.invalidateQueries({ queryKey: ["org-members", orgId!] });
            },
          });
        }}
        isSubmitting={invitePending}
        error={inviteError ? parseApiError(inviteError) : null}
      />

      <ConfirmDialog
        open={!!removeMember}
        onOpenChange={(open) => !open && setRemoveMember(null)}
        title="Remove member"
        description={
          removeMember
            ? `Remove ${removeMember.user?.email ?? "this member"} from the workspace? They will lose access.`
            : ""
        }
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => { if (removeMember) removeMutation.mutate(removeMember.id); }}
        loading={removeMutation.isPending}
      />

      <ConfirmDialog
        open={!!transferTo}
        onOpenChange={(open) => !open && setTransferTo(null)}
        title="Transfer ownership"
        description={
          transferTo
            ? `Transfer ownership to ${transferTo.user?.fullName ?? transferTo.user?.email ?? "this member"}? You will become a regular member.`
            : ""
        }
        confirmLabel="Transfer"
        variant="destructive"
        onConfirm={() => { if (transferTo) transferMutation.mutate(transferTo.userId); }}
        loading={transferMutation.isPending}
      />
    </div>
  );
}

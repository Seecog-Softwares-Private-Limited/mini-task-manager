"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptInvitationById, fetchMyPendingInvitations } from "@/services/api/invitations.api";
import { setStoredOrgId, parseApiError } from "@/services/api/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2, Mail } from "lucide-react";

export function PendingWorkspaceInvitations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["my-pending-invitations"],
    queryFn: fetchMyPendingInvitations,
  });

  const acceptMutation = useMutation({
    mutationFn: (invitationId: string) => acceptInvitationById(invitationId),
    onSuccess: (result) => {
      if (result.organizationId) {
        setStoredOrgId(result.organizationId);
      }
      queryClient.invalidateQueries({ queryKey: ["my-pending-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast({
        title: "Invitation accepted",
        description: "You've joined the workspace.",
        variant: "success",
      });
    },
    onError: (err) => {
      toast({
        title: "Could not accept invitation",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  if (isLoading || invitations.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Workspace invitations</h2>
          <Badge variant="secondary">{invitations.length}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          You&apos;ve been invited to join these workspaces. Accept to get access.
        </p>
        <ul className="space-y-3">
          {invitations.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-col gap-3 rounded-lg border bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {inv.organizationName ?? "Workspace invitation"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {inv.inviter?.fullName ?? inv.inviter?.email ?? "A team member"} invited you as{" "}
                    <span className="capitalize">{inv.role}</span>
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="shrink-0"
                disabled={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate(inv.id)}
              >
                {acceptMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Accept"
                )}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

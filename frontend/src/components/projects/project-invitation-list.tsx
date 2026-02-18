"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useProjectInvitations,
  useResendProjectInvitation,
  useCancelProjectInvitation,
} from "@/hooks/use-project-invitations";
import type { OrgInvitation } from "@/types/api";
import { Mail, Send, XCircle, Loader2 } from "lucide-react";

function statusBadge(status: OrgInvitation["status"]) {
  switch (status) {
    case "PENDING":
      return <Badge variant="warning">Invited</Badge>;
    case "ACCEPTED":
      return <Badge variant="success">Accepted</Badge>;
    case "EXPIRED":
      return <Badge variant="destructive">Expired</Badge>;
    case "CANCELLED":
      return <Badge variant="secondary">Cancelled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface ProjectInvitationListProps {
  organizationId: string | null;
}

export function ProjectInvitationList({ organizationId }: ProjectInvitationListProps) {
  const { invitations, isLoading } = useProjectInvitations(organizationId);
  const { resend, isPending: resendPending } = useResendProjectInvitation(organizationId);
  const { cancel, isPending: cancelPending } = useCancelProjectInvitation(organizationId);
  const [cancelTarget, setCancelTarget] = React.useState<OrgInvitation | null>(null);
  const [resendingId, setResendingId] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6" aria-busy="true" aria-label="Loading invitations">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div
        className="py-12 text-center text-muted-foreground text-sm"
        role="status"
        aria-label="No pending invitations"
      >
        No pending invitations.
      </div>
    );
  }

  const pendingOrExpired = invitations.filter(
    (inv) => inv.status === "PENDING" || inv.status === "EXPIRED"
  );
  const completed = invitations.filter(
    (inv) => inv.status === "ACCEPTED" || inv.status === "CANCELLED"
  );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table" aria-label="Pending invitations">
          <thead>
            <tr className="border-b">
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Invited By</th>
              <th className="px-6 py-3 text-left font-medium text-muted-foreground">Sent</th>
              <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingOrExpired.map((inv) => (
              <tr key={inv.id} className="border-b last:border-0">
                <td className="px-6 py-4">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    {inv.email}
                  </span>
                </td>
                <td className="px-6 py-4 capitalize">{inv.role}</td>
                <td className="px-6 py-4">{statusBadge(inv.status)}</td>
                <td className="px-6 py-4 text-muted-foreground">
                  {inv.inviter?.fullName ?? inv.inviter?.email ?? "—"}
                </td>
                <td className="px-6 py-4 text-muted-foreground">{formatDate(inv.createdAt)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      disabled={resendPending && resendingId === inv.id}
                      onClick={() => {
                        setResendingId(inv.id);
                        resend(inv.id);
                      }}
                      aria-label={`Resend invitation to ${inv.email}`}
                    >
                      {resendPending && resendingId === inv.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive gap-1"
                      onClick={() => setCancelTarget(inv)}
                      aria-label={`Cancel invitation to ${inv.email}`}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {completed.length > 0 && (
        <div className="border-t">
          <p className="px-6 pt-4 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Past invitations
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm opacity-60" role="table">
              <tbody>
                {completed.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="px-6 py-3">
                      <span className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {inv.email}
                      </span>
                    </td>
                    <td className="px-6 py-3 capitalize">{inv.role}</td>
                    <td className="px-6 py-3">{statusBadge(inv.status)}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {inv.inviter?.fullName ?? inv.inviter?.email ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{formatDate(inv.createdAt)}</td>
                    <td className="px-6 py-3" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel invitation"
        description={
          cancelTarget
            ? `Cancel the invitation to ${cancelTarget.email}? They will no longer be able to join.`
            : ""
        }
        confirmLabel="Cancel invitation"
        variant="destructive"
        onConfirm={() => {
          if (cancelTarget) {
            cancel(cancelTarget.id);
            setCancelTarget(null);
          }
        }}
        loading={cancelPending}
      />
    </>
  );
}

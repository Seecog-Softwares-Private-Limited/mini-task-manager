"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useOrgInvitations,
  useResendInvitation,
  useCancelInvitation,
} from "@/hooks/use-invitations";
import type { OrgInvitation } from "@/types/api";
import { Mail, Send, Trash2, Clock, Loader2 } from "lucide-react";

function statusBadge(status: OrgInvitation["status"]) {
  switch (status) {
    case "PENDING":
      return <Badge variant="warning">Pending</Badge>;
    case "ACCEPTED":
      return <Badge variant="success">Accepted</Badge>;
    case "EXPIRED":
      return <Badge variant="secondary">Expired</Badge>;
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

export interface InvitationListProps {
  orgId: string | null;
}

export function InvitationList({ orgId }: InvitationListProps) {
  const { invitations, isLoading } = useOrgInvitations(orgId);
  const { resendAsync, isPending: resendPending } = useResendInvitation(orgId);
  const { cancelAsync, isPending: cancelPending } = useCancelInvitation(orgId);
  const [deleteTarget, setDeleteTarget] = React.useState<OrgInvitation | null>(null);
  const [resendingId, setResendingId] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const pendingOrExpired = invitations.filter(
    (inv) => inv.status === "PENDING" || inv.status === "EXPIRED"
  );
  const completed = invitations.filter(
    (inv) => inv.status === "ACCEPTED" || inv.status === "CANCELLED"
  );

  if (invitations.length === 0) {
    return (
      <div className="px-6 py-10 text-center text-sm text-muted-foreground">
        No pending invitations. Use Invite to add someone to this workspace.
      </div>
    );
  }

  return (
    <>
      {pendingOrExpired.length > 0 && (
        <ul className="divide-y" role="list">
          {pendingOrExpired.map((inv) => (
            <li key={inv.id} className="flex items-center gap-4 px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{inv.email}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  Invited {formatDate(inv.createdAt)} · Expires{" "}
                  {formatDate(inv.expiresAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="outline" className="capitalize hidden sm:inline-flex">
                  {inv.role}
                </Badge>
                {statusBadge(inv.status)}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={resendPending && resendingId === inv.id}
                  onClick={async () => {
                    setResendingId(inv.id);
                    try {
                      await resendAsync(inv.id);
                    } finally {
                      setResendingId(null);
                    }
                  }}
                  aria-label={`Resend invitation to ${inv.email}`}
                  title="Resend invitation"
                >
                  {resendPending && resendingId === inv.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteTarget(inv)}
                  aria-label={`Delete invitation to ${inv.email}`}
                  title="Delete invitation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pendingOrExpired.length === 0 && completed.length > 0 && (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          No pending invitations.
        </div>
      )}

      {completed.length > 0 && (
        <div className="border-t">
          <p className="px-6 pt-4 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Past invitations
          </p>
          <ul className="divide-y" role="list">
            {completed.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center gap-4 px-6 py-3 opacity-60"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{inv.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="capitalize text-xs">
                    {inv.role}
                  </Badge>
                  {statusBadge(inv.status)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete invitation"
        description={
          deleteTarget
            ? `Remove the invitation to ${deleteTarget.email}? They will no longer be able to join this workspace.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (deleteTarget) {
            await cancelAsync(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        loading={cancelPending}
      />
    </>
  );
}

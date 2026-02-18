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
import { Mail, Send, XCircle, Clock, Loader2 } from "lucide-react";

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
  const { resend, isPending: resendPending } = useResendInvitation(orgId);
  const { cancel, isPending: cancelPending } = useCancelInvitation(orgId);
  const [cancelTarget, setCancelTarget] = React.useState<OrgInvitation | null>(null);
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

  if (invitations.length === 0) {
    return null;
  }

  const pendingOrExpired = invitations.filter(
    (inv) => inv.status === "PENDING" || inv.status === "EXPIRED"
  );
  const completed = invitations.filter(
    (inv) => inv.status === "ACCEPTED" || inv.status === "CANCELLED"
  );

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
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="capitalize">
                  {inv.role}
                </Badge>
                {statusBadge(inv.status)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1"
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
                  className="text-xs text-destructive hover:text-destructive gap-1"
                  onClick={() => setCancelTarget(inv)}
                  aria-label={`Cancel invitation to ${inv.email}`}
                >
                  <XCircle className="h-3.5 w-3.5" /> Cancel
                </Button>
              </div>
            </li>
          ))}
        </ul>
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

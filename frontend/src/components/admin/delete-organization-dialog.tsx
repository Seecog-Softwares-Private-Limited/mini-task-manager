"use client";

import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";
import { AlertTriangle, Building2, Loader2, Trash2 } from "lucide-react";
import type { AdminOrganizationListItem } from "@/services/api/admin.api";

export interface DeleteOrganizationDialogProps {
  organization: Pick<AdminOrganizationListItem, "id" | "name" | "slug" | "ownerEmail" | "memberCount"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (orgId: string) => Promise<void>;
  loading?: boolean;
}

const DELETED_ITEMS = [
  "All projects, tasks, and attachments",
  "Members, invitations, and activity logs",
  "Subscriptions, invoices, and billing records",
  "API keys, SSO config, and usage data",
] as const;

export function DeleteOrganizationDialog({
  organization,
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: DeleteOrganizationDialogProps) {
  const [confirmSlug, setConfirmSlug] = useState("");
  const slugMatches = organization ? confirmSlug.trim() === organization.slug : false;

  useEffect(() => {
    if (!open) setConfirmSlug("");
  }, [open, organization?.id]);

  const handleConfirm = async () => {
    if (!organization || !slugMatches || loading) return;
    await onConfirm(organization.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent
        showClose={!loading}
        className="gap-0 overflow-hidden p-0 sm:max-w-[480px]"
        overlayClassName="bg-slate-900/55 backdrop-blur-sm"
      >
        <div className="border-b border-red-100 bg-gradient-to-b from-red-50 to-white px-6 pb-5 pt-6">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 ring-1 ring-red-200/80">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-lg font-semibold text-slate-900">
                  Delete organization permanently?
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-slate-600">
                  This action cannot be undone. All tenant data will be removed from the database.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {organization && (
            <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{organization.name}</p>
                  <p className="text-xs text-muted-foreground">{organization.slug}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {organization.ownerEmail} · {organization.memberCount} member
                    {organization.memberCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              What will be deleted
            </p>
            <ul className="space-y-1.5">
              {DELETED_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              User accounts with no other workspaces will also be removed so the email can sign up again.
              Platform admins are never deleted automatically.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-org-slug" className="text-sm font-medium text-slate-900">
              Type <span className="font-mono text-red-700">{organization?.slug ?? "slug"}</span> to confirm
            </Label>
            <Input
              id="confirm-org-slug"
              value={confirmSlug}
              onChange={(e) => setConfirmSlug(e.target.value)}
              placeholder={organization?.slug ?? "organization-slug"}
              disabled={loading || !organization}
              autoComplete="off"
              className={cn(
                slugMatches && confirmSlug.length > 0 && "border-emerald-400 ring-emerald-500/20 focus-visible:ring-emerald-500/25"
              )}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-[#E5E7EB] bg-slate-50/80 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="bg-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!slugMatches || loading || !organization}
            onClick={handleConfirm}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete permanently
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

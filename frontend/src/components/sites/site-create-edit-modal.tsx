"use client";

import * as React from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type { Site } from "@/types/api";

export interface SiteFormPayload {
  name: string;
  address?: string;
}

export interface SiteCreateEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site?: Site | null;
  onSubmit: (payload: SiteFormPayload) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

export function SiteCreateEditModal({
  open,
  onOpenChange,
  site,
  onSubmit,
  isSubmitting = false,
  error,
}: SiteCreateEditModalProps) {
  const isEdit = !!site;
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setName(site?.name ?? "");
      setAddress(site?.address ?? "");
    }
  }, [open, site]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({ name: trimmed, address: address.trim() || undefined });
  };

  const canSubmit = !!name.trim() && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px]"
        aria-labelledby="site-modal-title"
        aria-describedby="site-modal-desc"
      >
        <DialogHeader>
          <DialogTitle id="site-modal-title">{isEdit ? "Edit site" : "New site"}</DialogTitle>
          <DialogDescription id="site-modal-desc">
            A physical location — branch, ward, campus — tasks and issues can be tied to.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="site-name">Name</Label>
            <Input
              id="site-name"
              placeholder="Downtown Branch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              required
              autoFocus
              disabled={isSubmitting}
              maxLength={200}
              aria-required="true"
            />
          </div>
          <div>
            <Label htmlFor="site-address">Address</Label>
            <Textarea
              id="site-address"
              placeholder="Optional — street, city, notes"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1.5 min-h-[70px]"
              disabled={isSubmitting}
              maxLength={2000}
            />
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
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_ROLE_OPTIONS } from "@/hooks/use-project-members";
import type { ProjectMemberRole } from "@/services/api/members.api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ProjectInviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: { email: string; role: string; message?: string }) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

export function ProjectInviteMemberModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  error,
}: ProjectInviteMemberModalProps) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<ProjectMemberRole>("CONTRIBUTOR");
  const [message, setMessage] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setEmail("");
      setRole("CONTRIBUTOR");
      setMessage("");
      setEmailError(null);
    }
  }, [open]);

  const validateEmail = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setEmailError("Email is required");
      return false;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!validateEmail(trimmed)) return;
    onSubmit({
      email: trimmed,
      role,
      message: message.trim() || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onOpenChange(false);
  };

  const isValid = email.trim().length > 0 && EMAIL_REGEX.test(email.trim());
  const canSubmit = isValid && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[440px]"
        aria-labelledby="project-invite-title"
        aria-describedby="project-invite-desc"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle id="project-invite-title">Invite member</DialogTitle>
          <DialogDescription id="project-invite-desc">
            Send an invitation by email. They will receive a link to join your organization and can then be added to this project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="project-invite-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-invite-email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => email && validateEmail(email)}
              className="mt-1.5"
              required
              autoFocus
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "project-invite-email-error" : undefined}
            />
            {emailError && (
              <p id="project-invite-email-error" className="mt-1 text-xs text-destructive" role="alert">
                {emailError}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="project-invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as ProjectMemberRole)} disabled={isSubmitting}>
              <SelectTrigger id="project-invite-role" className="mt-1.5">
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
          </div>
          <div>
            <Label htmlFor="project-invite-message">Message (optional)</Label>
            <Textarea
              id="project-invite-message"
              placeholder="Add a personal note to the invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              className="mt-1.5 min-h-[80px]"
              rows={3}
            />
          </div>
          <p className="text-xs text-muted-foreground" role="status">
            This invitation will expire in 7 days.
          </p>
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

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { DashboardProfileAvatar } from "@/components/dashboard/dashboard-profile-avatar";
import { WorkspaceThumb } from "@/components/workspaces/workspace-thumb";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/context/tenant-context";
import { fetchOrganizations } from "@/services/api/organizations.api";
import { updateCurrentUserProfile } from "@/services/api/users.api";
import { parseApiError } from "@/services/api/client";

function formatRole(role?: string): string {
  if (!role) return "Member";
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export default function ProfilePage() {
  const { user, mergeUser } = useAuth();
  const { orgId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.fullName && user.fullName !== user.email) {
      setFullName(user.fullName);
    } else {
      setFullName("");
    }
  }, [user?.fullName, user?.email]);

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });

  const trimmed = fullName.trim();
  const dirty = trimmed.length > 0 && trimmed !== (user?.fullName ?? "");

  const memberships = useMemo(
    () => [...organizations].sort((a, b) => a.name.localeCompare(b.name)),
    [organizations]
  );

  async function handleSave() {
    if (!dirty || !trimmed) return;
    setSaving(true);
    try {
      const updated = await updateCurrentUserProfile({ fullName: trimmed });
      mergeUser({ fullName: updated.fullName, avatarUrl: updated.avatarUrl });
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast({ title: "Profile updated", variant: "success" });
    } catch (err) {
      toast({
        title: "Could not update profile",
        description: parseApiError(err),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">Loading your profile…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your personal account, photo, and details.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-center sm:gap-6">
          <DashboardProfileAvatar user={user} mergeUser={mergeUser} size="lg" />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <p className="truncate text-lg font-semibold">
                {user.fullName && user.fullName !== user.email ? user.fullName : user.email}
              </p>
            </div>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{user.email}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Click the avatar to upload, crop, or remove your photo.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BadgeCheck className="h-5 w-5 text-primary" />
            Personal information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" value={user.email} disabled readOnly />
            <p className="text-xs text-muted-foreground">
              Email is used to sign in and cannot be changed here.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void handleSave()} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            href="/dashboard/settings/password"
            className="group flex items-center gap-4 rounded-xl border border-border/60 p-4 transition-colors hover:border-primary/30 hover:bg-muted/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
              <KeyRound className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-medium group-hover:text-primary">Password</p>
              <p className="text-xs text-muted-foreground">Change your account password</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Workspaces
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You are not a member of any workspace yet.
            </p>
          ) : (
            memberships.map((org) => (
              <div
                key={org.id}
                className="flex items-center gap-3 rounded-xl border border-border/50 p-3"
              >
                <WorkspaceThumb workspace={org} size="md" active={org.id === orgId} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{org.name}</p>
                  <p className="text-xs text-muted-foreground">{formatRole(org.myRole)}</p>
                </div>
                {org.id === orgId ? (
                  <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                    Active
                  </span>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/dashboard/settings">
          <ArrowLeft className="mr-1 h-4 w-4" /> Settings
        </Link>
      </Button>
    </div>
  );
}

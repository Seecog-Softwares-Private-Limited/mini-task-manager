"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  KeyRound,
  Mail,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { DashboardProfileAvatar } from "@/components/dashboard/dashboard-profile-avatar";
import { WorkspaceThumb } from "@/components/workspaces/workspace-thumb";
import { PhoneInput } from "@/components/auth/phone-input";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/context/tenant-context";
import { fetchOrganizations } from "@/services/api/organizations.api";
import { updateCurrentUserProfile, deleteMyAccount } from "@/services/api/users.api";
import { sendPhoneLinkOtp, verifyPhoneLink } from "@/services/api/auth.api";
import { clearAuth, parseApiError } from "@/services/api/client";
import { DEFAULT_COUNTRY_ISO, formatFullPhone } from "@/lib/country-codes";

function formatRole(role?: string): string {
  if (!role) return "Member";
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export default function ProfilePage() {
  const { user, mergeUser, refreshProfile } = useAuth();
  const { orgId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [phoneCountryIso, setPhoneCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [phoneLocal, setPhoneLocal] = useState("");
  const phoneFull = formatFullPhone(phoneCountryIso, phoneLocal);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);

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

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteMyAccount();
      clearAuth();
      router.replace("/login");
    } catch (err) {
      toast({
        title: "Could not delete account",
        description: parseApiError(err),
        variant: "error",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  async function handleSave() {
    if (!dirty || !trimmed) return;
    setSaving(true);
    try {
      const updated = await updateCurrentUserProfile({ fullName: trimmed });
      mergeUser({ fullName: updated.fullName, avatarUrl: updated.avatarUrl, phone: updated.phone });
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

  async function handleSendPhoneOtp() {
    if (phoneLocal.replace(/\D/g, "").length < 7) return;
    setPhoneBusy(true);
    try {
      await sendPhoneLinkOtp(phoneFull);
      setPhoneOtpSent(true);
      toast({ title: "Code sent", description: `Check SMS at ${phoneFull}`, variant: "success" });
    } catch (err) {
      toast({
        title: "Could not send code",
        description: parseApiError(err),
        variant: "error",
      });
    } finally {
      setPhoneBusy(false);
    }
  }

  async function handleVerifyPhone() {
    if (phoneCode.length !== 6) return;
    setPhoneBusy(true);
    try {
      const result = await verifyPhoneLink(phoneFull, phoneCode);
      mergeUser({
        phone: result.user.phone,
        fullName: result.user.fullName,
        email: result.user.email,
        avatarUrl: result.user.avatarUrl,
      });
      await refreshProfile();
      setPhoneOtpSent(false);
      setPhoneCode("");
      setPhoneLocal("");
      toast({ title: "Phone verified", description: result.message, variant: "success" });
    } catch (err) {
      toast({
        title: "Could not verify phone",
        description: parseApiError(err),
        variant: "error",
      });
    } finally {
      setPhoneBusy(false);
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
            {user.phone ? (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
                <Smartphone className="h-3.5 w-3.5" />
                <span className="truncate">{user.phone}</span>
              </div>
            ) : null}
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
            <Smartphone className="h-5 w-5 text-primary" />
            Phone number
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {user.phone
              ? `Verified: ${user.phone}. Add a new number below to change it (SMS verification required).`
              : "Add a mobile number to sign in with Phone OTP on web and mobile."}
          </p>
          {!phoneOtpSent ? (
            <>
              <PhoneInput
                countryIso={phoneCountryIso}
                phoneNumber={phoneLocal}
                onCountryChange={setPhoneCountryIso}
                onPhoneNumberChange={setPhoneLocal}
                id="profile-phone"
              />
              <Button
                type="button"
                disabled={phoneBusy || phoneLocal.replace(/\D/g, "").length < 7}
                onClick={() => void handleSendPhoneOtp()}
              >
                {phoneBusy ? "Sending…" : user.phone ? "Send code to change phone" : "Send verification code"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <span className="font-medium text-foreground">{phoneFull}</span>
              </p>
              <Input
                inputMode="numeric"
                maxLength={6}
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="max-w-[12rem] text-center tracking-[0.3em]"
                autoComplete="one-time-code"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={phoneBusy || phoneCode.length !== 6}
                  onClick={() => void handleVerifyPhone()}
                >
                  {phoneBusy ? "Verifying…" : "Verify & save"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={phoneBusy}
                  onClick={() => {
                    setPhoneOtpSent(false);
                    setPhoneCode("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
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

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete my account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all your data, and remove you from all
              workspaces. This action <strong>cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteAccount()}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Yes, delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/dashboard/settings">
          <ArrowLeft className="mr-1 h-4 w-4" /> Settings
        </Link>
      </Button>
    </div>
  );
}

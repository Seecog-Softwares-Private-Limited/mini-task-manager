"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useValidateInvitationEnriched,
  useAcceptInvitation,
} from "@/hooks/use-invitations";
import { useAuth } from "@/hooks/use-auth";
import { signupWithInvite, logout } from "@/services/api/auth.api";
import { parseApiError, isRateLimited, clearAuth } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Mail,
  User,
  Lock,
} from "lucide-react";

const signupSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const { user, isAuthenticated, ready } = useAuth();

  const { data: validation, isLoading, isError, error } = useValidateInvitationEnriched(token);
  const { accept, isPending: accepting } = useAcceptInvitation();
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", password: "" },
  });

  const inviteEmail = validation?.email?.toLowerCase() ?? "";
  const userEmail = user?.email?.toLowerCase() ?? "";
  const emailMatches = inviteEmail && userEmail && inviteEmail === userEmail;

  const handleAccept = async () => {
    if (!token) return;
    try {
      const result = await accept(token);
      setAcceptSuccess(true);
      // Store the org so the dashboard picks up the right tenant context
      if (result?.organizationId) {
        try {
          const { setStoredOrgId } = await import("@/services/api/client");
          setStoredOrgId(result.organizationId);
        } catch { /* best effort */ }
      }
      setTimeout(() => {
        router.push("/dashboard/settings/members");
        router.refresh();
      }, 1500);
    } catch {
      // toast handled by hook
    }
  };

  const handleSignup = async (values: SignupFormData) => {
    if (!token || !validation?.email) return;
    setSignupError(null);
    try {
      const signupResult = await signupWithInvite({
        token,
        fullName: values.fullName,
        password: values.password,
      });
      setAcceptSuccess(true);
      // Store the org so the dashboard picks up the right tenant context
      if (signupResult?.organizationId) {
        try {
          const { setStoredOrgId } = await import("@/services/api/client");
          setStoredOrgId(signupResult.organizationId);
        } catch { /* best effort */ }
      }
      setTimeout(() => {
        router.push("/dashboard/settings/members");
        router.refresh();
      }, 1500);
    } catch (err) {
      if (isRateLimited(err)) {
        setSignupError("Too many attempts. Please try again later.");
      } else {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const msg = parseApiError(err);
        if (msg.toLowerCase().includes("user not found")) {
          setSignupError(
            "Something went wrong creating your account. Please try again, or sign in if you already have an account."
          );
        } else if (status === 404 || status === 405) {
          setSignupError(
            "Unable to reach the server. Please ensure the backend is running and try again."
          );
        } else {
          setSignupError(msg);
        }
      }
    }
  };

  const handleGoToLogin = (email?: string) => {
    const params = new URLSearchParams({ from: `/invite/${token}` });
    if (email) params.set("email", email);
    router.push(`/login?${params.toString()}`);
  };

  const signOutAndRedirect = async (redirectTo: string) => {
    try {
      await logout();
    } catch {
      clearAuth();
    }
    window.dispatchEvent(new CustomEvent("auth:logout"));
    window.location.assign(redirectTo);
  };

  const handleSignInAsInvited = () => {
    if (!token || !validation?.email) return;
    const params = new URLSearchParams({
      email: validation.email,
      from: `/invite/${token}`,
    });
    void signOutAndRedirect(`/login?${params.toString()}`);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
        <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md animate-scale-in">
        <div className="glass-card p-8 sm:p-10">
          {isLoading || !ready ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Skeleton className="h-14 w-14 rounded-2xl" />
              </div>
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
              <Skeleton className="h-12 w-full mt-6" />
            </div>
          ) : isError || !validation?.valid ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
                {validation?.reason?.toLowerCase().includes("expired") ? (
                  <AlertTriangle className="h-7 w-7 text-amber-500" />
                ) : (
                  <XCircle className="h-7 w-7 text-destructive" />
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {validation?.reason?.toLowerCase().includes("expired")
                  ? "Invitation Expired"
                  : "Invalid Invitation"}
              </h1>
              <p className="text-muted-foreground">
                {validation?.reason ??
                  (error instanceof Error
                    ? error.message
                    : "This invitation link is not valid.")}
              </p>
              <Button
                className="w-full mt-4"
                variant="outline"
                onClick={() => router.push("/login")}
              >
                Go to Login
              </Button>
            </div>
          ) : acceptSuccess ? (
            <div className="text-center space-y-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/20">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">You&apos;re in!</h1>
              <p className="text-muted-foreground">
                You&apos;ve successfully joined {validation.organization?.name ?? "the workspace"}.
                Redirecting to dashboard...
              </p>
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </div>
          ) : isAuthenticated && !emailMatches ? (
            <div className="text-center space-y-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
                <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Wrong account</h1>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  This invitation was sent to{" "}
                  <strong className="text-foreground">{validation.email}</strong>.
                  You&apos;re signed in as{" "}
                  <strong className="text-foreground">{user?.email}</strong>.
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-left text-sm text-muted-foreground">
                Sign in with the invited email to accept this invitation.
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <Button className="w-full h-11" onClick={handleSignInAsInvited}>
                  Sign in as {validation.email}
                </Button>
              </div>
            </div>
          ) : isAuthenticated && emailMatches ? (
            <div className="text-center space-y-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg shadow-lg shadow-primary/25">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  You&apos;re invited!
                </h1>
                <p className="mt-2 text-muted-foreground">
                  You&apos;ve been invited to join
                </p>
                <p className="text-lg font-semibold mt-1">
                  {validation.organization?.name ?? "Unknown workspace"}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {validation.email}
                </Badge>
                <Badge variant="outline" className="text-sm px-3 py-1 capitalize">
                  {validation.role}
                </Badge>
              </div>

              <Button
                className="w-full h-12 text-base"
                size="lg"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Joining...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Accept Invitation
                  </span>
                )}
              </Button>
            </div>
          ) : validation.account_exists ? (
            <div className="text-center space-y-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg shadow-lg shadow-primary/25">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">You&apos;re invited!</h1>
                <p className="mt-2 text-muted-foreground">
                  Sign in to join {validation.organization?.name ?? "the workspace"} as {validation.role}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {validation.email}
                </Badge>
                <Badge variant="outline" className="text-sm px-3 py-1 capitalize">
                  {validation.role}
                </Badge>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left text-sm text-muted-foreground">
                An account already exists for this email. Sign in to accept the invitation — you don&apos;t
                need to create a new account.
              </div>

              <Button className="w-full h-12 text-base" size="lg" onClick={handleSignInAsInvited}>
                Sign in to accept invitation
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg shadow-lg shadow-primary/25">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  You&apos;re invited!
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Create an account to join {validation.organization?.name ?? "the workspace"} as {validation.role}
                </p>
              </div>

              <form onSubmit={handleSubmit(handleSignup)} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="invite-email"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                    <Input
                      id="invite-email"
                      type="email"
                      value={validation.email ?? ""}
                      readOnly
                      className="pl-10 bg-muted/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="invite-fullName"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Full name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                    <Input
                      id="invite-fullName"
                      type="text"
                      placeholder="Your name"
                      {...register("fullName")}
                      autoComplete="name"
                      className="pl-10"
                    />
                    {errors.fullName && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="invite-password"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                    <Input
                      id="invite-password"
                      type="password"
                      placeholder="At least 8 characters"
                      {...register("password")}
                      autoComplete="new-password"
                      className="pl-10"
                    />
                    {errors.password && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                {signupError && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 space-y-3">
                    <p className="text-sm text-destructive font-medium">{signupError}</p>
                    {signupError.toLowerCase().includes("already exists") && (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => handleGoToLogin(validation?.email)}
                      >
                        Sign in to accept invitation
                      </Button>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Create account & join
                    </span>
                  )}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="h-auto p-0 text-primary"
                  onClick={() => handleGoToLogin(validation?.email)}
                >
                  Sign in to accept
                </Button>
              </p>
              <p className="text-center text-xs text-muted-foreground">
                Prefer a separate signup page?{" "}
                <Link
                  href={`/signup?email=${encodeURIComponent(validation.email ?? "")}&token=${encodeURIComponent(token ?? "")}`}
                  className="font-medium text-primary hover:underline"
                >
                  Go to signup
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

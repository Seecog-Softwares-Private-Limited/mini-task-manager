"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signup, signupWithInvite, resendVerificationEmail } from "@/services/api/auth.api";
import { parseApiError, isRateLimited } from "@/services/api/client";
import { config } from "@/config/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import {
  AuthDivider,
  PremiumAuthCard,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "@/components/auth/premium-auth-shell";
import { AuthTransitionLink } from "@/components/auth/auth-transition-link";

const inviteSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  password: z.string().min(1, "Password is required"),
});

const publicSchema = z.object({
  email: z.string().email("Valid email is required"),
  fullName: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type InviteFormData = z.infer<typeof inviteSchema>;
type PublicFormData = z.infer<typeof publicSchema>;

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromInvite = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isInviteFlow = !!emailFromInvite && !!token;

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { fullName: "", password: "" },
  });

  const publicForm = useForm<PublicFormData>({
    resolver: zodResolver(publicSchema),
    defaultValues: { email: "", fullName: "", password: "" },
  });

  async function handleInviteSubmit(values: InviteFormData) {
    if (!token) return;
    setError(null);
    try {
      await signupWithInvite({
        token,
        fullName: values.fullName,
        password: values.password,
      });
      window.dispatchEvent(new CustomEvent("auth:login"));
      window.location.href = "/dashboard/workspaces";
    } catch (err) {
      if (isRateLimited(err)) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(parseApiError(err));
      }
    }
  }

  const [signupSuccess, setSignupSuccess] = useState(false);
  /** When true, backend skipped email verification — show “sign in” instead of “check email”. */
  const [signupEmailVerified, setSignupEmailVerified] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [devVerificationCode, setDevVerificationCode] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  async function handlePublicSubmit(values: PublicFormData) {
    setError(null);
    try {
      const res = await signup({
        email: values.email.trim().toLowerCase(),
        fullName: values.fullName.trim(),
        password: values.password,
      });
      if (res.emailVerified === true && res.accessToken) {
        window.dispatchEvent(new CustomEvent("auth:login"));
        window.location.href = "/dashboard/workspaces";
        return;
      }
      setSignupEmail(values.email.trim().toLowerCase());
      setSignupEmailVerified(res.emailVerified === true);
      setDevVerificationCode(res.devVerificationCode ?? null);
      setSignupSuccess(true);
    } catch (err) {
      if (isRateLimited(err)) {
        setError("Too many attempts. Please try again later.");
      } else {
        const msg = parseApiError(err);
        const isNetwork = !(err as { response?: unknown })?.response || /network|connection|refused|fetch/i.test(msg);
        setError(isNetwork
          ? "Could not reach the server. Ensure the backend is running (see properties.env PORT) and the frontend is using the same port, then try again."
          : msg);
      }
    }
  }

  if (isInviteFlow) {
    return (
      <PremiumAuthCard
        variant="compact"
        title="Create your account"
        subtitle="You’ve been invited to join a team. Complete signup to get started."
        icon={
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
        footer={
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <AuthTransitionLink href="/login" className="font-semibold text-primary underline-offset-4 transition-colors hover:underline">
              Sign in
            </AuthTransitionLink>
          </p>
        }
      >
          <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className={authLabelClass}>Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="email" type="email" value={emailFromInvite} readOnly className={`pl-10 bg-slate-100/75 ${authInputClass}`} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName" className={authLabelClass}>Full name</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="fullName" type="text" placeholder="Your name" data-cy="signup-fullName" {...inviteForm.register("fullName")} autoComplete="name" className={`pl-10 ${authInputClass}`} />
              </div>
              {inviteForm.formState.errors.fullName && <p className="text-xs text-destructive">{inviteForm.formState.errors.fullName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className={authLabelClass}>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Your password" data-cy="signup-password" {...inviteForm.register("password")} autoComplete="new-password" className={`pl-10 pr-10 ${authInputClass}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-700" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {inviteForm.formState.errors.password && <p className="text-xs text-destructive">{inviteForm.formState.errors.password.message}</p>}
            </div>
            {error && <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3"><p className="text-sm text-destructive font-medium">{error}</p></div>}
            <Button type="submit" className={authPrimaryButtonClass} size="lg" disabled={inviteForm.formState.isSubmitting} data-cy="signup-submit">
              {inviteForm.formState.isSubmitting ? <span className="flex items-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Creating account...</span> : <span className="flex items-center gap-2">Create account<ArrowRight className="h-4 w-4" /></span>}
            </Button>
          </form>
      </PremiumAuthCard>
    );
  }

  if (signupSuccess) {
    if (signupEmailVerified) {
      return (
        <PremiumAuthCard
          variant="compact"
          title="You’re all set"
          subtitle={`Account created for ${signupEmail}. Redirecting to your workspace...`}
          icon={
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20">
              <Mail className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
          }
        >
          <div className="mt-2 text-center text-sm text-muted-foreground">Please wait...</div>
        </PremiumAuthCard>
      );
    }
    return (
      <PremiumAuthCard
        variant="compact"
        title="Check your email"
        subtitle={
          devVerificationCode
            ? `Gmail often blocks localhost verification emails. Use the code below to verify ${signupEmail}.`
            : `We’ve sent a verification code to ${signupEmail}. Enter the 6-digit code at the link below (Gmail often blocks localhost links).`
        }
        icon={
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20">
            <Mail className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
        }
      >
          {devVerificationCode && (
            <div className="mt-4 rounded-xl border-2 border-emerald-400/40 bg-emerald-50 px-4 py-4 text-center dark:bg-emerald-950/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Your verification code (local dev)
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tracking-[0.3em] text-emerald-800 dark:text-emerald-300">
                {devVerificationCode}
              </p>
              <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                Email may not arrive — use this code at Verify email below.
              </p>
            </div>
          )}
          {resendMsg && (
            <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{resendMsg}</p>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild className={authPrimaryButtonClass}>
              <Link href="/verify-email">Enter verification code</Link>
            </Button>
            <Button asChild variant="outline">
              <AuthTransitionLink href="/login">Go to Sign in</AuthTransitionLink>
            </Button>
            <button
              type="button"
              className="text-xs text-primary hover:underline disabled:opacity-50"
              disabled={resending}
              onClick={async () => {
                setResending(true);
                setResendMsg(null);
                try {
                  const res = await resendVerificationEmail(signupEmail);
                  setResendMsg(res.message);
                  if (res.devVerificationCode) {
                    setDevVerificationCode(res.devVerificationCode);
                  }
                } catch (err) {
                  const msg = parseApiError(err);
                  const isNetwork = /network|connection|refused|fetch/i.test(msg) || (err as { code?: string })?.code === "ERR_NETWORK";
                  setResendMsg(isNetwork ? "Cannot reach the server. Check that the backend is running (see properties.env PORT)." : msg || "Failed to resend. Please try again.");
                } finally {
                  setResending(false);
                }
              }}
            >
              {resending ? "Sending..." : "Didn't receive it? Resend verification email"}
            </button>
          </div>
      </PremiumAuthCard>
    );
  }

  return (
    <PremiumAuthCard
      variant="compact"
      title="Create your account"
      subtitle="Get started for free. No credit card required."
      icon={
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      }
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <AuthTransitionLink href="/login" className="font-semibold text-primary underline-offset-4 transition-colors hover:underline">
            Sign in
          </AuthTransitionLink>
        </p>
      }
    >
      <form onSubmit={publicForm.handleSubmit(handlePublicSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className={authLabelClass}>Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input id="email" type="email" placeholder="you@example.com" data-cy="signup-email" {...publicForm.register("email")} autoComplete="email" className={`pl-10 ${authInputClass}`} />
          </div>
          {publicForm.formState.errors.email && <p className="text-xs text-destructive">{publicForm.formState.errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName" className={authLabelClass}>Username</Label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input id="fullName" type="text" placeholder="Your username" data-cy="signup-fullName" {...publicForm.register("fullName")} autoComplete="username" className={`pl-10 ${authInputClass}`} />
          </div>
          {publicForm.formState.errors.fullName && <p className="text-xs text-destructive">{publicForm.formState.errors.fullName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className={authLabelClass}>Password</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input id="password" type={showPassword ? "text" : "password"} placeholder="Your password" data-cy="signup-password" {...publicForm.register("password")} autoComplete="new-password" className={`pl-10 pr-10 ${authInputClass}`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-700" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {publicForm.formState.errors.password && <p className="text-xs text-destructive">{publicForm.formState.errors.password.message}</p>}
        </div>
        {error && <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3"><p className="text-sm text-destructive font-medium">{error}</p></div>}
        <Button type="submit" className={authPrimaryButtonClass} size="lg" disabled={publicForm.formState.isSubmitting} data-cy="signup-submit">
          {publicForm.formState.isSubmitting ? <span className="flex items-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Sending...</span> : <span className="flex items-center gap-2">Send verification mail<ArrowRight className="h-4 w-4" /></span>}
        </Button>

        <AuthDivider />

        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:bg-white hover:shadow-md"
          onClick={() => {
            const base = typeof window !== "undefined" ? window.location.origin : "";
            const apiBase = config.apiBaseUrl.startsWith("http") ? config.apiBaseUrl : base + config.apiBaseUrl;
            window.location.href = `${apiBase}/auth/google`;
          }}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign up with Google
        </Button>
      </form>
    </PremiumAuthCard>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex items-center gap-2 text-muted-foreground"><svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}

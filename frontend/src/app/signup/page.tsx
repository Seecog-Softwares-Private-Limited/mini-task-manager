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
      window.location.href = "/dashboard/organizations";
    } catch (err) {
      if (isRateLimited(err)) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(parseApiError(err));
      }
    }
  }

  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  async function handlePublicSubmit(values: PublicFormData) {
    setError(null);
    try {
      await signup({
        email: values.email.trim().toLowerCase(),
        fullName: values.fullName.trim(),
        password: values.password,
      });
      setSignupEmail(values.email.trim().toLowerCase());
      setSignupSuccess(true);
    } catch (err) {
      if (isRateLimited(err)) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(parseApiError(err));
      }
    }
  }

  if (isInviteFlow) {
    return (
      <div className="relative w-full max-w-md animate-scale-in">
        <div className="glass-card p-8 sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg shadow-lg shadow-primary/25">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You&apos;ve been invited to join a team. Complete signup to get started.
            </p>
          </div>

          <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input id="email" type="email" value={emailFromInvite} readOnly className="pl-10 bg-muted/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full name</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input id="fullName" type="text" placeholder="Your name" data-cy="signup-fullName" {...inviteForm.register("fullName")} autoComplete="name" className="pl-10" />
              </div>
              {inviteForm.formState.errors.fullName && <p className="text-xs text-destructive">{inviteForm.formState.errors.fullName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Your password" data-cy="signup-password" {...inviteForm.register("password")} autoComplete="new-password" className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {inviteForm.formState.errors.password && <p className="text-xs text-destructive">{inviteForm.formState.errors.password.message}</p>}
            </div>
            {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3"><p className="text-sm text-destructive font-medium">{error}</p></div>}
            <Button type="submit" className="w-full h-12 text-base" size="lg" disabled={inviteForm.formState.isSubmitting} data-cy="signup-submit">
              {inviteForm.formState.isSubmitting ? <span className="flex items-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Creating account...</span> : <span className="flex items-center gap-2">Create account<ArrowRight className="h-4 w-4" /></span>}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  if (signupSuccess) {
    return (
      <div className="relative w-full max-w-md animate-scale-in">
        <div className="glass-card p-8 sm:p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20">
            <Mail className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;ve sent a verification link to <strong>{signupEmail}</strong>. Click it to verify, then sign in.
          </p>
          {resendMsg && (
            <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{resendMsg}</p>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild>
              <Link href="/login">Go to Sign in</Link>
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
                } catch {
                  setResendMsg("Failed to resend. Please try again.");
                } finally {
                  setResending(false);
                }
              }}
            >
              {resending ? "Sending..." : "Didn't receive it? Resend verification email"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md animate-scale-in">
      <div className="glass-card p-8 sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg shadow-lg shadow-primary/25">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started for free. No credit card required.
          </p>
        </div>

        <form onSubmit={publicForm.handleSubmit(handlePublicSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input id="email" type="email" placeholder="you@example.com" data-cy="signup-email" {...publicForm.register("email")} autoComplete="email" className="pl-10" />
            </div>
            {publicForm.formState.errors.email && <p className="text-xs text-destructive">{publicForm.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Username</Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input id="fullName" type="text" placeholder="Your username" data-cy="signup-fullName" {...publicForm.register("fullName")} autoComplete="username" className="pl-10" />
            </div>
            {publicForm.formState.errors.fullName && <p className="text-xs text-destructive">{publicForm.formState.errors.fullName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Your password" data-cy="signup-password" {...publicForm.register("password")} autoComplete="new-password" className="pl-10 pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {publicForm.formState.errors.password && <p className="text-xs text-destructive">{publicForm.formState.errors.password.message}</p>}
          </div>
          {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3"><p className="text-sm text-destructive font-medium">{error}</p></div>}
          <Button type="submit" className="w-full h-12 text-base" size="lg" disabled={publicForm.formState.isSubmitting} data-cy="signup-submit">
            {publicForm.formState.isSubmitting ? <span className="flex items-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Sending...</span> : <span className="flex items-center gap-2">Send verification mail<ArrowRight className="h-4 w-4" /></span>}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12"
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
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4" data-cy="signup-page">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
        <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.12),rgba(255,255,255,0))]" />
      </div>
      <Suspense fallback={<div className="flex items-center gap-2 text-muted-foreground"><svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}

"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login, sendOtp, verifyOtp, resendVerificationEmail } from "@/services/api/auth.api";
import { parseApiError, isRateLimited } from "@/services/api/client";
import { config } from "@/config/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, ArrowRight, Eye, EyeOff, Smartphone } from "lucide-react";
import {
  AuthDivider,
  PremiumAuthCard,
  PremiumAuthShell,
  authGoogleButtonClass,
  authInputClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from "@/components/auth/premium-auth-shell";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

/** Seed owner (see README / `npm run seed`). Default password unless `SEED_USER_PASSWORD` was set when seeding. */
const SEED_OWNER_EMAIL = "owner@example.com";
const SEED_OWNER_DEFAULT_PASSWORD = "Password123!";

function LoginForm() {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from") ?? "/dashboard";
  /** Open-redirect safe: only same-app paths */
  const from =
    fromParam.startsWith("/") && !fromParam.startsWith("//") ? fromParam : "/dashboard";
  const emailParam = searchParams.get("email") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"email" | "otp">("email");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const urlError = searchParams.get("error");
  const prepopulateSeed =
    process.env.NODE_ENV === "development" && !emailParam;

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: emailParam || (prepopulateSeed ? SEED_OWNER_EMAIL : ""),
      password: emailParam ? "" : prepopulateSeed ? SEED_OWNER_DEFAULT_PASSWORD : "",
    },
  });

  useEffect(() => {
    if (emailParam) {
      reset({ email: emailParam, password: "" });
    } else if (process.env.NODE_ENV === "development") {
      reset({ email: SEED_OWNER_EMAIL, password: SEED_OWNER_DEFAULT_PASSWORD });
    }
  }, [emailParam, reset]);

  async function onSubmit(values: FormData) {
    setError(null);
    try {
      await login(values);
      window.dispatchEvent(new CustomEvent("auth:login"));
      // Defer navigation so `mini_tm_signed_in` cookie is visible to middleware on the next request.
      requestAnimationFrame(() => {
        window.location.assign(from);
      });
    } catch (err) {
      if (isRateLimited(err)) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(parseApiError(err));
      }
    }
  }

  return (
    <PremiumAuthCard
      title="Welcome back"
      subtitle="Sign in to your Mini Task Manager account"
      icon={
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      }
      footer={
        <p className="text-xs tracking-[0.01em] text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-violet-700 underline-offset-2 transition-all duration-300 hover:text-violet-800 hover:underline"
          >
            Sign up for free
          </Link>
        </p>
      }
    >
      {mode === "email" ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                data-cy="login-email"
                {...register("email")}
                autoComplete="email"
                className={`pl-10 ${authInputClass}`}
              />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                data-cy="login-password"
                {...register("password")}
                autoComplete="current-password"
                className={`pl-10 pr-10 ${authInputClass}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors duration-200 hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-violet-700 underline-offset-2 transition-colors hover:text-violet-800 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {(error || urlError) && (
            <div className="space-y-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
              <p className="text-sm font-medium text-destructive">
                {error ?? (urlError === "google_not_configured" ? "Google sign-in is not configured." : urlError)}
              </p>
              {error?.includes("verify your email") && (
                <button
                  type="button"
                  className="text-xs font-medium text-violet-700 hover:underline"
                  onClick={async () => {
                    const email = getValues("email");
                    if (email) {
                      setResendSuccess(null);
                      try {
                        const res = await resendVerificationEmail(email);
                        setResendSuccess(res.message);
                        setError(null);
                      } catch (e) {
                        setResendSuccess(null);
                        setError(parseApiError(e));
                      }
                    }
                  }}
                >
                  Resend verification email
                </button>
              )}
            </div>
          )}
          {resendSuccess && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{resendSuccess}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="secondary"
            className={authPrimaryButtonClass}
            size="lg"
            disabled={isSubmitting}
            data-cy="login-submit"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Sign in
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>

          <AuthDivider />

          <Button
            type="button"
            variant="ghost"
            className={authSecondaryButtonClass}
            onClick={() => setMode(mode === "email" ? "otp" : "email")}
          >
            {mode === "email" ? "Sign in with OTP instead" : "Sign in with email instead"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className={authGoogleButtonClass}
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
            Sign in with Google
          </Button>
        </form>
      ) : (
        <div className="space-y-5">
          {!otpSent ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp-phone" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Phone number
                </Label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="otp-phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={otpPhone}
                    onChange={(e) => setOtpPhone(e.target.value)}
                    className={`pl-10 ${authInputClass}`}
                  />
                </div>
              </div>
              {(error || urlError) && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
                  <p className="text-sm font-medium text-destructive">{error ?? urlError}</p>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                className={authPrimaryButtonClass}
                disabled={otpSubmitting || otpPhone.length < 10}
                onClick={async () => {
                  setError(null);
                  setOtpSubmitting(true);
                  try {
                    await sendOtp(otpPhone);
                    setOtpSent(true);
                  } catch (err) {
                    setError(isRateLimited(err) ? "Too many attempts." : parseApiError(err));
                  } finally {
                    setOtpSubmitting(false);
                  }
                }}
              >
                {otpSubmitting ? "Sending..." : "Send OTP"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">Code sent to {otpPhone}</p>
              <div className="space-y-2">
                <Label htmlFor="otp-code" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Verification code
                </Label>
                <Input
                  id="otp-code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className={`${authInputClass} text-center text-lg tracking-[0.5em]`}
                />
              </div>
              {(error || urlError) && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
                  <p className="text-sm font-medium text-destructive">{error ?? urlError}</p>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                className={authPrimaryButtonClass}
                disabled={otpSubmitting || otpCode.length !== 6}
                onClick={async () => {
                  setError(null);
                  setOtpSubmitting(true);
                  try {
                    await verifyOtp(otpPhone, otpCode);
                    window.dispatchEvent(new CustomEvent("auth:login"));
                    window.location.href = from;
                  } catch (err) {
                    setError(isRateLimited(err) ? "Too many attempts." : parseApiError(err));
                  } finally {
                    setOtpSubmitting(false);
                  }
                }}
              >
                {otpSubmitting ? "Verifying..." : "Verify & Sign in"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-slate-500 transition-colors hover:text-slate-900"
                onClick={() => {
                  setOtpSent(false);
                  setOtpCode("");
                }}
              >
                Use a different number
              </button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            className={authSecondaryButtonClass}
            onClick={() => {
              setMode("email");
              setOtpSent(false);
              setOtpPhone("");
              setOtpCode("");
              setError(null);
            }}
          >
            Sign in with email instead
          </Button>
        </div>
      )}
    </PremiumAuthCard>
  );
}

export default function LoginPage() {
  return (
    <PremiumAuthShell dataCy="login-page">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </PremiumAuthShell>
  );
}

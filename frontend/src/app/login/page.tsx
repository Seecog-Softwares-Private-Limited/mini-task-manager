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
  AuthAlert,
  AuthBrandPanel,
  AuthDivider,
  AuthMethodTabs,
  PremiumAuthCard,
  PremiumAuthShell,
  authGoogleButtonClass,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from "@/components/auth/premium-auth-shell";
import { PhoneInput } from "@/components/auth/phone-input";
import { DEFAULT_COUNTRY_ISO, formatFullPhone } from "@/lib/country-codes";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const loginIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

function LoginForm() {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from") ?? "/dashboard";
  const from =
    fromParam.startsWith("/") && !fromParam.startsWith("//") ? fromParam : "/dashboard";
  const emailParam = searchParams.get("email") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"email" | "otp">("email");
  const [otpCountryIso, setOtpCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [otpPhoneNumber, setOtpPhoneNumber] = useState("");
  const otpPhone = formatFullPhone(otpCountryIso, otpPhoneNumber);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const urlError = searchParams.get("error");

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: emailParam,
      password: "",
    },
  });

  useEffect(() => {
    if (emailParam) {
      reset({ email: emailParam, password: "" });
    }
  }, [emailParam, reset]);

  function switchMode(next: "email" | "otp") {
    setMode(next);
    setError(null);
    setResendSuccess(null);
    if (next === "email") {
      setOtpSent(false);
      setOtpCountryIso(DEFAULT_COUNTRY_ISO);
      setOtpPhoneNumber("");
      setOtpCode("");
    }
  }

  async function onSubmit(values: FormData) {
    setError(null);
    try {
      await login(values);
      window.dispatchEvent(new CustomEvent("auth:login"));
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

  const displayError =
    error ??
    (urlError === "google_not_configured" ? "Google sign-in is not configured." : urlError);

  return (
    <PremiumAuthCard
      variant="compact"
      title="Welcome back"
      subtitle="Sign in to continue to your workspace"
      icon={loginIcon}
      footer={
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-primary underline-offset-4 transition-colors hover:underline"
          >
            Sign up for free
          </Link>
        </p>
      }
    >
      <AuthMethodTabs
        value={mode}
        onChange={(id) => switchMode(id as "email" | "otp")}
        options={[
          { id: "email", label: "Email" },
          { id: "otp", label: "Phone OTP" },
        ]}
      />

      {mode === "email" ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className={authLabelClass}>
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password" className={authLabelClass}>
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary underline-offset-4 transition-colors hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {displayError && (
            <AuthAlert variant="error">
              <p className="font-medium">{displayError}</p>
              {error?.includes("verify your email") && (
                <button
                  type="button"
                  className="mt-1.5 text-xs font-medium text-primary hover:underline"
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
            </AuthAlert>
          )}
          {resendSuccess && (
            <AuthAlert variant="success">
              <p>{resendSuccess}</p>
            </AuthAlert>
          )}

          <Button
            type="submit"
            className={authPrimaryButtonClass}
            size="lg"
            disabled={isSubmitting}
            data-cy="login-submit"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
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
            variant="outline"
            className={authGoogleButtonClass}
            onClick={() => {
              const base = typeof window !== "undefined" ? window.location.origin : "";
              const apiBase = config.apiBaseUrl.startsWith("http") ? config.apiBaseUrl : base + config.apiBaseUrl;
              window.location.href = `${apiBase}/auth/google`;
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
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
                <Label htmlFor="otp-phone" className={authLabelClass}>
                  Phone number
                </Label>
                <PhoneInput
                  id="otp-phone"
                  countryIso={otpCountryIso}
                  phoneNumber={otpPhoneNumber}
                  onCountryChange={setOtpCountryIso}
                  onPhoneNumberChange={setOtpPhoneNumber}
                />
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Smartphone className="h-3.5 w-3.5" />
                  We&apos;ll text you a one-time verification code
                </p>
              </div>
              {displayError && (
                <AuthAlert variant="error">
                  <p className="font-medium">{displayError}</p>
                </AuthAlert>
              )}
              <Button
                type="button"
                className={authPrimaryButtonClass}
                disabled={otpSubmitting || otpPhoneNumber.replace(/\D/g, "").length < 7}
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
                {otpSubmitting ? "Sending code..." : "Send verification code"}
              </Button>
            </>
          ) : (
            <>
              <p className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-sm text-muted-foreground">
                Code sent to <span className="font-medium text-foreground">{otpPhone}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="otp-code" className={authLabelClass}>
                  Verification code
                </Label>
                <Input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className={`${authInputClass} text-center text-lg tracking-[0.4em]`}
                  autoComplete="one-time-code"
                />
              </div>
              {displayError && (
                <AuthAlert variant="error">
                  <p className="font-medium">{displayError}</p>
                </AuthAlert>
              )}
              <Button
                type="button"
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
                {otpSubmitting ? "Verifying..." : "Verify & sign in"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => {
                  setOtpSent(false);
                  setOtpCode("");
                  setError(null);
                }}
              >
                Use a different number
              </button>
            </>
          )}

          <AuthDivider label="Other options" />

          <Button
            type="button"
            variant="outline"
            className={authSecondaryButtonClass}
            onClick={() => {
              const base = typeof window !== "undefined" ? window.location.origin : "";
              const apiBase = config.apiBaseUrl.startsWith("http") ? config.apiBaseUrl : base + config.apiBaseUrl;
              window.location.href = `${apiBase}/auth/google`;
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </Button>
        </div>
      )}
    </PremiumAuthCard>
  );
}

export default function LoginPage() {
  return (
    <PremiumAuthShell dataCy="login-page" brandPanel={<AuthBrandPanel />}>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
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

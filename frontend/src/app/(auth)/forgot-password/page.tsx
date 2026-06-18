"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { forgotPassword } from "@/services/api/auth.api";
import { parseApiError, isRateLimited } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft } from "lucide-react";
import {
  AuthAlert,
  PremiumAuthCard,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "@/components/auth/premium-auth-shell";

const schema = z.object({
  email: z.string().email("Valid email is required"),
});

type FormData = z.infer<typeof schema>;

const forgotPasswordIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormData) {
    setError(null);
    try {
      await forgotPassword(values.email.trim().toLowerCase());
      setSuccess(true);
    } catch (err) {
      if (isRateLimited(err)) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(parseApiError(err));
      }
    }
  }

  if (success) {
    return (
      <PremiumAuthCard
        variant="compact"
        title="Check your email"
        subtitle="If an account exists with that email, you will receive a password reset link shortly."
        icon={
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20">
            <Mail className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
        }
      >
        <Button asChild className={authPrimaryButtonClass}>
          <Link href="/login">Back to Sign in</Link>
        </Button>
      </PremiumAuthCard>
    );
  }

  return (
    <PremiumAuthCard
      variant="compact"
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a link to reset your password."
      icon={forgotPasswordIcon}
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sign in
        </Link>
      }
    >
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
              {...register("email")}
              autoComplete="email"
              className={`pl-10 ${authInputClass}`}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        {error && (
          <AuthAlert variant="error">
            <p className="font-medium">{error}</p>
          </AuthAlert>
        )}

        <Button type="submit" className={authPrimaryButtonClass} disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending...
            </span>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>
    </PremiumAuthCard>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signupWithInvite } from "@/services/api/auth.api";
import { parseApiError, isRateLimited } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, User, ArrowRight } from "lucide-react";

const schema = z.object({
  fullName: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", password: "" },
  });

  const hasRequiredParams = !!email && !!token;

  async function onSubmit(values: FormData) {
    if (!hasRequiredParams) return;
    setError(null);
    try {
      await signupWithInvite({
        token,
        fullName: values.fullName,
        password: values.password,
      });
      router.push("/dashboard/organizations");
      router.refresh();
    } catch (err) {
      if (isRateLimited(err)) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(parseApiError(err));
      }
    }
  }

  if (!hasRequiredParams) {
    return (
      <div className="relative w-full max-w-md animate-scale-in">
        <div className="glass-card p-8 sm:p-10 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Invalid invite link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This signup page requires a valid invitation link. Please use the link
            from your invitation email.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md animate-scale-in">
      <div className="glass-card p-8 sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg shadow-lg shadow-primary/25">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                id="email"
                type="email"
                value={email}
                readOnly
                className="pl-10 bg-muted/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="fullName"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Full name
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                id="fullName"
                type="text"
                placeholder="Your name"
                data-cy="signup-fullName"
                {...register("fullName")}
                autoComplete="name"
                className="pl-10"
              />
            </div>
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                data-cy="signup-password"
                {...register("password")}
                autoComplete="new-password"
                className="pl-10"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base"
            size="lg"
            disabled={isSubmitting}
            data-cy="signup-submit"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Creating account...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Create account
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      data-cy="signup-page"
    >
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
        <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.12),rgba(255,255,255,0))]" />
      </div>

      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading...
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  );
}

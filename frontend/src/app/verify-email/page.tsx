"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/services/api/auth.api";
import { parseApiError } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

function completeLoginAndRedirect(router: ReturnType<typeof useRouter>) {
  window.dispatchEvent(new CustomEvent("auth:login"));
  router.replace("/dashboard/workspaces");
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const errorFromUrl = searchParams.get("error");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    tokenFromUrl ? "loading" : "idle",
  );
  const [error, setError] = useState<string | null>(errorFromUrl);
  const [code, setCode] = useState("");

  const runVerification = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        setStatus("error");
        setError("Enter your 6-digit verification code.");
        return;
      }
      setStatus("loading");
      setError(null);
      try {
        await verifyEmail(trimmed);
        setStatus("success");
        completeLoginAndRedirect(router);
      } catch (err) {
        setStatus("error");
        setError(parseApiError(err));
      }
    },
    [router],
  );

  useEffect(() => {
    if (errorFromUrl) {
      setStatus("error");
    }
  }, [errorFromUrl]);

  useEffect(() => {
    if (tokenFromUrl) {
      runVerification(tokenFromUrl);
    }
  }, [tokenFromUrl, runVerification]);

  if (status === "loading") {
    return (
      <div className="relative w-full max-w-md animate-scale-in">
        <div className="glass-card p-8 sm:p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
            <svg className="h-7 w-7 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verifying your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">Signing you in...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="relative w-full max-w-md animate-scale-in">
        <div className="glass-card p-8 sm:p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Email verified</h1>
          <p className="mt-2 text-sm text-muted-foreground">Redirecting to your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md animate-scale-in">
      <div className="glass-card p-8 sm:p-10">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the <strong>6-digit code</strong> from your email if the verify button did not work.
          </p>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            runVerification(code);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="verification-code">Verification code</Label>
            <Input
              id="verification-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-2xl tracking-[0.35em] font-semibold"
            />
          </div>
          {error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={code.length !== 6}>
            Verify email
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Open this page directly:{" "}
          <span className="font-mono text-foreground">/verify-email</span>
        </p>
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link href="/login">Back to Sign in</Link>
        </Button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
        <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.12),rgba(255,255,255,0))]" />
      </div>
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
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}

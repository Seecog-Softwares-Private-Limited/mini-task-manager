"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function InviteQueryRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim();

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    router.replace(`/invite/${encodeURIComponent(token)}`);
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Opening your invitation…</p>
      </div>
    </div>
  );
}

/**
 * Supports invitation links as /invite?token=... when mail clients break path URLs.
 */
export default function InviteQueryRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <InviteQueryRedirectInner />
    </Suspense>
  );
}

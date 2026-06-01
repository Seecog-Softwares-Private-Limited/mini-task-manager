"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, ArrowLeft } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, ready } = useAuth();
  const { isPlatformAdmin, isLoading } = usePlatformAdmin();

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.replace("/login?from=/admin");
    }
  }, [ready, isAuthenticated, router]);

  useEffect(() => {
    if (!ready || isLoading) return;
    if (isAuthenticated && !isPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [ready, isLoading, isAuthenticated, isPlatformAdmin, router]);

  if (!ready || isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="mb-6 h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isAuthenticated || !isPlatformAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Platform Admin</p>
              <p className="text-xs text-muted-foreground">Subscriber & organization management</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to app
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardLayoutSkeleton } from "@/components/dashboard-skeleton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.replace("/login?from=" + encodeURIComponent(pathname));
    }
  }, [ready, isAuthenticated, router, pathname]);

  if (!ready) {
    return <DashboardLayoutSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <DashboardShell>{children}</DashboardShell>;
}

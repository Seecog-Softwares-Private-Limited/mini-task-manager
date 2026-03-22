"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTenant, isTenantRequiredPath } from "@/context/tenant-context";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TenantGuardProps {
  children: ReactNode;
}

/** Redirects to workspaces when current path requires tenant but none is set. */
export function TenantGuard({ children }: TenantGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { orgId, ready } = useTenant();

  useEffect(() => {
    if (!ready) return;
    if (isTenantRequiredPath(pathname) && !orgId) {
      router.replace("/dashboard/workspaces?required=1");
    }
  }, [ready, orgId, pathname, router]);

  if (!ready) return null;
  if (isTenantRequiredPath(pathname) && !orgId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Select or create a workspace to continue.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/workspaces">Go to workspaces</Link>
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}

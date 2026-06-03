"use client";

import { usePathname } from "next/navigation";
import { SuperAdminPortalShell } from "@/components/super-admin/super-admin-portal-shell";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginRoute = pathname === "/super-admin/login";

  if (isLoginRoute) {
    return <>{children}</>;
  }

  return <SuperAdminPortalShell>{children}</SuperAdminPortalShell>;
}

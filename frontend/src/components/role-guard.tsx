"use client";

import { type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/hooks/use-auth";

interface RoleGuardProps {
  children: ReactNode;
  requiredRole: AppRole;
  fallback?: ReactNode;
}

/** Renders children only if user has required role; otherwise fallback or null. */
export function RoleGuard({ children, requiredRole, fallback = null }: RoleGuardProps) {
  const { hasRole, ready } = useAuth();
  if (!ready) return null;
  if (!hasRole(requiredRole)) return <>{fallback}</>;
  return <>{children}</>;
}

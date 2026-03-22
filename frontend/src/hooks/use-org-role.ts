"use client";

import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/context/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { fetchOrganization } from "@/services/api/organizations.api";
import type { Organization } from "@/types/api";

export type OrgRole = "owner" | "admin" | "member" | null;

/**
 * Fetches the current user's role in the selected workspace.
 * The /organizations/:id endpoint returns `myRole` based on the TenantGuard membership check.
 * This is the source of truth for org-level RBAC on the frontend (JWT does NOT contain roles).
 */
export function useOrgRole() {
  const { orgId } = useTenant();
  const { isAuthenticated } = useAuth();

  const { data: org, isLoading } = useQuery<Organization | null>({
    queryKey: ["organization", orgId ?? ""],
    queryFn: () => (orgId ? fetchOrganization(orgId) : Promise.resolve(null)),
    enabled: !!orgId && isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  const myRole = (org?.myRole?.toLowerCase() ?? null) as OrgRole;

  const isOwner = myRole === "owner";
  const isAdmin = myRole === "admin";
  const isMember = myRole === "member";
  const canManageBilling = isOwner || isAdmin;
  const canManageMembers = isOwner || isAdmin;
  const canManageSettings = isOwner || isAdmin;

  return {
    myRole,
    isOwner,
    isAdmin,
    isMember,
    canManageBilling,
    canManageMembers,
    canManageSettings,
    isLoading,
  };
}

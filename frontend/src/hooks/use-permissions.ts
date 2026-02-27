"use client";

import { useOrgRole } from "@/hooks/use-org-role";

/**
 * Permission matrix capabilities (matches settings/permissions page).
 * Use this hook for org-scoped permission checks.
 */
export function usePermissions() {
  const orgRole = useOrgRole();

  const { myRole, isOwner, isAdmin, isMember, isLoading } = orgRole;

  const canManageBilling = isOwner || isAdmin;
  const canViewAudit = isOwner || isAdmin;
  const canViewAnalytics = isOwner || isAdmin;
  const canEditOrgSettings = isOwner || isAdmin;
  const canManageApiKeys = isOwner;
  const canManageWebhooks = isOwner || isAdmin;
  const canInviteMembers = isOwner || isAdmin;
  const canCreateProjects = true; // owner, admin, member
  const canCreateTasks = true; // owner, admin, member
  const canExportData = true; // owner, admin, member

  const capabilityMap: Record<string, boolean> = {
    canManageBilling,
    canViewAudit,
    canViewAnalytics,
    canEditOrgSettings,
    canManageApiKeys,
    canManageWebhooks,
    canInviteMembers,
    canCreateProjects,
    canCreateTasks,
    canExportData,
  };

  const can = (capability: keyof typeof capabilityMap): boolean =>
    capabilityMap[capability] ?? false;

  return {
    ...orgRole,
    canManageBilling,
    canViewAudit,
    canViewAnalytics,
    canEditOrgSettings,
    canManageApiKeys,
    canManageWebhooks,
    canInviteMembers,
    canCreateProjects,
    canCreateTasks,
    canExportData,
    can,
  };
}

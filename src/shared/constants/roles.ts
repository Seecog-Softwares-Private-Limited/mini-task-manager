/**
 * Role names used for RBAC. Align with organization_members.role and project_members.role.
 */
export const ROLES = {
  ORG_OWNER: 'OWNER',
  ORG_ADMIN: 'ADMIN',
  ORG_MEMBER: 'MEMBER',
  PROJECT_ADMIN: 'ADMIN',
  PROJECT_MEMBER: 'MEMBER',
  PROJECT_VIEWER: 'VIEWER',
} as const;

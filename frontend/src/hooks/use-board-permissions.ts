"use client";

import { useMemo } from "react";
import type { OrgMember } from "@/types/api";

export interface BoardPermissions {
  canCreateTask: boolean;
  canEditTask: boolean;
  canMoveTask: boolean;
  canDeleteTask: boolean;
  canManageBoard: boolean;
  canBulkSelect: boolean;
  role: string;
  isViewer: boolean;
}

/**
 * Derives board-level permissions from the current user's org membership.
 * VIEWER: read-only, no drag/edit/create
 * CONTRIBUTOR: can create, edit own, move tasks
 * ADMIN / OWNER: full access
 */
export function useBoardPermissions(
  orgMembers: OrgMember[],
  currentUserId: string | null
): BoardPermissions {
  return useMemo(() => {
    if (!currentUserId) {
      return {
        canCreateTask: false,
        canEditTask: false,
        canMoveTask: false,
        canDeleteTask: false,
        canManageBoard: false,
        canBulkSelect: false,
        role: "VIEWER",
        isViewer: true,
      };
    }

    const member = orgMembers.find((m) => m.userId === currentUserId);
    const role = member?.role?.toUpperCase() ?? "VIEWER";

    switch (role) {
      case "OWNER":
      case "ADMIN":
        return {
          canCreateTask: true,
          canEditTask: true,
          canMoveTask: true,
          canDeleteTask: true,
          canManageBoard: true,
          canBulkSelect: true,
          role,
          isViewer: false,
        };
      case "CONTRIBUTOR":
      case "MEMBER":
        return {
          canCreateTask: true,
          canEditTask: true,
          canMoveTask: true,
          canDeleteTask: false,
          canManageBoard: false,
          canBulkSelect: true,
          role,
          isViewer: false,
        };
      case "VIEWER":
      default:
        return {
          canCreateTask: false,
          canEditTask: false,
          canMoveTask: false,
          canDeleteTask: false,
          canManageBoard: false,
          canBulkSelect: false,
          role,
          isViewer: true,
        };
    }
  }, [orgMembers, currentUserId]);
}

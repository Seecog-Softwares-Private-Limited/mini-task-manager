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
 * Board permissions from org membership.
 * Task create/update/delete/move is limited to workspace OWNER.
 * ADMIN can create tasks; MEMBER / VIEWER are read-only on the board.
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
      case "ADMIN":
        return {
          canCreateTask: true,
          canEditTask: false,
          canMoveTask: false,
          canDeleteTask: false,
          canManageBoard: false,
          canBulkSelect: false,
          role,
          isViewer: false,
        };
      case "CONTRIBUTOR":
      case "MEMBER":
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

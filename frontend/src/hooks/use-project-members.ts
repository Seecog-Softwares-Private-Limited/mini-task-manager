"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProjectMembers,
  addProjectMember,
  type AddProjectMemberPayload,
  type ProjectMemberRole,
} from "@/services/api/members.api";
import { parseApiError } from "@/services/api/client";
import { useToast } from "@/components/ui/use-toast";
import type { ProjectMember } from "@/types/api";

const PROJECT_MEMBERS_QUERY_KEY = "project-members" as const;

/**
 * Fetches project members. Use for list, duplicate checks, and loading state.
 */
export function useProjectMembers(projectId: string | undefined) {
  const query = useQuery({
    queryKey: [PROJECT_MEMBERS_QUERY_KEY, projectId],
    queryFn: () => fetchProjectMembers(projectId!),
    enabled: !!projectId,
  });

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export interface AddProjectMemberParams {
  userId: string;
  role: ProjectMemberRole;
}

/**
 * Mutation to add a project member.
 * On success: invalidates project-members, shows success toast.
 * On error: shows error toast.
 * Caller should reset local selection in mutate() onSuccess.
 */
export function useAddProjectMember(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (params: AddProjectMemberParams) => {
      if (!projectId) throw new Error("Project ID is required");
      return addProjectMember(projectId, {
        userId: params.userId,
        role: params.role,
      });
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [PROJECT_MEMBERS_QUERY_KEY, projectId] });
      }
      toast({
        title: "Member added",
        variant: "success",
      });
    },
    onError: (err) => {
      toast({
        title: "Failed to add member",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const mutate = (
    params: AddProjectMemberParams,
    options?: { onSuccess?: () => void }
  ) => {
    if (!projectId) return;
    mutation.mutate(params, {
      onSuccess: () => {
        options?.onSuccess?.();
      },
    });
  };

  return {
    addMember: mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

/** UI role label -> API role */
export const PROJECT_ROLE_OPTIONS: { value: ProjectMemberRole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "CONTRIBUTOR", label: "Contributor" },
  { value: "VIEWER", label: "Viewer" },
];

/** Normalized view of a project member for display */
export interface ProjectMemberView {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export function toProjectMemberView(m: ProjectMember): ProjectMemberView {
  return {
    id: m.id,
    userId: m.userId,
    name: m.user?.fullName ?? m.user?.email ?? "—",
    email: m.user?.email ?? "—",
    role: m.role,
    avatar: m.user?.avatarUrl,
  };
}

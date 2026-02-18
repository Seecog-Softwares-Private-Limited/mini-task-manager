"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createInvitation,
  fetchInvitations,
  resendInvitation,
  cancelInvitation,
} from "@/services/api/invitations.api";
import { parseApiError } from "@/services/api/client";
import { useToast } from "@/components/ui/use-toast";

/**
 * Project invitations use the organization invitation API.
 * Inviting from a project = inviting to the org; when accepted, user joins org
 * and can then be added to the project via "Add Existing Member".
 */
const PROJECT_INVITATIONS_KEY = "org-invitations" as const;

export function useProjectInvitations(organizationId: string | null) {
  const query = useQuery({
    queryKey: [PROJECT_INVITATIONS_KEY, organizationId],
    queryFn: () => fetchInvitations(organizationId!),
    enabled: !!organizationId,
  });

  return {
    invitations: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateProjectInvitation(organizationId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (params: { email: string; role: string }) => {
      if (!organizationId) throw new Error("Organization ID is required");
      return createInvitation(organizationId, params);
    },
    onSuccess: () => {
      if (organizationId) {
        queryClient.invalidateQueries({ queryKey: [PROJECT_INVITATIONS_KEY, organizationId] });
      }
      toast({ title: "Invitation sent", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Failed to send invitation",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  return {
    createInvite: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

export function useResendProjectInvitation(organizationId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (invitationId: string) => {
      if (!organizationId) throw new Error("Organization ID is required");
      return resendInvitation(organizationId, invitationId);
    },
    onSuccess: () => {
      if (organizationId) {
        queryClient.invalidateQueries({ queryKey: [PROJECT_INVITATIONS_KEY, organizationId] });
      }
      toast({ title: "Invitation resent", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Failed to resend",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  return { resend: mutation.mutate, isPending: mutation.isPending };
}

export function useCancelProjectInvitation(organizationId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (invitationId: string) => {
      if (!organizationId) throw new Error("Organization ID is required");
      return cancelInvitation(organizationId, invitationId);
    },
    onSuccess: () => {
      if (organizationId) {
        queryClient.invalidateQueries({ queryKey: [PROJECT_INVITATIONS_KEY, organizationId] });
      }
      toast({ title: "Invitation cancelled", variant: "default" });
    },
    onError: (err) => {
      toast({
        title: "Failed to cancel",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  return { cancel: mutation.mutate, isPending: mutation.isPending };
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createInvitation,
  fetchInvitations,
  resendInvitation,
  cancelInvitation,
  validateInvitation,
  validateInvitationEnriched,
  acceptInvitation,
} from "@/services/api/invitations.api";
import { parseApiError } from "@/services/api/client";
import { useToast } from "@/components/ui/use-toast";

const INVITATIONS_KEY = "org-invitations" as const;

export function useOrgInvitations(orgId: string | null) {
  const query = useQuery({
    queryKey: [INVITATIONS_KEY, orgId],
    queryFn: () => fetchInvitations(orgId!),
    enabled: !!orgId,
  });

  return {
    invitations: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateInvitation(orgId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (params: { email: string; role: string }) => {
      if (!orgId) throw new Error("Organization ID is required");
      return createInvitation(orgId, params);
    },
    onSuccess: () => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: [INVITATIONS_KEY, orgId] });
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

export function useResendInvitation(orgId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (invitationId: string) => {
      if (!orgId) throw new Error("Organization ID is required");
      return resendInvitation(orgId, invitationId);
    },
    onSuccess: () => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: [INVITATIONS_KEY, orgId] });
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

export function useCancelInvitation(orgId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (invitationId: string) => {
      if (!orgId) throw new Error("Organization ID is required");
      return cancelInvitation(orgId, invitationId);
    },
    onSuccess: () => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: [INVITATIONS_KEY, orgId] });
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

export function useValidateInvitation(token: string | undefined) {
  return useQuery({
    queryKey: ["invitation-validate", token],
    queryFn: () => validateInvitation(token!),
    enabled: !!token,
    retry: false,
  });
}

export function useValidateInvitationEnriched(token: string | undefined) {
  return useQuery({
    queryKey: ["invitation-validate-enriched", token],
    queryFn: () => validateInvitationEnriched(token!),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvitation() {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (token: string) => acceptInvitation(token),
    onSuccess: () => {
      toast({ title: "You've joined the organization!", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: "Failed to accept invitation",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  return {
    accept: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

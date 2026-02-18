import { apiClient } from "@/services/api/client";
import type {
  OrgInvitation,
  InvitationValidation,
  InvitationValidationEnriched,
} from "@/types/api";

export async function createInvitation(
  orgId: string,
  payload: { email: string; role: string }
): Promise<OrgInvitation> {
  const { data } = await apiClient.post<OrgInvitation>(
    `/organizations/${orgId}/invitations`,
    payload
  );
  return data;
}

export async function fetchInvitations(orgId: string): Promise<OrgInvitation[]> {
  const { data } = await apiClient.get<OrgInvitation[]>(
    `/organizations/${orgId}/invitations`
  );
  return data;
}

export async function resendInvitation(
  orgId: string,
  invitationId: string
): Promise<OrgInvitation> {
  const { data } = await apiClient.post<OrgInvitation>(
    `/organizations/${orgId}/invitations/${invitationId}/resend`
  );
  return data;
}

export async function cancelInvitation(
  orgId: string,
  invitationId: string
): Promise<void> {
  await apiClient.patch(`/organizations/${orgId}/invitations/${invitationId}/cancel`);
}

export async function validateInvitation(token: string): Promise<InvitationValidation> {
  const { data } = await apiClient.get<InvitationValidation>(
    `/invitations/validate`,
    { params: { token } }
  );
  return data;
}

export async function validateInvitationEnriched(
  token: string
): Promise<InvitationValidationEnriched> {
  const { data } = await apiClient.get<InvitationValidationEnriched>(
    `/invitations/validate/${encodeURIComponent(token)}`
  );
  return data;
}

export async function acceptInvitation(token: string): Promise<{
  success: boolean;
  organizationId: string;
}> {
  const { data } = await apiClient.post<{ success: boolean; organizationId: string }>(
    `/invitations/accept/${encodeURIComponent(token)}`
  );
  return data;
}

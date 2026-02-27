import { apiClient } from "@/services/api/client";

export interface SSOConfig {
  id: string;
  organizationId: string;
  provider: "SAML" | "OIDC";
  label: string | null;
  issuerUrl: string | null;
  ssoUrl: string | null;
  clientId: string | null;
  metadataUrl: string | null;
  domains: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSSOConfigPayload {
  provider: "SAML" | "OIDC";
  label?: string;
  issuerUrl?: string;
  ssoUrl?: string;
  clientId?: string;
  clientSecret?: string;
  certificate?: string;
  metadataUrl?: string;
  domains?: string;
  isEnabled?: boolean;
}

export async function fetchSSOConfig(): Promise<SSOConfig | null> {
  const { data } = await apiClient.get<SSOConfig | null>("/sso");
  return data;
}

export async function upsertSSOConfig(payload: UpsertSSOConfigPayload): Promise<SSOConfig> {
  const { data } = await apiClient.post<SSOConfig>("/sso", payload);
  return data;
}

export async function toggleSSOEnabled(enabled: boolean): Promise<SSOConfig> {
  const { data } = await apiClient.patch<SSOConfig>("/sso/toggle", { enabled });
  return data;
}

export async function deleteSSOConfig(): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete<{ success: boolean }>("/sso");
  return data;
}

import { apiClient } from "@/services/api/client";

export interface OnboardingStatus {
  hasOrganizations: boolean;
  onboardingCompletedAt: string | null;
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const { data } = await apiClient.get<OnboardingStatus>("/users/me/onboarding-status");
  return data;
}

export async function markOnboardingComplete(): Promise<{ success: boolean }> {
  const { data } = await apiClient.post<{ success: boolean }>("/users/me/onboarding-complete");
  return data;
}

import { apiClient } from "@/services/api/client";

export interface OrgAnalytics {
  totalMembers: number;
  totalProjects: number;
  totalTasks: number;
  activeMembers7d: number;
  activeMembers1d: number;
  activationRate: number;
  trialConversionPct: number | null;
  planDistribution: { plan: string; count: number; color: string }[];
  funnelCounts: Record<string, number>;
  currentPlan: string;
  subscriptionStatus: string;
}

export async function fetchOrganizationAnalytics(): Promise<OrgAnalytics> {
  const { data } = await apiClient.get<OrgAnalytics>("/analytics");
  return data;
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/context/tenant-context";
import { fetchUserPlanUsage, type CurrentPlanResponse } from "@/services/api/user-plans.api";
import { fetchUsageByOrg } from "@/services/api/billing.api";

/** Unified workspace plan: merges legacy user plan with org subscription usage. */
export function useWorkspacePlan() {
  const { orgId } = useTenant();

  return useQuery({
    queryKey: ["workspace-plan", orgId ?? "none"],
    queryFn: async (): Promise<CurrentPlanResponse> => {
      const userPlan = await fetchUserPlanUsage();
      if (!orgId) return userPlan;
      const orgUsage = await fetchUsageByOrg(orgId);
      return {
        ...userPlan,
        usage: {
          ...userPlan.usage,
          members: {
            used: orgUsage.users.current,
            limit: orgUsage.users.limit,
          },
          storage: {
            usedBytes: Math.round(orgUsage.storageGb.current * 1024 ** 3),
            limitBytes: orgUsage.storageGb.limit
              ? Math.round(orgUsage.storageGb.limit * 1024 ** 3)
              : userPlan.usage.storage.limitBytes,
          },
        },
      };
    },
    staleTime: 30_000,
    enabled: Boolean(orgId),
  });
}

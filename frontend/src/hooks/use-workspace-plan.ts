"use client";

import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/context/tenant-context";
import { fetchUserPlanUsage } from "@/services/api/user-plans.api";

export function useWorkspacePlan() {
  const { orgId } = useTenant();

  return useQuery({
    queryKey: ["user-plans", "usage", orgId ?? "none"],
    queryFn: fetchUserPlanUsage,
    staleTime: 30_000,
    enabled: Boolean(orgId),
  });
}

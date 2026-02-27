"use client";

import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/context/tenant-context";
import { fetchUsage } from "@/services/api/billing.api";
import type { UsageData } from "@/types/api";

/**
 * Fetches real-time usage data for the current organization.
 * Includes users, projects, storage, automations, and integrations usage with limits.
 */
export function useUsage() {
  const { orgId } = useTenant();

  const { data, isLoading, error, refetch } = useQuery<UsageData>({
    queryKey: ["billing", "usage", orgId ?? ""],
    queryFn: fetchUsage,
    enabled: !!orgId,
    staleTime: 30 * 1000, // 30s — usage changes frequently
    refetchOnWindowFocus: true,
  });

  return {
    usage: data ?? null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Check if a specific resource is at or over its limit.
 */
export function isAtLimit(usage: UsageData | null, resource: keyof Pick<UsageData, "users" | "projects" | "storageGb" | "automations" | "integrations">): boolean {
  if (!usage) return false;
  const bucket = usage[resource];
  return bucket.limit !== null && bucket.current >= bucket.limit;
}

/**
 * Check if a specific resource is over its limit.
 */
export function isOverLimit(usage: UsageData | null, resource: keyof Pick<UsageData, "users" | "projects" | "storageGb" | "automations" | "integrations">): boolean {
  if (!usage) return false;
  const bucket = usage[resource];
  return bucket.limit !== null && bucket.current > bucket.limit;
}

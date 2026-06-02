"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSuperAdminPlans } from "@/services/api/super-admin.api";

export default function SuperAdminPlansPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "plans"],
    queryFn: fetchSuperAdminPlans,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Plans</h1>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading plans...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-semibold">Billing Plans</h2>
            <pre className="overflow-auto text-xs">{JSON.stringify(data?.billingPlans ?? [], null, 2)}</pre>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-semibold">User Plan Configurations</h2>
            <pre className="overflow-auto text-xs">{JSON.stringify(data?.userPlanConfigs ?? [], null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}


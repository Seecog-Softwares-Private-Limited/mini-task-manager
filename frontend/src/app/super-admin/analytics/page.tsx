"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSuperAdminAnalytics } from "@/services/api/super-admin.api";

export default function SuperAdminAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "analytics"],
    queryFn: fetchSuperAdminAnalytics,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading analytics...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <div className="rounded-lg border p-4">
        <pre className="overflow-auto text-xs">{JSON.stringify(data ?? {}, null, 2)}</pre>
      </div>
    </div>
  );
}


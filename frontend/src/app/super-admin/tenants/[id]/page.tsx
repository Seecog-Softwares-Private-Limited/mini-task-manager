"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSuperAdminTenantById } from "@/services/api/super-admin.api";

export default function SuperAdminTenantDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "tenant", params.id],
    queryFn: () => fetchSuperAdminTenantById(params.id),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading tenant details...</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Tenant not found.</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{data.overview?.name ?? "Tenant Detail"}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 font-semibold">Overview</h2>
          <pre className="overflow-auto text-xs">{JSON.stringify(data.overview, null, 2)}</pre>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 font-semibold">Subscription & Usage</h2>
          <pre className="overflow-auto text-xs">{JSON.stringify(data.storageUsage, null, 2)}</pre>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">Workspaces</h3>
          <p>{data.workspaces?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">Projects</h3>
          <p>{data.projects?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">Tasks</h3>
          <p>{data.tasks?.length ?? 0}</p>
        </div>
      </div>
    </div>
  );
}


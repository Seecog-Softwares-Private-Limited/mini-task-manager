"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSuperAdminAuditLogs } from "@/services/api/super-admin.api";

export default function SuperAdminAuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "audit-logs"],
    queryFn: () => fetchSuperAdminAuditLogs({ limit: 100 }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading audit logs...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Global Audit Logs</h1>
      <div className="rounded-lg border p-4">
        <pre className="overflow-auto text-xs">{JSON.stringify(data ?? {}, null, 2)}</pre>
      </div>
    </div>
  );
}


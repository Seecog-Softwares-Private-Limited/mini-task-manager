"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchSuperAdminTenants, setSuperAdminTenantStatus } from "@/services/api/super-admin.api";

export default function SuperAdminTenantsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["super-admin", "tenants", search, status],
    queryFn: () => fetchSuperAdminTenants({ search: search || undefined, status }),
  });

  async function toggleStatus(id: string, current: string) {
    await setSuperAdminTenantStatus(id, current === "SUSPENDED" ? "ACTIVE" : "SUSPENDED");
    await refetch();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tenants</h1>
      <div className="flex gap-2">
        <Input placeholder="Search tenants..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select
          className="rounded-md border bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as "ALL" | "ACTIVE" | "SUSPENDED")}
        >
          <option value="ALL">All</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tenants...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">Tenant</th>
                <th className="p-2">Owner</th>
                <th className="p-2">Plan</th>
                <th className="p-2">Status</th>
                <th className="p-2">Users</th>
                <th className="p-2">Projects</th>
                <th className="p-2">Tasks</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map((t: any) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2 font-medium">
                    <Link className="hover:underline" href={`/super-admin/tenants/${t.id}`}>
                      {t.tenantName}
                    </Link>
                  </td>
                  <td className="p-2">{t.ownerEmail}</td>
                  <td className="p-2 uppercase">{t.plan}</td>
                  <td className="p-2">{t.status}</td>
                  <td className="p-2">{t.users}</td>
                  <td className="p-2">{t.projects}</td>
                  <td className="p-2">{t.tasks}</td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => void toggleStatus(t.id, t.status)}>
                      {t.status === "SUSPENDED" ? "Activate" : "Suspend"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


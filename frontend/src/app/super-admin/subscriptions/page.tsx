"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSuperAdminSubscriptions } from "@/services/api/super-admin.api";

export default function SuperAdminSubscriptionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "subscriptions"],
    queryFn: fetchSuperAdminSubscriptions,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading subscriptions...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Subscriptions</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Tenant</th>
              <th className="p-2">Plan</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Start</th>
              <th className="p-2">Expiry</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.tenant}</td>
                <td className="p-2">{s.plan}</td>
                <td className="p-2">₹{Number(s.amount ?? 0).toFixed(2)}</td>
                <td className="p-2">{s.startDate ? new Date(s.startDate).toLocaleDateString() : "-"}</td>
                <td className="p-2">{s.expiryDate ? new Date(s.expiryDate).toLocaleDateString() : "-"}</td>
                <td className="p-2">{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


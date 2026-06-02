"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSuperAdminDashboard } from "@/services/api/super-admin.api";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "dashboard"],
    queryFn: fetchSuperAdminDashboard,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">No dashboard data available.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Super Admin Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Tenants" value={data.totalTenants} />
        <Stat label="Active Tenants" value={data.activeTenants} />
        <Stat label="Suspended Tenants" value={data.suspendedTenants} />
        <Stat label="Total Users" value={data.totalUsers} />
        <Stat label="Total Workspaces" value={data.totalWorkspaces} />
        <Stat label="Total Projects" value={data.totalProjects} />
        <Stat label="Total Tasks" value={data.totalTasks} />
        <Stat label="Total Revenue" value={`₹${Number(data.totalRevenue ?? 0).toFixed(2)}`} />
        <Stat label="Active Subscriptions" value={data.activeSubscriptions} />
        <Stat label="Expired Subscriptions" value={data.expiredSubscriptions} />
        <Stat label="Free Plan Users" value={data.freePlanUsers} />
        <Stat label="Silver Plan Users" value={data.silverPlanUsers} />
        <Stat label="Gold Plan Users" value={data.goldPlanUsers} />
      </div>
    </div>
  );
}


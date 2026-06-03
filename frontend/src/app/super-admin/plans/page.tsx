"use client";

import { useQuery } from "@tanstack/react-query";
import { CustomerPlansEditor } from "@/components/super-admin/customer-plans-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchSuperAdminPlans } from "@/services/api/super-admin.api";
import { Globe, Info } from "lucide-react";

function formatLimit(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined) return "Unlimited";
  return `${value}${suffix}`;
}

export default function SuperAdminPlansPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin", "plans"],
    queryFn: fetchSuperAdminPlans,
  });

  const userConfigs = data?.userPlanConfigs ?? [];
  const billingPlans = data?.billingPlans ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure what customers see on the homepage pricing section and in{" "}
          <span className="font-medium text-foreground">Dashboard → Plans</span>.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Changes to <strong>Free / Silver / Gold</strong> limits apply immediately for new page loads.
          Enforced limits (workspaces, members, storage) update for all users on that plan.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Customer plans (Free, Silver, Gold)</h2>
          <p className="text-sm text-muted-foreground">
            Edit limits below — customers see these on the main website and when upgrading.
          </p>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading plan settings…</p>
        ) : (
          <CustomerPlansEditor configs={userConfigs} />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Organization billing plans</h2>
          <Badge variant="secondary">Advanced</Badge>
        </div>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          These are separate org-level tiers (Free, Starter, Pro, Enterprise) used for workspace subscriptions,
          not the user account plans above.
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : billingPlans.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No organization billing plans found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {billingPlans.map((plan) => {
              const p = plan as Record<string, unknown>;
              const features = (p.features as Record<string, boolean> | undefined) ?? {};
              const enabledFeatures = Object.entries(features)
                .filter(([, on]) => on)
                .map(([key]) => key.replace(/([A-Z])/g, " $1").trim())
                .slice(0, 4);
              return (
                <Card key={String(p.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{String(p.name ?? p.slug)}</CardTitle>
                      <Badge variant={p.isActive ? "default" : "secondary"}>
                        {p.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription className="capitalize">{String(p.slug)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly</span>
                      <span className="font-medium">
                        {String(p.currency ?? "INR")} {String(p.priceMonthly ?? "0")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max users</span>
                      <span>{formatLimit(p.maxUsers as number | null)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Projects</span>
                      <span>{formatLimit(p.maxProjects as number | null)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Storage</span>
                      <span>{p.storageLimitGb != null ? `${p.storageLimitGb} GB` : "—"}</span>
                    </div>
                    {enabledFeatures.length > 0 && (
                      <p className="pt-2 text-xs text-muted-foreground">
                        Features: {enabledFeatures.join(", ")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

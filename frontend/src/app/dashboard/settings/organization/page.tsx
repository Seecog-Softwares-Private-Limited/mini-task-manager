"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/context/tenant-context";
import { usePlanOptional } from "@/context/plan-context";
import { fetchOrganization } from "@/services/api/organizations.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, CreditCard, AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrgSettingsTabs } from "@/components/settings/org-settings-tabs";

export default function OrganizationSettingsPage() {
  const { canManageBilling } = useAuth();
  const { orgId } = useTenant();
  const planContext = usePlanOptional();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const { data: org, isLoading } = useQuery({
    queryKey: ["organization", orgId ?? ""],
    queryFn: () => fetchOrganization(orgId!),
    enabled: !!orgId,
  });

  if (!orgId) {
    return (
      <div className="space-y-4 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Select an Organization</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Choose an organization to manage settings.</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/organizations">Organizations</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subscriptionStatus = planContext?.subscription?.status ?? "—";
  const planName = planContext?.plan?.name ?? "—";

  return (
    <div className="space-y-6 animate-slide-up">
      <OrgSettingsTabs />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
        <p className="mt-1 text-muted-foreground">Update name, slug, and view subscription.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="org-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input
                  id="org-name"
                  value={name ?? org?.name ?? ""}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canManageBilling}
                  placeholder="Organization name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL Slug</Label>
                <Input
                  id="org-slug"
                  value={slug ?? org?.slug ?? ""}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={!canManageBilling}
                  placeholder="url-slug"
                />
              </div>
              {canManageBilling && (
                <Button disabled>Save Changes (API not implemented)</Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
            <span className="text-sm text-muted-foreground">Plan</span>
            <span className="text-sm font-semibold">{planName}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              subscriptionStatus?.toLowerCase() === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
            )}>
              {subscriptionStatus}
            </span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/billing">
              Manage Billing <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {canManageBilling && (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Deleting the organization will remove all projects, tasks, and data. This cannot be undone.
            </p>
            <Button variant="destructive" size="sm" className="mt-3" disabled>
              Delete Organization (contact support)
            </Button>
          </CardContent>
        </Card>
      )}

      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/dashboard/settings">
          <ArrowLeft className="mr-1 h-4 w-4" /> Settings
        </Link>
      </Button>
    </div>
  );
}

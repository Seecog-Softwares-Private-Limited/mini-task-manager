"use client";

import Link from "next/link";
import { usePlanOptional } from "@/context/plan-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

const ENTERPRISE_PLAN_NAMES = ["enterprise", "Enterprise"];

export default function SSOPage() {
  const plan = usePlanOptional();
  const isEnterprise = plan?.plan?.name && ENTERPRISE_PLAN_NAMES.includes(plan.plan.name);

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SSO</h1>
        <p className="mt-1 text-muted-foreground">Enterprise single sign-on (SAML/OIDC).</p>
      </div>

      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 rounded-xl bg-muted/30 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              {isEnterprise ? (
                <p className="text-sm text-muted-foreground">
                  SSO will be available for your Enterprise plan. Contact support to enable SAML or OIDC integration.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  SSO is available on the Enterprise plan. Upgrade to configure SAML or OIDC for your organization.
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/billing">
              View Plans <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/dashboard/settings"><ArrowLeft className="mr-1 h-4 w-4" /> Settings</Link>
      </Button>
    </div>
  );
}

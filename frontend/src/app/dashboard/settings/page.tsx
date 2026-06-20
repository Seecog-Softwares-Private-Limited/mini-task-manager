"use client";

import Link from "next/link";
import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Shield, Key, Webhook, Download, Lock, ArrowLeft, ArrowRight, Users, KeyRound, CircleUserRound } from "lucide-react";

const SECTIONS = [
  { href: "/dashboard/profile", title: "My Profile", description: "Your photo, name, and personal details", icon: CircleUserRound, color: "text-violet-500 bg-violet-500/10", requiredCap: null },
  { href: "/dashboard/settings/password", title: "Password", description: "Change your account password", icon: KeyRound, color: "text-sky-500 bg-sky-500/10", requiredCap: null },
  { href: "/dashboard/settings/workspace", title: "Workspace", description: "Name, slug, subscription, danger zone", icon: Building2, color: "text-primary bg-primary/10", requiredCap: "canEditOrgSettings" as const },
  { href: "/dashboard/settings/members", title: "Members", description: "Invite members, manage roles, transfer ownership", icon: Users, color: "text-emerald-600 bg-emerald-500/10", requiredCap: "canInviteMembers" as const },
  { href: "/dashboard/settings/permissions", title: "Roles & Permissions", description: "Role matrix and feature access", icon: Shield, color: "text-purple-500 bg-purple-500/10", requiredCap: null },
  { href: "/dashboard/settings/api-keys", title: "API Keys", description: "Create and revoke API keys", icon: Key, color: "text-amber-500 bg-amber-500/10", requiredCap: "canManageApiKeys" as const },
  { href: "/dashboard/settings/webhooks", title: "Webhooks", description: "Endpoint and event subscriptions", icon: Webhook, color: "text-blue-500 bg-blue-500/10", requiredCap: "canManageWebhooks" as const },
  { href: "/dashboard/settings/export", title: "Data Export", description: "Export your data", icon: Download, color: "text-emerald-500 bg-emerald-500/10", requiredCap: "canExportData" as const },
  { href: "/dashboard/settings/sso", title: "SSO", description: "Enterprise single sign-on (coming soon)", icon: Lock, color: "text-rose-500 bg-rose-500/10", requiredCap: "canEditOrgSettings" as const },
];

export default function SettingsPage() {
  const perms = usePermissions();

  const visibleSections = SECTIONS.filter(
    (s) => s.requiredCap === null || perms[s.requiredCap]
  );

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage workspace and security settings.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleSections.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href} className="group">
              <Card className="h-full transition-all hover:border-primary/20 hover:shadow-glow">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${s.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold group-hover:text-primary transition-colors">{s.title}</p>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/dashboard">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}

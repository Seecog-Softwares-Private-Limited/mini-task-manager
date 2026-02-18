"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Check, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLES = ["owner", "admin", "member"] as const;
const CAPABILITIES = [
  { id: "billing", label: "Manage billing & subscription", owner: true, admin: true, member: false },
  { id: "audit", label: "View audit log", owner: true, admin: true, member: false },
  { id: "analytics", label: "View analytics / growth", owner: true, admin: true, member: false },
  { id: "org_settings", label: "Edit organization settings", owner: true, admin: true, member: false },
  { id: "api_keys", label: "Create / revoke API keys", owner: true, admin: false, member: false },
  { id: "webhooks", label: "Manage webhooks", owner: true, admin: true, member: false },
  { id: "invite", label: "Invite members", owner: true, admin: true, member: false },
  { id: "projects", label: "Create / edit projects", owner: true, admin: true, member: true },
  { id: "tasks", label: "Create / edit tasks", owner: true, admin: true, member: true },
  { id: "export", label: "Export data", owner: true, admin: true, member: true },
];

function PermCell({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 mx-auto">
      <Check className="h-4 w-4 text-emerald-500" />
    </div>
  ) : (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted mx-auto">
      <XIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
    </div>
  );
}

export default function PermissionsPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="mt-1 text-muted-foreground">Read-only view of what each role can do.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Permission Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Capability</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <span className={cn(
                        "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                        r === "owner" && "gradient-bg text-white",
                        r === "admin" && "bg-purple-500/10 text-purple-600",
                        r === "member" && "bg-muted text-muted-foreground"
                      )}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((cap) => (
                  <tr key={cap.id} className="border-b transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{cap.label}</td>
                    <td className="px-4 py-3"><PermCell allowed={cap.owner} /></td>
                    <td className="px-4 py-3"><PermCell allowed={cap.admin} /></td>
                    <td className="px-4 py-3"><PermCell allowed={cap.member} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Feature toggles and custom roles can be added when supported by the backend.
          </p>
        </CardContent>
      </Card>

      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/dashboard/settings">
          <ArrowLeft className="mr-1 h-4 w-4" /> Settings
        </Link>
      </Button>
    </div>
  );
}

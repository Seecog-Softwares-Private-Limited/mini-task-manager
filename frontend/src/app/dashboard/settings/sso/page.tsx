"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePlanOptional } from "@/context/plan-context";
import { useTenant } from "@/context/tenant-context";
import { useOrgRole } from "@/hooks/use-org-role";
import {
  fetchSSOConfig,
  upsertSSOConfig,
  toggleSSOEnabled,
  deleteSSOConfig,
  type SSOConfig,
  type UpsertSSOConfigPayload,
} from "@/services/api/sso.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Lock,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Shield,
  Globe,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Save,
} from "lucide-react";

const SSO_PLAN_NAMES = ["pro", "enterprise"];

export default function SSOPage() {
  const planCtx = usePlanOptional();
  const { orgId } = useTenant();
  const { canManageSettings, isLoading: roleLoading } = useOrgRole();
  const queryClient = useQueryClient();

  const hasSSOFeature =
    planCtx?.plan?.features?.sso === true ||
    SSO_PLAN_NAMES.includes(planCtx?.plan?.name?.toLowerCase() ?? "");

  const {
    data: ssoConfig,
    isLoading: configLoading,
    refetch,
  } = useQuery<SSOConfig | null>({
    queryKey: ["sso", "config", orgId ?? ""],
    queryFn: fetchSSOConfig,
    enabled: !!orgId && hasSSOFeature,
  });

  const [provider, setProvider] = useState<"SAML" | "OIDC">("SAML");
  const [label, setLabel] = useState("");
  const [issuerUrl, setIssuerUrl] = useState("");
  const [ssoUrl, setSsoUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [certificate, setCertificate] = useState("");
  const [metadataUrl, setMetadataUrl] = useState("");
  const [domains, setDomains] = useState("");
  const [formDirty, setFormDirty] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Populate form when config loads
  const [populated, setPopulated] = useState(false);
  if (ssoConfig && !populated) {
    setProvider(ssoConfig.provider as "SAML" | "OIDC");
    setLabel(ssoConfig.label ?? "");
    setIssuerUrl(ssoConfig.issuerUrl ?? "");
    setSsoUrl(ssoConfig.ssoUrl ?? "");
    setClientId(ssoConfig.clientId ?? "");
    setMetadataUrl(ssoConfig.metadataUrl ?? "");
    setDomains(ssoConfig.domains ?? "");
    setPopulated(true);
  }

  const saveMutation = useMutation({
    mutationFn: (payload: UpsertSSOConfigPayload) => upsertSSOConfig(payload),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["sso"] });
      setFormDirty(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => toggleSSOEnabled(enabled),
    onSuccess: () => {
      refetch();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSSOConfig(),
    onSuccess: () => {
      refetch();
      setPopulated(false);
      setProvider("SAML");
      setLabel("");
      setIssuerUrl("");
      setSsoUrl("");
      setClientId("");
      setClientSecret("");
      setCertificate("");
      setMetadataUrl("");
      setDomains("");
      setShowDelete(false);
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      provider,
      label: label || undefined,
      issuerUrl: issuerUrl || undefined,
      ssoUrl: ssoUrl || undefined,
      clientId: clientId || undefined,
      clientSecret: clientSecret || undefined,
      certificate: certificate || undefined,
      metadataUrl: metadataUrl || undefined,
      domains: domains || undefined,
      isEnabled: ssoConfig?.isEnabled ?? false,
    });
  };

  const markDirty = () => setFormDirty(true);

  if (roleLoading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">SSO</h1>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  // Not on a plan with SSO — show upgrade prompt
  if (!hasSSOFeature) {
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
              SSO Requires Upgrade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 rounded-xl bg-muted/30 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Available on Pro &amp; Enterprise Plans</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  SSO (SAML 2.0 and OpenID Connect) is available on the Pro and Enterprise plans.
                  Upgrade to configure single sign-on for your workspace.
                </p>
              </div>
            </div>
            <Button asChild>
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

  // Restrict to owners/admins
  if (!canManageSettings) {
    return (
      <div className="space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">SSO</h1>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <Shield className="h-6 w-6 text-amber-500 shrink-0" />
            <div>
              <p className="font-semibold">Access Restricted</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Only workspace owners and admins can manage SSO settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SSO Configuration</h1>
        <p className="mt-1 text-muted-foreground">Configure SAML 2.0 or OpenID Connect for your workspace.</p>
      </div>

      {/* Status card */}
      <Card className="overflow-hidden">
        <div className={cn("h-1.5", ssoConfig?.isEnabled ? "bg-emerald-500" : "bg-gradient-to-r from-primary via-purple-500 to-pink-500")} />
        <CardContent className="flex items-center justify-between py-5 px-6">
          <div className="flex items-center gap-3">
            {ssoConfig?.isEnabled ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-semibold">
                {ssoConfig ? (ssoConfig.isEnabled ? "SSO is Active" : "SSO is Configured (Disabled)") : "No SSO Configuration"}
              </p>
              {ssoConfig && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Provider: {ssoConfig.provider}{ssoConfig.label && ` · ${ssoConfig.label}`}{ssoConfig.domains && ` · Domains: ${ssoConfig.domains}`}
                </p>
              )}
            </div>
          </div>
          {ssoConfig && (
            <Button
              size="sm"
              variant={ssoConfig.isEnabled ? "destructive" : "default"}
              disabled={toggleMutation.isPending}
              onClick={() => toggleMutation.mutate(!ssoConfig.isEnabled)}
            >
              {toggleMutation.isPending ? "Updating..." : ssoConfig.isEnabled ? "Disable SSO" : "Enable SSO"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Config form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-primary" />
            {ssoConfig ? "Update Configuration" : "Set Up SSO"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {configLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : (
            <>
              {/* Provider toggle */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Provider Type</label>
                <div className="flex gap-2">
                  <Button size="sm" variant={provider === "SAML" ? "default" : "outline"} onClick={() => { setProvider("SAML"); markDirty(); }}>
                    <Shield className="mr-1.5 h-4 w-4" /> SAML 2.0
                  </Button>
                  <Button size="sm" variant={provider === "OIDC" ? "default" : "outline"} onClick={() => { setProvider("OIDC"); markDirty(); }}>
                    <Globe className="mr-1.5 h-4 w-4" /> OpenID Connect
                  </Button>
                </div>
              </div>

              {/* Common fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Label (optional)</label>
                  <input type="text" value={label} onChange={(e) => { setLabel(e.target.value); markDirty(); }} placeholder="e.g. Okta, Azure AD"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Domains (comma-separated)</label>
                  <input type="text" value={domains} onChange={(e) => { setDomains(e.target.value); markDirty(); }} placeholder="e.g. acme.com, acme.org"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>

              {provider === "SAML" ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">IdP Entity ID / Issuer URL</label>
                    <input type="url" value={issuerUrl} onChange={(e) => { setIssuerUrl(e.target.value); markDirty(); }} placeholder="https://idp.example.com/entity-id"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">SSO URL (Login Endpoint)</label>
                    <input type="url" value={ssoUrl} onChange={(e) => { setSsoUrl(e.target.value); markDirty(); }} placeholder="https://idp.example.com/sso/saml"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">X.509 Certificate (Base64)</label>
                    <textarea value={certificate} onChange={(e) => { setCertificate(e.target.value); markDirty(); }} rows={4} placeholder="Paste your IdP's X.509 certificate here..."
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Issuer / Discovery URL</label>
                    <input type="url" value={issuerUrl} onChange={(e) => { setIssuerUrl(e.target.value); markDirty(); }} placeholder="https://accounts.google.com"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Client ID</label>
                      <input type="text" value={clientId} onChange={(e) => { setClientId(e.target.value); markDirty(); }} placeholder="your-client-id"
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Client Secret</label>
                      <input type="password" value={clientSecret} onChange={(e) => { setClientSecret(e.target.value); markDirty(); }} placeholder="••••••••"
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Metadata URL (optional)</label>
                    <input type="url" value={metadataUrl} onChange={(e) => { setMetadataUrl(e.target.value); markDirty(); }} placeholder="https://idp.example.com/.well-known/openid-configuration"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </>
              )}

              {/* Error display */}
              {saveMutation.isError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{(saveMutation.error as Error)?.message ?? "Failed to save SSO configuration."}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saveMutation.isPending}>
                    <Save className="mr-1.5 h-4 w-4" />
                    {saveMutation.isPending ? "Saving..." : ssoConfig ? "Update Configuration" : "Save Configuration"}
                  </Button>
                  {formDirty && <span className="self-center text-xs text-amber-500">Unsaved changes</span>}
                </div>
                {ssoConfig && (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setShowDelete(true)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Service Provider Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Provider Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Use these values when configuring your Identity Provider:</p>
          <div className="space-y-2 rounded-lg bg-muted/30 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ACS URL</span>
              <code className="font-mono text-xs">{typeof window !== "undefined" ? `${window.location.origin}/api/v1/auth/sso/callback` : "/api/v1/auth/sso/callback"}</code>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entity ID</span>
              <code className="font-mono text-xs">{typeof window !== "undefined" ? `${window.location.origin}/api/v1/auth/sso/metadata` : "/api/v1/auth/sso/metadata"}</code>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sign-on URL</span>
              <code className="font-mono text-xs">{typeof window !== "undefined" ? `${window.location.origin}/api/v1/auth/sso/login` : "/api/v1/auth/sso/login"}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-premium-lg animate-scale-in">
            <h3 className="font-bold text-lg">Delete SSO Configuration?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently remove the SSO configuration. Users who sign in via SSO will be unable to authenticate until it is reconfigured.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
              <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/dashboard/settings"><ArrowLeft className="mr-1 h-4 w-4" /> Settings</Link>
      </Button>
    </div>
  );
}

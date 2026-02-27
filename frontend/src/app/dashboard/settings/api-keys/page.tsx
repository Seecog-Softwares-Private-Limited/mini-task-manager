"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrgRole } from "@/hooks/use-org-role";
import { usePlan } from "@/context/plan-context";
import { useUpgradeModal } from "@/context/upgrade-modal-context";
import { fetchApiKeys, createApiKey, revokeApiKey } from "@/services/api/api-keys.api";
import { parseApiError } from "@/services/api/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Key, Plus, Copy, Check, Trash2, ArrowLeft, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ApiKeysPage() {
  const { isOwner, isLoading: roleLoading } = useOrgRole();
  const { usage, limits, plan } = usePlan();
  const { openUpgradeModal } = useUpgradeModal();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<{ id: string; rawKey: string } | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createApiKey(name),
    onSuccess: (data) => {
      setCreatedKey({ id: data.id, rawKey: data.rawKey });
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "API key created. Copy it now — it won't be shown again.", variant: "success" });
    },
    onError: (err) => {
      const res = (err as { response?: { data?: { code?: string; message?: string }; status?: number } })?.response;
      const data = res?.data;
      if (data?.code === "SUBSCRIPTION_LIMIT_EXCEEDED" || (res?.status === 403 && data?.message?.toLowerCase().includes("api access"))) {
        openUpgradeModal("limit");
      } else {
        toast({ title: "Failed to create API key", description: parseApiError(err), variant: "error" });
      }
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "API key revoked", variant: "success" });
    },
    onError: (err) => {
      toast({ title: "Failed to revoke", description: parseApiError(err), variant: "error" });
    },
  });

  const apiEnabled = plan?.apiEnabled ?? false;
  const atLimit = limits.maxApiKeys != null && (usage?.apiKeys?.current ?? 0) >= limits.maxApiKeys;
  const canManage = isOwner;
  const canCreate = canManage && apiEnabled && !atLimit;

  function handleCopy(id: string, rawKey?: string) {
    const text = rawKey ?? "(key value not stored after creation)";
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (roleLoading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="mt-1 text-muted-foreground">Create and revoke keys for API access. Owner only.</p>
        </div>
        <div className="h-48 rounded-xl border bg-muted/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
        <p className="mt-1 text-muted-foreground">Create and revoke keys for API access. Owner only.</p>
      </div>

      {!apiEnabled && canManage && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">API access requires Pro or Enterprise. Upgrade to create API keys.</p>
          <Button size="sm" onClick={() => openUpgradeModal("limit")}>Upgrade</Button>
        </div>
      )}

      {canManage && apiEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              Create API Key
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label htmlFor="key-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Name</Label>
              <Input id="key-name" placeholder="e.g. CI/CD" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            </div>
            {atLimit && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-600">Limit reached</span>
                <Button size="sm" variant="outline" onClick={() => openUpgradeModal("limit")}>
                  Upgrade
                </Button>
              </div>
            )}
            <Button
              disabled={!newKeyName.trim() || createMutation.isPending || atLimit}
              onClick={() => createMutation.mutate(newKeyName.trim())}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </CardContent>
          {createdKey && (
            <CardContent className="pt-0">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Copy your key now — it won&apos;t be shown again.</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-2 py-1 text-xs font-mono truncate">{createdKey.rawKey}</code>
                  <Button size="sm" variant="outline" onClick={() => handleCopy(createdKey.id, createdKey.rawKey)}>
                    {copiedId === createdKey.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button size="sm" variant="ghost" className="mt-3" onClick={() => setCreatedKey(null)}>
                  Done
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-primary" />
            Your API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : keys.length === 0 ? (
            <div className="py-12 text-center">
              <Key className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No API keys yet.</p>
              {canCreate && (
                <p className="mt-1 text-xs text-muted-foreground">Create one above to get started.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <div key={k.id} className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 hover:bg-muted/20 transition-colors")}>
                  <div>
                    <p className="font-semibold">{k.name}</p>
                    <p className="mt-0.5 text-sm font-mono text-muted-foreground">{k.keyPrefix}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Last used: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(k.id)}>
                      {copiedId === k.id ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                      {copiedId === k.id ? "Copied" : "Copy"}
                    </Button>
                    {canManage && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => revokeMutation.mutate(k.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/dashboard/settings"><ArrowLeft className="mr-1 h-4 w-4" /> Settings</Link>
      </Button>
    </div>
  );
}

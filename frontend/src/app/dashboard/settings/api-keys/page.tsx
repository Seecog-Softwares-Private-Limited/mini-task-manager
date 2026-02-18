"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Plus, Copy, Check, Trash2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const STUB_KEYS = [
  { id: "1", name: "CI/CD", prefix: "mtm_••••••••••••abc", lastUsed: "2 days ago" },
];

export default function ApiKeysPage() {
  const { canManageBilling } = useAuth();
  const [newKeyName, setNewKeyName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canManage = canManageBilling;

  function handleCopy(id: string) {
    void navigator.clipboard.writeText("(key value not stored after creation)");
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
        <p className="mt-1 text-muted-foreground">Create and revoke keys for API access. Owner only.</p>
      </div>

      {canManage && (
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
            <Button disabled>Create (API not implemented)</Button>
          </CardContent>
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
          {STUB_KEYS.length === 0 ? (
            <div className="py-12 text-center">
              <Key className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No API keys yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {STUB_KEYS.map((k) => (
                <div key={k.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 hover:bg-muted/20 transition-colors">
                  <div>
                    <p className="font-semibold">{k.name}</p>
                    <p className="mt-0.5 text-sm font-mono text-muted-foreground">{k.prefix}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Last used: {k.lastUsed}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(k.id)}>
                      {copiedId === k.id ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                      {copiedId === k.id ? "Copied" : "Copy"}
                    </Button>
                    {canManage && (
                      <Button variant="destructive" size="sm" disabled>
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

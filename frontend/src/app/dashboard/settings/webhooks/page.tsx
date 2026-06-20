"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Webhook, Plus, Trash2, ArrowLeft, Check, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { createWebhook, deleteWebhook, fetchWebhooks } from "@/services/api/webhooks.api";
import { useToast } from "@/components/ui/use-toast";

const EVENTS = ["project.created", "task.created", "task.updated", "member.invited"];

export default function WebhooksPage() {
  const { canManageWebhooks, isLoading: permsLoading } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: fetchWebhooks,
    enabled: canManageWebhooks,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createWebhook({
        name: name.trim() || "Webhook",
        url: url.trim(),
        events: selectedEvents,
      }),
    onSuccess: (result) => {
      toast({ title: "Webhook created", description: result.secret ? `Signing secret: ${result.secret}` : undefined });
      setUrl("");
      setName("");
      setSelectedEvents([]);
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: () => toast({ title: "Failed to create webhook", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      toast({ title: "Webhook removed" });
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: () => toast({ title: "Failed to remove webhook", variant: "destructive" }),
  });

  const canManage = canManageWebhooks;

  function toggleEvent(e: string) {
    setSelectedEvents((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  }

  if (!permsLoading && !canManageWebhooks) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="mt-1 text-muted-foreground">Subscribe to events. Owner/admin only.</p>
        </div>
        <Card className="max-w-md border-dashed border-2">
          <CardContent className="flex items-center gap-4 py-8 px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
              <Shield className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold">Access Restricted</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Only owners and admins can manage webhooks.</p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/dashboard/settings">Back to Settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
        <p className="mt-1 text-muted-foreground">Subscribe to events. Owner/admin only.</p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              Add Webhook Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="webhook-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
              <Input id="webhook-name" placeholder="Production alerts" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endpoint URL</Label>
              <Input id="webhook-url" type="url" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Events</Label>
              <div className="flex flex-wrap gap-2">
                {EVENTS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => toggleEvent(e)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      selectedEvents.includes(e)
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {selectedEvents.includes(e) && <Check className="mr-1 inline h-3 w-3" />}
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <Button
              disabled={!url.trim() || selectedEvents.length === 0 || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Add Webhook
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Webhook className="h-5 w-5 text-primary" />
            Webhook Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : webhooks.length === 0 ? (
            <div className="py-12 text-center">
              <Webhook className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No webhooks configured.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((w) => (
                <div key={w.id} className="rounded-xl border p-4 hover:bg-muted/20 transition-colors">
                  <p className="font-semibold text-sm">{w.name}</p>
                  <p className="font-mono text-sm text-muted-foreground mt-1">{w.url}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {w.events.map((e) => (
                      <span key={e} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">{e}</span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-end">
                    {canManage && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(w.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Webhook, Plus, Trash2, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENTS = ["project.created", "task.created", "task.updated", "member.invited"];

const STUB_WEBHOOKS = [
  { id: "1", url: "https://api.example.com/webhooks", events: ["project.created", "task.created"], lastDelivery: "Success", lastAt: "1 hour ago" },
];

export default function WebhooksPage() {
  const { canManageBilling } = useAuth();
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const canManage = canManageBilling;

  function toggleEvent(e: string) {
    setSelectedEvents((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
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
            <Button disabled>Add Webhook (API not implemented)</Button>
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
          {STUB_WEBHOOKS.length === 0 ? (
            <div className="py-12 text-center">
              <Webhook className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No webhooks configured.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {STUB_WEBHOOKS.map((w) => (
                <div key={w.id} className="rounded-xl border p-4 hover:bg-muted/20 transition-colors">
                  <p className="font-mono text-sm font-semibold">{w.url}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {w.events.map((e) => (
                      <span key={e} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">{e}</span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Last delivery: <span className="text-emerald-600 font-medium">{w.lastDelivery}</span> — {w.lastAt}
                    </p>
                    {canManage && (
                      <Button variant="destructive" size="sm" disabled>
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

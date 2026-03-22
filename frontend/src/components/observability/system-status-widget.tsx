"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ExternalLink, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const LAST_DEPLOYMENT = process.env.NEXT_PUBLIC_DEPLOY_TIME ?? "—";

export function SystemStatusWidget() {
  const [healthStatus, setHealthStatus] = useState<"ok" | "error" | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    setHealthStatus("loading");
    const healthUrl = `${window.location.origin}/api/v1/health`;
    fetch(healthUrl, { method: "GET" })
      .then((r) => {
        if (cancelled) return;
        setHealthStatus(r.ok ? "ok" : "error");
      })
      .catch(() => {
        if (!cancelled) setHealthStatus("error");
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <Card data-cy="system-status-card" className="overflow-hidden">
      <div className={cn(
        "h-1",
        healthStatus === "ok" && "bg-emerald-500",
        healthStatus === "error" && "bg-destructive",
        healthStatus === "loading" && "bg-muted"
      )} />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3" data-cy="health-status">
          <span className="text-muted-foreground">Health</span>
          {healthStatus === "loading" && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-muted animate-pulse" /> Checking...
            </span>
          )}
          {healthStatus === "ok" && (
            <span className="flex items-center gap-1.5 font-medium text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Operational
            </span>
          )}
          {healthStatus === "error" && (
            <span className="flex items-center gap-1.5 font-medium text-destructive">
              <span className="h-2 w-2 rounded-full bg-destructive" /> Unavailable
            </span>
          )}
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Last Deploy
          </span>
          <span className="text-xs font-medium">{LAST_DEPLOYMENT}</span>
        </div>
        <Button variant="ghost" size="sm" asChild className="w-full justify-center text-muted-foreground">
          <Link href="/api/v1/health" target="_blank" rel="noopener noreferrer">
            Health Endpoint <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

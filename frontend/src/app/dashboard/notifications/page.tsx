"use client";

import { useNotificationsOptional } from "@/context/notifications-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { useCallback } from "react";

export default function NotificationsPage() {
  const ctx = useNotificationsOptional();
  const hasUnread = (ctx?.unreadCount ?? 0) > 0;

  const handleRefresh = useCallback(() => ctx?.refetch(), [ctx]);

  if (!ctx) {
    return (
      <div className="space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <div className="h-48 rounded-xl border bg-muted/30 animate-pulse" />
      </div>
    );
  }

  const { notifications, isLoading, markRead, markAllRead } = ctx;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-muted-foreground">
            Your notifications. Updates every 15 seconds.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {hasUnread && (
            <Button variant="outline" size="sm" onClick={markAllRead} aria-label="Mark all as read">
              <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all as read
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            All Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-lg font-semibold">All caught up!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New notifications will show up here when you&apos;re assigned to tasks, mentioned in comments, and more.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`w-full px-4 py-4 text-left transition-colors hover:bg-muted/30 ${
                      !n.isRead ? "bg-primary/5 border-l-4 border-l-primary" : ""
                    }`}
                    onClick={() => markRead(n.id)}
                  >
                    <p className="font-semibold text-sm">{n.title ?? "Notification"}</p>
                    {n.message && (
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                        {n.message}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

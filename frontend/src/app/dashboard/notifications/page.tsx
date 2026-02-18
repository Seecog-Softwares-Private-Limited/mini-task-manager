"use client";

import { useNotificationsOptional } from "@/context/notifications-context";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";

export default function NotificationsPage() {
  const ctx = useNotificationsOptional();
  const hasUnread = (ctx?.unreadCount ?? 0) > 0;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-muted-foreground">Your notifications will appear here.</p>
        </div>
        {hasUnread && ctx && (
          <Button variant="outline" size="sm" onClick={ctx.markAllRead} aria-label="Mark all as read">
            <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/10 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Bell className="h-8 w-8 text-primary" />
        </div>
        <p className="mt-4 text-lg font-semibold">All caught up!</p>
        <p className="mt-1 text-sm text-muted-foreground">New notifications will show up here.</p>
      </div>
    </div>
  );
}

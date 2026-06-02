"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendSuperAdminNotification } from "@/services/api/super-admin.api";

export default function SuperAdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setInfo(null);
    try {
      await sendSuperAdminNotification({
        targetScope: "all",
        title,
        message,
      });
      setInfo("Notification sent to all tenants.");
      setTitle("");
      setMessage("");
    } catch (e) {
      setInfo(e instanceof Error ? e.message : "Failed to send notification");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Notification Center</h1>
      <div className="rounded-lg border p-4 space-y-3">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
        <Button onClick={() => void send()} disabled={!title || !message || sending}>
          {sending ? "Sending..." : "Send to all tenants"}
        </Button>
        {info && <p className="text-sm text-muted-foreground">{info}</p>}
      </div>
    </div>
  );
}


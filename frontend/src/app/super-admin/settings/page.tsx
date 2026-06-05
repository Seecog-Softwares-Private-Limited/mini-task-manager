"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { fetchSuperAdminSettings, upsertSuperAdminSetting } from "@/services/api/super-admin.api";
import { KeyRound } from "lucide-react";

export default function SuperAdminSettingsPage() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["super-admin", "settings"],
    queryFn: fetchSuperAdminSettings,
  });
  const [platformName, setPlatformName] = useState("Mini Task Manager");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await upsertSuperAdminSetting("platform_name", { value: platformName });
      await refetch();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">System Settings</h1>
      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-sm text-muted-foreground">Manage platform-level settings saved in database.</p>
        <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving..." : "Save Platform Name"}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5 text-primary" />
            Change password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <div className="rounded-lg border p-4">
        <h2 className="mb-2 font-semibold">Current Settings</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        ) : (
          <pre className="overflow-auto text-xs">{JSON.stringify(data ?? [], null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


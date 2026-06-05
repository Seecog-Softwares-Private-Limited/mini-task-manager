"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { KeyRound } from "lucide-react";

export default function PasswordSettingsPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Password</h1>
        <p className="mt-1 text-muted-foreground">Change your account password.</p>
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

      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/dashboard/settings">
          <ArrowLeft className="mr-1 h-4 w-4" /> Settings
        </Link>
      </Button>
    </div>
  );
}

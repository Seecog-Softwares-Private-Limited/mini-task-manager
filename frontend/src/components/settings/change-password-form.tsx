"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { changePassword, fetchPasswordStatus } from "@/services/api/auth.api";
import { parseApiError } from "@/services/api/client";
import { Eye, EyeOff, Lock } from "lucide-react";

const schema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    fetchPasswordStatus()
      .then((res) => setHasPassword(res.hasPassword))
      .catch(() => setHasPassword(true));
  }, []);

  async function onSubmit(values: FormValues) {
    if (hasPassword && !values.currentPassword?.trim()) {
      toast({
        variant: "destructive",
        title: "Current password required",
        description: "Enter your current password to continue.",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await changePassword({
        currentPassword: values.currentPassword?.trim() || undefined,
        newPassword: values.newPassword,
      });
      toast({ title: "Success", description: result.message });
      reset();
      setHasPassword(true);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not update password",
        description: parseApiError(err),
      });
    } finally {
      setLoading(false);
    }
  }

  if (hasPassword === null) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <p className="text-sm text-muted-foreground">
        {hasPassword
          ? "Update your account password. You will stay signed in on this device."
          : "Your account uses Google sign-in. Set a password to also sign in with email and password."}
      </p>

      {hasPassword && (
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              {...register("currentPassword")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowCurrent((v) => !v)}
              aria-label={showCurrent ? "Hide password" : "Show password"}
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="newPassword">{hasPassword ? "New password" : "Password"}</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            {...register("newPassword")}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowNew((v) => !v)}
            aria-label={showNew ? "Hide password" : "Show password"}
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="gap-2">
        <Lock className="h-4 w-4" />
        {loading ? "Saving..." : hasPassword ? "Change password" : "Set password"}
      </Button>
    </form>
  );
}

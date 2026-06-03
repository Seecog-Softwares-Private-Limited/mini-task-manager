"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, ArrowRight, Eye, EyeOff, Shield } from "lucide-react";
import {
  PremiumAuthCard,
  PremiumAuthShell,
  authInputClass,
  authPrimaryButtonClass,
} from "@/components/auth/premium-auth-shell";
import { parseApiError } from "@/services/api/client";
import { superAdminLogin } from "@/services/api/super-admin.api";

const SUPER_ADMIN_EMAIL = "superadmin@example.com";
const SUPER_ADMIN_DEFAULT_PASSWORD = "Password123!";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { isAuthenticated, ready } = useAuth();
  const { isPlatformAdmin, isLoading } = usePlatformAdmin();

  const [email, setEmail] = useState(
    process.env.NODE_ENV === "development" ? SUPER_ADMIN_EMAIL : ""
  );
  const [password, setPassword] = useState(
    process.env.NODE_ENV === "development" ? SUPER_ADMIN_DEFAULT_PASSWORD : ""
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || isLoading) return;
    if (isAuthenticated && isPlatformAdmin) {
      router.replace("/super-admin");
    }
  }, [ready, isLoading, isAuthenticated, isPlatformAdmin, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await superAdminLogin({ email, password });
      window.dispatchEvent(new CustomEvent("auth:login"));
      requestAnimationFrame(() => {
        window.location.assign("/super-admin");
      });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  if (ready && isLoading) {
    return (
      <PremiumAuthShell dataCy="super-admin-login">
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      </PremiumAuthShell>
    );
  }

  return (
    <PremiumAuthShell dataCy="super-admin-login">
      <PremiumAuthCard
        title="Super Admin"
        subtitle="Sign in to manage tenants, users, and platform settings"
        icon={<Shield className="h-7 w-7" strokeWidth={2.25} />}
        footer={
          <p className="text-xs tracking-[0.01em] text-slate-500">
            Tenant login?{" "}
            <Link
              href="/login"
              className="font-semibold text-violet-700 underline-offset-2 transition-all duration-300 hover:text-violet-800 hover:underline"
            >
              Go to app login
            </Link>
          </p>
        }
      >
        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-2.5">
            <Label htmlFor="super-admin-email" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="super-admin-email"
                type="email"
                autoComplete="email"
                placeholder="superadmin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`pl-10 ${authInputClass}`}
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="super-admin-password" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="super-admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`pl-10 pr-10 ${authInputClass}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" variant="secondary" className={authPrimaryButtonClass} size="lg" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Signing in…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Sign in as Super Admin
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
      </PremiumAuthCard>
    </PremiumAuthShell>
  );
}

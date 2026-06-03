"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bell,
  BarChart3,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { logout } from "@/services/api/auth.api";
import { clearAuth } from "@/services/api/client";

const NAV = [
  { href: "/super-admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/super-admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/super-admin/users", label: "Users", icon: Users },
  { href: "/super-admin/plans", label: "Plans", icon: CreditCard },
  { href: "/super-admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/super-admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/super-admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/super-admin/notifications", label: "Notifications", icon: Bell },
  { href: "/super-admin/settings", label: "Settings", icon: Settings },
];

export function SuperAdminPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, ready } = useAuth();
  const { isPlatformAdmin, isLoading } = usePlatformAdmin();

  useEffect(() => {
    if (!ready || isLoading) return;
    if (!isAuthenticated) {
      router.replace("/super-admin/login");
      return;
    }
    if (!isPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [ready, isLoading, isAuthenticated, isPlatformAdmin, router]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearAuth();
      router.replace("/super-admin/login");
    }
  }

  if (!ready || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading super admin portal…</p>
      </div>
    );
  }

  if (!isAuthenticated || !isPlatformAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="sticky top-4 h-fit w-64 shrink-0 rounded-xl border bg-card p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2 px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Super Admin</p>
              <p className="text-xs text-muted-foreground">Platform Control</p>
            </div>
          </div>
          <nav className="space-y-1">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/super-admin" && pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 space-y-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => router.push("/dashboard")}
            >
              <LayoutDashboard className="h-4 w-4" />
              Back to App
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

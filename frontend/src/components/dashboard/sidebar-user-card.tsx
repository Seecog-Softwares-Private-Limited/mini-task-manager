"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/context/tenant-context";
import { fetchOrganizations } from "@/services/api/organizations.api";
import { logout } from "@/services/api/auth.api";
import { clearAuth } from "@/services/api/client";
import { cn } from "@/lib/utils";
import { CircleUserRound, LogOut, Settings, ShieldCheck } from "lucide-react";

function formatRole(role?: string): string | null {
  if (!role) return null;
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export function SidebarUserCard({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const { orgId } = useTenant();
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });

  const role = useMemo(() => {
    const activeOrg = orgId ? organizations.find((o) => o.id === orgId) : undefined;
    return formatRole(activeOrg?.myRole);
  }, [orgId, organizations]);

  const displayName =
    user?.fullName?.trim() && user.fullName !== user.email
      ? user.fullName
      : user?.email ?? "";

  const secondaryText = role ? `${role} · ${user?.email ?? ""}` : user?.email ?? "";

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearAuth();
    }
    router.replace("/login");
    router.refresh();
  }

  if (!user) return null;

  const avatar = (
    <div className="relative shrink-0">
      <UserAvatar
        userId={user.id}
        name={displayName}
        avatarUrl={user.avatarUrl}
        className={cn(
          "rounded-full ring-2 ring-violet-500/20",
          collapsed ? "h-9 w-9" : "h-10 w-10"
        )}
        fallbackClassName="gradient-bg text-white text-xs font-bold"
      />
      <span
        className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-card"
        aria-label="Online"
      />
    </div>
  );

  const menu = (
    <DropdownMenuContent
      align={collapsed ? "center" : "start"}
      side={collapsed ? "right" : "bottom"}
      className="w-60"
    >
      <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
        <UserAvatar
          userId={user.id}
          name={displayName}
          avatarUrl={user.avatarUrl}
          className="h-9 w-9 rounded-full"
          fallbackClassName="gradient-bg text-white text-xs font-bold"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{displayName}</p>
          <p className="truncate text-[11px] font-normal text-muted-foreground">
            {user.email}
          </p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => router.push("/dashboard/profile")}>
        <CircleUserRound className="mr-2 h-4 w-4" />
        My Profile
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => router.push("/dashboard/settings")}>
        <Settings className="mr-2 h-4 w-4" />
        Account Settings
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => router.push("/dashboard/settings/password")}>
        <ShieldCheck className="mr-2 h-4 w-4" />
        Security
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => void handleLogout()}
        className="text-destructive focus:text-destructive"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  if (collapsed) {
    return (
      <div className="px-3 pt-2 pb-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full justify-center rounded-xl p-1 transition-colors hover:bg-violet-500/[0.06]"
              aria-label="Account menu"
              title={displayName}
            >
              {avatar}
            </button>
          </DropdownMenuTrigger>
          {menu}
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="px-3 pt-2 pb-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl border border-[#E7EAF0]/90 bg-gradient-to-b from-white to-slate-50/50 px-2.5 py-2 text-left shadow-sm transition-colors hover:border-violet-500/30 hover:shadow-md dark:border-border/70 dark:from-card dark:to-muted/20"
            aria-label="Account menu"
          >
            {avatar}
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[13px] font-semibold leading-tight text-foreground"
                title={displayName}
              >
                {displayName}
              </p>
              <p
                className="truncate text-[10px] leading-tight text-muted-foreground"
                title={secondaryText}
              >
                {secondaryText}
              </p>
            </div>
          </button>
        </DropdownMenuTrigger>
        {menu}
      </DropdownMenu>
    </div>
  );
}

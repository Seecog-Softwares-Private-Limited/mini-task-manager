"use client";

import { useRouter } from "next/navigation";
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
import { logout } from "@/services/api/auth.api";
import { clearAuth } from "@/services/api/client";
import { CircleUserRound, LogOut, Settings, ShieldCheck } from "lucide-react";

export function HeaderAccountMenu() {
  const router = useRouter();
  const { user } = useAuth();

  const displayName =
    user?.fullName?.trim() && user.fullName !== user.email
      ? user.fullName
      : user?.email ?? "";

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearAuth();
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full ring-offset-background transition-shadow hover:ring-2 hover:ring-violet-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
          aria-label="Account menu"
        >
          <UserAvatar
            userId={user?.id}
            name={displayName}
            avatarUrl={user?.avatarUrl}
            className="h-8 w-8 rounded-full"
            fallbackClassName="gradient-bg text-white text-[11px] font-bold"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
          <UserAvatar
            userId={user?.id}
            name={displayName}
            avatarUrl={user?.avatarUrl}
            className="h-9 w-9 rounded-full"
            fallbackClassName="gradient-bg text-white text-xs font-bold"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{displayName}</p>
            <p className="truncate text-[11px] font-normal text-muted-foreground">
              {user?.email}
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
          data-cy="logout-button"
          onSelect={() => void handleLogout()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

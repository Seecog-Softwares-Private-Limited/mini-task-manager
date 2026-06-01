"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getStoredToken } from "@/services/api/client";
import { fetchCurrentUserProfile } from "@/services/api/users.api";
import type { LoginResponse } from "@/types/api";

type User = LoginResponse["user"];

/** Roles from backend (TenantGuard sets request.user.roles). Not in JWT yet; extend when backend adds. */
export type AppRole = "owner" | "admin" | "member";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const loadFromStorage = useCallback(() => {
    const t = getStoredToken();
    setToken(t);
    if (!t) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const payload = JSON.parse(atob(t.split(".")[1] ?? "{}")) as {
        sub?: string;
        email?: string;
        roles?: string[];
      };
      if (payload.sub && payload.email) {
        setUser({
          id: payload.sub,
          email: payload.email,
          fullName: payload.email,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
    setReady(true);
  }, []);

  const mergeUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : null));
  }, []);

  const refreshProfile = useCallback(async () => {
    const t = getStoredToken();
    if (!t) return;
    try {
      const p = await fetchCurrentUserProfile();
      if (p) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                fullName: p.fullName,
                email: p.email,
                avatarUrl: p.avatarUrl,
                isPlatformAdmin: p.isPlatformAdmin,
              }
            : {
                id: p.id,
                email: p.email,
                fullName: p.fullName,
                avatarUrl: p.avatarUrl,
                isPlatformAdmin: p.isPlatformAdmin,
              }
        );
      }
    } catch {
      /* offline or 401 — keep JWT-derived user */
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
    const handler = () => loadFromStorage();
    window.addEventListener("auth:logout", handler);
    window.addEventListener("auth:login", handler);
    return () => {
      window.removeEventListener("auth:logout", handler);
      window.removeEventListener("auth:login", handler);
    };
  }, [loadFromStorage]);

  useEffect(() => {
    if (!token) return;
    void refreshProfile();
  }, [token, refreshProfile]);

  const roles: AppRole[] = useMemo(() => {
    if (!token) return [];
    try {
      const payload = JSON.parse(atob(token.split(".")[1] ?? "{}")) as { roles?: string[] };
      const r = payload.roles ?? [];
      return r.filter((x): x is AppRole => x === "owner" || x === "admin" || x === "member");
    } catch {
      return [];
    }
  }, [token]);

  const hasRole = useCallback(
    (role: AppRole) => roles.includes(role),
    [roles]
  );

  /** True if user can manage billing (OWNER or ADMIN). Hide billing nav for MEMBER. */
  const canManageBilling = useMemo(
    () => hasRole("owner") || hasRole("admin"),
    [hasRole]
  );

  return {
    user,
    token,
    isAuthenticated: !!token,
    ready,
    roles,
    hasRole,
    canManageBilling,
    refreshProfile,
    mergeUser,
  };
}

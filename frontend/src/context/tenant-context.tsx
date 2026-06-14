"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getStoredOrgId, setStoredOrgId } from "@/services/api/client";
import { fetchOrganizations } from "@/services/api/organizations.api";

type TenantContextValue = {
  orgId: string | null;
  setOrgId: (id: string | null) => void;
  ready: boolean;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [orgId, setOrgIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredOrgId();
    if (stored) {
      setOrgIdState(stored);
      setReady(true);
    } else {
      // No workspace stored — auto-select the first one on login
      fetchOrganizations()
        .then((orgs) => {
          if (orgs.length > 0) {
            setStoredOrgId(orgs[0].id);
            setOrgIdState(orgs[0].id);
          }
        })
        .catch(() => {/* not logged in yet, ignore */})
        .finally(() => setReady(true));
    }
  }, []);

  useEffect(() => {
    const handler = () => setOrgIdState(getStoredOrgId());
    window.addEventListener("auth:orgInvalid", handler);
    return () => window.removeEventListener("auth:orgInvalid", handler);
  }, []);

  const setOrgId = useCallback((id: string | null) => {
    setStoredOrgId(id);
    setOrgIdState(id);
  }, []);

  return (
    <TenantContext.Provider value={{ orgId, setOrgId, ready }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}

/** Routes that require a tenant workspace (header `X-Organization-Id`) to be set. */
export const TENANT_REQUIRED_PATHS = [
  "/dashboard/projects",
  "/dashboard/tasks",
  "/dashboard/recurring-tasks",
  "/dashboard/billing",
  "/dashboard/activity",
];

export function isTenantRequiredPath(pathname: string): boolean {
  return TENANT_REQUIRED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

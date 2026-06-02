"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { LimitExceededErrorBody } from "@/services/api/user-plans.api";
import { UpgradePlanModal } from "@/components/UpgradePlanModal";

type UpgradePlanModalContextValue = {
  openLimitExceeded: (detail: LimitExceededErrorBody) => void;
  close: () => void;
};

const UpgradePlanModalContext = createContext<UpgradePlanModalContextValue | null>(null);

export function UpgradePlanModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<LimitExceededErrorBody | null>(null);

  const openLimitExceeded = useCallback((d: LimitExceededErrorBody) => {
    setDetail(d);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setDetail(null);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<LimitExceededErrorBody>;
      if (custom.detail?.error === "LIMIT_EXCEEDED") {
        openLimitExceeded(custom.detail);
      }
    };
    window.addEventListener("plans:limitExceeded", handler);
    return () => window.removeEventListener("plans:limitExceeded", handler);
  }, [openLimitExceeded]);

  return (
    <UpgradePlanModalContext.Provider value={{ openLimitExceeded, close }}>
      {children}
      <UpgradePlanModal open={open} onOpenChange={setOpen} detail={detail} onClose={close} />
    </UpgradePlanModalContext.Provider>
  );
}

export function useUpgradePlanModal() {
  const ctx = useContext(UpgradePlanModalContext);
  if (!ctx) {
    throw new Error("useUpgradePlanModal must be used within UpgradePlanModalProvider");
  }
  return ctx;
}

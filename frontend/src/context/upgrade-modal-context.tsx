"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type UpgradeModalContextValue = {
  open: boolean;
  openUpgradeModal: (reason?: "limit" | "trial" | "general") => void;
  closeUpgradeModal: () => void;
};

const UpgradeModalContext = createContext<UpgradeModalContextValue | null>(null);

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openUpgradeModal = useCallback((_reason?: "limit" | "trial" | "general") => {
    setOpen(true);
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("billing:limitExceeded", handler);
    return () => window.removeEventListener("billing:limitExceeded", handler);
  }, []);
  const closeUpgradeModal = useCallback(() => setOpen(false), []);
  const value: UpgradeModalContextValue = {
    open,
    openUpgradeModal,
    closeUpgradeModal,
  };
  return (
    <UpgradeModalContext.Provider value={value}>
      {children}
    </UpgradeModalContext.Provider>
  );
}

export function useUpgradeModal() {
  const ctx = useContext(UpgradeModalContext);
  if (!ctx) throw new Error("useUpgradeModal must be used within UpgradeModalProvider");
  return ctx;
}

export function useUpgradeModalOptional(): UpgradeModalContextValue | null {
  return useContext(UpgradeModalContext);
}

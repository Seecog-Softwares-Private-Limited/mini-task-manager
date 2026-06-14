"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { clearAuth } from "@/services/api/client";
import { Clock, LogIn } from "lucide-react";

export function SessionExpiredModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const previousPathRef = useRef<string>("");

  useEffect(() => {
    const handler = () => {
      const pathname = typeof window !== "undefined" ? window.location.pathname : "";
      previousPathRef.current = pathname;
      const isPublicRoute =
        pathname === "/login" ||
        pathname === "/signup" ||
        pathname === "/verify-email" ||
        pathname === "/forgot-password" ||
        pathname === "/reset-password" ||
        pathname.startsWith("/invite");
      if (!isPublicRoute) {
        setOpen(true);
      }
    };
    window.addEventListener("auth:sessionExpired", handler);
    return () => window.removeEventListener("auth:sessionExpired", handler);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    clearAuth();
    const from = previousPathRef.current || "/dashboard";
    router.replace("/login?from=" + encodeURIComponent(from));
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleClose]);

  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) buttonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-desc"
    >
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-premium-lg animate-scale-in overflow-hidden">
        <div className="bg-amber-500/10 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20">
            <Clock className="h-7 w-7 text-amber-500" />
          </div>
        </div>
        <div className="p-6 text-center">
          <h2 id="session-expired-title" className="text-lg font-bold">
            Session Expired
          </h2>
          <p id="session-expired-desc" className="mt-2 text-sm text-muted-foreground">
            Your session has expired. Please log in again to continue.
          </p>
          <Button ref={buttonRef} onClick={handleClose} className="mt-6 w-full">
            <LogIn className="mr-2 h-4 w-4" /> Log In Again
          </Button>
        </div>
      </div>
    </div>
  );
}

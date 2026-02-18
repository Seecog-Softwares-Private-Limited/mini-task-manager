"use client";

import { useGlobalError } from "@/context/error-context";
import { AlertTriangle, X } from "lucide-react";

export function ErrorBanner5xx() {
  const { error, clearError } = useGlobalError();
  const is5xx = error?.statusCode != null && error.statusCode >= 500;
  if (!error || !is5xx) return null;

  return (
    <div
      role="alert"
      className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-center gap-3 border-b border-destructive/30 bg-gradient-to-r from-destructive/10 via-destructive/5 to-destructive/10 px-4 py-3 text-sm backdrop-blur-sm"
    >
      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
      <span>
        <span className="font-semibold">Server error.</span> {error.message}
      </span>
      <button
        type="button"
        onClick={clearError}
        className="ml-1 rounded-full p-1 hover:bg-destructive/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Dismiss error"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

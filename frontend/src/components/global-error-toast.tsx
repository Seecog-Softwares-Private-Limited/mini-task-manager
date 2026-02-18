"use client";

import { useGlobalError } from "@/context/error-context";
import { cn } from "@/lib/utils";

export function GlobalErrorToast() {
  const { error, clearError } = useGlobalError();
  if (!error) return null;

  return (
    <div
      role="alert"
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-md rounded-lg border px-4 py-3 shadow-lg",
        error.isRateLimited
          ? "border-amber-500/50 bg-amber-50 dark:bg-amber-950/30"
          : error.isNetwork
            ? "border-orange-500/50 bg-orange-50 dark:bg-orange-950/30"
            : "border-destructive/50 bg-destructive/10"
      )}
    >
      <p className="text-sm font-medium">
        {error.isRateLimited
          ? "Too many requests. Please try again later."
          : error.isNetwork
            ? "Network error. Check your connection and try again."
            : error.message}
      </p>
      <button
        type="button"
        onClick={clearError}
        className="mt-2 text-xs underline focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Dismiss
      </button>
    </div>
  );
}

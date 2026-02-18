"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { isNetworkError } from "@/lib/error";

interface NetworkFallbackProps {
  error: unknown;
  retry: () => void;
  children: ReactNode;
}

/** Renders children or a network-failure message with retry when error is a network error. */
export function NetworkFallback({ error, retry, children }: NetworkFallbackProps) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (offline || isNetworkError(error)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <p className="font-medium">Connection problem</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Check your network and try again.
        </p>
        <Button className="mt-4" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}

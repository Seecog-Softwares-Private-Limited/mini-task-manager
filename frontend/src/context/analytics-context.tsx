"use client";

import { createContext, useMemo, type ReactNode } from "react";
import { createPipeline, createConsoleProvider } from "@/lib/analytics";
import type { AnalyticsEvent } from "@/lib/analytics/events";
import { getStoredToken } from "@/services/api/client";

export type { AnalyticsEvent };

export type AnalyticsTracker = {
  track: (event: AnalyticsEvent, properties?: Record<string, unknown>) => void;
};

function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  const t = getStoredToken();
  if (!t) return null;
  try {
    const payload = JSON.parse(atob(t.split(".")[1] ?? "{}")) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

const defaultPipeline = createPipeline({
  providers: [createConsoleProvider()],
  getUserId,
});

const defaultTracker: AnalyticsTracker = {
  track: (event, properties) => defaultPipeline.track(event, properties),
};

const AnalyticsContext = createContext<AnalyticsTracker>(defaultTracker);

export { AnalyticsContext };

type AnalyticsProviderProps = {
  children: ReactNode;
  /** Optional: inject your tracker (e.g. from createPipeline with Segment/Mixpanel/Custom). */
  tracker?: AnalyticsTracker;
};

export function AnalyticsProvider({ children, tracker }: AnalyticsProviderProps) {
  const value = useMemo(() => tracker ?? defaultTracker, [tracker]);
  return (
    <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
  );
}

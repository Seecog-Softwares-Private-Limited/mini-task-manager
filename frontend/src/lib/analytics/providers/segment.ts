import type { AnalyticsProvider, AnalyticsPayload } from "./types";

/**
 * Segment adapter. Use when window.analytics (Segment snippet) is loaded.
 * No vendor lock-in: this is one of many provider options.
 */
export function createSegmentProvider(): AnalyticsProvider {
  return {
    name: "segment",
    track: (payload: AnalyticsPayload) => {
      if (typeof window === "undefined") return;
      const w = window as Window & { analytics?: { track: (e: string, p?: Record<string, unknown>) => void } };
      w.analytics?.track(payload.event, { ...payload.properties, timestamp: payload.timestamp });
    },
    identify: (userId: string, traits?: Record<string, unknown>) => {
      if (typeof window === "undefined") return;
      const w = window as Window & { analytics?: { identify: (id: string, t?: Record<string, unknown>) => void } };
      w.analytics?.identify(userId, traits);
    },
  };
}

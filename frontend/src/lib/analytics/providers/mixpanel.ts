import type { AnalyticsProvider, AnalyticsPayload } from "./types";

/**
 * Mixpanel adapter. Use when window.mixpanel is loaded.
 * No vendor lock-in: this is one of many provider options.
 */
export function createMixpanelProvider(): AnalyticsProvider {
  return {
    name: "mixpanel",
    track: (payload: AnalyticsPayload) => {
      if (typeof window === "undefined") return;
      const w = window as Window & { mixpanel?: { track: (e: string, p?: Record<string, unknown>) => void } };
      w.mixpanel?.track(payload.event, payload.properties);
    },
    identify: (userId: string) => {
      if (typeof window === "undefined") return;
      const w = window as Window & { mixpanel?: { identify: (id: string) => void } };
      w.mixpanel?.identify(userId);
    },
  };
}

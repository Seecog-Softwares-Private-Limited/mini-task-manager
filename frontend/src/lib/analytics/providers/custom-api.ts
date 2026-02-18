import type { AnalyticsProvider, AnalyticsPayload } from "./types";

/**
 * Sends events to a custom API endpoint. No vendor lock-in.
 * Configure endpoint via env: NEXT_PUBLIC_ANALYTICS_API_URL
 */
export function createCustomApiProvider(): AnalyticsProvider {
  const url = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_ANALYTICS_API_URL as string) : undefined;

  return {
    name: "custom-api",
    track: (payload: AnalyticsPayload) => {
      if (!url) return;
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: payload.event,
          properties: payload.properties ?? {},
          timestamp: payload.timestamp ?? new Date().toISOString(),
          userId: payload.userId,
          anonymousId: payload.anonymousId,
        }),
      }).catch(() => {});
    },
  };
}

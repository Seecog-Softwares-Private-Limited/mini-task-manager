import type { AnalyticsProvider, AnalyticsPayload } from "./types";

export function createConsoleProvider(): AnalyticsProvider {
  return {
    name: "console",
    track: (payload: AnalyticsPayload) => {
      if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
        console.debug("[Analytics]", payload.event, payload.properties);
      }
    },
  };
}

/**
 * Event pipeline: fan-out to multiple providers. No vendor lock-in.
 */

import type { AnalyticsPayload } from "./providers/types";
import type { AnalyticsProvider } from "./providers/types";

export type PipelineConfig = {
  providers: AnalyticsProvider[];
  getUserId?: () => string | null;
  getAnonymousId?: () => string | null;
};

export function createPipeline(config: PipelineConfig) {
  const { providers, getUserId, getAnonymousId } = config;

  return {
    track: (event: AnalyticsPayload["event"], properties?: Record<string, unknown>) => {
      const payload: AnalyticsPayload = {
        event,
        properties,
        timestamp: new Date().toISOString(),
        userId: getUserId?.() ?? undefined,
        anonymousId: getAnonymousId?.() ?? undefined,
      };
      providers.forEach((p) => {
        try {
          p.track(payload);
        } catch (_) {}
      });
    },
    identify: (userId: string, traits?: Record<string, unknown>) => {
      providers.forEach((p) => {
        try {
          p.identify?.(userId, traits);
        } catch (_) {}
      });
    },
  };
}

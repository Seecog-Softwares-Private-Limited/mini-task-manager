/**
 * Analytics provider interface. Implement for Console, Segment, Mixpanel, Custom API.
 */

import type { AnalyticsEvent } from "../events";

export type AnalyticsPayload = {
  event: AnalyticsEvent;
  properties?: Record<string, unknown>;
  timestamp?: string;
  userId?: string;
  anonymousId?: string;
};

export type AnalyticsProvider = {
  name: string;
  track: (payload: AnalyticsPayload) => void | Promise<void>;
  identify?: (userId: string, traits?: Record<string, unknown>) => void | Promise<void>;
};

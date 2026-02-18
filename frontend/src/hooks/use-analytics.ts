"use client";

import { useContext } from "react";
import { AnalyticsContext, type AnalyticsTracker } from "@/context/analytics-context";

/**
 * Returns the analytics tracker. Defaults to no-op (dev: console.debug).
 * Wrap app with AnalyticsProvider and pass a tracker to plug in Segment, Mixpanel, GA4, etc.
 */
export function useAnalytics(): AnalyticsTracker {
  return useContext(AnalyticsContext);
}

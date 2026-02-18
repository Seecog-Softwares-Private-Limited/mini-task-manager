"use client";

import { useCallback } from "react";
import { useOnboardingOptional } from "@/context/onboarding-context";
import { useAnalytics } from "@/hooks/use-analytics";

/**
 * Centralized retention event tracking. Call from success handlers when:
 * - First task is created → trackFirstTaskCreated()
 * - A member is invited → trackInvitedMember()
 * Marks onboarding steps and fires analytics; when all 3 steps are done, fires workspace_completed.
 */
export function useRetentionTracking() {
  const onboarding = useOnboardingOptional();
  const analytics = useAnalytics();

  const trackFirstTaskCreated = useCallback(() => {
    onboarding?.markStepCompleted("task");
    analytics.track("first_task_created", {});
    const state = onboarding?.state;
    if (state?.stepCompleted.project && state?.stepCompleted.member) {
      analytics.track("workspace_completed", {});
    }
  }, [onboarding, analytics]);

  const trackInvitedMember = useCallback(() => {
    onboarding?.markStepCompleted("member");
    analytics.track("invited_member", {});
  }, [onboarding, analytics]);

  return { trackFirstTaskCreated, trackInvitedMember };
}

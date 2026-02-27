"use client";

import { useEffect, useRef } from "react";
import { usePlanOptional } from "@/context/plan-context";
import { useFeatureGate } from "@/hooks/use-feature-gate";
import { useNotificationsOptional } from "@/context/notifications-context";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Seeds system notifications for trial ending soon and limit approaching.
 * Call once when dashboard is loaded (e.g. in layout or dashboard page).
 */
export function useNotificationSeed(projectCount: number) {
  const plan = usePlanOptional();
  const notifications = useNotificationsOptional();
  const projectGate = useFeatureGate("projects", projectCount);
  const seeded = useRef({ trial: false, limit: false });

  useEffect(() => {
    if (!notifications) return;

    if (plan?.isTrial && plan.trialEndsAt && !seeded.current.trial) {
      const days = Math.ceil((plan.trialEndsAt.getTime() - Date.now()) / MS_PER_DAY);
      if (days <= 7 && days > 0) {
        seeded.current.trial = true;
        notifications.addNotification?.({
          title: "Trial ending soon",
          message: `Your trial ends in ${days} day${days === 1 ? "" : "s"}. Upgrade to keep access.`,
        });
      }
    }

    if (projectGate.showUpgrade && projectGate.limit != null && !seeded.current.limit) {
      const pct = Math.round((projectCount / projectGate.limit) * 100);
      if (pct >= 80) {
        seeded.current.limit = true;
        notifications.addNotification?.({
          title: "Project limit approaching",
          message: `You've used ${projectCount} of ${projectGate.limit} projects. Upgrade for more.`,
        });
      }
    }
  }, [plan?.isTrial, plan?.trialEndsAt, projectGate.showUpgrade, projectGate.limit, projectCount, notifications]);
}

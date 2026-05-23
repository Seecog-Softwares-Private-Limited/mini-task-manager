/**
 * Product intelligence event taxonomy. No vendor lock-in: map to Segment/Mixpanel/Custom as needed.
 */

/** Activation funnel steps (ordered). */
export const ACTIVATION_FUNNEL_STEPS = [
  "signup",
  "first_project_created",
  "invited_member",
  "first_task_created",
  "workspace_completed",
] as const;

export type ActivationFunnelStep = (typeof ACTIVATION_FUNNEL_STEPS)[number];

/** All trackable events. */
export type AnalyticsEvent =
  | "signup"
  | "project_created"
  | "project_updated"
  | "task_created"
  | "plan_upgrade_clicked"
  | "upgrade_success"
  | "limit_reached"
  | "first_project_created"
  | "first_task_created"
  | "invited_member"
  | "workspace_completed"
  | "onboarding_skipped"
  | "trial_converted"
  | "org_active_daily"
  | "org_active_weekly"
  | "org_churned";

/** Conversion pairs for funnel analysis. */
export const CONVERSION_PAIRS: { from: AnalyticsEvent; to: AnalyticsEvent }[] = [
  { from: "plan_upgrade_clicked", to: "upgrade_success" },
  { from: "signup", to: "trial_converted" },
];

/** Events that represent funnel step completion. */
export const FUNNEL_STEP_EVENTS: Record<ActivationFunnelStep, AnalyticsEvent> = {
  signup: "signup",
  first_project_created: "first_project_created",
  invited_member: "invited_member",
  first_task_created: "first_task_created",
  workspace_completed: "workspace_completed",
};

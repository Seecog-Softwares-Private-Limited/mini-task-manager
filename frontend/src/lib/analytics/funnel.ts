/**
 * Activation funnel: completion percentage and step index.
 * Funnel: signup → first_project_created → invited_member → first_task_created → workspace_completed
 */

import { ACTIVATION_FUNNEL_STEPS, type ActivationFunnelStep } from "./events";

export type FunnelState = Partial<Record<ActivationFunnelStep, boolean>>;

/**
 * Returns the last completed step index (0-based). -1 if none.
 */
export function getFunnelStepIndex(state: FunnelState): number {
  for (let i = ACTIVATION_FUNNEL_STEPS.length - 1; i >= 0; i--) {
    const step = ACTIVATION_FUNNEL_STEPS[i];
    if (state[step]) return i;
  }
  return -1;
}

/**
 * Completion percentage 0..100. 100 when workspace_completed is true.
 */
export function getFunnelCompletionPercentage(state: FunnelState): number {
  if (state.workspace_completed) return 100;
  const completed = ACTIVATION_FUNNEL_STEPS.filter((s) => state[s]).length;
  return Math.round((completed / ACTIVATION_FUNNEL_STEPS.length) * 100);
}

/**
 * Next step in funnel, or null if complete.
 */
export function getNextFunnelStep(state: FunnelState): ActivationFunnelStep | null {
  for (const step of ACTIVATION_FUNNEL_STEPS) {
    if (!state[step]) return step;
  }
  return null;
}

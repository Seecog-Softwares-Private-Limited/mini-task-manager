/**
 * Onboarding state per organization. Persisted in localStorage.
 * Used to drive first-time setup flow and workspace progress.
 */

const PREFIX = "mini_tm_onboarding_";

export type OnboardingStep = "project" | "member" | "task";

export type OnboardingState = {
  stepCompleted: Record<OnboardingStep, boolean>;
  skipped: boolean;
  completedAt: string | null;
  lastSeenStep: number; // 0..2
};

const defaultState: OnboardingState = {
  stepCompleted: { project: false, member: false, task: false },
  skipped: false,
  completedAt: null,
  lastSeenStep: 0,
};

export function getOnboardingState(orgId: string | null): OnboardingState {
  if (typeof window === "undefined" || !orgId) return defaultState;
  try {
    const raw = localStorage.getItem(PREFIX + orgId);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      stepCompleted: { ...defaultState.stepCompleted, ...parsed.stepCompleted },
      skipped: parsed.skipped ?? false,
      completedAt: parsed.completedAt ?? null,
      lastSeenStep: Math.max(0, Math.min(2, parsed.lastSeenStep ?? 0)),
    };
  } catch {
    return defaultState;
  }
}

export function setOnboardingState(
  orgId: string | null,
  update: Partial<OnboardingState> | ((prev: OnboardingState) => Partial<OnboardingState>)
): void {
  if (typeof window === "undefined" || !orgId) return;
  const prev = getOnboardingState(orgId);
  const next = typeof update === "function" ? update(prev) : update;
  const merged: OnboardingState = {
    ...prev,
    ...next,
    stepCompleted: { ...prev.stepCompleted, ...next.stepCompleted },
  };
  localStorage.setItem(PREFIX + orgId, JSON.stringify(merged));
}

export function markStepCompleted(orgId: string | null, step: OnboardingStep): void {
  setOnboardingState(orgId, (prev) => ({
    stepCompleted: { ...prev.stepCompleted, [step]: true },
    completedAt:
      step === "task" && prev.stepCompleted.project && prev.stepCompleted.member
        ? new Date().toISOString()
        : prev.completedAt,
  }));
}

export function markOnboardingSkipped(orgId: string | null): void {
  setOnboardingState(orgId, { skipped: true });
}

export function setOnboardingSeenStep(orgId: string | null, stepIndex: number): void {
  setOnboardingState(orgId, { lastSeenStep: Math.max(0, Math.min(2, stepIndex)) });
}

/** Progress 0..100 for workspace setup (project + member + task). */
export function getWorkspaceProgress(state: OnboardingState): number {
  if (state.skipped || state.completedAt) return 100;
  const done = [state.stepCompleted.project, state.stepCompleted.member, state.stepCompleted.task].filter(Boolean).length;
  return Math.round((done / 3) * 100);
}

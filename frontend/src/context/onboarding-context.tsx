"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTenant } from "@/context/tenant-context";
import {
  getOnboardingState,
  setOnboardingState,
  markStepCompleted as markStepCompletedStorage,
  markOnboardingSkipped,
  setOnboardingSeenStep,
  getWorkspaceProgress,
  type OnboardingState,
  type OnboardingStep,
} from "@/lib/onboarding-storage";

type OnboardingContextValue = {
  state: OnboardingState;
  progress: number;
  isFirstTime: boolean;
  currentStepIndex: number;
  markStepCompleted: (step: OnboardingStep) => void;
  skip: () => void;
  setSeenStep: (index: number) => void;
  refresh: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { orgId } = useTenant();
  const [state, setState] = useState<OnboardingState>(() =>
    typeof window !== "undefined" ? getOnboardingState(orgId) : getOnboardingState(null)
  );

  const refresh = useCallback(() => {
    setState(getOnboardingState(orgId));
  }, [orgId]);

  useEffect(() => {
    setState(getOnboardingState(orgId));
  }, [orgId]);

  const markStepCompleted = useCallback(
    (step: OnboardingStep) => {
      markStepCompletedStorage(orgId, step);
      refresh();
    },
    [orgId, refresh]
  );

  const skip = useCallback(() => {
    markOnboardingSkipped(orgId);
    refresh();
  }, [orgId, refresh]);

  const setSeenStep = useCallback(
    (index: number) => {
      setOnboardingSeenStep(orgId, index);
      refresh();
    },
    [orgId, refresh]
  );

  const progress = useMemo(() => getWorkspaceProgress(state), [state]);
  const isFirstTime =
    !!orgId &&
    !state.skipped &&
    !state.completedAt &&
    (!state.stepCompleted.project || !state.stepCompleted.member || !state.stepCompleted.task);
  const currentStepIndex = state.lastSeenStep;

  const value: OnboardingContextValue = useMemo(
    () => ({
      state,
      progress,
      isFirstTime,
      currentStepIndex,
      markStepCompleted,
      skip,
      setSeenStep,
      refresh,
    }),
    [state, progress, isFirstTime, currentStepIndex, markStepCompleted, skip, setSeenStep, refresh]
  );

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}

export function useOnboardingOptional() {
  return useContext(OnboardingContext);
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTenant } from "@/context/tenant-context";
import { fetchWorkspaceProgress } from "@/services/api/organizations.api";
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
  const reconciledRef = useRef<string | null>(null);

  const refresh = useCallback(() => {
    setState(getOnboardingState(orgId));
  }, [orgId]);

  useEffect(() => {
    setState(getOnboardingState(orgId));
  }, [orgId]);

  /**
   * Auto-reconcile: fetch actual data from the backend and mark any
   * steps whose data already exists but localStorage missed.
   * Runs once per orgId to avoid repeated calls.
   */
  useEffect(() => {
    if (!orgId || reconciledRef.current === orgId) return;
    const current = getOnboardingState(orgId);
    // Skip if user explicitly skipped
    if (current.skipped) {
      reconciledRef.current = orgId;
      return;
    }

    let cancelled = false;
    fetchWorkspaceProgress(orgId)
      .then((progress) => {
        if (cancelled) return;
        reconciledRef.current = orgId;
        let changed = false;
        if (progress.hasProjects && !current.stepCompleted.project) {
          markStepCompletedStorage(orgId, "project");
          changed = true;
        }
        if (progress.hasMembers && !current.stepCompleted.member) {
          markStepCompletedStorage(orgId, "member");
          changed = true;
        }
        if (progress.hasTasks && !current.stepCompleted.task) {
          markStepCompletedStorage(orgId, "task");
          changed = true;
        }
        // If completedAt was set prematurely but not all steps are actually done,
        // clear it so the wizard can show again.
        const updated = getOnboardingState(orgId);
        const allActuallyDone = updated.stepCompleted.project && updated.stepCompleted.member && updated.stepCompleted.task;
        if (updated.completedAt && !allActuallyDone) {
          setOnboardingState(orgId, { completedAt: null });
          changed = true;
        }
        if (changed) {
          setState(getOnboardingState(orgId));
        }
      })
      .catch(() => {
        // Silently ignore - reconciliation is best-effort
      });

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  /**
   * Poll workspace progress when member step is incomplete, so we detect when
   * an invitee accepts (status becomes ACTIVE). hasMembers is true only when
   * there are >1 ACTIVE members.
   */
  useEffect(() => {
    if (!orgId) return;
    const current = getOnboardingState(orgId);
    if (current.skipped || current.stepCompleted.member) return;

    const poll = () => {
      fetchWorkspaceProgress(orgId)
        .then((progress) => {
          if (progress.hasMembers) {
            markStepCompletedStorage(orgId, "member");
            setState(getOnboardingState(orgId));
          }
        })
        .catch(() => {});
    };

    const id = setInterval(poll, 15000);
    poll(); // run immediately
    return () => clearInterval(id);
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

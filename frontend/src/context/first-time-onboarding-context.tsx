"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOnboardingStatus,
  markOnboardingComplete,
} from "@/services/api/onboarding.api";

export type FirstTimeOnboardingStatus = {
  hasOrganizations: boolean;
  onboardingCompletedAt: string | null;
};

export type FirstTimeOnboardingContextValue = {
  status: FirstTimeOnboardingStatus | null;
  isLoading: boolean;
  shouldShowOnboarding: boolean;
  trigger: () => void;
  completeOnboarding: () => Promise<void>;
};

const FirstTimeOnboardingContext = createContext<FirstTimeOnboardingContextValue | null>(null);

export function FirstTimeOnboardingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [triggerCount, setTriggerCount] = useState(0);

  const isOnDashboard = pathname?.startsWith("/dashboard");

  const { data: status = null, isLoading } = useQuery({
    queryKey: ["onboarding-status", triggerCount],
    queryFn: fetchOnboardingStatus,
    enabled: isOnDashboard,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      const statusCode = (error as { response?: { status?: number } })?.response?.status;
      if (statusCode === 401) return false;
      return failureCount < 2;
    },
  });

  const completeMutation = useMutation({
    mutationFn: markOnboardingComplete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      setTriggerCount((c) => c + 1);
    },
  });

  const trigger = useCallback(() => {
    setTriggerCount((c) => c + 1);
  }, []);

  const completeOnboarding = useCallback(async () => {
    await completeMutation.mutateAsync();
  }, [completeMutation]);

  const shouldShowOnboarding =
    !isLoading &&
    status !== null &&
    !status.hasOrganizations;

  const value: FirstTimeOnboardingContextValue = {
    status,
    isLoading,
    shouldShowOnboarding,
    trigger,
    completeOnboarding,
  };

  return (
    <FirstTimeOnboardingContext.Provider value={value}>
      {children}
    </FirstTimeOnboardingContext.Provider>
  );
}

export function useFirstTimeOnboarding() {
  const ctx = useContext(FirstTimeOnboardingContext);
  if (!ctx) throw new Error("useFirstTimeOnboarding must be used within FirstTimeOnboardingProvider");
  return ctx;
}

export function useFirstTimeOnboardingOptional() {
  return useContext(FirstTimeOnboardingContext);
}

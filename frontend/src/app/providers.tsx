"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { ErrorProvider } from "@/context/error-context";
import { TenantProvider } from "@/context/tenant-context";
import { PlanProvider } from "@/context/plan-context";
import { UpgradeModalProvider } from "@/context/upgrade-modal-context";
import { OnboardingProvider } from "@/context/onboarding-context";
import { NotificationsProvider } from "@/context/notifications-context";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalErrorToast } from "@/components/global-error-toast";
import { ErrorBanner5xx } from "@/components/error-banner-5xx";
import { Toaster } from "@/components/ui/toaster";
import { SessionExpiredModal } from "@/components/session-expired-modal";
import { UpgradeModal } from "@/components/upgrade-modal";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error) => {
              const status = (error as { response?: { status?: number } })?.response?.status;
              if (status === 401 || status === 403 || status === 429) return false;
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 10000),
          },
        },
      })
  );
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
        <QueryClientProvider client={queryClient}>
          <ErrorProvider>
            <TenantProvider>
              <PlanProvider>
                <UpgradeModalProvider>
                  <OnboardingProvider>
                    <NotificationsProvider>
                      {children}
                      <UpgradeModal />
                      <OnboardingFlow />
                    </NotificationsProvider>
                  </OnboardingProvider>
                  <ErrorBanner5xx />
                  <GlobalErrorToast />
                  <Toaster />
                  <SessionExpiredModal />
                </UpgradeModalProvider>
              </PlanProvider>
            </TenantProvider>
          </ErrorProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

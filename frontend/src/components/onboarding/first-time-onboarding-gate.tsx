"use client";

import { usePathname } from "next/navigation";
import { useFirstTimeOnboardingOptional } from "@/context/first-time-onboarding-context";
import { FirstTimeOnboardingStepper } from "./first-time-onboarding-stepper";

/** Renders the first-time onboarding stepper only when user has no orgs and hasn't completed onboarding. */
export function FirstTimeOnboardingGate() {
  const pathname = usePathname();
  const ctx = useFirstTimeOnboardingOptional();
  const isDashboard = pathname?.startsWith("/dashboard");
  if (!isDashboard || !ctx?.shouldShowOnboarding) return null;
  return <FirstTimeOnboardingStepper />;
}

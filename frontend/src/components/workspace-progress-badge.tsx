"use client";

import Link from "next/link";
import { useOnboardingOptional } from "@/context/onboarding-context";
import { cn } from "@/lib/utils";

export function WorkspaceProgressBadge({ className }: { className?: string }) {
  const onboarding = useOnboardingOptional();
  if (!onboarding || onboarding.progress >= 100) return null;

  return (
    <Link
      href="/dashboard"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted",
        className
      )}
      title="Complete setup"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
      Workspace setup {onboarding.progress}%
    </Link>
  );
}

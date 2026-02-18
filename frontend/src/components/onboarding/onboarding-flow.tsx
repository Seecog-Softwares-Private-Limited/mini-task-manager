"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useOnboarding } from "@/context/onboarding-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Rocket, X, Check, ArrowRight, FolderKanban, Users, ListTodo } from "lucide-react";

const STEPS = [
  { id: "project" as const, title: "Create your first project", cta: "Create project", href: "/dashboard/projects", icon: FolderKanban },
  { id: "member" as const, title: "Invite a team member", cta: "Invite member", href: "/dashboard/organizations", icon: Users },
  { id: "task" as const, title: "Create your first task", cta: "Create task", href: "/dashboard/tasks", icon: ListTodo },
];

export function OnboardingFlow() {
  const { state, isFirstTime, currentStepIndex, setSeenStep, skip } = useOnboarding();
  const analytics = useAnalytics();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isFirstTime) return;
    closeRef.current?.focus();
  }, [isFirstTime]);

  if (!isFirstTime) return null;

  const current = STEPS[currentStepIndex];
  const completedCount = STEPS.filter((_, i) => state.stepCompleted[STEPS[i].id]).length;
  const progressPct = (completedCount / 3) * 100;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      data-cy="onboarding-modal"
    >
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-premium-lg animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="gradient-bg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Rocket className="h-5 w-5" />
              </div>
              <h2 id="onboarding-title" className="text-lg font-bold">
                Get Started
              </h2>
            </div>
            <Button
              ref={closeRef}
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => {
                analytics.track("onboarding_skipped", { at_step: currentStepIndex });
                skip();
              }}
            >
              Skip
            </Button>
          </div>
          <p className="mt-2 text-sm text-white/70">
            Complete these steps to get the most out of your workspace.
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-white/50">{completedCount} of {STEPS.length} complete</p>
        </div>

        <div className="p-5 space-y-3">
          {STEPS.map((step, i) => {
            const done = state.stepCompleted[step.id];
            const active = i === currentStepIndex;
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 transition-all",
                  done && "border-emerald-500/20 bg-emerald-500/5",
                  active && !done && "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
                )}
              >
                {done ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 shrink-0">
                    <Check className="h-5 w-5 text-emerald-500" />
                  </div>
                ) : (
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl shrink-0",
                    active ? "gradient-bg text-white shadow-md shadow-primary/20" : "bg-muted"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1">
                  <p className={cn("font-semibold text-sm", done && "text-muted-foreground line-through")}>
                    {step.title}
                  </p>
                </div>
                {!done && (
                  <Button size="sm" variant={active ? "default" : "outline"} asChild>
                    <Link href={step.href} onClick={() => setSeenStep(i)} data-cy={`onboarding-step-${step.id}`}>
                      {step.cta} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

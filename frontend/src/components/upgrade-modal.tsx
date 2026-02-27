"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useUpgradeModal } from "@/context/upgrade-modal-context";
import { usePlan } from "@/context/plan-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/use-analytics";
import { Sparkles, X, ArrowRight, Check } from "lucide-react";

export function UpgradeModal() {
  const { open, closeUpgradeModal } = useUpgradeModal();
  const { plan, plans } = usePlan();
  const analytics = useAnalytics();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeUpgradeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeUpgradeModal]);

  useEffect(() => {
    if (open) analytics.track("plan_upgrade_clicked", { source: "modal" });
  }, [open, analytics]);

  if (!open) return null;

  const paidPlans = plans.filter(
    (p) => p.priceMonthly > 0
  );
  const currentPlanId = plan?.id;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      data-cy="upgrade-modal"
    >
      <div className="w-full max-w-lg rounded-2xl border bg-card shadow-premium-lg animate-scale-in overflow-hidden">
        {/* Header with gradient */}
        <div className="gradient-bg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 id="upgrade-modal-title" className="text-lg font-bold">
                Upgrade Your Plan
              </h2>
            </div>
            <Button
              ref={closeRef}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              onClick={closeUpgradeModal}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-sm text-white/70">
            {currentPlanId
              ? "You've reached a limit on your current plan. Upgrade for more."
              : "Choose a plan to unlock more projects and members."}
          </p>
        </div>

        <div className="p-6 space-y-3">
          {paidPlans.length > 0 ? (
            paidPlans.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 transition-all",
                  currentPlanId === p.id
                    ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
                    : "hover:border-primary/20 hover:bg-muted/30"
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{p.name}</p>
                    {p.isPopular && (
                      <span className="rounded-full bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">Popular</span>
                    )}
                    {currentPlanId === p.id && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Current</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    ₹{p.priceMonthly}/user/mo
                    {p.maxUsers != null && ` · ${p.maxUsers} users`}
                    {p.maxProjects != null && ` · ${p.maxProjects} projects`}
                  </p>
                </div>
                {currentPlanId === p.id ? (
                  <Check className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <Button size="sm" asChild>
                    <Link href="/dashboard/plans" onClick={closeUpgradeModal}>
                      Select <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No paid plans available. Contact support.
            </p>
          )}
        </div>

        <div className="border-t p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={closeUpgradeModal}>Close</Button>
          <Button asChild>
            <Link href="/dashboard/plans" onClick={closeUpgradeModal}>
              View Plans <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

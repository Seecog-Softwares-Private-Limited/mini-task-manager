"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { useUpgradeModal } from "@/context/upgrade-modal-context";
import { usePlan } from "@/context/plan-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/use-analytics";
import { Sparkles, X, ArrowRight, Check } from "lucide-react";

/** Above task detail / create-task modals (z-50–100) so limit prompts stay clickable. */
const UPGRADE_MODAL_Z = "z-[250]";

export function UpgradeModal() {
  const { open, closeUpgradeModal } = useUpgradeModal();
  const { plan, plans } = usePlan();
  const analytics = useAnalytics();

  useEffect(() => {
    if (open) analytics.track("plan_upgrade_clicked", { source: "modal" });
  }, [open, analytics]);

  const paidPlans = plans.filter((p) => p.priceMonthly > 0);
  const currentPlanId = plan?.id;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeUpgradeModal();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            UPGRADE_MODAL_Z,
            "fixed inset-0 bg-black/70 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <Dialog.Content
          className={cn(
            UPGRADE_MODAL_Z,
            "fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border bg-card shadow-premium-lg outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          aria-labelledby="upgrade-modal-title"
          data-cy="upgrade-modal"
        >
          <div className="overflow-hidden rounded-2xl">
            {/* Header with gradient */}
            <div className="gradient-bg p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <Dialog.Title id="upgrade-modal-title" className="text-lg font-bold">
                    Upgrade Your Plan
                  </Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
                    aria-label="Close upgrade dialog"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="mt-2 text-sm text-white/70">
                {currentPlanId
                  ? "You've reached a limit on your current plan. Upgrade for more."
                  : "Choose a plan to unlock more projects and members."}
              </Dialog.Description>
            </div>

            <div className="space-y-3 p-6">
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
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                            Popular
                          </span>
                        )}
                        {currentPlanId === p.id && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        ₹{p.priceMonthly}/user/mo
                        {p.maxUsers != null && ` · ${p.maxUsers} users`}
                        {p.maxProjects != null && ` · ${p.maxProjects} projects`}
                      </p>
                    </div>
                    {currentPlanId === p.id ? (
                      <Check className="h-5 w-5 shrink-0 text-primary" />
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
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No paid plans available. Contact support.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t p-4">
              <Dialog.Close asChild>
                <Button variant="outline">Close</Button>
              </Dialog.Close>
              <Button asChild>
                <Link href="/dashboard/plans" onClick={closeUpgradeModal}>
                  View Plans <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

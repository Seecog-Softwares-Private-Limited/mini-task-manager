"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/PlanBadge";
import { useToast } from "@/components/ui/use-toast";
import {
  type LimitExceededErrorBody,
  type UserPlanSlug,
  upgradeUserPlan,
} from "@/services/api/user-plans.api";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Crown, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const LIMIT_LABELS: Record<string, string> = {
  workspace: "workspaces",
  member: "members",
  storage: "storage",
};

const PLAN_META: Record<
  UserPlanSlug,
  { icon: typeof Zap; accent: string; description: string }
> = {
  free: {
    icon: Zap,
    accent: "border-slate-200 bg-slate-50 dark:bg-slate-900/50",
    description: "Get started with essentials",
  },
  silver: {
    icon: Zap,
    accent: "border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-900/60",
    description: "More members and storage",
  },
  gold: {
    icon: Crown,
    accent: "border-amber-400/50 bg-amber-50/80 dark:bg-amber-950/30",
    description: "Maximum workspaces and unlimited members",
  },
};

function formatLimitValue(limitType: string, value: number): string {
  if (limitType === "storage") {
    if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GB`;
    return `${Math.round(value / 1024 ** 2)} MB`;
  }
  return String(value);
}

export interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: LimitExceededErrorBody | null;
  onClose: () => void;
}

export function UpgradePlanModal({
  open,
  onOpenChange,
  detail,
  onClose,
}: UpgradePlanModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [upgrading, setUpgrading] = useState<UserPlanSlug | null>(null);

  const handleUpgrade = async (plan: UserPlanSlug) => {
    setUpgrading(plan);
    try {
      const init = await upgradeUserPlan(plan);
      if (init.requiresPayment && init.payment?.paymentId) {
        const verified = await upgradeUserPlan(plan, init.payment.paymentId);
        if (verified.plan) {
          toast({
            title: "Plan upgraded",
            description: `You are now on the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`,
            variant: "success",
          });
          queryClient.invalidateQueries({ queryKey: ["user-plans"] });
          onClose();
          return;
        }
      }
      if (!init.requiresPayment) {
        toast({ title: "Plan upgraded", variant: "success" });
        queryClient.invalidateQueries({ queryKey: ["user-plans"] });
        onClose();
      }
    } catch (err) {
      toast({
        title: "Upgrade failed",
        description: err instanceof Error ? err.message : "Could not upgrade plan",
        variant: "error",
      });
    } finally {
      setUpgrading(null);
    }
  };

  if (!detail) return null;

  const limitName = LIMIT_LABELS[detail.limitType] ?? detail.limitType;
  const maximumPlan = detail.maximumPlan || detail.upgradeTo.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
        else onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {maximumPlan ? "Plan limit reached" : "Upgrade your plan"}
          </DialogTitle>
          <DialogDescription className="text-left">
            {detail.message ||
              `You have reached your ${limitName} limit on your current plan.`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/40 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Current plan</span>
            <PlanBadge plan={detail.currentPlan} />
            <span className="text-sm text-muted-foreground">
              {limitName}:{" "}
              <strong className="text-foreground">
                {formatLimitValue(detail.limitType, detail.currentUsage)}
                {detail.planLimit != null
                  ? ` / ${formatLimitValue(detail.limitType, detail.planLimit)}`
                  : ""}
              </strong>
            </span>
          </div>
        </div>

        {maximumPlan ? (
          <p className="text-sm text-muted-foreground">
            You are on our highest plan (Gold). Contact support if you need a custom
            enterprise arrangement.
          </p>
        ) : (
          <>
            <p className="text-sm font-medium">Choose a plan to continue</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {detail.upgradeTo.map((opt) => {
                const meta = PLAN_META[opt.plan];
                const Icon = meta.icon;
                return (
                  <div
                    key={opt.plan}
                    className={cn(
                      "flex flex-col rounded-xl border-2 p-4 transition-shadow hover:shadow-md",
                      meta.accent
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <PlanBadge plan={opt.plan} />
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">
                      ₹{opt.price}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
                    <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                      {opt.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-4 w-full"
                      onClick={() => void handleUpgrade(opt.plan)}
                      disabled={upgrading !== null}
                    >
                      {upgrading === opt.plan
                        ? "Upgrading…"
                        : `Upgrade to ${opt.plan.charAt(0).toUpperCase() + opt.plan.slice(1)}`}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 font-medium">Feature</th>
                    <th className="p-3 font-medium">Free</th>
                    <th className="p-3 font-medium">Silver</th>
                    <th className="p-3 font-medium">Gold</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    ["Workspaces", "1", "1", "10"],
                    ["Members / workspace", "5", "20", "Unlimited"],
                    ["Storage", "500 MB", "2 GB", "4 GB"],
                    ["Price", "Free", "₹500/mo", "₹1000/mo"],
                  ].map(([feature, free, silver, gold]) => (
                    <tr key={feature}>
                      <td className="p-3 text-muted-foreground">{feature}</td>
                      <td className="p-3">{free}</td>
                      <td className="p-3">{silver}</td>
                      <td className="p-3 font-medium">{gold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} className="gap-1">
            <X className="h-4 w-4" />
            Dismiss
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/dashboard/plans">View all plans</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

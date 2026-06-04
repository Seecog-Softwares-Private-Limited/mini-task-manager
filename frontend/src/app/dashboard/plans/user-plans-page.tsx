"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { PlanUsageWidget } from "@/components/PlanUsageWidget";
import { PlanBadge } from "@/components/PlanBadge";
import {
  createUserPlanOrder,
  fetchCurrentUserPlan,
  fetchUserPlans,
  formatBytes,
  validatePlanCoupon,
  verifyUserPlanPayment,
  type CouponValidationResult,
  type UserPlanSlug,
} from "@/services/api/user-plans.api";
import { parseApiError } from "@/services/api/client";
import { Check, Crown, HardDrive, Users, Building2, Sparkles, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

type PlanAccent = {
  gradient: string;
  border: string;
  badge: string;
  button: string;
};

const ACCENTS: Record<UserPlanSlug, PlanAccent> = {
  free: {
    gradient: "from-slate-500 to-slate-700",
    border: "border-slate-200/70 dark:border-slate-700/70",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    button: "bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700",
  },
  silver: {
    gradient: "from-slate-300 via-slate-200 to-slate-300",
    border: "border-slate-300/70 dark:border-slate-500/70",
    badge: "bg-gradient-to-r from-slate-200 to-slate-300 text-slate-900 dark:text-white",
    button: "bg-gradient-to-r from-slate-500 to-slate-300 text-slate-950 hover:brightness-110",
  },
  gold: {
    gradient: "from-amber-400 via-amber-300 to-yellow-400",
    border: "border-amber-400/60 dark:border-amber-600/60",
    badge: "bg-amber-100 text-amber-950 dark:bg-amber-950/30 dark:text-amber-200",
    button: "bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 hover:brightness-110",
  },
};

function toMaxText(n: number | null): string {
  if (n === null) return "Unlimited";
  return String(n);
}

function canUpgradeTo(current: UserPlanSlug | null | undefined, target: UserPlanSlug) {
  if (!current) return target !== "free";
  if (current === "gold") return false;
  if (target === "free") return false;
  if (current === "silver") return target === "gold";
  if (current === "free") return target === "silver" || target === "gold";
  return false;
}

function planIcon(plan: UserPlanSlug) {
  switch (plan) {
    case "free":
      return <Sparkles className="h-6 w-6" />;
    case "silver":
      return <Crown className="h-6 w-6" />;
    case "gold":
      return <Crown className="h-6 w-6" />;
  }
}

export default function UserPlansPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [checkoutOverlay, setCheckoutOverlay] = useState(false);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["user-plans", "list"],
    queryFn: fetchUserPlans,
    staleTime: 30_000,
  });

  const { data: current, isLoading: currentLoading } = useQuery({
    queryKey: ["user-plans", "current"],
    queryFn: fetchCurrentUserPlan,
    staleTime: 30_000,
  });

  const currentPlan: UserPlanSlug | null | undefined = current?.plan;
  const [upgrading, setUpgrading] = useState<UserPlanSlug | null>(null);
  const [couponInputs, setCouponInputs] = useState<Partial<Record<UserPlanSlug, string>>>({});
  const [appliedCoupons, setAppliedCoupons] = useState<
    Partial<Record<UserPlanSlug, CouponValidationResult | null>>
  >({});
  const [validatingCoupon, setValidatingCoupon] = useState<UserPlanSlug | null>(null);

  const ensureRazorpayLoaded = useCallback(() => {
    if (typeof window === "undefined") return Promise.resolve(false);
    if (window.Razorpay) return Promise.resolve(true);
    const existing = document.getElementById("razorpay-script") as HTMLScriptElement | null;
    if (existing) {
      return new Promise<boolean>((resolve) => {
        if (window.Razorpay) {
          resolve(true);
          return;
        }
        existing.addEventListener("load", () => resolve(true));
        existing.addEventListener("error", () => resolve(false));
      });
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    return new Promise<boolean>((resolve) => {
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const upgradeButtonText = (target: UserPlanSlug) => {
    if (currentPlan === target) return "Current plan";
    return `Upgrade to ${target.charAt(0).toUpperCase() + target.slice(1)}`;
  };

  const applyCoupon = async (target: UserPlanSlug) => {
    const code = couponInputs[target]?.trim();
    if (!code) {
      toast({ title: "Enter a coupon code", variant: "error" });
      return;
    }
    setValidatingCoupon(target);
    try {
      const result = await validatePlanCoupon(code, target);
      setAppliedCoupons((prev) => ({ ...prev, [target]: result }));
      if (result.valid) {
        toast({
          title: "Coupon applied",
          description: `${result.discountPercent}% off — pay ₹${result.finalAmountInr} instead of ₹${result.originalAmountInr}`,
          variant: "success",
        });
      } else {
        toast({
          title: "Invalid coupon",
          description: result.message ?? "This code cannot be used for this plan",
          variant: "error",
        });
      }
    } catch (e) {
      toast({
        title: "Could not validate coupon",
        description: e instanceof Error ? e.message : "Try again",
        variant: "error",
      });
    } finally {
      setValidatingCoupon(null);
    }
  };

  const onUpgrade = async (target: UserPlanSlug) => {
    setUpgrading(target);
    const applied = appliedCoupons[target];
    const couponCode = applied?.valid ? applied.code : undefined;
    try {
      const orderResponse = await createUserPlanOrder(target, couponCode);

      if (!orderResponse.requiresPayment) {
        toast({
          title: "Plan upgraded",
          variant: "success",
          description: `You are now on the ${orderResponse.plan ?? target} plan.`,
        });
        await queryClient.invalidateQueries({ queryKey: ["user-plans"] });
        return;
      }

      const rz = orderResponse.razorpay;
      if (!rz?.orderId || !rz.keyId) {
        throw new Error("Payment could not be started. Please try again.");
      }

      const loaded = await ensureRazorpayLoaded();
      if (!loaded || !window.Razorpay) {
        throw new Error("Payment system failed to load. Please refresh and try again.");
      }

      setCheckoutOverlay(true);
      const planLabel = rz.planName ?? target.charAt(0).toUpperCase() + target.slice(1);

      const options: Record<string, unknown> = {
        key: rz.keyId,
        amount: rz.amount,
        currency: rz.currency,
        name: "Mini Task Manager",
        description: `${planLabel} plan — monthly`,
        order_id: rz.orderId,
        redirect: false,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const result = await verifyUserPlanPayment({
              plan: target,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              couponCode,
            });
            toast({
              title: "Plan upgraded",
              variant: "success",
              description: `You are now on the ${result.plan} plan.`,
            });
            await queryClient.invalidateQueries({ queryKey: ["user-plans"] });
          } catch (err) {
            toast({
              title: "Payment verification failed",
              description: parseApiError(err),
              variant: "error",
            });
          } finally {
            setUpgrading(null);
            setCheckoutOverlay(false);
          }
        },
        modal: {
          ondismiss: () => {
            setUpgrading(null);
            setCheckoutOverlay(false);
          },
          escape: true,
          confirm_close: true,
        },
        theme: {
          color: target === "gold" ? "#f59e0b" : "#8b5cf6",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast({
          title: "Payment failed",
          description: "Your payment was not completed. You can try again.",
          variant: "error",
        });
        setUpgrading(null);
        setCheckoutOverlay(false);
      });
      rzp.open();
    } catch (e) {
      toast({
        title: "Upgrade failed",
        description: parseApiError(e),
        variant: "error",
      });
      setUpgrading(null);
      setCheckoutOverlay(false);
    }
  };

  const plansList = plans ?? [];

  return (
    <>
    <div className="mx-auto max-w-7xl space-y-8 pb-10 pt-6">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">
          Plans that scale with you
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Transparent pricing for your account limits: Free, Silver, and Gold.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px] items-start">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3 items-start">
            {plansLoading ? (
              <div className="md:col-span-3 text-center text-muted-foreground">Loading plans…</div>
            ) : (
              plansList.map((plan) => {
                const accent = ACCENTS[plan.slug as UserPlanSlug] ?? ACCENTS.free;
                const currentBadge =
                  currentPlan && plan.slug === currentPlan ? (
                    <span className={cn("text-xs font-bold uppercase", accent.badge)}>Current</span>
                  ) : null;
                const canUpgrade = canUpgradeTo(currentPlan, plan.slug as UserPlanSlug);
                const isUpgrading = upgrading === plan.slug;
                const slug = plan.slug as UserPlanSlug;
                const applied = appliedCoupons[slug];
                const showCoupon =
                  plan.allowCoupon && slug !== "free" && canUpgrade;

                return (
                  <Card
                    key={plan.slug}
                    className={cn(
                      "relative overflow-hidden transition-shadow hover:shadow-lg",
                      accent.border,
                      plan.slug === "silver" && "shadow-md"
                    )}
                  >
                    <div className={cn("h-1.5 w-full bg-gradient-to-r", accent.gradient)} />

                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
                            {planIcon(plan.slug as UserPlanSlug)}
                          </div>
                          <div>
                            <CardTitle className="text-xl">{plan.name}</CardTitle>
                            {currentBadge ? <div className="mt-1">{currentBadge}</div> : null}
                          </div>
                        </div>
                        {plan.slug !== "free" ? (
                          <PlanBadge plan={plan.slug as UserPlanSlug} className="hidden" />
                        ) : null}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div>
                        {plan.price === 0 ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold">₹0</span>
                            <span className="text-muted-foreground">/forever</span>
                          </div>
                        ) : applied?.valid ? (
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-extrabold text-emerald-600">
                                ₹{applied.finalAmountInr}
                              </span>
                              <span className="text-lg text-muted-foreground line-through">
                                ₹{applied.originalAmountInr}
                              </span>
                              <span className="text-muted-foreground">/mo</span>
                            </div>
                            <p className="mt-1 text-xs font-medium text-emerald-600">
                              {applied.discountPercent}% off with {applied.code}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold">₹{plan.price}</span>
                            <span className="text-muted-foreground">/mo</span>
                          </div>
                        )}
                      </div>

                      {showCoupon && (
                        <div className="space-y-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
                          <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <Ticket className="h-3.5 w-3.5" />
                            Coupon code
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter code"
                              value={couponInputs[slug] ?? ""}
                              onChange={(e) =>
                                setCouponInputs((prev) => ({
                                  ...prev,
                                  [slug]: e.target.value.toUpperCase(),
                                }))
                              }
                              className="h-9 text-sm"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={validatingCoupon === slug}
                              onClick={() => void applyCoupon(slug)}
                            >
                              {validatingCoupon === slug ? "…" : "Apply"}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            Workspaces
                          </span>
                          <span className="font-semibold">{plan.limits.maxWorkspaces}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            Members / workspace
                          </span>
                          <span className="font-semibold">{toMaxText(plan.limits.maxMembersPerWorkspace)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <HardDrive className="h-4 w-4" />
                            Storage
                          </span>
                          <span className="font-semibold">{formatBytes(plan.limits.storageBytes)}</span>
                        </div>
                      </div>

                      <ul className="space-y-1.5 text-sm">
                        {plan.benefits.slice(0, 5).map((b) => (
                          <li key={b} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={cn(
                          "w-full",
                          plan.slug === "free"
                            ? "cursor-not-allowed"
                            : canUpgrade
                              ? accent.button
                              : "cursor-not-allowed bg-muted"
                        )}
                        disabled={plan.slug === "free" || !canUpgrade || isUpgrading}
                        onClick={() => void onUpgrade(plan.slug as UserPlanSlug)}
                      >
                        {plan.slug === currentPlan
                          ? "Current plan"
                          : canUpgrade
                            ? isUpgrading
                              ? "Upgrading…"
                              : upgradeButtonText(plan.slug as UserPlanSlug)
                            : "Not available"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <div className="sticky top-6">
          <PlanUsageWidget />
        </div>
      </div>
    </div>

    {checkoutOverlay && (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <p className="rounded-lg bg-background px-6 py-4 text-sm font-medium shadow-lg">
          Complete your payment in the Razorpay popup…
        </p>
      </div>
    )}
    </>
  );
}


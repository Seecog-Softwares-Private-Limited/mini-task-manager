"use client";
export { default } from "./user-plans-page";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { usePlan } from "@/context/plan-context";
import { useTenant } from "@/context/tenant-context";
import { createOrder, verifyPayment, startTrial, downgradeToFree } from "@/services/api/billing.api";
import { cn } from "@/lib/utils";
import {
  Check, X, Sparkles, Crown, Shield, Zap, ArrowRight, Star,
  Users, FolderKanban, HardDrive, Bot, Plug, Code, Lock,
  ClipboardList, BarChart3, Clock, HeadphonesIcon, Infinity,
} from "lucide-react";
import type { Plan } from "@/types/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Shield className="h-7 w-7" />,
  pro: <Zap className="h-7 w-7" />,
  enterprise: <Crown className="h-7 w-7" />,
};

const PLAN_COLORS: Record<string, { gradient: string; border: string; shadow: string; badge: string; glow: string; text: string; ring: string }> = {
  free: {
    gradient: "from-slate-500 to-slate-700",
    border: "border-slate-200 dark:border-slate-700",
    shadow: "shadow-slate-200/50 dark:shadow-slate-800/50",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    glow: "",
    text: "text-slate-600 dark:text-slate-400",
    ring: "ring-slate-400",
  },
  pro: {
    gradient: "from-violet-600 via-purple-600 to-indigo-600",
    border: "border-purple-300 dark:border-purple-600",
    shadow: "shadow-purple-300/50 dark:shadow-purple-900/50",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    glow: "before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-purple-400/20 before:via-violet-400/20 before:to-indigo-400/20 before:blur-xl before:-z-10",
    text: "text-purple-600 dark:text-purple-400",
    ring: "ring-purple-500",
  },
  enterprise: {
    gradient: "from-amber-500 via-orange-500 to-red-500",
    border: "border-amber-300 dark:border-amber-600",
    shadow: "shadow-amber-200/50 dark:shadow-amber-900/50",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    glow: "",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500",
  },
};

const featureList: { key: string; label: string; icon: React.ReactNode; free: string; pro: string; enterprise: string }[] = [
  { key: "users", label: "Team Members", icon: <Users className="h-4 w-4" />, free: "5", pro: "Unlimited", enterprise: "Unlimited" },
  { key: "projects", label: "Projects", icon: <FolderKanban className="h-4 w-4" />, free: "1", pro: "Unlimited", enterprise: "Unlimited" },
  { key: "storage", label: "Storage", icon: <HardDrive className="h-4 w-4" />, free: "5 GB", pro: "100 GB", enterprise: "Unlimited" },
  { key: "automation", label: "Automations", icon: <Bot className="h-4 w-4" />, free: "—", pro: "500/month", enterprise: "Unlimited" },
  { key: "integrations", label: "Integrations", icon: <Plug className="h-4 w-4" />, free: "—", pro: "10", enterprise: "Unlimited" },
  { key: "api", label: "API Access", icon: <Code className="h-4 w-4" />, free: "—", pro: "✓", enterprise: "✓" },
  { key: "workflows", label: "Custom Workflows", icon: <Zap className="h-4 w-4" />, free: "—", pro: "✓", enterprise: "✓" },
  { key: "reporting", label: "Advanced Reporting", icon: <BarChart3 className="h-4 w-4" />, free: "Basic", pro: "✓", enterprise: "✓" },
  { key: "time", label: "Time Tracking", icon: <Clock className="h-4 w-4" />, free: "—", pro: "✓", enterprise: "✓" },
  { key: "sso", label: "SSO (Google, Okta)", icon: <Lock className="h-4 w-4" />, free: "—", pro: "—", enterprise: "✓" },
  { key: "audit", label: "Audit Logs", icon: <ClipboardList className="h-4 w-4" />, free: "—", pro: "—", enterprise: "✓" },
  { key: "sla", label: "SLA Uptime", icon: <Shield className="h-4 w-4" />, free: "—", pro: "—", enterprise: "99.9%" },
  { key: "support", label: "Priority Support", icon: <HeadphonesIcon className="h-4 w-4" />, free: "Community", pro: "Email", enterprise: "24/7 Dedicated" },
];

function PlansPage() {
  const router = useRouter();
  const { orgId } = useTenant();
  const { subscription, plan: currentPlan, plans, refetch, isTrial, isTrialExpired } = usePlan();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [processing, setProcessing] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [successPlan, setSuccessPlan] = useState<string | null>(null);
  const [checkoutOverlay, setCheckoutOverlay] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  /** Load Razorpay script only when user initiates checkout (avoids preload warning + faster initial load) */
  const ensureRazorpayLoaded = useCallback(() => {
    if (typeof window === "undefined") return Promise.resolve(false);
    if (window.Razorpay) {
      setRazorpayReady(true);
      return Promise.resolve(true);
    }
    const existing = document.getElementById("razorpay-script") as HTMLScriptElement | null;
    if (existing) {
      return new Promise<boolean>((resolve) => {
        if (window.Razorpay) {
          setRazorpayReady(true);
          resolve(true);
          return;
        }
        existing.addEventListener("load", () => {
          setRazorpayReady(true);
          resolve(true);
        });
      });
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    return new Promise<boolean>((resolve) => {
      script.onload = () => {
        setRazorpayReady(true);
        resolve(true);
      };
      script.onerror = () => {
        console.error("Failed to load Razorpay SDK");
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }, []);

  const getPrice = (p: Plan) => {
    return billingCycle === "yearly" ? p.priceYearly : p.priceMonthly;
  };

  const getMonthlyEquivalent = (p: Plan) => {
    if (billingCycle === "yearly") {
      return Math.round(p.priceYearly / 12);
    }
    return p.priceMonthly;
  };

  const getSavingsPercent = (p: Plan) => {
    if (p.priceMonthly <= 0) return 0;
    const yearlyMonthly = p.priceYearly / 12;
    return Math.round(((p.priceMonthly - yearlyMonthly) / p.priceMonthly) * 100);
  };

  const isCurrentPlan = (p: Plan) => {
    const st = subscription?.status?.toUpperCase();
    if (st !== "ACTIVE" && st !== "TRIAL") return false;
    // Match by plan ID or slug (slug fallback ensures correct display after payment upgrade)
    return currentPlan?.id === p.id || subscription?.planSlug === p.slug;
  };

  const isOnTrial = isTrial && !isTrialExpired;

  async function handleStartTrial() {
    if (!orgId) return;
    setProcessing("trial");
    try {
      await startTrial();
      refetch();
      setSuccessPlan("pro");
      setTimeout(() => setSuccessPlan(null), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to start trial");
    }
    setProcessing(null);
  }

  async function handleSubscribe(plan: Plan) {
    if (!orgId) return;
    if (plan.slug === "free") {
      // If already on free plan, do nothing
      if (currentPlan?.slug === "free" || (!subscription?.planSlug && !currentPlan)) {
        return;
      }
      // Downgrade to free plan
      if (!confirm("Are you sure you want to switch to the Free plan? You will lose access to premium features immediately.")) return;
      setProcessing(plan.id);
      try {
        const updatedSub = await downgradeToFree();
        if (orgId) {
          queryClient.setQueryData(["billing", "subscription", orgId], updatedSub);
        }
        await queryClient.invalidateQueries({ queryKey: ["billing"] });
        await refetch();
        setSuccessPlan("free");
        setTimeout(() => setSuccessPlan(null), 3000);
      } catch (err: any) {
        alert(err?.response?.data?.message || "Failed to switch to Free plan");
      }
      setProcessing(null);
      return;
    }

    // Load Razorpay SDK on demand (avoids preload warning, faster initial page load)
    const loaded = await ensureRazorpayLoaded();
    if (!loaded || !window.Razorpay) {
      alert("Payment system failed to load. Please try again.");
      return;
    }

    setProcessing(plan.id);
    setCheckoutOverlay(true);
    try {
      const order = await createOrder(plan.id, billingCycle);

      const options: Record<string, any> = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Mini Task Manager",
        description: `${order.planName} Plan - ${billingCycle === "yearly" ? "Annual" : "Monthly"}`,
        order_id: order.orderId,
        // CRITICAL: prevent redirect / new-tab — force inline popup modal
        redirect: false,
        handler: async (response: any) => {
          try {
            const updatedSub = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan.id,
              billingCycle,
            });
            // Eagerly update subscription cache so UI shows new plan immediately
            if (orgId) {
              queryClient.setQueryData(["billing", "subscription", orgId], updatedSub);
            }
            await queryClient.invalidateQueries({ queryKey: ["billing"] });
            await refetch();
            setCheckoutOverlay(false);
            setSuccessPlan(plan.slug);
            setTimeout(() => {
              setSuccessPlan(null);
              router.push("/dashboard/billing");
            }, 2500);
          } catch (err: any) {
            alert("Payment verification failed. Please contact support.");
          }
          setProcessing(null);
          setCheckoutOverlay(false);
        },
        modal: {
          ondismiss: () => {
            setProcessing(null);
            setCheckoutOverlay(false);
          },
          escape: true,
          confirm_close: true,
          animation: true,
          backdropclose: false,
        },
        prefill: {},
        theme: {
          color: plan.slug === "enterprise" ? "#f59e0b" : "#8b5cf6",
          backdrop_color: "rgba(0,0,0,0.6)",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (failResponse: any) => {
        console.error("Payment failed", failResponse?.error);
        setProcessing(null);
        setCheckoutOverlay(false);
      });
      rzp.open();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to create payment order");
      setProcessing(null);
      setCheckoutOverlay(false);
    }
  }

  return (
    <>
      {/* Animated gradient background decorations */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-purple-400/10 via-violet-400/5 to-transparent blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-amber-400/10 via-orange-400/5 to-transparent blur-3xl animate-[pulse_10s_ease-in-out_infinite_2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-blue-400/5 via-indigo-400/5 to-transparent blur-3xl animate-[pulse_12s_ease-in-out_infinite_4s]" />
      </div>

      <div className="mx-auto max-w-7xl space-y-12 pb-20">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">
            Plans that scale with you
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Start free, upgrade when you grow. No hidden fees, transparent pricing.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center animate-fade-in" style={{ animationDelay: "150ms" }}>
          <div className="relative grid grid-cols-2 rounded-full border bg-card p-1 shadow-lg w-full max-w-[280px]">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "relative z-10 flex items-center justify-center rounded-full py-2.5 text-sm font-semibold transition-all duration-300",
                billingCycle === "monthly"
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition-all duration-300",
                billingCycle === "yearly"
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                SAVE 15%
              </span>
            </button>
            {/* Sliding pill - behind buttons, z-0 so text stays on top */}
            <div
              className={cn(
                "absolute top-1 h-[calc(100%-8px)] rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg transition-all duration-300 ease-in-out z-0",
                billingCycle === "monthly"
                  ? "left-1 w-[calc(50%-4px)]"
                  : "left-[calc(50%+2px)] w-[calc(50%-4px)]"
              )}
            />
          </div>
        </div>

        {/* Plan Cards */}
        <div ref={cardsRef} className="grid gap-8 md:grid-cols-3 animate-fade-in" style={{ animationDelay: "300ms" }}>
          {plans.map((plan, idx) => {
            const colors = PLAN_COLORS[plan.slug] || PLAN_COLORS.free;
            const price = getPrice(plan);
            const monthlyEq = getMonthlyEquivalent(plan);
            const savings = getSavingsPercent(plan);
            const isCurrent = isCurrentPlan(plan);
            const icon = PLAN_ICONS[plan.slug] || <Shield className="h-7 w-7" />;

            return (
              <div
                key={plan.id}
                className={cn(
                  "group relative flex flex-col rounded-2xl border-2 bg-card p-8 shadow-xl transition-all duration-500",
                  "hover:shadow-2xl hover:-translate-y-2",
                  colors.border,
                  colors.shadow,
                  plan.isPopular && colors.glow,
                  plan.isPopular && "scale-[1.02] md:scale-105",
                  isCurrent && `ring-2 ${colors.ring}`,
                  successPlan === plan.slug && "animate-[celebrate_0.6s_ease-out]"
                )}
                style={{
                  animationDelay: `${idx * 150}ms`,
                  animationFillMode: "both",
                }}
              >
                {/* Popular badge */}
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className={cn(
                      "flex items-center gap-1.5 rounded-full bg-gradient-to-r px-5 py-1.5 text-xs font-bold text-white shadow-lg",
                      colors.gradient
                    )}>
                      <Star className="h-3.5 w-3.5 fill-current" />
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Current plan indicator */}
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <div className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold text-white shadow-lg">
                      <Check className="h-3 w-3" />
                      CURRENT
                    </div>
                  </div>
                )}

                {/* Plan Icon & Name */}
                <div className="mb-6">
                  <div className={cn(
                    "mb-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-br p-3 text-white shadow-lg",
                    colors.gradient
                  )}>
                    {icon}
                  </div>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.slug === "free" && "Perfect for getting started"}
                    {plan.slug === "pro" && "For growing teams"}
                    {plan.slug === "enterprise" && "For large organizations"}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  {price === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-extrabold tracking-tight">₹0</span>
                      <span className="text-lg text-muted-foreground">/forever</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-extrabold tracking-tight">₹{monthlyEq}</span>
                        <span className="text-lg text-muted-foreground">/user/mo</span>
                      </div>
                      {billingCycle === "yearly" && savings > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-sm text-muted-foreground line-through">₹{plan.priceMonthly}/mo</span>
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            Save {savings}%
                          </span>
                        </div>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">
                        Billed ₹{price}/user/{billingCycle === "yearly" ? "year" : "month"}
                      </p>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <div className="mb-6">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full rounded-xl bg-muted py-3.5 text-sm font-semibold text-muted-foreground cursor-default"
                    >
                      Current Plan
                    </button>
                  ) : plan.slug === "free" ? (
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={processing === plan.id}
                      className="w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 py-3.5 text-sm font-semibold text-foreground transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60 disabled:cursor-wait"
                    >
                      {processing === plan.id ? "Switching..." : "Get Started Free"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={processing === plan.id}
                      className={cn(
                        "w-full rounded-xl bg-gradient-to-r py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300",
                        "hover:shadow-xl hover:brightness-110 active:scale-[0.98]",
                        "disabled:opacity-60 disabled:cursor-wait",
                        colors.gradient
                      )}
                    >
                      {processing === plan.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {plan.slug === "enterprise" ? "Subscribe" : "Upgrade to Pro"}
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  )}

                  {/* Trial CTA for Pro */}
                  {plan.slug === "pro" && !isOnTrial && !isCurrent && subscription?.planSlug !== "pro" && subscription?.planSlug !== "enterprise" && (
                    <button
                      onClick={handleStartTrial}
                      disabled={processing === "trial"}
                      className="mt-3 w-full rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-600 py-2.5 text-sm font-semibold text-purple-600 dark:text-purple-400 transition-all duration-300 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                    >
                      {processing === "trial" ? "Starting..." : "Start 14-Day Free Trial"}
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

                {/* Feature List */}
                <div className="flex-1 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {plan.slug === "free" ? "Includes:" : plan.slug === "pro" ? "Everything in Free, plus:" : "Everything in Pro, plus:"}
                  </p>
                  {plan.slug === "free" && (
                    <>
                      <Feature text={`Up to ${plan.maxUsers ?? 5} team members`} included />
                      <Feature text={`${plan.maxProjects ?? 1} project${(plan.maxProjects ?? 1) !== 1 ? "s" : ""}`} included />
                      <Feature text="5 GB storage" included />
                      <Feature text="Kanban board" included />
                      <Feature text="Basic task management" included />
                      <Feature text="Basic reporting" included />
                      <Feature text="Community support" included />
                    </>
                  )}
                  {plan.slug === "pro" && (
                    <>
                      <Feature text="Unlimited users" included />
                      <Feature text="Unlimited projects" included />
                      <Feature text="100 GB storage" included />
                      <Feature text="Kanban + Scrum boards" included />
                      <Feature text="Custom workflows" included />
                      <Feature text="500 automations/month" included />
                      <Feature text="API access" included />
                      <Feature text="10 integrations" included />
                      <Feature text="Advanced reporting" included />
                      <Feature text="Time tracking" included />
                      <Feature text="Role-based permissions" included />
                    </>
                  )}
                  {plan.slug === "enterprise" && (
                    <>
                      <Feature text="Unlimited everything" included />
                      <Feature text="Unlimited automations" included />
                      <Feature text="Unlimited integrations" included />
                      <Feature text="SSO (Google, Okta)" included />
                      <Feature text="Audit logs" included />
                      <Feature text="99.9% SLA" included />
                      <Feature text="Priority 24/7 support" included />
                      <Feature text="Dedicated manager" included />
                      <Feature text="Custom security policies" included />
                      <Feature text="Data export tools" included />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Trial Banner */}
        {!isOnTrial && subscription?.planSlug !== "pro" && subscription?.planSlug !== "enterprise" && (
          <div className="animate-fade-in" style={{ animationDelay: "500ms" }}>
            <div className="relative overflow-hidden rounded-2xl border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 via-violet-50 to-indigo-50 dark:from-purple-950/30 dark:via-violet-950/30 dark:to-indigo-950/30 p-8 md:p-12">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgxMzksMTAwLDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />
              <div className="relative flex flex-col items-center text-center gap-4 md:flex-row md:text-left md:gap-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl shadow-purple-300/30 shrink-0">
                  <Sparkles className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">Try Pro free for 14 days</h3>
                  <p className="mt-1 text-muted-foreground">No credit card required. Get access to all Pro features instantly. Automatically downgrades to Free after trial.</p>
                </div>
                <button
                  onClick={handleStartTrial}
                  disabled={processing === "trial"}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                >
                  {processing === "trial" ? "Starting..." : "Start Free Trial"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compare All Features Button */}
        <div className="text-center animate-fade-in" style={{ animationDelay: "600ms" }}>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center gap-2 rounded-full border bg-card px-6 py-3 text-sm font-semibold shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
          >
            {showComparison ? "Hide" : "Compare All Features"}
            <ArrowRight className={cn("h-4 w-4 transition-transform duration-300", showComparison && "rotate-90")} />
          </button>
        </div>

        {/* Feature Comparison Table */}
        {showComparison && (
          <div className="animate-fade-in overflow-hidden rounded-2xl border bg-card shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gradient-to-r from-slate-50 via-purple-50/30 to-amber-50/30 dark:from-slate-900 dark:via-purple-900/10 dark:to-amber-900/10">
                    <th className="px-6 py-5 text-left text-sm font-bold text-foreground">Feature</th>
                    {["Free", "Pro", "Enterprise"].map((name) => (
                      <th key={name} className="px-6 py-5 text-center">
                        <span className={cn(
                          "text-sm font-bold",
                          name === "Free" && "text-slate-600 dark:text-slate-400",
                          name === "Pro" && "text-purple-600 dark:text-purple-400",
                          name === "Enterprise" && "text-amber-600 dark:text-amber-400"
                        )}>
                          {name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureList.map((feat, i) => (
                    <tr
                      key={feat.key}
                      className={cn(
                        "border-b transition-colors hover:bg-muted/30",
                        i % 2 === 0 && "bg-muted/10"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{feat.icon}</span>
                          <span className="text-sm font-medium">{feat.label}</span>
                        </div>
                      </td>
                      {["free", "pro", "enterprise"].map((slug) => {
                        const val = feat[slug as keyof typeof feat] as string;
                        return (
                          <td key={slug} className="px-6 py-4 text-center">
                            {val === "✓" ? (
                              <Check className="h-5 w-5 text-emerald-500 mx-auto" />
                            ) : val === "—" ? (
                              <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                            ) : val === "Unlimited" ? (
                              <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                <Infinity className="h-4 w-4" />
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-foreground">{val}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FAQ / Trust Section */}
        <div className="grid gap-8 md:grid-cols-3 animate-fade-in" style={{ animationDelay: "700ms" }}>
          {[
            { title: "No Hidden Fees", desc: "What you see is what you pay. No surprises, no per-feature charges." },
            { title: "Cancel Anytime", desc: "Switch plans or cancel with one click. Your data stays safe." },
            { title: "14-Day Free Trial", desc: "Try Pro with all features. No credit card needed to start." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border bg-card p-6 text-center shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <h4 className="font-bold text-foreground">{item.title}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Secure checkout overlay — stays behind Razorpay popup */}
      {checkoutOverlay && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          style={{ animation: "overlayIn .35s cubic-bezier(.4,0,.2,1) forwards" }}
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xl" />

          {/* Floating card */}
          <div
            className="relative z-10 mx-4 mb-6 sm:mb-0 w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-b from-card/95 to-card/80 p-8 shadow-[0_8px_60px_-12px_rgba(139,92,246,.35)] ring-1 ring-purple-500/20"
            style={{ animation: "cardUp .4s cubic-bezier(.4,0,.2,1) forwards" }}
          >
            {/* Glow ring */}
            <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-tr from-purple-500/20 via-transparent to-indigo-500/20 blur-sm" />

            {/* Spinner */}
            <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
              <svg className="absolute inset-0 h-16 w-16" viewBox="0 0 64 64" fill="none" style={{ animation: "spin 1.4s linear infinite" }}>
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" className="text-purple-200/30 dark:text-purple-800/30" />
                <path d="M32 4 a28 28 0 0 1 28 28" stroke="url(#spGrad)" strokeWidth="3" strokeLinecap="round" />
                <defs><linearGradient id="spGrad" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8b5cf6" /><stop offset="1" stopColor="#6366f1" /></linearGradient></defs>
              </svg>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/30">
                <Lock className="h-5 w-5 text-white" />
              </div>
            </div>

            <h3 className="text-center text-base font-bold text-foreground">Secure Checkout</h3>
            <p className="mt-1.5 text-center text-sm text-muted-foreground leading-relaxed">
              Complete your payment in the Razorpay popup.&nbsp;Do&nbsp;not close this window.
            </p>

            {/* Animated dots */}
            <div className="mt-5 flex items-center justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-purple-500"
                  style={{ animation: `dotPulse 1.2s ease-in-out ${i * .2}s infinite` }}
                />
              ))}
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex items-center justify-center gap-3 text-[11px] font-medium text-muted-foreground/60">
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" />256-bit SSL</span>
              <span className="h-3 w-px bg-border" />
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" />PCI DSS</span>
              <span className="h-3 w-px bg-border" />
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" />Razorpay</span>
            </div>
          </div>
        </div>
      )}

      {/* Success overlay animation */}
      {successPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="rounded-3xl bg-card p-12 text-center shadow-2xl animate-[celebrate_0.8s_ease-out]">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-lg">
              <Check className="h-10 w-10" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {successPlan === "pro" && isTrial ? "Pro Trial Activated!" : "Plan Upgraded!"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {successPlan === "pro" && isTrial
                ? "Enjoy 14 days of Pro features. No credit card required."
                : `You're now on the ${successPlan.charAt(0).toUpperCase() + successPlan.slice(1)} plan.`}
            </p>
          </div>
        </div>
      )}

      {/* Custom CSS animations */}
      <style jsx global>{`
        @keyframes celebrate {
          0% { transform: scale(0.8) rotate(-2deg); opacity: 0; }
          40% { transform: scale(1.05) rotate(1deg); }
          70% { transform: scale(0.98) rotate(-0.5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cardUp {
          from { opacity: 0; transform: translateY(24px) scale(.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: .25; transform: scale(.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        /* Ensure Razorpay popup appears above our overlay */
        .razorpay-container { z-index: 99999 !important; }
        .razorpay-checkout-frame { z-index: 99999 !important; }
        .razorpay-backdrop { z-index: 99998 !important; }
      `}</style>
    </>
  );
}

function Feature({ text, included }: { text: string; included?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {included ? (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        </div>
      ) : (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
          <X className="h-3 w-3 text-muted-foreground/40" />
        </div>
      )}
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

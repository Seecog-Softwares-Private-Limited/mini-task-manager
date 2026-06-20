"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchUserPlans, formatBytes, type UserPlanSlug } from "@/services/api/user-plans.api";
import { IconCheck } from "../icons";

const LANDING_PLAN_STYLE: Record<
  UserPlanSlug,
  { desc: string; cta: string; popular: boolean; extras: string[] }
> = {
  free: {
    desc: "For getting started with core task management",
    cta: "Get started free",
    popular: false,
    extras: ["Kanban boards", "Basic reporting", "Community support"],
  },
  silver: {
    desc: "For teams that need more members and storage",
    cta: "Upgrade to Silver",
    popular: true,
    extras: ["Upgraded reporting", "Priority email support", "Faster collaboration"],
  },
  gold: {
    desc: "For power users who need more workspaces",
    cta: "Upgrade to Gold",
    popular: false,
    extras: ["Advanced analytics", "Gold support", "Priority upgrades"],
  },
};

const FALLBACK_LANDING_PLANS = [
  {
    name: "Free",
    slug: "free" as UserPlanSlug,
    desc: LANDING_PLAN_STYLE.free.desc,
    price: 0,
    priceAnnual: 0,
    features: ["1 workspace", "5 members / workspace", "500 MB storage", ...LANDING_PLAN_STYLE.free.extras],
    cta: LANDING_PLAN_STYLE.free.cta,
    popular: false,
  },
  {
    name: "Silver",
    slug: "silver" as UserPlanSlug,
    desc: LANDING_PLAN_STYLE.silver.desc,
    price: 500,
    priceAnnual: 510,
    features: ["1 workspace", "20 members / workspace", "2 GB storage", ...LANDING_PLAN_STYLE.silver.extras],
    cta: LANDING_PLAN_STYLE.silver.cta,
    popular: true,
  },
  {
    name: "Gold",
    slug: "gold" as UserPlanSlug,
    desc: LANDING_PLAN_STYLE.gold.desc,
    price: 1000,
    priceAnnual: 1020,
    features: ["10 workspaces", "Unlimited members / workspace", "4 GB storage", ...LANDING_PLAN_STYLE.gold.extras],
    cta: LANDING_PLAN_STYLE.gold.cta,
    popular: false,
  },
];

function landingLimitFeatures(limits: {
  maxWorkspaces: number | null;
  maxMembersPerWorkspace: number | null;
  storageBytes: number;
}): string[] {
  const workspaces =
    limits.maxWorkspaces === null
      ? "Unlimited workspaces"
      : `${limits.maxWorkspaces} workspace${limits.maxWorkspaces === 1 ? "" : "s"}`;
  const members =
    limits.maxMembersPerWorkspace === null
      ? "Unlimited members / workspace"
      : `${limits.maxMembersPerWorkspace} members / workspace`;
  return [workspaces, members, `${formatBytes(limits.storageBytes)} storage`];
}

export function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const { data: apiPlans } = useQuery({
    queryKey: ["public-user-plans"],
    queryFn: fetchUserPlans,
    staleTime: 60_000,
  });

  const plans = useMemo(() => {
    if (!apiPlans?.length) return FALLBACK_LANDING_PLANS;
    return apiPlans.map((p) => {
      const style = LANDING_PLAN_STYLE[p.slug];
      return {
        name: p.name,
        slug: p.slug,
        desc: style.desc,
        price: p.price,
        priceAnnual: p.price === 0 ? 0 : Math.round(p.price * 0.85),
        features: [...landingLimitFeatures(p.limits), ...style.extras],
        cta: style.cta,
        popular: style.popular,
      };
    });
  }, [apiPlans]);

  return (
    <section id="pricing" className="py-20 sm:py-28 lp-section-alt">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="lp-reveal mx-auto max-w-2xl text-center mb-12">
          <span className="lp-section-label">Pricing</span>
          <h2 className="lp-heading mt-4">Start free. Scale infinitely.</h2>
          <p className="lp-body-lg mt-3">Transparent pricing that grows with your team.</p>

          <div className="mt-7 inline-flex items-center rounded-full border border-border bg-card p-1 shadow-sm" role="group" aria-label="Billing period">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${!annual ? "gradient-bg text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              aria-pressed={!annual}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${annual ? "gradient-bg text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              aria-pressed={annual}
            >
              Annual
              <span className="ml-1.5 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--status-active-fg))]">-15%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {plans.map((plan, i) => (
            <div
              key={plan.slug}
              className={`lp-reveal lp-card relative p-6 ${plan.popular ? "lp-pricing-popular md:-mt-1" : ""}`}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              {plan.popular && <span className="lp-pricing-popular-badge">Most popular</span>}

              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{plan.desc}</p>

              <div className="mt-5 mb-5">
                {plan.price === 0 ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight">₹0</span>
                    <span className="text-muted-foreground">/forever</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-semibold tracking-tight">₹{annual ? plan.priceAnnual : plan.price}</span>
                      <span className="text-muted-foreground">/user/mo</span>
                    </div>
                    {annual && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        <span className="line-through">₹{plan.price}</span>
                        <span className="ml-2 font-medium text-[hsl(var(--status-active-fg))]">Save 15%</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Link
                href="/signup"
                className={`block w-full text-center rounded-[var(--radius)] py-2.5 text-sm font-semibold ${plan.popular ? "lp-btn-primary" : "lp-btn-secondary"}`}
              >
                {plan.cta}
              </Link>

              <ul className="mt-6 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <IconCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

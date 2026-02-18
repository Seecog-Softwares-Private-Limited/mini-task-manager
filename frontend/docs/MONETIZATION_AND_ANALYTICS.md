# Monetization & Analytics

## Plan context architecture

- **PlanProvider** (in `app/providers.tsx`): Wraps app inside TenantProvider. Fetches:
  - `GET /billing/plans` → list of plans (cached 5 min)
  - `GET /billing/subscription` (with `X-Organization-Id`) → current subscription (cached 2 min)
- **usePlan()**: Returns `{ subscription, plan, plans, limits, isTrial, trialEndsAt, isLoading, refetch }`.
  - `plan` is resolved from `plans` by `subscription.planId`.
  - `limits`: `{ maxProjects, maxMembers }` from plan.
- **usePlanOptional()**: Same shape when inside PlanProvider; use when component may render outside (e.g. TrialBanner).

## Feature gating

- **lib/feature-gate.ts**: `checkLimit(limit, current)` and `getFeatureGateResult(limit, current, showUpgradeWhenAtLimit)`.
- **hooks/use-feature-gate.ts**:
  - `useFeatureGate(limitKey, current, options?)` → `{ allowed, atLimit, overLimit, limit, current, showUpgrade }`.
  - `useFeatureGates(usage)` → `{ canCreateProject, canAddMember, projectGate, memberGate }` for `usage: { projects?, members? }`.
- **Pattern**: Before performing a gated action (e.g. create project), check `gate.allowed`. If false, call `openUpgradeModal("limit")` and optionally `analytics.track("limit_reached", { limit, current })` instead of proceeding.

## Upgrade modal

- **UpgradeModalProvider** (in providers): Exposes `openUpgradeModal(reason?)` and `closeUpgradeModal()`.
- **UpgradeModal** (rendered in providers): Shows plan comparison and “Go to Billing” / “Select” per plan. Keyboard: Escape closes. Opens when user hits a limit or clicks “Upgrade plan” in billing.

## Usage meter

- **UsageMeter** (`components/usage-meter.tsx`): Props `label`, `current`, `limit`, `subLabel?`, `className?`.
- Renders a progress bar; warning (amber) when ≥80%, destructive when over limit.
- When `limit` is null or ≤0, shows only current count.

## Trial banner

- **TrialBanner** (`components/trial-banner.tsx`): Renders when `usePlanOptional()` has `isTrial` and `trialEndsAt`.
- Shows “Trial ends in X days (date)”. Urgency styling (amber) when &lt; 5 days. Link “Upgrade now” to billing.

## Billing dashboard

- **Route**: `/dashboard/billing`. Visible in nav only when **canManageBilling** (owner or admin).
- **Content** (when org selected and canManageBilling):
  - Current plan card: plan name, price, trial end if applicable, UsageMeter for projects and members.
  - Billing cycle: period dates, status.
  - Invoice history table (from `GET /billing/invoices`).
  - Danger zone: “Cancel subscription” (UI only; disabled with “contact support” for now).
  - “Compare plans” opens a modal listing all plans.
  - “Upgrade plan” opens the global upgrade modal.

## Admin / role-based access

- **Auth**: `AppRole = "owner" | "admin" | "member"`. `canManageBilling = hasRole("owner") || hasRole("admin")`.
- **Nav**: Billing link shown only when `canManageBilling`. Other nav items can use `requiredRole`.
- **Billing page**: If `!canManageBilling`, shows “Only organization owners and admins can manage billing.”

## Analytics hooks (vendor-agnostic)

- **AnalyticsProvider** (optional): Pass a `tracker` with `track(event, properties?)`. If omitted, default is no-op (dev: `console.debug`).
- **useAnalytics()**: Returns the tracker. Events are typed as `AnalyticsEvent`.
- **Events**:
  - `project_created` — when a project is created (e.g. Projects page create mutation onSuccess).
  - `task_created` — when a task is created (wire in task create flow when implemented).
  - `plan_upgrade_clicked` — when upgrade modal is opened or user clicks upgrade CTA (source in properties).
  - `limit_reached` — when user tries to perform an action that is blocked by limit (properties: `limit`, `current`).
- **Implementation**: In `context/analytics-context.tsx`, replace the default tracker with your provider (e.g. Segment, Mixpanel, GA4) by wrapping the app with `<AnalyticsProvider tracker={{ track: (e, p) => window.analytics?.track(e, p) }}>`.

## Folder structure (additions)

```
frontend/src/
├── context/
│   ├── plan-context.tsx
│   ├── upgrade-modal-context.tsx
│   └── analytics-context.tsx
├── hooks/
│   ├── use-feature-gate.ts
│   └── use-analytics.ts
├── lib/
│   └── feature-gate.ts
├── components/
│   ├── upgrade-modal.tsx
│   ├── usage-meter.tsx
│   ├── trial-banner.tsx
│   └── ...
├── services/api/
│   └── billing.api.ts
├── app/dashboard/
│   └── billing/page.tsx   (enhanced)
└── docs/
    ├── MONETIZATION_AND_ANALYTICS.md
    └── UX_IMPROVEMENT_SUMMARY.md
```

Backend: `GET /billing/invoices` (TenantGuard) added in billing controller.

---

## SaaS business maturity score

| Area | Score | Notes |
|------|--------|--------|
| Plan-aware UI | 9/10 | Subscription + plan in context; limits exposed; plan badge in header. |
| Feature gating | 9/10 | useFeatureGate + upgrade modal; Projects page gated; optional useFeatureGates(usage). |
| Trial UX | 8/10 | Trial banner with countdown; urgency &lt; 5 days; upgrade CTA. |
| Usage metering | 8/10 | UsageMeter for projects/members; progress bar; warning at 80%. |
| Billing dashboard | 8/10 | Invoice table; billing cycle; plan comparison modal; cancel (UI placeholder). |
| Admin controls | 9/10 | canManageBilling (owner/admin); billing nav and page guarded. |
| Upgrade experience | 8/10 | Upgrade modal with plan list; “Go to Billing”; success state can be added post-checkout. |
| Analytics hooks | 9/10 | Typed events; vendor-agnostic tracker; project_created, limit_reached, plan_upgrade_clicked. |

**Overall SaaS business maturity: 8.5/10** — Monetization-aware UX and plan enforcement in place; ready to plug in payment provider and analytics backend.

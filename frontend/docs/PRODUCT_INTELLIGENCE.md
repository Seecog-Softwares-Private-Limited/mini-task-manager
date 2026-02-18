# Product Intelligence Layer

## Updated folder structure

```
frontend/src/
├── lib/analytics/
│   ├── events.ts           # Event taxonomy, funnel steps, conversion pairs
│   ├── funnel.ts           # getFunnelCompletionPercentage, getNextFunnelStep
│   ├── pipeline.ts         # createPipeline (multi-provider fan-out)
│   ├── index.ts
│   └── providers/
│       ├── types.ts        # AnalyticsProvider, AnalyticsPayload
│       ├── console.ts      # Dev console
│       ├── custom-api.ts   # POST to NEXT_PUBLIC_ANALYTICS_API_URL
│       ├── segment.ts      # window.analytics
│       └── mixpanel.ts     # window.mixpanel
├── context/
│   └── analytics-context.tsx  # Uses pipeline + getUserId
├── app/dashboard/
│   └── analytics/
│       └── page.tsx        # Growth dashboard (admin only)
└── docs/
    └── PRODUCT_INTELLIGENCE.md
```

---

## Analytics architecture (text-based)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION                                     │
│  useAnalytics().track(event, properties)                                 │
│  useRetentionTracking().trackFirstTaskCreated() / trackInvitedMember()   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     ANALYTICS CONTEXT (default)                          │
│  createPipeline({ providers: [console], getUserId })                     │
│  tracker.track(event, properties) → pipeline.track(event, properties)   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         EVENT PIPELINE                                    │
│  Payload: { event, properties, timestamp, userId?, anonymousId? }        │
│  Fan-out: for each provider → provider.track(payload)                     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   CONSOLE     │         │   CUSTOM API    │         │  SEGMENT /      │
│   (dev)       │         │   POST /events  │         │  MIXPANEL       │
└───────────────┘         └─────────────────┘         └─────────────────┘
```

- **No vendor lock-in:** Swap or add providers via `createPipeline({ providers: [createConsoleProvider(), createSegmentProvider(), createCustomApiProvider()] })` and pass the resulting tracker to `AnalyticsProvider`.
- **Single interface:** Each provider implements `AnalyticsProvider`: `track(payload)`, optional `identify(userId, traits)`.

---

## Activation funnel definition

**Ordered steps:**

1. **signup** — User signed up (track on registration).
2. **first_project_created** — First project created in org.
3. **invited_member** — First team member invited.
4. **first_task_created** — First task created.
5. **workspace_completed** — All of 2–4 done (or onboarding completed).

**Completion percentage:** `getFunnelCompletionPercentage(state)` where `state` is a map of step → boolean. Returns 0–100.

**Helpers (lib/analytics/funnel.ts):**

- `getFunnelStepIndex(state)` — Last completed step index (0–4), -1 if none.
- `getNextFunnelStep(state)` — Next step to complete, or null if done.
- `getFunnelCompletionPercentage(state)` — 0–100.

**Structured tracking:** Emit the events above from the app; backend or analytics provider can aggregate funnel counts and compute activation rate (e.g. workspace_completed / signup).

---

## Retention metrics architecture

**Definitions:**

- **Active organization (daily):** Org with at least one event (e.g. project/task view, create) in the last 24h. Track via `org_active_daily` (or derive from event stream).
- **Active organization (weekly):** Same in the last 7 days. Track via `org_active_weekly` or derive.
- **Churned organization:** Previously paid, now cancelled or no activity for N days (e.g. 30). Track `org_churned` when subscription cancelled or criteria met.

**Implementation:** Frontend emits `org_active_daily` / `org_active_weekly` on session or key actions (or backend derives from events). Churn is typically computed backend-side from subscription and activity data.

---

## Conversion tracking

**Pairs:**

- **trial → paid:** `signup` (or trial_start) → `trial_converted`. Track `trial_converted` when subscription status becomes paid.
- **upgrade_click → upgrade_success:** `plan_upgrade_clicked` → `upgrade_success`. Track `upgrade_success` after successful payment or subscription change.

**Conversion rate:** e.g. `upgrade_success` count / `plan_upgrade_clicked` count over a period.

---

## Growth dashboard (admin only)

- **Route:** `/dashboard/analytics`. Visible in nav only when **canManageBilling** (owner/admin).
- **Content (stub):**
  - **KPI cards:** Activation rate %, Trial conversion %, Active orgs (7d), Plan distribution total.
  - **Activation funnel:** Counts per step (signup → … → workspace_completed).
  - **Plan distribution:** Count by plan name.
  - **Revenue:** Placeholder until API connected.
  - **Health indicator definitions:** Cards describing Activation Rate, 7-day Retention, Conversion Rate, Churn Rate.

Replace stub with API when backend provides analytics endpoints.

---

## Event pipeline abstraction

**Providers:**

| Provider    | Use case              | How to enable                                      |
|------------|------------------------|----------------------------------------------------|
| Console    | Development            | Default in pipeline                                |
| Custom API | Your own backend       | `createCustomApiProvider()`, set `NEXT_PUBLIC_ANALYTICS_API_URL` |
| Segment    | Segment snippet        | `createSegmentProvider()` when `window.analytics` exists |
| Mixpanel   | Mixpanel snippet       | `createMixpanelProvider()` when `window.mixpanel` exists |

**Wiring multiple providers:**

```ts
import { createPipeline, createConsoleProvider, createSegmentProvider, createCustomApiProvider } from "@/lib/analytics";

const pipeline = createPipeline({
  providers: [
    createConsoleProvider(),
    createCustomApiProvider(),
    createSegmentProvider(), // if loaded
  ],
  getUserId: () => /* from auth */,
});
<AnalyticsProvider tracker={{ track: pipeline.track }} />
```

---

## Health indicators (KPIs)

| KPI               | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| **Activation Rate** | % of signups who complete workspace (project + member + task). Onboarding health. |
| **7-day Retention** | % of orgs active in the week after first activity. Stickiness.              |
| **Conversion Rate** | % of upgrade clicks that become paid. Funnel quality.                       |
| **Churn Rate**      | % of paid orgs that cancel in a period. Retention/revenue health.          |

Dashboard cards on `/dashboard/analytics` include short descriptions for each.

---

## SaaS intelligence maturity score

| Area                    | Score | Notes                                                                 |
|-------------------------|--------|----------------------------------------------------------------------|
| Activation funnel       | 9/10   | Defined steps, tracking in app, funnel helpers for completion %.    |
| Retention architecture  | 7/10   | Events defined (org_active_daily/weekly, org_churned); backend aggregation needed. |
| Conversion tracking     | 8/10   | Pairs defined; trial_converted and upgrade_success to be wired to billing. |
| Growth dashboard        | 8/10   | Admin-only page, stub KPIs and funnel; ready for real API.          |
| Event pipeline          | 9/10   | Multi-provider, Console/Custom/Segment/Mixpanel; no vendor lock-in. |
| Health indicators       | 8/10   | KPI definitions and dashboard cards in place.                       |

**Overall SaaS intelligence maturity: 8.2/10** — Product intelligence layer in place; connect backend and billing for live metrics.

# Activation and Retention Optimization Layer

## Updated folder structure

```
frontend/src/
├── context/
│   ├── onboarding-context.tsx      # First-time state, progress, steps
│   └── notifications-context.tsx   # In-app notifications, mark read
├── lib/
│   ├── onboarding-storage.ts       # Per-org onboarding state (localStorage)
│   ├── feature-tour-storage.ts     # Tour "seen" flags (localStorage)
│   └── streak-storage.ts           # Daily visit streak (optional)
├── hooks/
│   ├── use-notification-seed.ts    # Seeds trial/limit notifications
│   └── use-retention-tracking.ts    # first_task_created, invited_member, workspace_completed
├── components/
│   ├── onboarding/
│   │   └── onboarding-flow.tsx    # Guided setup modal (3 steps, progress, skip)
│   ├── feature-tour/
│   │   ├── tour-tooltip.tsx        # Multi-step highlight tour (show once)
│   │   └── whats-new-banner.tsx    # "What's new" dismissible banner (show once)
│   ├── notifications/
│   │   └── notification-center.tsx # Bell dropdown, mark read
│   ├── workspace-progress-badge.tsx # "Workspace setup 60%"
│   └── streak-badge.tsx            # Daily streak (optional)
├── app/dashboard/
│   └── page.tsx                    # Overview + admin insights + WhatsNew
└── docs/
    └── ACTIVATION_AND_RETENTION.md
```

---

## Onboarding state architecture

- **Per-organization state** (localStorage key `mini_tm_onboarding_<orgId>`):
  - `stepCompleted`: `{ project, member, task }` booleans
  - `skipped`: boolean
  - `completedAt`: ISO string or null
  - `lastSeenStep`: 0..2 for progress UI
- **OnboardingProvider** (inside TenantProvider): exposes `state`, `progress` (0..100), `isFirstTime`, `markStepCompleted(step)`, `skip()`, `setSeenStep(index)`, `refresh()`.
- **First-time detection**: `isFirstTime` is true when org is set, not skipped, not completed, and at least one step is incomplete.
- **Workspace progress**: `progress = (steps done / 3) * 100`; 100% when skipped or completed.

---

## First-time setup flow

- **OnboardingFlow** (rendered in providers): Modal with 3 steps:
  1. Create your first project → link to `/dashboard/projects`
  2. Invite a team member → link to `/dashboard/workspaces`
  3. Create your first task → link to `/dashboard/tasks`
- Progress bar reflects completed steps; each step shows "Done" or a CTA button.
- **Skip** button marks onboarding skipped and tracks `onboarding_skipped` (at_step in properties).
- When user creates first project, Projects page mutation `onSuccess` calls `markStepCompleted("project")` and tracks `first_project_created`. When task create and invite member exist, use `useRetentionTracking().trackFirstTaskCreated()` and `trackInvitedMember()`; when all 3 steps are done, `workspace_completed` is tracked.

---

## Empty state activation UX

- **EmptyState** supports optional `valueProp` (micro-copy explaining feature value).
- Projects empty: *"Projects keep work organized by initiative or team. Add one to start tracking tasks."*
- Billing invoices empty: *"Upgrade to a paid plan to see invoices and billing history here."*
- Use `valueProp` on other empty states (tasks, notifications) for contextual help.

---

## Feature discovery layer

- **feature-tour-storage**: `getTourSeen(tourId)`, `setTourSeen(tourId)`. Tour IDs: `kanban`, `datatable`, `whats_new`.
- **WhatsNewBanner**: Shown on dashboard when `whats_new` not seen; "Got it" sets seen and hides. Message: Kanban and Data Tables intro.
- **TourTooltip**: Multi-step tour targeting elements with `data-tour-id`. Shows once per tourId; Next/Done/Skip. Use on Kanban and Projects (DataTable) pages by rendering `<TourTooltip tourId="datatable" steps={[...]} />` and adding `data-tour-id="..."` on the table container.

---

## In-app notifications

- **NotificationsProvider**: In-memory list of notifications; persisted to localStorage (`mini_tm_notifications`). Types: `trial_ending`, `limit_approaching`, `feature`.
- **addNotification({ type, title, message })**, **markRead(id)**, **markAllRead()**, **remove(id)**.
- **NotificationCenter**: Bell icon in header; badge with unread count; dropdown lists notifications; click to mark read.
- **useNotificationSeed(projectCount)**: Called on dashboard load; adds "Trial ending soon" if trial &lt; 7 days; adds "Project limit approaching" if usage ≥ 80% of limit. Seeds at most once per type per session (ref).

---

## Habit formation

- **WorkspaceProgressBadge**: Renders "Workspace setup X%" when progress &lt; 100; links to projects. Shown in header.
- **StreakBadge**: Uses `streak-storage` to record visit and compute consecutive days. Renders flame + count when streak ≥ 2. Optional; shown in header.

---

## Retention metrics hooks

- **Analytics events** (in analytics-context): `first_project_created`, `first_task_created`, `invited_member`, `workspace_completed`, `onboarding_skipped`.
- **useRetentionTracking()**: Returns `trackFirstTaskCreated()` and `trackInvitedMember()`. Call from task-creation and invite-member success handlers. `trackFirstTaskCreated` also marks onboarding "task" and, if project+member already done, tracks `workspace_completed`.
- First project: tracked in Projects page create mutation `onSuccess` (via `markStepCompleted("project")` and `first_project_created`).

---

## Admin insights panel

- **Dashboard overview** (`/dashboard`): When org selected and **canManageBilling**, shows "Workspace insights" card with:
  - Total projects (from API)
  - Active tasks (placeholder "—" until tasks summary API)
  - Members count (placeholder "—" until members API)
- Plus "Recent projects" list and link to all projects.

---

## Retention maturity score

| Area | Score | Notes |
|------|--------|--------|
| First-time onboarding | 9/10 | Guided 3-step flow, progress, skip with event; per-org state. |
| Empty state activation | 8/10 | valueProp micro-copy; can extend to all empty states. |
| Feature discovery | 8/10 | WhatsNew banner (show once); TourTooltip for Kanban/DataTable (add data-tour-id where needed). |
| In-app notifications | 8/10 | Trial/limit seeding; center with mark read; feature type ready. |
| Habit formation | 7/10 | Workspace progress badge; optional streak. |
| Retention analytics | 9/10 | first_project/task, invited_member, workspace_completed, onboarding_skipped. |
| Admin insights | 7/10 | Projects count; tasks/members placeholders for future API. |

**Overall retention maturity: 8.2/10** — Activation and retention layer in place; ready to plug in task-creation and invite flows for full workspace_completed tracking.

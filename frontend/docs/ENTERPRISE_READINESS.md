# Enterprise Readiness & Operational Tooling

## Updated folder structure

```
frontend/src/
├── app/dashboard/
│   ├── audit/
│   │   └── page.tsx              # Audit log viewer (admin only)
│   └── settings/
│       ├── page.tsx              # Settings hub
│       ├── organization/
│       │   └── page.tsx          # Org name/slug, subscription, danger zone
│       ├── permissions/
│       │   └── page.tsx         # Role & permission matrix
│       ├── api-keys/
│       │   └── page.tsx         # API keys (UI pattern, backend stub)
│       ├── webhooks/
│       │   └── page.tsx         # Webhooks (UI architecture, stub)
│       ├── export/
│       │   └── page.tsx         # Data export (stub CSV + progress)
│       └── sso/
│           └── page.tsx         # SSO coming soon (enterprise visibility)
├── components/
│   └── observability/
│       └── system-status-widget.tsx  # Health check, last deploy stub
├── services/api/
│   └── activity-logs.api.ts     # fetchActivityLogs(page, limit)
└── docs/
    └── ENTERPRISE_READINESS.md
```

---

## Enterprise module breakdown

| Module | Purpose | Access | Backend |
|--------|--------|--------|--------|
| **Audit log** | View activity by entity_type, action, user, date range; pagination | Owner/Admin | GET /activity-logs (exists) |
| **Roles & permissions** | Read-only matrix: owner, admin, member vs capabilities | All | None |
| **Organization settings** | Update name/slug, subscription status, danger zone (delete placeholder) | Owner/Admin for edit | GET org exists; PATCH stub |
| **API keys** | Create, revoke, copy (masked); role-based (owner only create/revoke) | Owner/Admin | Stub |
| **Webhooks** | Add endpoint, select events, delivery status placeholder | Owner/Admin | Stub |
| **Data export** | Export data button, stub CSV flow, progress indicator | All | Stub |
| **SSO** | “Coming soon” placeholder; enterprise plan–only messaging | All (content varies by plan) | None |
| **Observability** | System status widget, last deployment stub, health link; 5xx via existing banner | Admin on dashboard | GET /health (exists) |

---

## Audit log UI

- **Route:** `/dashboard/audit`. Nav and command palette: admin/owner only.
- **API:** `fetchActivityLogs(page, limit)` → GET `/activity-logs` with TenantGuard (X-Organization-Id).
- **Filters (client-side):** Entity type, action, user ID, date from, date to. Applied to current page data; backend filtering can be added later.
- **Pagination:** Page/limit via API; Previous/Next with meta.totalPages.
- **Secure access:** Page and nav gated by `canManageBilling` (owner/admin).

---

## Permission matrix

- **Route:** `/dashboard/settings/permissions`.
- **Content:** Read-only table: rows = capabilities (billing, audit, analytics, org settings, API keys, webhooks, invite, projects, tasks, export), columns = owner, admin, member. Checkmarks indicate allowed.
- **Optional:** Note on feature toggles / custom roles when backend supports.

---

## Organization settings

- **Route:** `/dashboard/settings/organization`.
- **Details:** Name and slug inputs (prefilled from `fetchOrganization`); “Save” disabled with note until backend PATCH exists.
- **Subscription:** Plan name and status from `usePlan()`; link to “Manage billing”.
- **Danger zone:** “Delete organization” with short warning; button disabled “contact support” until backend supports.

---

## API keys UI pattern

- **Route:** `/dashboard/settings/api-keys`.
- **Create:** Name input + “Create” (disabled, backend not implemented). When backend exists: POST, show key once, then masked.
- **List:** Name, masked key (e.g. `mtm_••••••••••••abc`), last used; Copy (placeholder) and Revoke (owner only, disabled).
- **Role:** Create/revoke restricted to `canManageBilling` (owner/admin).

---

## Webhook architecture UI

- **Route:** `/dashboard/settings/webhooks`.
- **Add endpoint:** URL input; event checkboxes (e.g. project.created, task.created, task.updated, member.invited); “Add” disabled until backend.
- **List:** URL, events, last delivery status + time (placeholder). “Remove” for owner/admin, disabled until backend.
- **Backend contract (for later):** POST /webhooks (url, events[]), GET /webhooks, DELETE /webhooks/:id, GET /webhooks/:id/deliveries.

---

## Data export

- **Route:** `/dashboard/settings/export`.
- **UI:** “Export data (CSV)” button; on click, stub progress bar 0→100% then “Complete (stub)”. Real implementation: call export API, poll or stream, then download.

---

## SSO preparation

- **Route:** `/dashboard/settings/sso`.
- **Content:** “Coming soon” card. If plan name is “Enterprise” (or similar), show “SSO will be available for your Enterprise plan.” Else show “SSO is available on the Enterprise plan” and link to billing.

---

## Operational observability

- **System status widget:** Rendered on dashboard for admin/owner. Shows health (fetch to `config.apiOrigin/health`), last deployment (stub from `NEXT_PUBLIC_DEPLOY_TIME` or “—”), link to health endpoint.
- **5xx / errors:** Existing ErrorBanner5xx and GlobalErrorToast unchanged; no extra spike logic in this pass.

---

## Enterprise readiness score

| Area | Score | Notes |
|------|--------|--------|
| Audit log UI | 9/10 | Filters, pagination, admin-only; backend exists. |
| Role & permission matrix | 8/10 | Read-only table in place. |
| Organization settings | 7/10 | View + subscription; update/delete stubbed. |
| API keys UI | 7/10 | Pattern and role restriction; backend stub. |
| Webhooks UI | 7/10 | Add/list and events; delivery stub. |
| Data export | 7/10 | Stub flow and progress; backend stub. |
| SSO preparation | 8/10 | Placeholder and enterprise visibility. |
| Observability | 8/10 | Status widget and health link; deploy time stub. |

**Overall enterprise readiness: 7.6/10** — Operational and enterprise UI in place; connect backend for PATCH org, API keys, webhooks, and export to reach full readiness.

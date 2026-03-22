# Plan limits (workspaces, projects, tasks)

Canonical **per-workspace** limits are defined in:

- Runtime upsert: [`src/modules/billing/plan-seed.service.ts`](../src/modules/billing/plan-seed.service.ts) (on API startup)
- Full demo seed: [`src/infrastructure/database/seed/run-seed.ts`](../src/infrastructure/database/seed/run-seed.ts)

## Per plan (workspace / organization)

| Slug | maxProjects | maxUsers | storageLimitGb |
|------|-------------|----------|----------------|
| `free` | 1 | 5 | 5 |
| `starter` | 10 | 10 | 5 |
| `pro` | unlimited (`null`) | unlimited | 100 |
| `enterprise` | unlimited | unlimited | unlimited (`null`) |

`null` numeric limits mean **unlimited** in [`UsageService.checkLimit`](../src/modules/billing/usage.service.ts).

## Not limited by plan (current code)

- **Number of workspaces** a user may create (no `CheckSubscriptionLimit` on org create).
- **Number of tasks** (only attachment **storage** is capped via `storage_limit_gb`).

## Enforcement

- New **projects**: `@CheckSubscriptionLimit('projects')` on `POST /projects`.
- New **members** (invites): `@CheckSubscriptionLimit('users')` on organization invitations.
- **Attachments**: storage usage vs `storage_limit_gb`.

After changing limits, restart the API so `PlanSeedService` upserts, or run `npm run seed` for a fresh database.

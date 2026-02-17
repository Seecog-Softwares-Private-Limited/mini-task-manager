# Security Integration Tests

## Overview

`security-integration.e2e-spec.ts` validates the security hardening applied after the SECURITY_AUDIT_REPORT:

1. **Tenant isolation** – User from Tenant A cannot access Tenant B’s project, task, workflow, sprint, or custom fields by id or list-by-project (expect 404/empty).
2. **Notification IDOR** – User A cannot mark User B’s notification as read (expect 404).
3. **Users endpoint** – User cannot GET another user’s profile (expect 403).
4. **Positive control** – Same-tenant access and own-profile/own-notification access still work.

## Requirements

- **Database:** MySQL running with the same config as development (or set `DB_DATABASE=mini_task_manager_test`). Migrations must be applied so the schema exists.
- **Env:** No special env required; uses same config as the app (e.g. `JWT_SECRET` for login).

**Bootstrap / DI:** Any module that uses `TenantGuard` must import `OrganizationsModule` so that `ORGANIZATION_MEMBERS_REPOSITORY` is in scope when the guard is resolved. See `docs/INTEGRATION-TEST-DI-FIX.md`.

**Note:** If tests fail in `beforeAll` with `DataTypeNotSupportedError: Data type "Object" in "...Entity.column"`, TypeORM is inferring column types from ts-jest’s emitted metadata. Add explicit `type: 'varchar'` (or the correct type) to the reported entity column so TypeORM does not infer `Object`.

## Commands

```bash
# Run only security integration tests
npm run test:security

# Run all e2e/integration tests (any file matching .e2e-spec.ts or .integration-spec.ts)
npm test
```

## Test structure

| Suite | What it does |
|-------|----------------|
| **1. Tenant isolation** | As User A (org A), request Tenant B’s project/task/workflow/sprint by id → 200 + null. List tasks/workflows/sprints/custom-fields by Tenant B’s project id with org A header → empty data. |
| **2. Notification IDOR** | As User A, PATCH notification owned by User B → 404. |
| **3. Users endpoint** | As User A, GET User B’s profile → 403. |
| **4. Positive control** | As User A with X-Organization-Id: org A, GET project/task/workflow/sprint in org A → 200 + body. List tasks/custom-fields by project A → non-empty. GET own user profile → 200. PATCH own notification → 200. |

Seeding is done once in `beforeAll`: two users (with hashed password), two orgs, two memberships, two projects, one task/workflow/sprint/custom-field in org A, one notification for User B. Then login via `POST /api/v1/auth/login` to get JWTs. No application code is refactored; tests use the real HTTP layer, guards, and services.

## Seed data integrity and DB reset

**Root cause of past FK failures:** Inserts were failing with foreign key errors (e.g. `organizations.owner_id` REFERENCES `users(id)`) for two reasons: (1) **Insert order / visibility** – when using the default DataSource (no transaction), inserts can be visible on different connections or in an order that doesn’t match FK dependencies. (2) **Leftover seed data** – re-runs with the same seed emails/ids caused unique or FK conflicts. (3) **BINARY(16) IDs** – TypeORM’s UUID transformer expects string UUIDs; after `find(..., select: ['id'])` the driver can return `id` as a Buffer, and passing that into `In(...)` or entity `create()` caused transformer errors or wrong references.

**Fix applied:**

- **Single transaction for seed** – The entire seed runs inside `dataSource.transaction(async (manager) => { ... })`. All inserts use `manager.getRepository(Entity)` and sequential `await save()`, so insert order is correct and every row is visible to the next within the same transaction.
- **Explicit UUIDs** – Seed uses explicit `generateUuid()` values for every entity (users, orgs, projects, tasks, etc.) and passes those same string IDs into child entities (e.g. `ownerId: userAId`). This avoids relying on `entity.id` after save (which may be a Buffer in some drivers).
- **Cleanup before seed** – `cleanupSeedData(dataSource)` runs before seeding. It finds users by seed emails, then deletes in **reverse FK order** (e.g. task-related tables → projects → org members → orgs → users) so re-runs start from a clean state. FK checks remain enabled; no truncate-all or constraint disabling.
- **BINARY(16) deletes** – Cleanup uses a small helper that runs `DELETE ... WHERE column IN (UNHEX(:h0), ...)` via the query builder so the UUID transformer is not applied to array elements (avoiding `value.replace is not a function`).

**Recommended strategy for reliable test runs:**

1. Use a dedicated test database (e.g. `DB_DATABASE=mini_task_manager_test`) when possible.
2. Run cleanup before seed (as in `beforeAll`) so each run starts from a clean slate for the seed identities.
3. Do not disable FK constraints or modify migrations; keep real DB enforcement so tests validate the real schema.

## Coverage

- **Cross-tenant by id:** projects, tasks, workflows, sprints (all return null when resource is in another tenant).
- **Cross-tenant list-by-project:** tasks, workflows, sprints, custom-fields (all return empty when project is in another tenant).
- **IDOR:** notifications markAsRead restricted to owner (404 otherwise).
- **Users:** GET /users/:id restricted to self (403 for other id).
- **No false negatives:** Same-tenant and self-access paths are asserted to return 200 with expected data.

If tenant isolation or ownership checks are removed or relaxed, these tests will fail (e.g. cross-tenant request would return data, or status would not be 404/403).

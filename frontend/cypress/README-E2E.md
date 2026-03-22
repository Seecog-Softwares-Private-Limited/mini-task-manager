# Cypress E2E – How to run locally

## Prerequisites

- **Backend** running (e.g. `npm run start:dev` in repo root) with DB seeded.
- **Frontend** running (e.g. `npm run dev` in `frontend/`). For E2E, use a different port so Cypress baseUrl doesn’t conflict:
  ```bash
  PORT=3001 npm run dev
  ```
- **Test users** in the database:
  - At least one user with **owner or admin** role (for billing, audit, system status).
  - Optionally a **member** user (for billing visibility and tenant tests).
  - Optionally a second user in a **different organization** (for tenant isolation).

## Environment

Set in repo-root **`properties.env`** (Cypress loads it via `cypress.config.ts`) or export vars in the shell before `npm run test:e2e`:

| Variable | Description | Example |
|----------|-------------|--------|
| `CYPRESS_BASE_URL` | Frontend URL (default `http://localhost:3001`) | `http://localhost:3001` |
| `CYPRESS_API_URL` | Backend API base (default from `NEXT_PUBLIC_API_URL`) | `http://localhost:3000/api/v1` |
| `CYPRESS_TEST_USER_EMAIL` | Admin/owner test user email | `owner@example.com` |
| `CYPRESS_TEST_USER_PASSWORD` | Admin/owner test user password | `Password123!` |
| `CYPRESS_TEST_MEMBER_EMAIL` | Member test user email (billing, tenant tests) | `member@example.com` |
| `CYPRESS_TEST_MEMBER_PASSWORD` | Member test user password | `Password123!` |
| `CYPRESS_TEST_ORG_ID` | Optional. Default org to set after login (so dashboard/projects work without selecting org in UI). | UUID of test org |

## Run E2E

From **frontend** directory:

```bash
# Headless (CI-style)
npm run test:e2e

# Interactive
npm run test:e2e:open
```

With env:

```bash
CYPRESS_BASE_URL=http://localhost:3001 CYPRESS_TEST_USER_EMAIL=admin@test.com CYPRESS_TEST_USER_PASSWORD=secret npm run test:e2e
```

## Folder structure

```
frontend/
  cypress.config.ts       # baseUrl, env.apiUrl, timeouts
  cypress/
    e2e/
      auth.cy.ts         # Login, logout, session expiry
      onboarding.cy.ts   # First-time onboarding, create project
      project-task.cy.ts # Project + task flow, Kanban, plan limit
      billing.cy.ts      # Billing visibility (member vs admin)
      tenant.cy.ts       # Tenant isolation (User A vs User B)
      enterprise.cy.ts   # Audit log, system health widget
    support/
      e2e.ts             # Imports commands
      commands.ts        # login(), logout(), createProject(), createTask()
    fixtures/
      users.json         # Doc only; credentials from env
```

## Custom commands

- **`cy.login({ email, password, orgId? })`** – POSTs to `/auth/login`, sets `mini_tm_token` and `mini_tm_org_id` in localStorage and auth cookie.
- **`cy.logout()`** – Clears token, org, and cookie.
- **`cy.createProject({ name, description?, visibility? })`** – POSTs to `/projects` with current token/org; yields `{ id, name }`.
- **`cy.createTask({ projectId, organizationId, title, ... })`** – POSTs to `/tasks`; yields `{ id, title, statusId? }`.

## CI-ready notes

- Use **`npm run test:e2e`** in CI; no GUI.
- Set **`CYPRESS_BASE_URL`** and **`CYPRESS_API_URL`** to your deployed frontend/backend (or staging).
- Set **`CYPRESS_TEST_USER_EMAIL`** / **`CYPRESS_TEST_USER_PASSWORD`** (and member vars if running billing/tenant specs).
- Ensure backend has **seed data** or create test users in a CI seed step.
- Optional: set **`VIDEO=true`** in `cypress.config.ts` for failure videos; **`screenshotOnRunFailure: true`** is already on.

# Runtime and Feature Readiness

This document summarizes startup lifecycle, failure points, dependency risks, feature readiness by module, and a prioritized remediation backlog.

---

## 1. Startup Lifecycle and Failure Points

### Entry points

| Entry | Command | Behavior |
|-------|--------|----------|
| **Universal** | `node app.js` | Chooses dev or prod from `NODE_ENV` / `APP_MODE`; runs `src/main.ts` (ts-node) or `dist/main.js`. |
| **Nest CLI dev** | `npm run start:dev` | Nest in watch mode (no app.js). |
| **Nest CLI prod** | `npm run start:prod` | Runs `node dist/main` (no app.js). |
| **App scripts** | `npm run start:app` / `start:app:dev` / `start:app:prod` | All go through `app.js` with optional mode override. |

### Bootstrap sequence (Nest)

1. **Config load** — `bootstrap-env` + `ConfigModule` load repo-root **`properties.env` only** (no `.env` / `.env.local`), then `configuration()` / `validate()`.  
   - **Failure**: Missing or invalid env (e.g. production without `JWT_SECRET`) → throw in `configuration()` or `validate()`.
2. **DB connection** — `DatabaseModule` uses TypeORM `forRootAsync` with config.  
   - **Failure**: MySQL unreachable, wrong credentials, or DB missing → TypeORM connection error; process exits in `bootstrap().catch()`.
3. **Module init** — All feature modules (Auth, Tasks, Billing, etc.) are registered.  
   - **Failure**: Any module constructor or `onModuleInit` throwing (e.g. missing Razorpay key in prod) can abort startup.
4. **Listen** — `app.listen(port)`.  
   - **Failure**: Port in use → EADDRINUSE.

### Common failure points

- **DB not created**: Create DB first (`CREATE DATABASE mini_task_manager ...`) or migrations may fail; at runtime, connection fails if DB does not exist.
- **Migrations not run**: Tables may be missing → 500s or "Table doesn't exist" at first API use.
- **Production without JWT_SECRET**: Config validation throws; app refuses to start.
- **Production with DB_SYNCHRONIZE=true**: Env validation throws (safety guard).
- **Dev without ts-node/tsconfig-paths**: `node app.js` in dev mode exits with an actionable message.

---

## 2. Dependency / Runtime Risk Matrix

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **MySQL down or wrong credentials** | App won’t start or requests fail | Medium | Env checks in app.js (hints); health endpoint; document DB setup. |
| **Missing properties.env** | Wrong defaults (e.g. DB password), possible hardcoded fallbacks | Medium | app.js warns; remove hardcoded defaults in config (see P1). |
| **Migrations out of order or partial** | Schema mismatch, runtime errors | Low | Document migration order; prefer single bootstrap migration for fresh installs. |
| **CORS misconfiguration** | Frontend (e.g. :3001) blocked in prod | Medium | Set `CORS_ORIGIN` in prod; doc in README. |
| **JWT_SECRET default in prod** | Security | High | Already blocked by config validation. |
| **DB_SYNCHRONIZE in prod** | Data loss risk | High | Already blocked by env validation. |
| **Auth guard / tenant context** | Wrong org/project data exposure | High | TenantGuard + JWT; audit tenant scoping on all multi-tenant endpoints. |
| **Razorpay / billing env missing** | Billing flows fail or throw | Low | Document optional env; fail gracefully in billing service. |

---

## 3. Feature Readiness by Module

| Module | Readiness | Notes |
|--------|-----------|--------|
| **Auth** | ✅ Ready | Login, JWT, guards, optional Google OAuth. |
| **Users** | ✅ Ready | CRUD, last-seen, profile. |
| **Organizations** | ✅ Ready | CRUD, members, roles. |
| **Projects** | ✅ Ready | CRUD, project-scoped access. |
| **Workflows** | ✅ Ready | Statuses, board columns. |
| **Tasks** | ✅ Ready | Full CRUD, assignees, subtasks, status, filters; used by board and list views. |
| **Sprints** | ✅ Ready | Sprint association for tasks. |
| **Custom fields** | ✅ Ready | Extensible task metadata. |
| **Invitations** | ✅ Ready | Invite flow, email (SMTP/MailHog). |
| **Activity logs** | ✅ Ready | Audit trail for key actions. |
| **Notifications** | ✅ Ready | In-app notifications. |
| **Billing** | ⚠️ Partial | Plans, subscriptions, usage, Razorpay integration; requires RAZORPAY_* env for payments. |
| **Analytics** | ⚠️ Partial | Org-level analytics; role-gated (owner/admin). |
| **API keys** | ✅ Ready | API key CRUD for programmatic access. |
| **Health** | ✅ Ready | Liveness/readiness for k8s or load balancers. |

---

## 4. Immediate Remediation Backlog

### P0 (Critical)

- **None** — No P0 items identified for normal dev/prod startup. JWT and DB_SYNCHRONIZE are already guarded.

### P1 (High)

- **Remove hardcoded DB password in config** — `src/config/configuration.ts` has a default `DB_PASSWORD` fallback (`'Nikhil-700'`). Prefer no default or empty so missing `properties.env` is obvious; app.js already warns when DB_* are unset.
- **Ensure properties.env.example includes DB and JWT** — Template exists; new clones copy to `properties.env` and set values.

### P2 (Medium)

- **Document CORS_ORIGIN for production** — In README and optional deployment doc, state that production frontend origin must be set (e.g. `CORS_ORIGIN=https://app.example.com`).
- **Optional migration status hint** — In dev startup (e.g. in app.js or a small Nest hook), log a one-line reminder to run migrations if not run (e.g. check a known table exists). Non-blocking.
- **Billing env documentation** — List RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (and any webhook secret) in properties.env.example or README so payment flows are configurable.

### P3 (Low)

- **Health check for DB** — Ensure `/health` or similar uses TypeORM connection check so orchestrators can detect DB failures.
- **Structured startup logging** — Log mode (dev/prod), port, and API prefix on one line for easier ops debugging.

---

## 5. Summary

- **Startup**: Use `node app.js` (or `npm run start:app`) for a single entrypoint; dev uses ts-node, prod uses `dist/main.js` after `npm run build`.
- **Risks**: DB and env are the main failure sources; config validation already prevents dangerous production defaults (JWT, synchronize).
- **Features**: Core task/project/org/auth and billing/analytics surfaces are implemented; billing and analytics are suitable for production with correct env and roles.
- **Next steps**: P1 (config defaults and `properties.env.example`) and P2 (CORS and billing env docs) give the highest benefit for minimal change.

# Production Release Checklist — First Manual Deployment

Use this checklist for the first (and subsequent) manual Docker production deployment. No CI/CD; all steps are manual verification and execution.

---

## How to Use This Checklist

- **Go / No-Go**: At each gate, complete every item. If any item fails, fix before proceeding or abort.
- **Sign-off**: Optionally initial/date each section when done.
- **Rollback**: If post-deployment checks fail, follow the Rollback Strategy section immediately.

---

# 1. Pre-Deployment Verification

## 1.1 Environment Variables Validation

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 1.1.1 | All required env vars are documented and set for production. | Compare against the table below; ensure no required var is missing. | ☐ |
| 1.1.2 | No `properties.env` / secrets committed in the image (use runtime env or secret manager). | Do not COPY `properties.env` into Dockerfile; use `-e`, `env_file`, or secrets at run. | ☐ |

**Required production environment variables:**

| Variable | Required | Example / Note |
|----------|----------|----------------|
| `NODE_ENV` | Yes | Must be `production` (also set in Dockerfile). |
| `JWT_SECRET` | Yes | Strong random value; app refuses to start if default or unset in prod. |
| `DB_HOST` | Yes | MySQL host (e.g. RDS endpoint or container name). |
| `DB_PORT` | Yes | Usually `3306`. |
| `DB_USERNAME` | Yes | DB user. |
| `DB_PASSWORD` | Yes | Strong password; not validated by app but must be set. |
| `DB_DATABASE` | Yes | Database name (e.g. `mini_task_manager`). |
| `PORT` | No | Default `3000`; set if container port differs. |
| `API_PREFIX` | No | Default `api/v1`. |
| `FRONTEND_URL` | Yes | Public URL where users open the app in a browser (e.g. `http://3.110.214.243:3000`). Used for invite, verification, and password-reset links in emails. Must **not** be `localhost` in production — API refuses to start otherwise. |
| `CORS_ORIGIN` | Recommended | Same origin as the frontend (e.g. `http://3.110.214.243:3000`). |
| `THROTTLE_*` | No | Override defaults if needed (see 1.5). |

---

## 1.2 JWT Secret Verification

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 1.2.1 | `JWT_SECRET` is set in the production environment. | `echo $JWT_SECRET` (or inspect run config); must be non-empty. | ☐ |
| 1.2.2 | `JWT_SECRET` is not the default string `change-me-in-production`. | Value must differ; app throws on startup if default in prod. | ☐ |
| 1.2.3 | Secret is stored in a secure place (e.g. secret manager), not in repo or plain env file in image. | Operational review. | ☐ |

---

## 1.3 DB Connection Verification

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 1.3.1 | MySQL is reachable from the host/network where the container will run. | From deploy host: `mysql -h $DB_HOST -P $DB_PORT -u $DB_USERNAME -p$DB_PASSWORD -e "SELECT 1"` (or use a DB client). | ☐ |
| 1.3.2 | Target database exists. | `mysql ... -e "USE $DB_DATABASE; SELECT 1"`. | ☐ |
| 1.3.3 | User has sufficient privileges (SELECT, INSERT, UPDATE, DELETE, and any needed for migrations). | Run a read and write test query or run migrations in dry-run. | ☐ |

---

## 1.4 DB_SYNCHRONIZE=false Confirmation

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 1.4.1 | `DB_SYNCHRONIZE` is not set to `true` in production. | Ensure env does not include `DB_SYNCHRONIZE=true`. Unset or set to `false`. | ☐ |
| 1.4.2 | App will refuse to start if `NODE_ENV=production` and `DB_SYNCHRONIZE=true`. | Code enforced in `config/env.validation.ts`. | ☐ |

---

## 1.5 Throttle Config Confirmation

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 1.5.1 | Auth throttle is acceptable (default 10 requests per 60s per IP for login). | Confirm `THROTTLE_AUTH_LIMIT` / `THROTTLE_AUTH_TTL_MS` or defaults are acceptable. | ☐ |
| 1.5.2 | General API throttle is acceptable (default 100 per 60s per user). | Confirm `THROTTLE_GENERAL_LIMIT` / `THROTTLE_GENERAL_TTL_MS` or defaults. | ☐ |

Defaults: auth 10/60s, general 100/60s (see `src/config/configuration.ts`).

---

## 1.6 NODE_ENV=production Confirmation

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 1.6.1 | `NODE_ENV` is `production` at container runtime. | Set in Dockerfile; if overriding at run, use `-e NODE_ENV=production`. | ☐ |

---

**Gate 1 — Go / No-Go:** All items in §1 completed and passed. ☐ **GO** / ☐ **NO-GO**

---

# 2. Database Safety

## 2.1 Backup Strategy Before Deployment

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 2.1.1 | Full backup of the production database is taken before any schema or app change. | Run `mysqldump` (or provider backup) and verify backup file/restore path. | ☐ |
| 2.1.2 | Backup is stored in a safe location and retention is defined. | Operational. | ☐ |
| 2.1.3 | Point-in-time or backup restore has been tested (optional but recommended). | Restore to a test DB and verify. | ☐ |

---

## 2.2 Migration Verification

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 2.2.1 | Pending migrations are identified. | Run migrations in dry-run or against a copy of prod DB. | ☐ |
| 2.2.2 | Migrations are applied in a controlled way (e.g. run migration job before or during deploy, not via app `synchronize`). | Use `npm run migration:run` (or equivalent) with production DB URL; do not use `DB_SYNCHRONIZE=true`. | ☐ |
| 2.2.3 | Migration order and rollback (if any) are documented or scripted. | TypeORM migrations; note that down-migrations may not exist—document manual rollback if needed. | ☐ |

---

## 2.3 Connection Pool Limits Check

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 2.3.1 | `DB_CONNECTION_LIMIT` is set appropriately for the instance (default 10). | Per container: 10 is default; increase if needed; ensure DB `max_connections` supports (instances × limit). | ☐ |
| 2.3.2 | `DB_QUEUE_LIMIT` is reviewed (default 0 = no queue). | Set if you want to queue when pool is full; 0 = fail fast. | ☐ |

---

## 2.4 Index Review

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 2.4.1 | Critical query paths have indexes (e.g. tenant/org filters, user lookups, FKs used in WHERE). | Review migrations and entity definitions; run `EXPLAIN` on key queries if needed. | ☐ |
| 2.4.2 | No redundant or unused indexes that slow writes. | Optional: review index list in DB. | ☐ |

---

**Gate 2 — Go / No-Go:** All items in §2 completed and passed. ☐ **GO** / ☐ **NO-GO**

---

# 3. Container Verification

## 3.1 Build Image Locally

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 3.1.1 | Image builds without error. | `docker build -t mini-task-manager:release .` | ☐ |
| 3.1.2 | Build uses multi-stage; no dev dependencies in final image. | Dockerfile uses `npm ci --omit=dev` in production stage. | ☐ |
| 3.1.3 | Tag for this release (e.g. `mini-task-manager:2025-02-17` or `mini-task-manager:v1.0.0`) for rollback. | `docker tag mini-task-manager:release mini-task-manager:<release-tag>` | ☐ |

---

## 3.2 Verify Image Size

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 3.2.1 | Image size is reasonable (e.g. &lt; 500 MB for Node Alpine). | `docker images mini-task-manager:release` | ☐ |

---

## 3.3 Verify Non-Root User

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 3.3.1 | Container runs as non-root. | `docker run --rm mini-task-manager:release id` → should show `uid=1001(nestjs)`. | ☐ |

---

## 3.4 Health Endpoint Test Inside Container

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 3.4.1 | Start container with production-like env (DB reachable, JWT_SECRET set). | `docker run -d --name prod-check -e NODE_ENV=production -e JWT_SECRET=<secret> -e DB_HOST=... -e DB_PORT=3306 -e DB_USERNAME=... -e DB_PASSWORD=... -e DB_DATABASE=... -p 3000:3000 mini-task-manager:release` | ☐ |
| 3.4.2 | Health returns 200. | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health` → `200` | ☐ |
| 3.4.3 | Health response includes DB status. | `curl -s http://localhost:3000/api/v1/health` → JSON with database check. | ☐ |
| 3.4.4 | Stop test container. | `docker stop prod-check && docker rm prod-check` | ☐ |

---

**Gate 3 — Go / No-Go:** All items in §3 completed and passed. ☐ **GO** / ☐ **NO-GO**

---

# 4. Post-Deployment Smoke Tests

Run these **after** the new container is live and receiving traffic (or on the target port).

## 4.1 Login Test

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 4.1.1 | Login returns 201 and an access token. | `curl -s -X POST http://<host>:<port>/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"<valid-user>","password":"<valid-password>"}'` → status 201, body contains `accessToken`. | ☐ |
| 4.1.2 | Invalid credentials return 401 (or expected error). | Same with wrong password → non-2xx, no token. | ☐ |

---

## 4.2 Cross-Tenant Isolation Test

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 4.2.1 | User A cannot access User B’s project by ID. | As User A, `GET /api/v1/projects/<project-B-id>` with User A’s token and User A’s org header → 200 with null/empty or 404, not B’s data. | ☐ |
| 4.2.2 | List endpoints respect tenant (e.g. tasks by project). | As User A, list tasks for Project B’s ID with User A’s org → empty list. | ☐ |

(Align with `test/security-integration.e2e-spec.ts` behavior.)

---

## 4.3 Throttle Test

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 4.3.1 | Exceeding login attempts returns 429. | Send &gt; auth limit (e.g. 11) login requests in quick succession from same IP → one returns 429. | ☐ |
| 4.3.2 | Exceeding general API limit returns 429. | With valid token, send &gt; general limit (e.g. 101) requests to same endpoint → one returns 429. | ☐ |

---

## 4.4 Health Endpoint Test

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 4.4.1 | Health returns 200 from outside. | `curl -s -o /dev/null -w "%{http_code}" http://<host>:<port>/api/v1/health` → `200`. | ☐ |
| 4.4.2 | Response indicates database is up. | JSON has database status healthy. | ☐ |

---

## 4.5 Graceful Shutdown Test

| # | Check | How to Verify | Go / No-Go |
|---|--------|----------------|------------|
| 4.5.1 | Sending SIGTERM stops the process without leaving connections hanging (optional but recommended). | Run container; send `docker stop -t 15 <container>`; check container exits and DB connections are closed (e.g. check MySQL `SHOW PROCESSLIST` before/after). | ☐ |

---

**Gate 4 — Go / No-Go:** All items in §4 completed and passed. ☐ **GO** / ☐ **NO-GO**

---

# 5. Rollback Strategy

## 5.1 Previous Image Tagging Strategy

| Action | Command / Convention |
|--------|----------------------|
| Before deploying new image | Tag current running image: `docker tag <current-image> mini-task-manager:rollback-pre-<date>` (e.g. `rollback-pre-2025-02-17`). |
| Keep last known good | Always keep at least one tagged image (e.g. `mini-task-manager:v1.0.0`) that is known good. |
| Rollback | Stop new container; start container from `mini-task-manager:rollback-pre-<date>` (or last good tag) with same env and port. |

---

## 5.2 DB Rollback Considerations

| Scenario | Action |
|----------|--------|
| App-only rollback | No DB change; switch container to previous image. |
| Migrations already applied | New image may expect new schema; rolling back app to old image may require rolling back migrations (manual or down scripts). Prefer backward-compatible migrations (add column nullable, then backfill, then make non-null in next release). |
| If migration failed mid-way | Restore from backup if necessary; fix migration; re-run in controlled way. |

---

## 5.3 Log Review Procedure

| Step | Action |
|------|--------|
| 1 | Collect container logs: `docker logs <container> --tail 500` (or from your log aggregator). |
| 2 | Search for `error`, `Error`, `ECONNREFUSED`, `ER_`, `Failed to start`. |
| 3 | Check for 5xx in HTTP logs (exception filter logs 5xx with stack). |
| 4 | If rollback: compare logs before/after deploy time to identify errors introduced by new version. |

---

# 6. Monitoring Setup

## 6.1 First 24 Hours — What to Monitor

| Metric | Why |
|--------|-----|
| HTTP 5xx rate | Detect regressions and DB/config issues. |
| HTTP 429 rate | Validate throttle settings; avoid legitimate users hit too often. |
| Login success / 401 rate | Auth and DB connectivity. |
| Health check failures | LB/orchestrator may pull instance out if health fails. |
| DB connections in use | Ensure under pool limit and DB max_connections. |
| Container memory (RSS) | Detect leaks or unexpected growth. |
| Response time (e.g. p95, p99) | Performance regression. |

---

## 6.2 Minimal Monitoring Dashboard Suggestions

**Row 1 — Availability & Errors**

- Health endpoint: success rate or uptime (e.g. 200s / total).
- Error rate: count of 5xx per minute or per 5 min.
- 429 rate: count per minute (optional: by route or auth vs general).

**Row 2 — Traffic & Latency**

- Request rate (req/s or req/min).
- Latency: median and p95 (or p99) for key endpoints (e.g. `POST /api/v1/auth/login`, `GET /api/v1/projects`, `GET /api/v1/health`).

**Row 3 — Resources**

- Container memory usage (RSS or container metric).
- DB connections in use (from MySQL `SHOW STATUS LIKE 'Threads_connected'` or cloud metric).
- CPU % (optional).

**Row 4 — Alerts (suggested thresholds)**

- Health check failing for &gt; 2 consecutive checks.
- 5xx rate &gt; 1% of requests or &gt; N per minute.
- DB connections &gt; 80% of pool (e.g. 8 of 10) or &gt; DB max_connections − buffer.
- Memory growth &gt; X% over 1 hour (e.g. +20%).

---

## 6.3 Logging

- Application logs: ensure stdout/stderr go to a log aggregator (e.g. CloudWatch, Datadog, ELK). Production uses JSON log line per request (path, method, duration); 5xx logged with stack.
- No sensitive data: avoid logging headers or body; path is logged without query string in production.

---

# 7. Risk Score After Deployment

| Level | Condition | Typical meaning |
|-------|-----------|------------------|
| **Low** | All gates 1–4 passed; rollback image tagged; monitoring in place; first 24h metrics normal. | Proceed with normal watch; next release can follow same checklist. |
| **Medium** | Deploy successful but one or more smoke tests flaky, or monitoring not yet verified. | Increase watch; fix flakiness and confirm monitoring; document for next time. |
| **High** | Smoke tests failed, or 5xx/errors spiking, or health failing. | Execute rollback; fix in staging; redeploy after re-verification. |

**Post-deployment risk score (circle one):** **LOW** / **MEDIUM** / **HIGH**

---

# Quick Reference

- **Health:** `GET /api/v1/health` (no auth).
- **Login:** `POST /api/v1/auth/login` body `{ "email", "password" }`.
- **Default port:** 3000 (override with `PORT`).
- **App refuses to start in production if:** `JWT_SECRET` is missing or default; `DB_SYNCHRONIZE=true`.

---

*Document version: 1.0 — First production release checklist.*

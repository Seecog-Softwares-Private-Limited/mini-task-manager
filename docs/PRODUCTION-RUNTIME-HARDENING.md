# Production Runtime Hardening Review

Manual Docker-based deployment; no CI/CD. This document summarizes production risks, hardening measures applied, and readiness score.

---

## 1. Docker Readiness

### Implemented

| Item | Status |
|------|--------|
| **Multi-stage build** | `Dockerfile`: builder stage (npm ci + build) → production stage (npm ci --omit=dev + dist only). |
| **No dev dependencies in final image** | Production stage runs `npm ci --omit=dev`; only `dist/` and prod node_modules are present. |
| **Non-root execution** | User `nestjs` (UID 1001) created; `USER nestjs` before CMD. |
| **Healthcheck** | `HEALTHCHECK` hits `GET /api/v1/health` (node-based, no wget/curl). Interval 30s, timeout 5s, start-period 10s, retries 3. |
| **.dockerignore** | Excludes node_modules, .env*, test/, docs, git, IDE files so secrets and dev artifacts are not copied. |

### Notes

- **Port**: Container exposes 3000. App reads `PORT` from env (default 3000). If you run with `-e PORT=8080`, either use the same port in HEALTHCHECK or override the healthcheck in docker run/compose.
- **Lock file**: Build expects `package-lock.json` for `npm ci`. Commit it for reproducible builds.

---

## 2. Runtime Safety

### Implemented

| Item | Status |
|------|--------|
| **NODE_ENV=production** | Set in Dockerfile (`ENV NODE_ENV=production`). Config validation enforces JWT and DB_SYNCHRONIZE when `nodeEnv === 'production'`. |
| **Graceful shutdown** | `app.enableShutdownHooks()` in `main.ts`. NestJS handles SIGTERM/SIGINT and runs lifecycle hooks (e.g. TypeORM connection close). |
| **DB connection pool** | Config exposes `DB_CONNECTION_LIMIT` and `DB_QUEUE_LIMIT`; TypeORM uses them in `database.extra`. |
| **No unbounded caches** | No application-level caches. Throttler uses in-memory storage (per-instance; see Scalability). |
| **Startup failure** | `bootstrap().catch()` logs and `process.exit(1)` so the process exits on startup errors. |

### Notes

- **synchronize**: In production, `env.validation` throws if `DB_SYNCHRONIZE === 'true'`. Use migrations only.
- **Memory**: No obvious leak sources; no long-lived in-memory caches. Monitor RSS in production.

---

## 3. Configuration Safety

### Implemented

| Item | Status |
|------|--------|
| **Fail fast on critical env** | Production: `JWT_SECRET` must be set and not the default; `DB_SYNCHRONIZE` must not be true. Enforced in `config/configuration.ts` and `config/env.validation.ts`. |
| **No unsafe default secrets** | Default JWT secret is `change-me-in-production`; app refuses to start in production if that value is used. |
| **No debug logging in production** | Startup uses `Logger`; extra “running on http://localhost” log only when `NODE_ENV !== 'production'`. HTTP logging interceptor uses path-only (no query) and JSON in production. |

### Recommendations

- **DB_PASSWORD**: Not enforced in code. In production, set a strong `DB_PASSWORD` and consider failing startup if it is empty when `NODE_ENV=production` (optional; may conflict with local Docker MySQL without password).

---

## 4. Scalability Readiness

| Item | Status |
|------|--------|
| **Stateless** | No server-side session store; auth is JWT. No in-memory session state. |
| **Per-instance state** | Throttler uses **in-memory** storage. With multiple instances, limits are per instance (each instance has its own counters). For a single instance or if per-instance limits are acceptable, this is fine. For strict global limits across replicas, use a shared store (e.g. Redis) with Throttler storage. |
| **No sticky sessions required** | Safe to run behind a load balancer with round-robin. |

---

## 5. Logging & Observability

### Implemented

| Item | Status |
|------|--------|
| **Structured logging (production)** | When `NODE_ENV=production`, HTTP requests are logged as a single JSON line: `level`, `method`, `path`, `handler`, `durationMs`. No query string (avoids leaking tokens in URLs). |
| **No sensitive data in logs** | Logging interceptor logs `path` only (query stripped). No headers or body. Exception filter logs method, URL path, status, and stack for 5xx only. |
| **Health endpoint** | `GET /api/v1/health` is public and unthrottled. Returns Terminus format (status, info, error, details) including DB ping. Suitable for load balancers and orchestrators. |

### Notes

- **Log level**: NestJS default log level applies. To reduce noise in production, configure Logger or use a logger module (e.g. only `log` and `error`).

---

## Production Risks (Summary)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Throttler in-memory per instance | Low (if single instance or per-instance limits OK) | Document; for multi-replica global limits, add Redis storage later. |
| DB_PASSWORD empty in prod | Medium | Operational: set strong password; optionally add validation in config. |
| PORT vs HEALTHCHECK | Low | Keep container PORT and app PORT in sync or override HEALTHCHECK when using a different port. |
| No request ID / correlation ID | Low | Add middleware later for tracing if needed. |

---

## Required Code/Config Changes (Minimal) – Done

1. **main.ts**: `enableShutdownHooks()`, bootstrap `Logger`, no `console.log` in production, `process.exit(1)` on bootstrap failure.
2. **config/env.validation.ts**: In production, throw if `DB_SYNCHRONIZE === true`.
3. **Dockerfile**: Multi-stage build; production stage with `npm ci --omit=dev`; non-root user; HEALTHCHECK using app health URL.
4. **.dockerignore**: Exclude dev deps, tests, env files, git, IDE.
5. **Logging interceptor**: Production = JSON log line, path-only (no query); dev = existing human-readable line.

---

## Production Readiness Score: **8/10**

- **Docker**: Multi-stage, non-root, healthcheck, no dev deps in image. **(+2)**
- **Runtime**: Graceful shutdown, NODE_ENV, pool config, no unbounded caches. **(+2)**
- **Config**: Fail fast on JWT and synchronize; no default prod secrets. **(+1.5)**
- **Stateless**: JWT auth, no in-memory session; throttler is per-instance. **(+1)**
- **Logging**: Structured in prod, path-only, no secrets; health usable. **(+1)**
- **(-1)** Optional: DB_PASSWORD validation in production; global throttler storage for multi-replica.
- **(-0.5)** Optional: Request/correlation ID; log level configuration.

---

## Deployment Checklist (Manual Docker)

1. Set `NODE_ENV=production` (already in Dockerfile).
2. Set `JWT_SECRET` to a strong secret; do not use default.
3. Set `DB_*` (host, port, user, password, database); do **not** set `DB_SYNCHRONIZE=true`.
4. Run migrations before or at startup (e.g. separate job or entrypoint).
5. Run container as built (non-root); map port if needed: `-p 3000:3000`.
6. Use health endpoint for readiness/liveness: `GET /api/v1/health`.

Example run:

```bash
docker build -t mini-task-manager:latest .
docker run -d \
  -e NODE_ENV=production \
  -e JWT_SECRET="your-secret" \
  -e DB_HOST=... -e DB_PORT=3306 -e DB_USERNAME=... -e DB_PASSWORD=... -e DB_DATABASE=... \
  -p 3000:3000 \
  mini-task-manager:latest
```

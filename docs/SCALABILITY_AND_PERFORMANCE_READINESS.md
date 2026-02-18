# Scalability and Performance Readiness Review

**Role:** Principal Platform Scalability Architect  
**Scope:** Backend, database, API, frontend, multi-tenant safety, infrastructure, load simulation.

---

## 1. Backend Scalability Review

### 1.1 N+1 Query Risks

| Location | Risk | Detail |
|----------|------|--------|
| **TasksService.update** | Medium | Three sequential DB calls: `findByIdAndOrganization` → `update` → `findById`. The final `findById` can be removed by returning the updated entity from a single update-and-select or by building the response from the patch DTO. |
| **Task list responses** | Low | Controllers return DTOs built from entities without loading relations (no `relations: ['assignee', 'project']`). So no N+1 when serializing task lists. |
| **Project list** | Low | `findByOrganization` returns projects without relations; no N+1. |
| **Comments/attachments** | Low | Fetched per task only when the client requests them (separate endpoints); not loaded for every task in a list. |

**Recommendation:** Refactor `TasksService.update` to a single round-trip (e.g. `repo.update` then return `repo.findOne` only if needed, or use `QueryBuilder` with `UPDATE ... RETURNING`-style pattern if moving to PostgreSQL later).

### 1.2 High-Growth Tables

| Table | Growth driver | Current access pattern |
|-------|----------------|-------------------------|
| **tasks** | Per-project task creation, Kanban usage | Paginated by project (`findByProject` with skip/take). Frontend currently requests up to 200 tasks per project in one call. |
| **activity_logs** | Every create/update/delete (and future events) | Paginated by `organization_id`; no server-side filters (entity_type, action, user, date) yet. Append-only; no TTL or archive. |
| **notifications** | Per-user notifications | Paginated by `user_id`. Append-only. |

**Risks:**  
- **activity_logs** will dominate row count and table size; `findAndCount` on large tables is expensive (two queries: data + full count).  
- **tasks**: Fetching 200 rows per project is acceptable for small/medium projects but can become slow and memory-heavy for very large projects; cursor-based or stricter limit (e.g. 50) recommended.

### 1.3 Indexing Strategy

**Current state:** No explicit `@Index()` or migration-added indexes found. Reliance on primary keys and (where present) foreign key indexes only.

**Impact:**  
- Queries filtered by `organization_id`, `project_id`, `user_id`, or `(organization_id, created_at)` will do full table or large index scans as data grows.  
- `TenantGuard` calls `findByOrganizationAndUser(orgId, userId)` on every authenticated request — without a composite index this can degrade with many org members.

**Recommendation:** Add the indexes in **Section 6**; implemented via entity `@Index()` decorators and optional SQL script `docs/database/SCALABILITY_INDEXES.sql` for manual application.

### 1.4 Pagination Strategy

| Area | Implementation | Assessment |
|------|----------------|------------|
| **Tasks** | `getSkip(page, limit)` + `findAndCount` | Offset-based; correct. Limit capped at 100 in DTO. |
| **Activity logs** | Same pattern | Offset-based; limit 20 default. |
| **Notifications** | Same pattern | Same. |

**Risks:**  
- **findAndCount:** TypeORM runs two queries (SELECT + COUNT). On very large tables COUNT can be slow; consider approximate counts or cursor-based pagination for activity_logs.  
- **Deep offset:** `OFFSET 10000` is slow in MySQL; for infinite scroll or very deep pages, prefer cursor (e.g. `WHERE created_at < ? ORDER BY created_at DESC LIMIT n`).

### 1.5 Query Filtering Patterns

- **Activity logs:** Only `organizationId` is used server-side. Filters (entity_type, action, user, date range) are applied client-side on the current page — not acceptable for large datasets.  
- **Tasks:** Filtered by `projectId` (and implicitly tenant via project check). Good.  
- **Notifications:** Filtered by `userId`. Good.

**Recommendation:** Add optional server-side query params for activity logs (entity_type, action, user_id, from_date, to_date) and use them in the repository with index-backed columns.

### 1.6 Blocking DB Calls

- No `synchronize: true` in production (config is env-driven; ensure `DB_SYNCHRONIZE` is not `true` in prod).  
- No synchronous file or external I/O in hot paths.  
- All repository methods are async; no blocking Node calls identified.  
- **TenantGuard:** One DB call per authenticated request (membership lookup). Under high RPS this is a hotspot; recommend caching (see Section 3).

---

## 2. Database Load Readiness

### 2.1 Connection Pool Settings

**Current (from `configuration.ts`):**

- `connectionLimit`: `process.env.DB_CONNECTION_LIMIT || '10'`
- `queueLimit`: `process.env.DB_QUEUE_LIMIT || '0'` (0 → undefined; no queue or default driver behavior)

**Recommendations:**

| Users (approx) | App instances | Pool size per instance | Total connections | Notes |
|----------------|----------------|-------------------------|--------------------|--------|
| 1K             | 1–2            | 10–15                   | 10–30              | Default 10 is workable; 15 gives headroom. |
| 5K             | 2–4            | 15–20                   | 30–80              | Set `DB_CONNECTION_LIMIT=20`; ensure MySQL `max_connections` > 80. |
| 10K            | 4–8            | 20–25                   | 80–200             | `DB_CONNECTION_LIMIT=25`; consider PgBouncer-style pooling or proxy if DB becomes bottleneck. |

Set `queueLimit` (e.g. 5–10) so that under burst the driver queues instead of failing immediately; tune so queue doesn’t hide overload.

### 2.2 Tables That May Require Partitioning

| Table | Suggested strategy | When |
|-------|---------------------|------|
| **activity_logs** | Partition by `created_at` (e.g. monthly) or by `organization_id` hash | When row count reaches tens of millions or single-table queries slow. |
| **notifications** | Partition by `user_id` hash or by `created_at` | When table grows very large and list/delivery queries degrade. |
| **tasks** | Usually not first candidate; partition by `project_id` or `organization_id` only if a single tenant has millions of tasks. | Later stage. |

### 2.3 Archive Strategy for activity_logs

- **Retention:** e.g. keep last 90 days hot; archive older rows to `activity_logs_archive` (same schema) or cold storage.  
- **Process:** Scheduled job (cron or queue) that:  
  - Copies rows with `created_at < (now() - 90 days)` to archive.  
  - Deletes from `activity_logs` in batches (e.g. 1000 per run) to avoid long locks.  
- **API:** Audit UI can support “View archived” that queries archive (or a read replica) with same filters.  
- **Index:** Archive table should have the same indexes as production for query performance.

---

## 3. API Performance

### 3.1 Endpoints That May Degrade Under Load

| Endpoint / area | Risk | Reason |
|-----------------|------|--------|
| **All authenticated routes** | High | `TenantGuard` does one membership lookup per request. At 500 RPS that’s 500 membership queries/sec. |
| **GET /activity-logs** | Medium | `findAndCount` on large `activity_logs` table; no server-side filters. |
| **GET /tasks/project/:id** | Medium | Frontend requests up to 200 tasks; large projects will return large payloads and heavier DB. |
| **GET /projects** | Medium | Unpaginated; orgs with hundreds of projects will get a large response and one big SELECT. |
| **GET /organizations** (if exists) / org resolution | Low | Typically small dataset. |
| **POST /activity-logs** (log write) | Low | Single insert; can be offloaded to queue later. |

### 3.2 Caching Strategies (Where Safe)

| What | Strategy | Safety |
|------|----------|--------|
| **Tenant membership** | Cache `(orgId, userId) → role` in Redis (or in-memory with TTL). Invalidate on membership change / leave / role change. | Safe if invalidation is correct. |
| **Plans (billing)** | Cache plan list in memory or Redis; invalidate on plan CRUD. | Safe; rarely changing. |
| **Subscription per org** | Short TTL cache (e.g. 1–5 min) for `getSubscriptionForOrganization`. Invalidate on subscription change. | Safe. |
| **Activity log list** | Avoid caching (always fresh for audit). | — |
| **Task/project lists** | Optional short-lived cache (e.g. 30–60 s) for list endpoints; invalidate on create/update/delete. | Use with care; can serve stale data. |

**Recommendation:** Implement Redis (or equivalent) for membership cache first; it removes the main per-request DB hotspot.

### 3.3 Rate-Limit Tuning

**Current:**  
- Auth: 10 requests / 60 s (per IP or user).  
- General: 100 requests / 60 s per user (authenticated) or per IP.  
- Many controllers use `@SkipThrottle({ auth: true })`, so general limit applies.

**Recommendations:**

- **1K users:** Keep defaults; monitor 429 and latency.  
- **5K–10K users:** Consider raising general limit to 200–300/min per user and/or per-route overrides for read-heavy endpoints (e.g. GET tasks, GET projects).  
- **Burst:** Throttler is in-memory per instance; with multiple instances each has its own counter. For global limits, use a shared store (e.g. Redis) with `ThrottlerStorage` implementation.

---

## 4. Frontend Performance

### 4.1 Heavy Modules

- **Kanban (dnd-kit):** Project detail page loads Kanban and fetches workflows, statuses, and up to 200 tasks. This is the heaviest view; ensure it’s not on the critical path of initial dashboard load.  
- **Analytics / charts:** If added, use dynamic import so they load only on analytics route.  
- **Dashboard:** Multiple providers (Tenant, Plan, Notifications, Onboarding, etc.) and shared layout; acceptable but keep an eye on re-renders.

### 4.2 Code Splitting

- **Current:** No `dynamic()` or lazy imports found; routes are standard Next.js app router. Next.js already code-splits by route.  
- **Recommendation:** Use `next/dynamic` for below-the-fold or heavy UI (e.g. Kanban board, charts, rich editor) to reduce main bundle and TTI.

Example:

```tsx
const KanbanBoard = dynamic(() => import('@/components/kanban/kanban-board'), { ssr: false });
```

### 4.3 React Query Cache Strategy

- **Current:** `staleTime: 60_000` (1 min), retry 2 with exponential backoff, no retry on 401/403/429.  
- **Assessment:** Sensible; 1 min reduces refetches. Consider `gcTime` (formerly `cacheTime`) to avoid unbounded growth (e.g. 5–10 min).  
- **Rerender:** Project detail uses `useMemo` for `tasksByStatus`; good. Ensure list components (e.g. task cards) are memoized if they receive stable props to avoid unnecessary rerenders when parent state updates.

### 4.4 Rerender Bottlenecks

- **Tenant/Plan context:** Changes to `orgId` or plan can re-render many consumers; keep context values stable (e.g. memoized object).  
- **Command palette:** Opens with project list fetch; ensure project list is cached and not refetched on every open.  
- **Dashboard overview:** If it embeds many widgets, consider isolating state so that updating one widget doesn’t re-render the whole page.

---

## 5. Multi-Tenant Safety at Scale

### 5.1 Tenant Filters and Indexes

- **tasks:** Filtered by `projectId` (tenant-scoped via project) and by `organizationId` in `findByIdAndOrganization`. Both should be index-backed.  
- **activity_logs:** Filtered by `organizationId`; index on `(organization_id, created_at DESC)` is critical.  
- **notifications:** Filtered by `userId` (user-scoped, not org-scoped); index on `user_id`.  
- **organization_members:** Lookup by `(organizationId, userId, status)`; composite index required for TenantGuard.  
- **projects:** Filtered by `organizationId` and `isArchived`; index on `(organization_id, is_archived)`.  
- **subscriptions:** Lookup by `organizationId`; index on `organization_id`.

All tenant filters are column-based (no cross-tenant join in a single query). The only concern is that every query must include the tenant condition; TenantGuard sets `tenantId` from header and services use it — no raw queries bypassing tenant found.

### 5.2 Cross-Tenant Join Inefficiencies

- No cross-tenant joins identified. Tenant isolation is enforced by passing `organizationId` or `projectId` (derived from org) into repositories.  
- **Recommendation:** Add tenant to all list/count queries explicitly and enforce in code review; consider a lint or test that checks repository methods for tenant parameter.

### 5.3 Tenant-Scoped Index Recommendations

See **Section 6** and the migration file: composite indexes for (organization_id, created_at), (organization_id, user_id, status), (project_id, created_at), (user_id, created_at), etc.

---

## 6. Index Recommendations (Summary)

Implement the following (entity `@Index()` decorators added; optional SQL in `docs/database/SCALABILITY_INDEXES.sql`):

| Table | Index | Purpose |
|-------|--------|--------|
| activity_logs | (organization_id, created_at DESC) | Paginated audit by org; avoid full table scan. |
| activity_logs | (organization_id, entity_type, created_at DESC) | Optional; for future server-side entity_type filter. |
| tasks | (project_id, created_at DESC) | Paginated task list by project. |
| tasks | (organization_id, id) | findByIdAndOrganization. |
| notifications | (user_id, created_at DESC) | Paginated notifications by user. |
| organization_members | (organization_id, user_id, status) | TenantGuard membership lookup. |
| projects | (organization_id, is_archived) | List projects by org. |
| subscriptions | (organization_id) | getSubscriptionForOrganization. |

---

## 7. Infrastructure Readiness

### 7.1 Single Instance vs Horizontal Scaling

- **App:** Stateless; no in-memory session store. JWT is used; scaling to N instances is fine.  
- **Throttler:** In-memory; each instance has its own counters. For global rate limits use Redis-backed ThrottlerStorage.  
- **Dockerfile:** Single process per container; no embedded queue or worker. Suitable for horizontal replication behind a load balancer.

### 7.2 Stateless Validation

- Auth: JWT validation; no server-side session.  
- Tenant: Resolved per request from header + DB (or cache).  
- **Verdict:** Stateless; horizontally scalable.

### 7.3 Redis Recommendation

- **Optional but recommended** for:  
  - Membership cache (TenantGuard).  
  - Optional: plan list, subscription cache.  
  - Optional: rate-limit storage for multi-instance throttle.  
- Not required for first 1–2K users if DB is healthy and indexes are in place.

### 7.4 Future Migration Path to Microservices

- Current monolith is modular (per-domain modules). Natural split points: **Billing**, **Notifications**, **Activity logs**.  
- **Steps:** Extract APIs into separate services; keep shared auth (JWT) and tenant header; use events or REST for cross-service calls; move activity log writes to a queue and consumer.  
- No immediate need; scale monolith first with caching and indexes.

---

## 8. Load Simulation Strategy

### 8.1 Realistic Load Test Plan

1. **Baseline:** Single instance, DB with indexes, no cache.  
   - Ramp: 10 → 50 → 100 → 200 concurrent users (or RPS).  
   - Mix: 70% GET (projects, tasks, activity, notifications), 20% PATCH (task updates), 10% POST (create task, log activity).  
   - Duration: 5–10 min steady at target.  
2. **Tenant distribution:** Simulate 100–500 orgs; each virtual user tied to 1–2 orgs.  
3. **Hot paths:** Emphasize GET /tasks/project/:id, GET /activity-logs, GET /projects, and one membership-validated GET per request (to stress TenantGuard).  
4. **Spike:** Short burst at 2x target RPS to test queue and degradation.

### 8.2 Tools

- **k6:** Script scenarios (ramp, mix, tenant header per user); output metrics (p95, error rate, DB connections).  
- **Artillery:** Alternative; YAML scenarios; good for HTTP mix.  
- **DB:** Monitor MySQL connections, slow query log, CPU during test.

### 8.3 Target SLAs (Suggested)

| Metric | Target | Alert threshold |
|--------|--------|-------------------|
| **p95 response time** | < 500 ms for list/detail GETs | > 1 s |
| **p99** | < 1 s | > 2 s |
| **Error rate** | < 0.1% | > 0.5% |
| **DB CPU** | < 70% average | > 85% |
| **API 5xx** | 0% under normal load | > 0.1% |
| **Connection pool** | No “queue full” or timeouts | Any pool error |

---

## 9. Scores and Action Plan

### 9.1 Horizontal Scaling Readiness Score: **8/10**

- **Strengths:** Stateless app, JWT, tenant in header, Docker single-process.  
- **Gaps:** In-memory throttle (per-instance), no shared cache; under high RPS membership DB load can limit scale.

### 9.2 Infrastructure Maturity Score: **7/10**

- **Strengths:** Config-driven DB pool and throttle, health check, production Docker.  
- **Gaps:** No explicit indexes, no Redis, no queue for activity log or notifications, connection limits not tuned for 5K/10K.

### 9.3 Clear Action Plan for Scaling to 5,000 Orgs

| Priority | Action | Owner |
|----------|--------|--------|
| P0 | Add DB indexes (activity_logs, tasks, notifications, organization_members, projects, subscriptions) via migration. | Backend |
| P0 | Ensure `DB_SYNCHRONIZE=false` in production; run migrations. | DevOps |
| P1 | Cache tenant membership (Redis or in-memory with TTL); invalidate on membership/role change. | Backend |
| P1 | Add server-side filters for activity logs (entity_type, action, user_id, date range). | Backend |
| P1 | Paginate GET /projects (or cap list size) and consider reducing max tasks per request (e.g. 50) with cursor support later. | Backend + Frontend |
| P2 | Set `DB_CONNECTION_LIMIT=20` and tune `queueLimit` for 5K users; document MySQL `max_connections`. | DevOps |
| P2 | Introduce Redis for cache and optionally for ThrottlerStorage. | DevOps + Backend |
| P2 | Refactor TasksService.update to avoid redundant findById. | Backend |
| P3 | Define activity_logs retention (e.g. 90 days) and archive job. | Backend |
| P3 | Load test with k6/Artillery against SLAs; add monitoring (DB CPU, p95, error rate). | QA / DevOps |

---

**Document version:** 1.0  
**Last updated:** 2025-02

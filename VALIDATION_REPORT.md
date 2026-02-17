# Architectural Validation Report

**Scope:** NestJS folder structure and modules generated from V1 MySQL migration  
**Audit type:** Strict architectural validation vs. migration script and stated requirements  
**Date:** 2025-02-17

---

## 1. Missing modules based on database tables

**Migration tables (19):**  
`users`, `organizations`, `organization_members`, `projects`, `project_members`, `workflows`, `workflow_statuses`, `sprints`, `tasks`, `task_comments`, `task_attachments`, `custom_fields`, `task_custom_field_values`, `notifications`, `plans`, `subscriptions`, `invoices`, `payments`, `activity_logs`

| Table(s) | Module | Status |
|----------|--------|--------|
| users | users | ✅ |
| organizations, organization_members | organizations | ✅ |
| projects, project_members | projects | ✅ |
| workflows, workflow_statuses | workflows | ✅ |
| sprints | sprints | ✅ |
| tasks, task_comments, task_attachments | tasks | ✅ |
| custom_fields, task_custom_field_values | custom-fields | ✅ |
| notifications | notifications | ✅ |
| plans, subscriptions, invoices, payments | billing | ✅ |
| activity_logs | activity-logs | ✅ |

**Result:** No missing modules. All 19 tables are represented in entities and grouped into the expected feature modules.

---

## 2. Incorrect module grouping

- **organizations** – `organizations` + `organization_members`: correct (tenant root + membership).
- **projects** – `projects` + `project_members`: correct (project + project-level access).
- **workflows** – `workflows` + `workflow_statuses`: correct (workflow and statuses).
- **tasks** – `tasks` + `task_comments` + `task_attachments`: correct (task aggregate).
- **custom-fields** – `custom_fields` + `task_custom_field_values`: correct (project custom fields + values).
- **billing** – `plans`, `subscriptions`, `invoices`, `payments`: correct (subscription and billing lifecycle).

**Result:** No incorrect grouping. Boundaries align with the migration and relationships.

---

## 3. Violations of Clean Architecture principles

- **Dependency rule:** Controllers depend on services; services depend on repositories; repositories depend on TypeORM. No controller depends on infrastructure (DB) directly.  
- **Layering:** Config, common, infrastructure, shared, and modules are clearly separated.  
- **Single responsibility:** Each module owns one aggregate/feature.

**Warnings:**

- **No repository abstraction (interfaces):** Repositories are concrete classes only. There are no `IUsersRepository`-style interfaces and no dependency inversion onto abstractions. Services depend on concrete repositories.  
  **Recommendation:** Introduce interfaces (e.g. `IUsersRepository`) in the module or a shared contracts layer and inject them. Services should depend on the interface; the repository implementation lives in the data layer.

- **Infrastructure → modules dependency:** `infrastructure/health/health.controller.ts` imports `Public` from `modules/auth`. Infrastructure therefore depends on an application (auth) module.  
  **Recommendation:** Move `Public` (and optionally `IS_PUBLIC_KEY`) to `common/decorators/` so both auth and health depend on common, and infrastructure does not depend on modules.

---

## 4. Direct DB access inside controllers

- Grep for `InjectRepository`, `TypeOrmModule`, and `getRepository` shows these only in:
  - `*repository.ts` files (repositories),
  - `*module.ts` files (TypeOrmModule.forFeature),
  - `database.module.ts` (TypeOrmModule.forRootAsync).
- No controller file uses `InjectRepository`, `TypeOrmModule`, or `getRepository`.

**Result:** No direct DB access in controllers. Data access is confined to the repository layer.

---

## 5. Missing repository abstraction

- Every feature module has a **concrete** repository (e.g. `UsersRepository`, `OrganizationsRepository`).
- There are **no repository interfaces** (e.g. `IUsersRepository`). Services and guards depend on concrete repository classes.

**Result:** Repository layer exists and is used consistently, but the **abstraction** required for strict Clean Architecture (dependency inversion) is missing.

**Recommendation:** Add interfaces for each repository (or at least for those used across modules, e.g. `OrganizationMembersRepository` used by `TenantGuard`), and bind the implementation in the module. This improves testability and keeps dependency direction pointing toward abstractions.

---

## 6. Missing DTO validation usage

- **Present and used with class-validator:**  
  `LoginDto`, `CreateOrganizationDto`, `CreateProjectDto`, `CreateWorkflowDto`, `CreateSprintDto`, `CreateTaskDto`, `CreateCustomFieldDto`, `PaginationQueryDto`, `EnvironmentVariables` (config).
- **Global ValidationPipe:** Enabled in `main.ts` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.

**Gaps:**

- **Response DTOs** (e.g. `UserResponseDto`, `ProjectResponseDto`) are plain classes with no validators. For response DTOs this is acceptable; validation is not required for outbound data.
- **Query/param handling:** `activity-logs` and `notifications` use `@Query() query?: PaginationQueryDto`. When no query params are sent, `query` can be `{}` or `undefined`. The ValidationPipe does not instantiate `PaginationQueryDto` with defaults for a plain `{}`, so `query.page` and `query.limit` can be undefined and cause **runtime errors** (e.g. in `findByOrganization(tenantId!, query!)` when the service uses `query.page` / `query.limit`).

**Recommendation:** For list endpoints that take pagination, either: (1) use a pipe that ensures an instance of `PaginationQueryDto` with defaults (e.g. `page = 1`, `limit = 20`) when the request has no query, or (2) in the service, use `query?.page ?? 1` and `query?.limit ?? 20` so undefined query is safe.

---

## 7. Missing cross-cutting components

| Component | Status | Notes |
|-----------|--------|--------|
| JWT authentication | ✅ | AuthModule, JwtStrategy, JwtAuthGuard (global), @Public() for login |
| RBAC guard | ⚠️ | RolesGuard exists and uses @Roles(); see RBAC wiring below |
| Multi-tenant context | ✅ | TenantGuard, @TenantId(), X-Organization-Id |
| Global exception filter | ✅ | GlobalExceptionFilter in main.ts |
| Logging interceptor | ✅ | LoggingInterceptor in main.ts |
| Validation pipe | ✅ | Global ValidationPipe in main.ts |
| Config module | ✅ | config/, env validation |
| Database module | ✅ | TypeORM, MySQL, BINARY(16) support |
| Health check | ✅ | GET /health, TypeORM ping, @Public() |
| Pagination utilities | ✅ | PaginationQueryDto, paginate(), getSkip() |
| Base entity | ✅ | BaseEntity, uuidBinaryTransformer |

**RBAC wiring issue:**  
`RolesGuard` checks `user.roles` (array). `JwtStrategy` only sets `userId` and `email` on `request.user`. `TenantGuard` sets `user.orgRole` (single string). Nothing ever sets `user.roles`. So any route protected with `@Roles(...)` will fail (guard returns false) because `user.roles` is undefined.

**Recommendation:** Either (1) in `TenantGuard` (or a dedicated middleware/guard after tenant resolution), set `request.user.roles = [request.user.orgRole]` (and optionally merge with project role), or (2) change `RolesGuard` to also consider `user.orgRole` when evaluating `@Roles()`. Align the contract (e.g. “roles” vs “orgRole”) and document it.

---

## 8. Incorrect dependency direction / circular imports

- **AuthModule** imports **UsersModule** and **OrganizationsModule** (for TenantGuard).  
- **OrganizationsModule** does not import AuthModule.  
- **TasksModule**, **CustomFieldsModule**, **WorkflowsModule**, **SprintsModule**, **ProjectsModule** do not import each other; they only share entities via TypeORM’s global entity registration.  
- **CustomFieldsModule** entity `TaskCustomFieldValueEntity` references `TaskEntity`; TasksModule does not reference CustomFieldsModule. One-way dependency only.

**Result:** No circular module dependencies detected. Dependency direction is acceptable (auth and app modules depend on domain/data modules; infrastructure depends on config and, currently, on auth for `Public`).

**Recommendation:** Move `Public` to `common` to remove the infrastructure → auth dependency (see §3).

---

## 9. Areas that may break at runtime

- **Placeholder user IDs in controllers:**  
  - `organizations.controller.ts`: `ownerId = 'placeholder'`  
  - `projects.controller.ts`: `createdBy = 'placeholder'`  
  - `tasks.controller.ts`: `reporterId = 'placeholder'`  
  - `notifications.controller.ts`: `userId = 'placeholder'`  

  These will cause wrong data (e.g. all orgs/projects/tasks/notifications tied to a non-existent or wrong user) and can violate FKs if `users.id` does not match.  
  **Recommendation:** Inject current user from the request (e.g. a decorator that reads `request.user.userId` set by JwtAuthGuard) and pass that into the service. Remove all placeholder IDs before production.

- **Pagination query undefined:**  
  In `ActivityLogsController.findAll` and `NotificationsController.findAll`, `query` can be undefined or `{}`. The service then uses `query.page` and `query.limit` without defaults, leading to NaN or undefined in pagination and possible runtime errors.  
  **Recommendation:** Apply defaults in the controller or service (e.g. `query ?? { page: 1, limit: 20 }` or use a pipe that returns a default `PaginationQueryDto`).

- **Missing UUID generation on create:**  
  All entities use `id BINARY(16)` with no default in the migration. Repository `create()` methods never set `id` (e.g. `organizations.repository.ts`, `users.repository.ts`). TypeORM will not auto-generate UUIDs for a non-`generated` `@PrimaryColumn()`. Inserts will fail with “id cannot be null” or similar.  
  **Recommendation:** Generate a UUID (e.g. `uuid.v4()`) and convert to Buffer (or use the same format as `uuidBinaryTransformer`) in the service or repository before `create()`, and pass `id` in the payload. Apply this to every entity that has a UUID primary key and is created via the app (users, organizations, organization_members, projects, project_members, workflows, workflow_statuses, sprints, tasks, task_comments, task_attachments, custom_fields, task_custom_field_values, notifications, plans, subscriptions, invoices, payments, activity_logs).

- **TenantGuard when `X-Organization-Id` is missing:**  
  For routes protected by TenantGuard, if the client omits `X-Organization-Id`, the guard returns false and the request is rejected. This is correct behavior; document that multi-tenant routes require this header.

---

## 10. Scalability risks for ~10K users

- **Stateless API:** JWT + tenant header; no server-side session store. Suitable for horizontal scaling. ✅  
- **Connection pooling:** Not explicitly configured in the shown TypeORM config. For 10K users and multiple instances, connection pooling (and limits) should be set (e.g. via TypeORM `extra` or RDS/MySQL settings).  
  **Recommendation:** Configure `extra: { connectionLimit: N }` (or equivalent) and align with RDS max_connections and number of app instances.

- **N+1 queries:** Repositories use simple `findOne`/`find` without mandatory relations. If controllers or services later load relations (e.g. task with assignee), ensure `relations` or QueryBuilder is used to avoid N+1. No N+1 introduced by current code; keep an eye when adding relation loading.

- **Indexes:** Migration defines indexes (e.g. `idx_tasks_project_status_assignee`, `idx_notifications_user_read`, `idx_activity_org`). They support list and filter queries. ✅  

- **Pagination:** List endpoints use pagination (tasks, notifications, activity-logs). Ensure all list APIs that can grow (e.g. projects by org, workflows by project) are paginated or capped to avoid large responses.

- **Caching:** No caching layer. For 10K users, consider caching for plans, config, or hot read paths later. Not a blocker for initial structure.

---

## Summary

| Category | Result |
|----------|--------|
| Missing modules (tables) | ✅ None |
| Incorrect grouping | ✅ None |
| Clean Architecture violations | ⚠️ No repository interfaces; infra → auth dependency |
| Direct DB in controllers | ✅ None |
| Repository abstraction | ❌ No interfaces (concrete only) |
| DTO validation | ✅ Create/query DTOs validated; ⚠️ pagination query defaults needed |
| Cross-cutting (auth, RBAC, logging, multi-tenancy) | ✅ Present; ⚠️ RBAC not wired to org/project role |
| Dependency direction | ✅ No circular; ⚠️ move Public to common |
| Runtime risks | ❌ Placeholder user IDs; ❌ no UUID on create; ⚠️ pagination query undefined |
| Scalability (10K users) | ⚠️ Configure connection pooling; pagination and indexes in place |

---

## Recommended fix order

1. **Critical:** Generate and set UUID (BINARY(16)) for every entity on create; remove or replace all placeholder user IDs with the authenticated user from the request.  
2. **Critical:** Ensure pagination query defaults (controller or service) so `query` is never undefined when accessing `page`/`limit`.  
3. **High:** Wire RBAC so `@Roles()` works with org (and optionally project) role (e.g. set `user.roles` from `user.orgRole` or extend RolesGuard).  
4. **Medium:** Move `Public` (and `IS_PUBLIC_KEY`) to `common/decorators` and update health and auth to use it.  
5. **Medium:** Introduce repository interfaces and dependency injection on abstractions for at least cross-module repositories (e.g. `OrganizationMembersRepository`).  
6. **Low:** Document multi-tenant routes and required headers; add connection pooling configuration for production and 10K-user load.

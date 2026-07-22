# OpsPick SaaS – Backend Architecture

Production-grade NestJS structure derived **strictly** from the V1 MySQL migration. No schema redesign; module boundaries follow database tables and relationships.

---

## 1. Folder structure (tree)

```
src/
├── main.ts
├── app.module.ts
├── config/
│   ├── config.module.ts
│   ├── configuration.ts
│   ├── env.validation.ts
│   └── index.ts
├── common/
│   ├── base.entity.ts
│   ├── pagination/
│   │   ├── pagination.dto.ts
│   │   ├── pagination.util.ts
│   │   └── index.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   ├── decorators/
│   │   ├── tenant.decorator.ts
│   │   └── roles.decorator.ts
│   └── index.ts
├── infrastructure/
│   ├── database/
│   │   ├── database.module.ts
│   │   └── index.ts
│   └── health/
│       └── health.module.ts
│       └── health.controller.ts
├── shared/
│   ├── constants/
│   │   └── roles.ts
│   └── index.ts
└── modules/
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── dto/
    │   │   ├── login.dto.ts
    │   │   └── login-response.dto.ts
    │   ├── strategies/
    │   │   └── jwt.strategy.ts
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts
    │   │   ├── roles.guard.ts
    │   │   └── tenant.guard.ts
    │   └── decorators/
    │       └── public.decorator.ts
    ├── users/
    │   ├── users.module.ts
    │   ├── users.controller.ts
    │   ├── users.service.ts
    │   ├── entities/
    │   │   └── user.entity.ts
    │   ├── repositories/
    │   │   └── users.repository.ts
    │   └── dto/
    │       └── user-response.dto.ts
    ├── organizations/
    │   ├── organizations.module.ts
    │   ├── organizations.controller.ts
    │   ├── organizations.service.ts
    │   ├── entities/
    │   │   ├── organization.entity.ts
    │   │   └── organization-member.entity.ts
    │   ├── repositories/
    │   │   ├── organizations.repository.ts
    │   │   └── organization-members.repository.ts
    │   └── dto/
    │       ├── create-organization.dto.ts
    │       └── organization-response.dto.ts
    ├── projects/
    │   ├── projects.module.ts
    │   ├── projects.controller.ts
    │   ├── projects.service.ts
    │   ├── entities/
    │   │   ├── project.entity.ts
    │   │   └── project-member.entity.ts
    │   ├── repositories/
    │   │   ├── projects.repository.ts
    │   │   └── project-members.repository.ts
    │   └── dto/
    │       ├── create-project.dto.ts
    │       └── project-response.dto.ts
    ├── workflows/
    │   ├── workflows.module.ts
    │   ├── workflows.controller.ts
    │   ├── workflows.service.ts
    │   ├── entities/
    │   │   ├── workflow.entity.ts
    │   │   └── workflow-status.entity.ts
    │   ├── repositories/
    │   │   ├── workflows.repository.ts
    │   │   └── workflow-statuses.repository.ts
    │   └── dto/
    │       ├── create-workflow.dto.ts
    │       └── workflow-response.dto.ts
    ├── sprints/
    │   ├── sprints.module.ts
    │   ├── sprints.controller.ts
    │   ├── sprints.service.ts
    │   ├── entities/
    │   │   └── sprint.entity.ts
    │   ├── repositories/
    │   │   └── sprints.repository.ts
    │   └── dto/
    │       ├── create-sprint.dto.ts
    │       └── sprint-response.dto.ts
    ├── tasks/
    │   ├── tasks.module.ts
    │   ├── tasks.controller.ts
    │   ├── tasks.service.ts
    │   ├── entities/
    │   │   ├── task.entity.ts
    │   │   ├── task-comment.entity.ts
    │   │   └── task-attachment.entity.ts
    │   ├── repositories/
    │   │   ├── tasks.repository.ts
    │   │   ├── task-comments.repository.ts
    │   │   └── task-attachments.repository.ts
    │   └── dto/
    │       ├── create-task.dto.ts
    │       └── task-response.dto.ts
    ├── custom-fields/
    │   ├── custom-fields.module.ts
    │   ├── custom-fields.controller.ts
    │   ├── custom-fields.service.ts
    │   ├── entities/
    │   │   ├── custom-field.entity.ts
    │   │   └── task-custom-field-value.entity.ts
    │   ├── repositories/
    │   │   ├── custom-fields.repository.ts
    │   │   └── task-custom-field-values.repository.ts
    │   └── dto/
    │       ├── create-custom-field.dto.ts
    │       └── custom-field-response.dto.ts
    ├── notifications/
    │   ├── notifications.module.ts
    │   ├── notifications.controller.ts
    │   ├── notifications.service.ts
    │   ├── entities/
    │   │   └── notification.entity.ts
    │   ├── repositories/
    │   │   └── notifications.repository.ts
    │   └── dto/
    │       └── notification-response.dto.ts
    ├── billing/
    │   ├── billing.module.ts
    │   ├── billing.controller.ts
    │   ├── billing.service.ts
    │   ├── entities/
    │   │   ├── plan.entity.ts
    │   │   ├── subscription.entity.ts
    │   │   ├── invoice.entity.ts
    │   │   └── payment.entity.ts
    │   ├── repositories/
    │   │   ├── plans.repository.ts
    │   │   ├── subscriptions.repository.ts
    │   │   ├── invoices.repository.ts
    │   │   └── payments.repository.ts
    │   └── dto/
    │       ├── plan-response.dto.ts
    │       └── subscription-response.dto.ts
    └── activity-logs/
        ├── activity-logs.module.ts
        ├── activity-logs.controller.ts
        ├── activity-logs.service.ts
        ├── entities/
        │   └── activity-log.entity.ts
        ├── repositories/
        │   └── activity-logs.repository.ts
        └── dto/
            └── activity-log-response.dto.ts
```

---

## 2. Why modules are grouped this way

- **users** – Single table `users`; identity and auth identity provider.
- **organizations** – `organizations` + `organization_members`; tenant root and membership (one org, many members).
- **projects** – `projects` + `project_members`; project scope and project-level access.
- **workflows** – `workflows` + `workflow_statuses`; workflow and its ordered statuses per project.
- **sprints** – Single table `sprints`; project-scoped sprint entity.
- **tasks** – `tasks` + `task_comments` + `task_attachments`; task aggregate (task + comments + attachments).
- **custom-fields** – `custom_fields` + `task_custom_field_values`; project custom fields and their values on tasks.
- **notifications** – Single table `notifications`; user-scoped notifications.
- **billing** – `plans` + `subscriptions` + `invoices` + `payments`; subscription and billing lifecycle.
- **activity-logs** – Single table `activity_logs`; org-scoped audit trail.

Table boundaries from the migration are unchanged; no tables are split or merged across modules.

---

## 3. Why this is production-ready

- **Clean separation**: Controllers → services → repositories; no DB access in controllers.
- **Feature-based modules**: Each domain has its own module with entity, repository, service, controller, DTOs.
- **Config**: Environment-based config and validation (e.g. `class-validator`) in `config/`.
- **Database**: TypeORM, isolated in `infrastructure/database` and repositories; ready for MySQL 8 and BINARY(16) UUIDs via `uuidBinaryTransformer`.
- **Validation**: Global `ValidationPipe` with whitelist and transform; DTOs prepared for `class-validator`.
- **Errors**: Global exception filter; 5xx logged, consistent JSON responses.
- **Observability**: Logging interceptor; health check endpoint for DB (and future probes).
- **Pagination**: Shared `PaginationQueryDto` and `paginate()` for list endpoints.
- **Base entity**: `BaseEntity` + `uuidBinaryTransformer` for `created_at`/`updated_at` and UUID handling.

---

## 4. Where multi-tenancy is enforced

- **Tenant resolution**: `TenantGuard` reads `X-Organization-Id`, validates the current user against `organization_members`, and sets `request.tenantId` and org role.
- **Usage**: Any route that must be org-scoped uses `@UseGuards(JwtAuthGuard, TenantGuard)` and optionally `@TenantId()` to get the current organization. Examples: projects, tasks, workflows, sprints, custom-fields, billing subscription, activity-logs.
- **Data access**: Services/repositories that need tenant scope receive `organizationId` (from controller using `@TenantId()`) and use it in queries (e.g. `findByOrganization`, `create(..., organizationId)`). No direct DB access in controllers.

Multi-tenancy is enforced at the guard + service layer, not by changing the schema.

**Multi-tenant API usage (client):**  
Routes protected by `TenantGuard` require the **`X-Organization-Id`** header set to a valid organization UUID. The authenticated user must be a member of that organization; otherwise the guard returns 403. Omit this header only on routes that do not use `TenantGuard` (e.g. login, health, user profile, or org list).

---

## 5. How this supports scaling (10K users, horizontal, Docker, AWS RDS, future microservices)

- **Stateless API**: JWT + tenant header; no server-side session store. Multiple instances behind a load balancer work without sticky sessions.
- **Database**: Single TypeORM/MySQL setup; connection pooling and RDS fit this model. Indexes from the migration (e.g. `idx_tasks_project_status_assignee`, `idx_notifications_user_read`) support query performance.
- **Module boundaries**: Each feature module (tasks, billing, notifications, etc.) has clear boundaries and can later be moved to a separate NestJS app or service with minimal refactor; shared types/DTOs can live in a shared package.
- **Config**: Environment-based config and validation allow different settings per environment (dev/staging/prod, RDS, etc.) and are Docker-friendly via env vars.
- **Health**: `/health` is suitable for load balancers and orchestrators (e.g. Docker/K8s); can be extended with more checks (Redis, queues) when needed.
- **Docker**: Run `node dist/main` (or `nest start`); single process, no schema change. Dockerfile can use multi-stage build and non-root user; RDS as external MySQL.

---

## 6. Cross-cutting components summary

| Component              | Location / usage |
|------------------------|------------------|
| JWT authentication     | `AuthModule`, `JwtStrategy`, `JwtAuthGuard` (global); `@Public()` for login and health. |
| RBAC                   | `RolesGuard` + `@Roles()`; role from tenant/project context can be attached in guards. |
| Multi-tenant context   | `TenantGuard` + `@TenantId()`; validates `X-Organization-Id` and sets `tenantId` and org role. |
| Global exception filter| `GlobalExceptionFilter` in `main.ts`. |
| Logging interceptor    | `LoggingInterceptor` in `main.ts`. |
| Validation pipe        | Global in `main.ts` (whitelist, transform, class-validator-ready DTOs). |
| Config module          | `config/`; env-based with validation. |
| Database module        | `infrastructure/database`; TypeORM, MySQL, BINARY(16) UUID support. |
| Health check           | `infrastructure/health`; `/health` with DB ping. |
| Pagination             | `common/pagination`; `PaginationQueryDto`, `paginate()`, `getSkip()`. |
| Base entity            | `common/base.entity.ts`; `created_at`, `updated_at`, `uuidBinaryTransformer`. |

---

*Schema source: V1__initial_schema.sql (MySQL 8.0, Flyway-compatible).*

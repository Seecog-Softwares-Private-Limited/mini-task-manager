# Production Security Audit Report

**Scope:** Deep security validation of the NestJS application (auth, authorization, data exposure, config, destructive operations, rate limiting).  
**Audit type:** Review only — no refactoring, no module regeneration.  
**Date:** 2025-02-17

---

## 1. Authentication Initialization

### ✅ Secure areas

- **JWT configuration:** Secret is loaded from config (ConfigService); no inline hardcoding of production secret. `JwtModule.registerAsync` uses `config.get('jwt.secret')` and `config.get('jwt.expiresIn')`.
- **Production secret enforcement:** In `configuration()` and in `validate()` (env.validation.ts), when `NODE_ENV === 'production'`, the app throws and refuses to start if `JWT_SECRET` is missing or equals the default `'change-me-in-production'`. Prevents accidental production boot with weak/default secret.
- **Token expiration:** `ignoreExpiration: false` in JwtStrategy; expiry is enforced. Default `expiresIn: '7d'` is configurable via `JWT_EXPIRES_IN`.
- **JWT extraction:** Bearer token only (`ExtractJwt.fromAuthHeaderAsBearerToken()`); no cookie or other extraction that could widen attack surface without design.
- **Login flow:** Password validated via `usersService.validatePassword` (bcrypt.compare); on success only `accessToken` and safe user fields (id, email, fullName) returned. No password or passwordHash in response.
- **Validate callback:** JwtStrategy `validate()` loads user by `payload.sub` and returns `{ userId, email }`; invalid/disabled user results in `UnauthorizedException`. No sensitive fields attached to `request.user`.

### ⚠ Security warnings

- **Refresh token:** There is no refresh token mechanism. Access tokens are long-lived (default 7d). Compromise of a token grants access until expiry. Consider shorter access token TTL and refresh tokens for production if session revocation or shorter exposure is required.
- **Default JWT secret in code:** `DEFAULT_JWT_SECRET = 'change-me-in-production'` exists in configuration.ts. It is only used when not in production; production fails to start if this value is used. Risk is limited to misconfigured production (mitigated by fail-fast).

### ❌ Critical vulnerabilities

- None in this section.

---

## 2. Authorization & Access Control

### ✅ Secure areas

- **Global JWT enforcement:** `APP_GUARD` with `JwtAuthGuard` ensures every route requires a valid JWT unless explicitly marked `@Public()`. Only `POST /auth/login` and `GET /health` are public; no other bypass.
- **Multi-tenant guard:** TenantGuard resolves tenant from `X-Organization-Id`, validates membership via `IOrganizationMembersRepository.findByOrganizationAndUser`, and sets `request.tenantId` and `request.user.roles` from membership. Used on: activity-logs, tasks, projects, workflows, sprints, custom-fields, and billing subscription. Organizations use explicit `canAccess(id, userId)` plus header check instead of TenantGuard (avoids circular dependency).
- **Organizations GET :id:** Requires `X-Organization-Id` to match the requested `id` and `organizationsService.canAccess(id, userId)`; otherwise ForbiddenException. Prevents arbitrary org access.
- **Notifications list:** `findAll` uses `CurrentUserId()` and `findByUser(userId, query)` — correctly scoped to current user.
- **Billing subscription:** `GET billing/subscription` uses TenantGuard and `TenantId()`; subscription is loaded by `tenantId`, so scoped to the organization in the header.
- **Activity logs:** List endpoint uses `TenantId()` and `findByOrganization(tenantId)` — tenant-scoped.

### ⚠ Security warnings

- **RBAC not used:** RolesGuard is registered and exported from AuthModule, and TenantGuard sets `user.roles` from organization membership, but no controller or route uses `@Roles()`. Role-based restrictions (e.g. admin-only actions) are not enforced anywhere. If the design intent is RBAC, it is not yet applied.
- **GET /users/:id:** Any authenticated user can request any user by id and receive id, fullName, email, avatarUrl, isEmailVerified, isActive. There is no check that the caller is the same user or has an admin role. This is an information disclosure / IDOR-lite (no write, but profile enumeration and data leak).

### ❌ Critical vulnerabilities

- **Notifications PATCH :id/read — IDOR:** `markAsRead(id)` in the service calls `notificationsRepository.markAsRead(id)` with only the notification id. The repository performs `this.repo.update(id, { isRead: true })` with no check that the notification belongs to the current user. Any authenticated user can mark any notification as read by id (e.g. guessing or enumerating UUIDs), violating tenant/user isolation and data integrity.
- **Cross-tenant read on single-resource endpoints:** Controllers that use TenantGuard but do not validate resource ownership for get-by-id:
  - **GET /projects/:id:** `projectsService.findById(id)` — no check that `project.organizationId === request.tenantId`. A user in org A can set `X-Organization-Id` to org A and pass a project id from org B and receive that project’s data.
  - **GET /tasks/:id:** Same pattern; `tasksService.findById(id)` does not verify `task.organizationId === request.tenantId`. Cross-tenant task read is possible.
  - **GET /workflows/:id:** `workflowsService.findById(id)` — no tenant/org check; cross-tenant workflow read possible.
  - **GET /sprints/:id:** `sprintsService.findById(id)` — no tenant/org check; cross-tenant sprint read possible.
  - **GET /tasks/project/:projectId:** `findByProject(projectId)` does not verify that `projectId` belongs to the current tenant; a project id from another org returns that org’s tasks.
  - **GET /workflows/project/:projectId**, **GET /sprints/project/:projectId**, **GET /custom-fields/project/:projectId:** Same pattern — projectId is not validated against tenant, allowing cross-tenant list reads.

Impact: Any authenticated user who is a member of at least one organization can read another organization’s projects, tasks, workflows, sprints, and custom fields by knowing or guessing UUIDs (or project ids for list endpoints). Multi-tenant isolation is broken for these read paths.

---

## 3. Data Exposure Risks

### ✅ Secure areas

- **User responses:** UsersController returns `UserResponseDto` with explicit fields (id, fullName, email, avatarUrl, isEmailVerified, isActive). `passwordHash` is never included; it exists only on the entity and is used only in `validatePassword` and `create`.
- **Login response:** LoginResponseDto contains `accessToken` and `user: { id, email, fullName }`. No password or hash.
- **Auth validate:** JwtStrategy and AuthService return minimal user data (e.g. `{ id, email }` or `{ userId, email }`); no password or internal fields.
- **Other controllers:** Projects, tasks, workflows, sprints, organizations, billing, custom-fields, activity-logs use explicit `toResponse()` or DTO mapping; no raw entity with sensitive columns returned.
- **Serialization:** No use of `excludeExtraneousValues`/`@Exclude`/`@Expose` found; reliance is on explicit DTOs and mapping, which avoids accidental exposure of entity fields (e.g. passwordHash) if someone later returns an entity by mistake.
- **Logging:** LoggingInterceptor logs only `method`, `url`, handler name, and duration — no request/response body or headers. GlobalExceptionFilter logs for 5xx: method, url, status, and exception stack — no request body or tokens. No evidence of sensitive data in logs.

### ⚠ Security warnings

- **Entity definition:** UserEntity has `passwordHash` on the type; if any future code returns the raw entity (e.g. in a generic list or debug endpoint), it could leak. Currently no such path found; recommend keeping a policy of never returning UserEntity (or any entity with secrets) directly and always mapping to a DTO.

### ❌ Critical vulnerabilities

- None in this section (assuming current response shapes and no raw-entity returns).

---

## 4. Environment & Configuration Security

### ✅ Secure areas

- **JWT secret in production:** Must be set and must not be the default; otherwise application throws and does not start.
- **Config validation:** `validate()` in env.validation.ts is used (ConfigModule); production JWT check is applied to loaded config object.
- **No conditional dev routes:** No routes or features are gated by NODE_ENV in a way that would expose dev-only endpoints in production.
- **Database config:** Host, port, username, password, database, synchronize, logging come from environment variables; no hardcoded production credentials.

### ⚠ Security warnings

- **Database password default:** `DB_PASSWORD` defaults to `''` in configuration. In development this may be acceptable; in production, if DB_PASSWORD is not set, the app would connect with an empty password. Recommend validating in production that DB_PASSWORD (and other critical DB vars) are set, or documenting that production must set them.
- **Default JWT secret string in source:** The string `'change-me-in-production'` appears in code; it is only used when not in production and production startup fails if it is used. Low risk but visible in repo.

### ❌ Critical vulnerabilities

- None in this section.

---

## 5. Destructive Operations Safety

### ✅ Secure areas

- **No exposed delete endpoints:** No controller exposes a DELETE route. OrganizationsRepository has a `delete(id)` method but no HTTP endpoint calls it. Projects, tasks, workflows, sprints, etc. have no delete endpoints in controllers. Risk of mass delete or accidental cascade via API is low.
- **No mass-update endpoints:** No bulk PATCH/PUT that could update many records by a single request without scoping. Notifications have `markAsRead(id)` for a single id (but see IDOR above).
- **Cascade behavior:** Cascade deletes are defined at the entity/DB level (e.g. project → tasks, org → projects). Since no delete API is exposed, cascade-delete is not triggerable by end users via the app.

### ⚠ Security warnings

- **Future deletes:** If delete endpoints are added later, they must enforce tenant and (where applicable) role (e.g. only org owner/admin can delete org, or only project members with delete permission). Current design does not implement this because no delete endpoints exist.

### ❌ Critical vulnerabilities

- None in this section (no destructive endpoints exposed).

---

## 6. Rate Limiting & Abuse Risks

### ✅ Secure areas

- **Health endpoint:** GET /health is public for load balancers; response is standard health check (e.g. DB ping). No sensitive data returned.
- **Login endpoint:** POST /auth/login is public by design; credentials are validated server-side. No rate limiting found (see below).

### ⚠ Security warnings

- **No rate limiting:** There is no ThrottlerModule or custom rate-limiting middleware. Consequences:
  - **Login:** Brute-force or credential stuffing against POST /auth/login is not throttled. Mitigation is partial (bcrypt) but attackers can attempt many requests per second.
  - **API abuse:** Authenticated endpoints can be called at high rate; no per-user or per-IP throttling. Could lead to DoS or scraping.
- **Public endpoints:** Only login and health are public. Both are necessary; the main abuse vector is unthrottled login.

### ❌ Critical vulnerabilities

- None solely from “missing rate limiting” (no unauthenticated data mutation or privilege escalation from this alone), but absence of rate limiting is a significant production risk for abuse and brute-force.

---

## Summary Table

| Area                         | ✅ Secure              | ⚠ Warnings                                                                 | ❌ Critical                                                                 |
|-----------------------------|------------------------|----------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| Authentication              | JWT config, prod secret, expiry, login flow | No refresh token; default secret string in code                           | None                                                                        |
| Authorization               | Global JWT, TenantGuard usage, org canAccess, notifications list, billing/activity scoped | RBAC not used; GET /users/:id no self/admin check                          | Notifications markAsRead IDOR; cross-tenant read (projects, tasks, workflows, sprints, project-scoped lists) |
| Data exposure               | User/login DTOs, no password in responses, logging safe | Policy: never return raw UserEntity                                        | None                                                                        |
| Environment & config        | Prod JWT enforced, config validation, no dev-only routes | DB password default; default secret in code                                | None                                                                        |
| Destructive operations      | No delete/mass-update endpoints                                             | Future deletes must enforce tenant/role                                    | None                                                                        |
| Rate limiting               | Health/login design    | No throttling; login brute-force and API abuse possible                    | None                                                                        |

---

## Recommendations (audit only; no refactor)

1. **Critical — Notifications markAsRead:** Before updating, load the notification by id and verify `notification.userId === request.user.userId` (or equivalent). If not owned, return 403/404. Do not rely on id alone.
2. **Critical — Cross-tenant read:** For every get-by-id and project-scoped list that runs under TenantGuard, ensure the resource’s organization (or project’s organization) equals `request.tenantId`. For example: load project/task/workflow/sprint by id, then check `resource.organizationId === tenantId` (or for tasks/workflows/sprints, check via project.organizationId). Return 404 if not in tenant. Apply the same tenant check for list-by-project endpoints using `projectId` (resolve project, then verify project.organizationId === tenantId).
3. **High — GET /users/:id:** Restrict to self or to roles with permission (e.g. same user or org admin). Return 403 if the requested id is not the current user and the user does not have an allowed role.
4. **High — Rate limiting:** Add throttling (e.g. @nestjs/throttler) for login (e.g. per-IP) and optionally for global or per-user API limits to reduce brute-force and abuse.
5. **Medium — RBAC:** If roles (from TenantGuard) are intended to restrict actions, apply `@Roles()` (and UseGuards(RolesGuard)) on the relevant routes (e.g. org admin–only or project admin–only).
6. **Low — Config:** Consider validating in production that critical DB env vars (e.g. DB_PASSWORD) are set and non-default where applicable.

---

*Audit performed against current codebase. No code or modules were refactored or regenerated.*

# Runtime Integrity & Dependency Wiring Validation Report

**Scope:** Full runtime correctness and structural integrity of the NestJS application  
**Type:** Deep runtime analysis and dependency validation (no regeneration, no refactor)  
**Date:** 2025-02-17

---

## 1. Application Boot Integrity

### ✅ Confirmed correct

- **Entry point:** `main.ts` creates the app with `NestFactory.create(AppModule)` and wires global prefix, ValidationPipe, GlobalExceptionFilter, and LoggingInterceptor. Bootstrap order is correct.
- **Root module:** `AppModule` imports ConfigModule, DatabaseModule, HealthModule, and all feature modules. No missing top-level imports.
- **ConfigModule:** Loaded first (in AppModule imports). Uses `forRoot` with `isGlobal: true`, so ConfigService is available everywhere.
- **DatabaseModule:** `@Global()` and TypeOrmModule.forRootAsync with ConfigService injection. Entity glob `__dirname + '/../../**/*.entity{.ts,.js}'` resolves correctly from `dist/` at runtime.
- **Module order:** ConfigModule and DatabaseModule appear before feature modules that depend on them; HealthModule appears after DatabaseModule so the default TypeORM connection exists for health checks.

### ⚠ Architectural warning

- **Migrations path:** `database.module.ts` sets `migrations: [__dirname + '/migrations/*{.ts,.js}']`. At runtime from `dist/infrastructure/database/`, this points to `dist/infrastructure/database/migrations/`. If migrations are not copied there or run via CLI from a different path, migration runs may fail or not find files.  
  **Recommendation:** Document where to run migrations from (e.g. project root with a data-source path) or ensure the build copies migrations into the expected path.

---

## 2. Dependency Injection Integrity

### ✅ Confirmed correct

- **JwtAuthGuard (APP_GUARD):** Provided in AppModule with `useClass: JwtAuthGuard`. Only dependency is `Reflector` (from `@nestjs/core`). No unresolved tokens.
- **JwtStrategy:** Provided and used in AuthModule. Depends on ConfigService (global) and AuthService (same module). Both available.
- **AuthService:** Depends on UsersService and JwtService. AuthModule imports UsersModule and JwtModule; both are exported from those modules. Resolved.
- **TenantGuard (when resolvable):** Depends on Reflector and `ORGANIZATION_MEMBERS_REPOSITORY`. OrganizationsModule provides and exports the token; AuthModule imports OrganizationsModule, so within AuthModule context the token is resolved.
- **Repositories:** All feature modules register their repositories and entities via TypeOrmModule.forFeature; DatabaseModule is global and registers the default connection, so repositories resolve.
- **Duplicate provider:** `OrganizationMembersRepository` is both a class provider and bound to `ORGANIZATION_MEMBERS_REPOSITORY`. Both are in the same module; Nest treats them as two providers (one concrete, one token alias). No scope conflict.
- **Scoping:** No request-scoped or transient providers; default singleton scope is used consistently and is appropriate for stateless services and DB access.

### ❌ Critical runtime risk: TenantGuard not resolvable in feature modules

- **Risk:** Controllers in **ProjectsModule, TasksModule, BillingModule, ActivityLogsModule, CustomFieldsModule, SprintsModule, WorkflowsModule** use `@UseGuards(JwtAuthGuard, TenantGuard)`. None of these modules **import AuthModule**. In Nest, a guard used in `@UseGuards()` is resolved from the **module that owns the controller**. So when a request hits e.g. `POST /api/v1/projects`, Nest tries to instantiate `TenantGuard` in the context of ProjectsModule. ProjectsModule does not provide or import TenantGuard, so **Nest will throw a dependency resolution error** (e.g. "Nest can't resolve dependencies of TenantGuard" or the guard not being found) on the first request to any of these routes.
- **Impact:** All tenant-scoped routes (projects, tasks, workflows, sprints, custom-fields, billing subscription, activity-logs) will fail at runtime with a DI error as soon as they are hit.
- **Recommendation:** For every module whose controller uses `TenantGuard`, add **AuthModule** to that module’s `imports` array so the exported `TenantGuard` is available: **ProjectsModule, TasksModule, BillingModule, ActivityLogsModule, CustomFieldsModule, SprintsModule, WorkflowsModule.**  
  **OrganizationsModule** must not import AuthModule (it would create a circular dependency: AuthModule → OrganizationsModule → AuthModule). For the single route on OrganizationsController that uses TenantGuard, either: (a) register TenantGuard in a **global** module that only imports OrganizationsModule and exports TenantGuard, and import that global module in AppModule, or (b) remove TenantGuard from that route and enforce tenant context another way (e.g. body/param and service-level check).

### ⚠ Architectural warning

- **RolesGuard not registered:** `RolesGuard` is defined in `auth/guards/roles.guard.ts` but is **not** listed in AuthModule’s `providers` or `exports`. Any route that uses `@UseGuards(RolesGuard)` will fail at runtime with an unresolved provider.  
  **Recommendation:** If RBAC via `@Roles()` is intended, add `RolesGuard` to AuthModule’s `providers` and `exports`. If it is not used yet, leave as-is but document that it must be registered before use.

---

## 3. Circular Dependency Analysis

### ✅ Confirmed correct

- **AuthModule → UsersModule, OrganizationsModule:** One-way. No cycle.
- **Feature modules → each other:** Projects, Tasks, Workflows, Sprints, CustomFields, Notifications, Billing, ActivityLogs do not import each other. Cross-cutting use of entities is via TypeORM’s global entity registration, not module imports. No direct or indirect circles among these.
- **Infrastructure → common:** Health and database modules depend on config/common, not on feature modules (after moving `Public` to common). No cycle.

### ⚠ Architectural warning

- **Potential cycle if TenantGuard is fixed by importing AuthModule everywhere:** If OrganizationsModule is updated to import AuthModule so that OrganizationsController can use TenantGuard, the dependency graph becomes **OrganizationsModule → AuthModule → OrganizationsModule**, which is a circular dependency and can cause runtime or bootstrap failures.  
  **Recommendation:** Do **not** add AuthModule to OrganizationsModule. Use the global-guard or alternative-tenant-enforcement approach described in §2 for the organizations tenant route.

---

## 4. Infrastructure Configuration

### ✅ Confirmed correct

- **Database:** TypeOrmModule.forRootAsync uses ConfigService; connection options (host, port, username, password, database) come from `configuration()` and are environment-driven. No credentials hardcoded in code.
- **Connection pooling:** `configuration.ts` sets `database.extra.connectionLimit` and `queueLimit` from env (DB_CONNECTION_LIMIT, DB_QUEUE_LIMIT). Pooling is configured for production use.
- **ORM initialization:** Single default connection; entities loaded via glob. Synchronize and logging are env-driven (`DB_SYNCHRONIZE`, `DB_LOGGING`).
- **Health check:** HealthController uses TypeOrmHealthIndicator with `pingCheck('database')`, which uses the default TypeORM connection. TerminusModule provides the indicator; no extra TypeORM import needed in HealthModule.

### ⚠ Architectural warning

- **Unsafe defaults in configuration:** In `config/configuration.ts`, `jwt.secret` defaults to `'change-me-in-production'` and `database.password` to `''`. If the app is started in production without setting JWT_SECRET and DB_PASSWORD, it will run with weak or empty secrets.  
  **Recommendation:** In production, fail fast if critical env vars are missing: e.g. in `configuration()`, when `nodeEnv === 'production'`, require JWT_SECRET and DB_PASSWORD (and optionally DB_HOST, DB_USERNAME, DB_DATABASE) and throw a clear error if unset. Optionally use the existing `validate` hook for this once its input shape is fixed (see §7).

---

## 5. Security & Auth Initialization

### ✅ Confirmed correct

- **JWT global guard:** APP_GUARD with JwtAuthGuard in AppModule applies to all routes. Routes marked with `@Public()` skip the guard via IS_PUBLIC_KEY. Login and health use `@Public()`; no bypass of auth on protected routes.
- **Passport strategy:** JwtStrategy is registered in AuthModule with strategy name `'jwt'`. AuthModule is imported by AppModule, so the strategy is registered before any request. JwtAuthGuard extends AuthGuard('jwt'), so the strategy is invoked correctly.
- **AuthService.validateUserById:** Used by JwtStrategy to validate the token subject; invalid or deleted users get UnauthorizedException. No gap at module level for valid tokens.
- **TenantGuard (when resolved):** Checks X-Organization-Id and membership; sets tenantId and roles. No bypass if the guard is successfully instantiated.

### ⚠ Architectural warning

- **CurrentUserId decorator:** When `request.user` or `request.user.userId` is missing, the decorator throws a generic `Error`. That can surface as a 500 and may leak internal wording ("CurrentUserId decorator requires JwtAuthGuard").  
  **Recommendation:** Throw `UnauthorizedException('Unauthorized')` (or similar) instead of `Error` so the global exception filter returns a consistent 401 and avoids internal messages.

---

## 6. Global Application Middleware

### ✅ Confirmed correct

- **ValidationPipe:** Applied in `main.ts` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`, and `transformOptions: { enableImplicitConversion: true }`. Applied globally before route handlers; invalid DTOs are rejected with 400.
- **GlobalExceptionFilter:** Registered with `useGlobalFilters(GlobalExceptionFilter)`. Catches all exceptions; maps HttpException to status/body and logs 5xx. No constructor dependencies; works as a singleton.
- **LoggingInterceptor:** Registered with `useGlobalInterceptors(LoggingInterceptor)`. Runs in the request lifecycle; no constructor dependencies. Logs method, url, handler name, and duration.
- **Order:** In Nest, the order is: middleware → guards → interceptors (before) → pipe → controller → interceptors (after) → exception filters. Global guard (JwtAuthGuard), pipe, filter, and interceptor are all registered; their relative order is correct for auth, validation, logging, and error handling.

### ⚠ Architectural warning

- **LoggingInterceptor:** Uses `context.getHandler().name`. If the handler is anonymous or minified, `name` can be empty or not meaningful. Low impact; consider falling back to a route path or controller method string for logs.

---

## 7. Environment & Configuration Safety

### ✅ Confirmed correct

- **Config load:** ConfigModule loads `configuration()` and uses envFilePath. Values come from `process.env` with defaults in code. No hardcoded production secrets.
- **Dev vs prod:** `nodeEnv` is read from NODE_ENV; it can be used to branch behavior (e.g. strict env checks in production) if implemented.

### ⚠ Architectural warning

- **Validate function vs loaded config shape:** In `config/config.module.ts`, `validate` is passed to Nest’s ConfigModule. In Nest, when using `load: [configuration]`, the object passed to `validate` is the **loaded configuration** (the return value of `configuration()`), which has **camelCase** keys (e.g. `nodeEnv`, `port`, `jwt`, `database`). In `env.validation.ts`, `EnvironmentVariables` uses **UPPER_SNAKE** (e.g. `NODE_ENV`, `PORT`, `JWT_SECRET`). So `plainToInstance(EnvironmentVariables, config)` maps the wrong shape; validated properties may be undefined and validation may not reflect actual env usage. With all properties `@IsOptional()`, validation can pass without enforcing anything.  
  **Recommendation:** Either (1) validate the **loaded** config (e.g. a DTO with `nodeEnv`, `port`, `jwt: { secret, expiresIn }`, etc.) or (2) pass `process.env` (or the raw env object) into `validate` and keep `EnvironmentVariables` as-is. Align the validate contract with what Nest passes in and use it to enforce required production vars (e.g. JWT_SECRET, DB_*) in production.

### ❌ Critical runtime risk: Production secrets default

- **Risk:** `configuration.ts` defaults `jwt.secret` to `'change-me-in-production'`. If JWT_SECRET is not set in production, tokens are signed with a known default and can be forged.  
  **Impact:** Full authentication bypass and privilege escalation.  
  **Recommendation:** In production, do not default JWT_SECRET. In `configuration()`, if `process.env.NODE_ENV === 'production'` and `!process.env.JWT_SECRET`, throw an Error and refuse to start. Optionally do the same for DB_PASSWORD and other critical vars.

---

## 8. Scalability & Stability Risks

### ✅ Confirmed correct

- **Singleton scope:** Services, repositories, and guards are singleton by default. No per-request state stored in them; suitable for horizontal scaling.
- **Stateless API:** JWT + headers; no server-side session store. No shared mutable state across requests in application code.
- **TypeORM connection:** Single connection pool; no manual connection handling or leak patterns in the codebase. Repositories use the injected TypeORM repository; no long-lived raw connections.
- **Guards and interceptors:** Stateless; no request data cached in them. Safe under load.

### ⚠ Architectural warning

- **TenantGuard and request.user mutation:** TenantGuard mutates `request.user` (adds `orgRole`, `roles`). This is per-request and safe. If in the future any guard or interceptor caches `request.user` in a shared object, that would be a concurrency bug; current code does not do this.
- **GlobalExceptionFilter logger:** Uses a single Logger instance (singleton). Logger is thread-safe for I/O; no issue for multi-instance deployment.

---

## Summary Table

| Area                         | Status | Notes |
|-----------------------------|--------|--------|
| Application boot            | ✅     | Entry, root module, and config/DB/health order correct. |
| DI – general                | ✅     | Repositories, Auth, JWT, and tokens resolve where modules import correctly. |
| DI – TenantGuard in features| ❌     | Feature modules using TenantGuard do not import AuthModule → runtime DI failure. |
| Circular dependencies       | ✅     | No current cycle; avoid adding AuthModule to OrganizationsModule. |
| Infrastructure / DB         | ✅     | Env-driven, pooling configured; unsafe defaults only (see below). |
| Security / auth             | ✅     | JWT global, Public, strategy; CurrentUserId could throw 401 instead of 500. |
| Global middleware           | ✅     | Validation, filter, interceptor registered and ordered correctly. |
| Config / env                | ⚠️❌   | Validate shape mismatch; production default JWT secret is a critical risk. |
| Scalability / stability     | ✅     | Stateless, singletons, no shared mutable state or connection leaks. |

---

## Recommended Fix Order

1. **Critical:** Resolve **TenantGuard** in feature modules by adding **AuthModule** to the `imports` of **ProjectsModule, TasksModule, BillingModule, ActivityLogsModule, CustomFieldsModule, SprintsModule, WorkflowsModule.** Do **not** add AuthModule to **OrganizationsModule**; fix the single tenant route on OrganizationsController via a global guard module or alternative tenant enforcement.
2. **Critical:** Enforce **JWT_SECRET** (and optionally other secrets) in production in `configuration()` or validate: refuse to start if NODE_ENV is production and JWT_SECRET is unset or still the default.
3. **High:** Align **config validation** with the object actually passed to `validate()` (loaded config shape or raw env) and use it to require production-critical env vars.
4. **Medium:** Register **RolesGuard** in AuthModule (providers + exports) if `@Roles()` is intended for use.
5. **Low:** In **CurrentUserId**, throw **UnauthorizedException** instead of a generic Error; optionally make **LoggingInterceptor** robust to missing handler names.

---

*This report is a runtime integrity assessment only. No application code or structure was regenerated.*

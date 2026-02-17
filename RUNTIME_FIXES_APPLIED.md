# Runtime Integrity Fixes Applied

Based strictly on **RUNTIME_INTEGRITY_REPORT.md**. Minimal, production-safe corrections only. No architecture redesign; module boundaries and migration alignment preserved.

---

## 1. Critical: TenantGuard not resolvable in feature modules

**Risk:** Controllers in 7 modules used `@UseGuards(TenantGuard)` but did not import AuthModule, causing Nest to fail resolving TenantGuard on first request to those routes.

**Fix:** Added **AuthModule** to the `imports` array of every module whose controller uses TenantGuard.

**Files changed:**

| File | Change |
|------|--------|
| `src/modules/projects/projects.module.ts` | `import { AuthModule } from '../auth/auth.module';` and `AuthModule` in `imports`. |
| `src/modules/tasks/tasks.module.ts` | Same. |
| `src/modules/billing/billing.module.ts` | Same. |
| `src/modules/activity-logs/activity-logs.module.ts` | Same. |
| `src/modules/custom-fields/custom-fields.module.ts` | Same. |
| `src/modules/sprints/sprints.module.ts` | Same. |
| `src/modules/workflows/workflows.module.ts` | Same. |

**Why it works:** Nest resolves guards from the module that owns the controller. Importing AuthModule makes the exported TenantGuard (and its dependency `ORGANIZATION_MEMBERS_REPOSITORY`) available in those modules’ context.

**Circular dependencies:** None. AuthModule → UsersModule, OrganizationsModule; feature modules → AuthModule only. OrganizationsModule does **not** import AuthModule (see below).

---

## 2. Critical: OrganizationsController tenant route (avoid cycle)

**Risk:** Adding AuthModule to OrganizationsModule would create **OrganizationsModule → AuthModule → OrganizationsModule**.

**Fix:** Removed TenantGuard from `GET organizations/:id`. Tenant context is enforced with the **X-Organization-Id** header and a service-level access check; no AuthModule import in OrganizationsModule.

**Files changed:**

| File | Change |
|------|--------|
| `src/modules/organizations/organizations.controller.ts` | Removed TenantGuard and `TenantId` decorator. `findOne` now takes `@CurrentUserId() userId` and `@Headers('x-organization-id') orgIdHeader`. If header missing or `orgIdHeader !== id`, throws `ForbiddenException`. Then calls `organizationsService.canAccess(id, userId)`; if false, throws `ForbiddenException`. Then returns `findById(id)` as before. |
| `src/modules/organizations/organizations.service.ts` | Added `canAccess(organizationId: string, userId: string): Promise<boolean>` using `orgMembersRepository.findByOrganizationAndUser` and `status === 'ACTIVE'`. |

**Why it works:** Same tenant guarantee (user must be active member of the org and request must match header) without TenantGuard, so OrganizationsModule does not need AuthModule.

**Circular dependencies:** None. OrganizationsModule unchanged; no new imports.

---

## 3. Critical: Production JWT secret default

**Risk:** Default `jwt.secret` (`'change-me-in-production'`) in production allows token forgery and full auth bypass.

**Fix:** Fail fast at config load when `NODE_ENV === 'production'`: require a set, non-default JWT secret and throw before returning config.

**File changed:** `src/config/configuration.ts`

**Snippet:**

```ts
const DEFAULT_JWT_SECRET = 'change-me-in-production';

export const configuration = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

  if (nodeEnv === 'production') {
    if (!process.env.JWT_SECRET || jwtSecret === DEFAULT_JWT_SECRET) {
      throw new Error(
        'JWT_SECRET must be set to a non-default value in production. Refusing to start.',
      );
    }
  }

  return {
    nodeEnv,
    port: parseInt(process.env.PORT || '3000', 10),
    // ... rest unchanged, jwt.secret uses jwtSecret
  };
};
```

**Why it works:** App will not start in production without a proper JWT_SECRET, eliminating the default-secret risk.

---

## 4. High: Config validation shape and production enforcement

**Risk:** `validate()` was written for UPPER_SNAKE env vars while Nest passes the **loaded** config (camelCase from `configuration()`), so validation did not align with what Nest passes and did not enforce production vars.

**Fix:** `validate()` now works on the **loaded config** object: in production it checks `jwt.secret` and throws if missing or default; then returns the same config so Nest uses it unchanged.

**File changed:** `src/config/env.validation.ts`

**Snippet:**

```ts
export function validate(config: Record<string, unknown>) {
  const loaded = config as { nodeEnv?: string; jwt?: { secret?: string } };
  if (loaded?.nodeEnv === 'production') {
    const secret = loaded.jwt?.secret;
    if (!secret || secret === 'change-me-in-production') {
      throw new Error(
        'JWT_SECRET must be set to a non-default value in production. Refusing to start.',
      );
    }
  }
  return config;
}
```

Removed the old `EnvironmentVariables` class and `plainToInstance`/`validateSync` usage so the contract matches what Nest passes.

**Why it works:** Validation runs on the same object Nest gets from `load: [configuration]` and enforces production JWT secret at startup; return value keeps the existing config shape.

---

## 5. Medium: RolesGuard not registered

**Risk:** RolesGuard was never in AuthModule’s `providers`/`exports`, so any route using `@UseGuards(RolesGuard)` would fail at runtime.

**Fix:** Registered RolesGuard in AuthModule and exported it.

**File changed:** `src/modules/auth/auth.module.ts`

**Snippet:**

```ts
import { RolesGuard } from './guards/roles.guard';
// ...
providers: [AuthService, JwtStrategy, TenantGuard, RolesGuard],
exports: [AuthService, JwtModule, TenantGuard, RolesGuard],
```

**Why it works:** Any module that imports AuthModule can now use `@UseGuards(RolesGuard)` and `@Roles()` without DI errors.

---

## 6. Low: CurrentUserId decorator error type

**Risk:** When `request.user` was missing, the decorator threw a generic `Error`, leading to 500 and possible leakage of internal wording.

**Fix:** Throw `UnauthorizedException('Unauthorized')` instead so the global exception filter returns 401 with a safe message.

**File changed:** `src/common/decorators/current-user.decorator.ts`

**Snippet:**

```ts
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
// ...
if (!userId) {
  throw new UnauthorizedException('Unauthorized');
}
```

**Why it works:** Missing user is treated as unauthorized and returns a consistent 401 without exposing implementation details.

---

## Summary

| # | Issue | Severity | Resolution |
|---|--------|----------|------------|
| 1 | TenantGuard not resolvable in 7 feature modules | Critical | AuthModule added to those modules’ `imports`. |
| 2 | OrganizationsController tenant route without importing AuthModule | Critical | TenantGuard removed from `findOne`; tenant enforced via X-Organization-Id + `canAccess()`. |
| 3 | Production JWT secret default | Critical | Fail fast in `configuration()` when production and JWT_SECRET missing/default. |
| 4 | Config validation shape / production enforcement | High | `validate()` uses loaded config, enforces production JWT, returns config. |
| 5 | RolesGuard not registered | Medium | RolesGuard added to AuthModule providers and exports. |
| 6 | CurrentUserId throws generic Error | Low | Throw `UnauthorizedException('Unauthorized')` instead. |

**Build:** `npm run build` succeeds after all changes.

**Circular dependencies:** None introduced. OrganizationsModule still does not import AuthModule; all other feature modules only add a one-way dependency on AuthModule.

---

## Remaining known risks (from report, not changed)

- **Migrations path:** `database.module.ts` points migrations at `dist/infrastructure/database/migrations/`. Document or adjust so migration runs (e.g. CLI or CI) use the correct path.
- **Unsafe defaults in non-production:** `database.password` and other defaults remain for local/dev; production safety is enforced by JWT_SECRET and can be extended (e.g. require DB_* in production) if desired.
- **LoggingInterceptor:** `context.getHandler().name` can be empty for anonymous/minified handlers; low impact, no change made.

These are documented in **RUNTIME_INTEGRITY_REPORT.md** and can be addressed in a later iteration if needed.

# Rate Limiting and Brute-Force Protection

## Overview

The API uses `@nestjs/throttler` for request throttling:

- **Auth endpoints** (e.g. `/auth/login`): Stricter limit per IP to mitigate brute-force and credential stuffing.
- **General API** (authenticated routes): Higher limit per user (or per IP when unauthenticated).
- **Health** (`/health`): Not throttled.

Multi-tenant and business logic are unchanged; throttling is applied as a global guard in addition to existing guards.

## Configuration

Config is in `src/config/configuration.ts` and can be overridden via environment variables:

| Env | Default | Description |
|-----|---------|-------------|
| `THROTTLE_AUTH_TTL_MS` | 60000 | Time window (ms) for auth limit. |
| `THROTTLE_AUTH_LIMIT` | 10 | Max login attempts per IP per window. |
| `THROTTLE_GENERAL_TTL_MS` | 60000 | Time window (ms) for general API. |
| `THROTTLE_GENERAL_LIMIT` | 100 | Max requests per user/IP per window. |

## Throttling Strategy

1. **Two named throttlers**
   - `auth`: Applied only to `/auth/login` (and any future auth routes like register). Skipped on all other routes.
   - `default`: Applied to all non-auth, non-health routes. Skipped on login and health.

2. **Tracker (identity)**
   - Configured in `ThrottleModule` via `getTracker`: `req.user?.userId ?? req.ip ?? 'unknown'`.
   - **Login**: No JWT → tracked by **IP** (brute-force protection per IP).
   - **Authenticated routes**: After `JwtAuthGuard`, `req.user` is set → tracked by **user id** (per-user abuse protection).

3. **Guard order**
   - `JwtAuthGuard` runs first, then `ThrottlerGuard`, so authenticated requests are limited per user.

4. **Decorators**
   - `@SkipThrottle({ default: true })` on login → only `auth` throttler applies.
   - `@SkipThrottle({ auth: true })` on all other controllers → only `default` applies.
   - `@SkipThrottle({ default: true, auth: true })` on health → no throttling.

## Module Layout

- **`src/infrastructure/throttle/throttle.module.ts`**: Registers `ThrottlerModule.forRootAsync` with config and `getTracker`.
- **`src/app.module.ts`**: Imports `ThrottleModule` and registers `ThrottlerGuard` as `APP_GUARD` (after `JwtAuthGuard`).
- **Auth controller**: Login uses auth throttler only; logout uses default only.
- **Other controllers**: Use default throttler only (`@SkipThrottle({ auth: true })`).

## Responses

When a limit is exceeded, the guard throws and the app returns **429 Too Many Requests** with a JSON body (handled by the global exception filter).

## Integration Tests

- **`test/throttle-integration.e2e-spec.ts`**: Overrides config to low limits (auth: 3, general: 5), then:
  - Exceeds login attempts → expects 429.
  - Exceeds general API requests (GET /projects with valid token) → expects 429.
- Run: `npm run test:throttle` (or `npx jest test/throttle-integration.e2e-spec.ts --runInBand`).
- Security integration tests are unchanged and remain under the default (higher) limits.

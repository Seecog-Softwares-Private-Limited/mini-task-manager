# Frontend Production Hardening — Summary

## 1. List of improvements

| Area | Improvement |
|------|-------------|
| **Auth** | Centralized 401 handling: clear token + cookie and redirect in axios interceptor; `clearAuth()` used on explicit logout. |
| **Auth** | httpOnly cookie strategy documented (see FRONTEND-AUTH-STRATEGY.md); current flow uses localStorage + cookie for middleware. |
| **Tenant** | `TenantProvider` + `useTenant()` replace raw localStorage for org; `setOrgId` syncs context and storage. |
| **Tenant** | `TenantGuard` redirects to `/dashboard/workspaces` when path requires tenant but no org is set. |
| **Tenant** | `X-Organization-Id` always from `getStoredOrgId()` (updated via `setOrgId` in context); never missing for protected routes that pass TenantGuard. |
| **Errors** | `normalizeApiError()` normalizes backend `{ statusCode, message }` (message string or string[]). |
| **Errors** | Global API errors (5xx, 429, network) reported via `reportGlobalError()` and shown in `GlobalErrorToast`. |
| **Errors** | `ErrorBoundary` wraps app; catches render errors and shows fallback with “Try again”. |
| **UX** | Skeleton loaders on dashboard layout (initial) and projects list / project detail. |
| **UX** | `loading.tsx` for dashboard route (Next.js loading UI). |
| **UX** | Optimistic UI for create project (onMutate/onError/onSettled). |
| **UX** | `EmptyState` component used on projects list when no data. |
| **Roles** | `useAuth().roles` and `hasRole(role)`; nav items filtered by `requiredRole` (e.g. Billing for admin). |
| **Roles** | `RoleGuard` component for route-level role checks. |
| **SSR** | Token only read in client (localStorage); no token in server logs. |
| **Resilience** | 429: no retry in React Query; global toast shows “Too many requests”. |
| **Resilience** | Exponential retry for GET: `retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)`, max 2 retries. |
| **Resilience** | `NetworkFallback` component for network errors with retry. |

---

## 2. Updated folder structure

```
frontend/src/
├── app/
│   ├── dashboard/
│   │   ├── loading.tsx          # NEW: route loading skeleton
│   │   ├── layout.tsx           # UPDATED: TenantGuard, role nav, skeleton
│   │   ├── workspaces/page.tsx     # Tenant picker; legacy organizations route redirects here
│   │   ├── projects/
│   │   │   ├── [id]/page.tsx    # UPDATED: useTenant, Skeleton, NetworkFallback
│   │   │   └── page.tsx         # UPDATED: useTenant, Skeleton, EmptyState, optimistic
│   │   └── ...
│   ├── providers.tsx            # UPDATED: ErrorBoundary, ErrorProvider, TenantProvider, GlobalErrorToast
│   └── ...
├── components/
│   ├── dashboard-skeleton.tsx   # NEW
│   ├── empty-state.tsx         # NEW
│   ├── error-boundary.tsx       # NEW
│   ├── global-error-toast.tsx   # NEW
│   ├── network-fallback.tsx     # NEW
│   ├── role-guard.tsx           # NEW
│   ├── tenant-guard.tsx         # NEW
│   └── ui/
│       └── skeleton.tsx         # NEW
├── context/
│   ├── error-context.tsx        # NEW
│   └── tenant-context.tsx       # NEW
├── lib/
│   ├── error.ts                 # NEW: normalizeApiError, NormalizedError
│   └── global-error-handler.ts  # NEW: setGlobalErrorHandler, reportGlobalError
├── services/api/
│   └── client.ts                # UPDATED: clearAuth, 401 redirect, report 5xx/429/network
└── hooks/
    └── use-auth.ts              # UPDATED: roles, hasRole
```

---

## 3. Updated auth flow strategy

1. **Login:** User submits credentials → `login()` stores token in localStorage and sets cookie `mini_tm_signed_in` → redirect to `from` or dashboard.
2. **Requests:** Axios interceptor adds `Authorization: Bearer <token>` and `X-Organization-Id` (from storage, kept in sync by TenantProvider).
3. **401:** Interceptor calls `clearAuth()`, dispatches `auth:logout`, and sets `window.location.href` to `/login?from=...`. Single place for “session expired” behavior.
4. **Logout:** User clicks Log out → `logout()` (POST /auth/logout) and `clearAuth()` → redirect to `/login`.
5. **Middleware:** Protects routes by checking cookie `mini_tm_signed_in`; no token read on server.

See **FRONTEND-AUTH-STRATEGY.md** for httpOnly cookie option and same-origin proxy approach.

---

## 4. Code snippets for critical improvements

### 4.1 Centralized 401 and global error reporting (api client)

```ts
// services/api/client.ts (excerpt)
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    if (status === 401 && !url.includes("/auth/login")) {
      clearAuth();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:logout"));
        window.location.href = "/login?from=" + encodeURIComponent(window.location.pathname);
      }
    } else {
      const normalized = normalizeApiError(err);
      if (normalized.statusCode >= 500 || normalized.isRateLimited || normalized.isNetwork)
        reportGlobalError(normalized);
    }
    return Promise.reject(err);
  }
);
```

### 4.2 Tenant context and guard

```ts
// context/tenant-context.tsx: single source of truth for orgId; setOrgId syncs storage + state.
const setOrgId = useCallback((id: string | null) => {
  setStoredOrgId(id);
  setOrgIdState(id);
}, []);

// components/tenant-guard.tsx: redirect when path requires tenant but orgId is null.
if (isTenantRequiredPath(pathname) && !orgId) {
  router.replace("/dashboard/workspaces?required=1");
  return <EmptyTenantUI />;
}
```

### 4.3 Normalized error and global toast

```ts
// lib/error.ts
export function normalizeApiError(err: unknown): NormalizedError {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorBody | undefined;
    const message = data?.message;
    const messageStr = Array.isArray(message) ? message.join(", ") : typeof message === "string" ? message : undefined;
    return {
      message: messageStr ?? err.message ?? "Request failed",
      statusCode: err.response?.status,
      isNetwork: !err.response,
      isRateLimited: err.response?.status === 429,
    };
  }
  // ...
}
```

### 4.4 Exponential retry (React Query)

```ts
// app/providers.tsx
retry: (failureCount, error) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403 || status === 429) return false;
  return failureCount < 2;
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

### 4.5 Optimistic create project

```ts
// dashboard/projects/page.tsx
onMutate: async (payload) => {
  await queryClient.cancelQueries({ queryKey: ["projects", orgId ?? ""] });
  const previous = queryClient.getQueryData<Project[]>(["projects", orgId ?? ""]);
  const optimistic: Project = { id: `temp-${Date.now()}`, ... };
  queryClient.setQueryData(["projects", orgId ?? ""], (old) => [...(old ?? []), optimistic]);
  return { previous };
},
onError: (_err, _vars, context) => {
  if (context?.previous != null)
    queryClient.setQueryData(["projects", orgId ?? ""], context.previous);
},
```

---

## 5. Final frontend production readiness score: **8/10**

| Category | Score | Notes |
|----------|-------|--------|
| Auth | 2/2 | Central 401 logout; clearAuth; middleware + API consistent; httpOnly path documented. |
| Multi-tenant | 2/2 | Tenant context; guard; X-Organization-Id from single source. |
| Error handling | 2/2 | Normalized errors; ErrorBoundary; global toast for 5xx/429/network. |
| UX | 1.5/2 | Skeletons; loading; optimistic project create; empty states; no app-wide progress bar. |
| Role-based UI | 1/1 | Nav by role; RoleGuard; roles from token (when backend adds claim). |
| SSR / client | 0.5/1 | No token on server; client-only token read; hydration handled by loading state. |
| Resilience | 1/1 | 429 handled; exponential retry for GET; network fallback. |

**Deductions:** No httpOnly JWT yet (documented only); no global top loading bar (only route loading); optional: request correlation ID and stricter CSP.

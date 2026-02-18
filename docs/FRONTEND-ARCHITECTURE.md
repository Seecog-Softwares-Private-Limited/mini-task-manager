# Frontend Architecture

## Backend → Frontend mapping

See [BACKEND-FRONTEND-MAPPING.md](./BACKEND-FRONTEND-MAPPING.md) for domain mapping, API contract, pagination, and error format.

## Folder structure

```
frontend/src/
├── app/              # App Router: layout, pages, providers
├── modules/          # Feature modules (auth, projects, organizations, tasks, …)
├── components/       # Shared components; components/ui for ShadCN-style
├── services/         # API client and domain API functions
├── hooks/            # useAuth, etc.
├── lib/              # utils (cn, etc.)
├── types/            # API and app types
└── config/           # env-based config
```

## SSR strategy

| Route type | Strategy | Reason |
|------------|----------|--------|
| Marketing / landing | SSR | SEO, fast first paint; no auth. |
| Auth (login) | CSR | Form and token handling are client-only; no need for SEO. |
| Dashboard | Hybrid | Server layout (shell), client data (React Query). Layout can be server-rendered; data fetched client-side after hydration so we have token and org context. |
| Kanban / heavy UI | Client | Drag-and-drop and real-time updates are client-only. |

Current app: login is client; dashboard and all sub-routes use a client layout that guards on token and then fetches data with React Query (client).

## API layer

- **Axios instance** (`services/api/client.ts`): base URL from config; request interceptor adds `Authorization: Bearer <token>` and `X-Organization-Id` from storage; response interceptor on 401 clears token and dispatches `auth:logout`.
- **React Query**: default staleTime 60s; no retry on 401/403; used for list/detail and mutations with invalidation.
- **Per-domain APIs**: `auth.api`, `projects.api`, `organizations.api`; others can be added following the same pattern.

## Auth and tenant

- **Token:** Stored in `localStorage`; mirrored with a cookie `mini_tm_signed_in` so Next middleware can protect routes without reading the token.
- **Middleware:** Redirects to `/login?from=...` when `mini_tm_signed_in` is not set (except on public paths like `/login`).
- **Org (tenant):** Stored in `localStorage`; sent as `X-Organization-Id` on every request. Set after creating an organization or (when implemented) selecting one in a switcher.
- **401:** Client clears token and cookie; listener in `useAuth` updates state; dashboard layout redirects to login.

## Scalability and production

- **Typed:** TypeScript strict; API types aligned with backend DTOs.
- **API URL:** From `NEXT_PUBLIC_API_URL`; no hardcoded origin.
- **Stateless:** No global in-memory store; token and org in localStorage; React Query cache is request-scoped per tab.
- **429:** Handled via `isRateLimited()` and user-facing message; no unbounded retries.
- **Docker:** Frontend Dockerfile multi-stage build; optional `docker-compose.yml` for backend + frontend.

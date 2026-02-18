# Repository Structure & Frontend Summary

## Current layout

- **Root:** NestJS backend (src/, test/, package.json, Dockerfile, etc.)
- **frontend/:** Next.js 14 App Router frontend (see frontend/README.md)

To get **root/backend** and **root/frontend** as in the original plan:

1. Create `backend/` at root.
2. Move into `backend/`: `src`, `test`, `docs` (or keep docs at root), `package.json`, `package-lock.json`, `tsconfig.json`, `nest-cli.json`, `jest.config.js`, `Dockerfile`, `.dockerignore`, and any backend-only config.
3. Update `docker-compose.yml`: set backend build context to `./backend` and dockerfile to `backend/Dockerfile`.

## Deliverables

### 1. Backend → Frontend domain mapping

See **docs/BACKEND-FRONTEND-MAPPING.md**: domain table, API contract, auth flow, tenant header, pagination, error format, endpoints list.

### 2. Frontend folder tree

```
frontend/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── activity/page.tsx
│   │   │   ├── billing/page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   ├── organizations/page.tsx
│   │   │   ├── page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── page.tsx
│   │   │   └── tasks/page.tsx
│   │   ├── login/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── label.tsx
│   ├── config/
│   │   └── env.ts
│   ├── hooks/
│   │   └── use-auth.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── services/
│   │   └── api/
│   │       ├── client.ts
│   │       ├── auth.api.ts
│   │       ├── organizations.api.ts
│   │       └── projects.api.ts
│   ├── types/
│   │   └── api.ts
│   └── middleware.ts
├── Dockerfile
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── README.md
├── tailwind.config.ts
└── tsconfig.json
```

### 3. Next.js config

**frontend/next.config.mjs:** `reactStrictMode: true`, `output: 'standalone'` for Docker.

### 4. Middleware

**frontend/src/middleware.ts:** Protects all routes except `/login`. Redirects to `/login?from=...` when cookie `mini_tm_signed_in` is not set.

### 5. Axios client

**frontend/src/services/api/client.ts:** Base URL from config; request interceptor adds `Authorization: Bearer <token>` and `X-Organization-Id`; response interceptor on 401 clears token and dispatches `auth:logout`. Helpers: `getStoredToken`, `setStoredToken`, `getStoredOrgId`, `setStoredOrgId`, `parseApiError`, `isRateLimited`.

### 6. React Query

**frontend/src/app/providers.tsx:** `QueryClientProvider` with 60s default staleTime and no retry on 401/403. Used in projects list/detail and create mutation with invalidation.

### 7. Sample implementations

- **Login:** `frontend/src/app/login/page.tsx` — form with Zod + RHF, login API, 429/error handling, redirect after success, Suspense for useSearchParams.
- **Dashboard layout:** `frontend/src/app/dashboard/layout.tsx` — client layout, useAuth, nav links, logout, redirect when unauthenticated.
- **Projects module:** `frontend/src/app/dashboard/projects/page.tsx` — list (React Query), create form (mutation), org guard; **frontend/src/app/dashboard/projects/[id]/page.tsx** — detail by id.

### 8. Run frontend locally

```bash
cd frontend
npm install
npm run dev
```

Backend must be running (e.g. port 3000). Set `NEXT_PUBLIC_API_URL` if different. Open http://localhost:3000 (or 3001 if 3000 is backend).

### 9. Dockerfile for frontend

**frontend/Dockerfile:** Multi-stage (deps → builder → runner), Node 20 Alpine, non-root user `nextjs`, `output: 'standalone'`, PORT=3001, CMD `node server.js`.

### 10. Architectural decisions

- **SSR:** Login and dashboard are client-rendered or hybrid; data after auth uses React Query (client) so token/org are available.
- **Auth:** Token in localStorage; cookie `mini_tm_signed_in` for middleware; 401 → clear token and redirect.
- **Tenant:** `X-Organization-Id` from localStorage on every request; set after creating/selecting org.
- **No global state:** Token and org in localStorage; React Query for server state.
- **429:** Detected and shown as user message; no unbounded retry.
- **Typing:** TypeScript strict; API types in `types/api.ts` aligned with backend DTOs.

See **docs/FRONTEND-ARCHITECTURE.md** for full notes.

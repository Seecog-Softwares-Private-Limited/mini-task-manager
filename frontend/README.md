# OpsPick — Frontend

Next.js 14 (App Router) SaaS frontend for the OpsPick backend.

## Stack

- **Next.js 14** (App Router), **TypeScript** (strict)
- **TailwindCSS** + **ShadCN-style** UI (Radix primitives, CVA, tailwind-merge)
- **React Query** (TanStack Query) for server state
- **Axios** for API client (JWT + `X-Organization-Id` interceptors)
- **Zod** + **React Hook Form** for validation

## Prerequisites

- Node 20+
- Backend running (port from repo-root `properties.env`, default `3000`). Optional: set `NEXT_PUBLIC_API_URL` in **`../properties.env`** if the API is not same-origin.

## Run locally

```bash
cd frontend
# Env: repo-root ../properties.env (loaded by scripts/dev.mjs + next.config.mjs)
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). Default Next dev port is 3000; if the backend uses 3000, Next will use 3001.

## Build

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t mini-task-manager-frontend .
docker run -p 3001:3001 -e NEXT_PUBLIC_API_URL=http://host.docker.internal:3000 mini-task-manager-frontend
```

Use `NEXT_PUBLIC_API_URL` so the browser can reach the API (e.g. host machine or public URL).

## Environment

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend origin, e.g. `http://localhost:3000`. No trailing slash. |

## Structure

- `src/app` — App Router routes, layout, providers
- `src/modules` — Feature modules (auth, projects, organizations, etc.)
- `src/components` — Shared UI (including `ui/` for ShadCN-style)
- `src/services/api` — Axios client and per-domain API functions
- `src/hooks` — `useAuth`, etc.
- `src/lib` — utils (e.g. `cn`)
- `src/types` — API and app types
- `src/config` — env-based config

## Auth and tenant

- **Login:** Token stored in `localStorage`; cookie `mini_tm_signed_in` set for middleware.
- **401:** Token cleared and `auth:logout` event dispatched; redirect to login in app.
- **Tenant:** `X-Organization-Id` sent on every request when set; stored in `localStorage` and set after creating/selecting an organization.

# Login flow — deep analysis (Mini Task Manager)

This document explains how email/password login works, what broke in the past, and how to debug it.

## End-to-end path

1. **Browser** (`/login`): user submits email + password.
2. **`loginWithEmailPassword`** (`frontend/src/services/auth/email-password-login.ts`):  
   `POST` to **same origin** e.g. `http://localhost:3008/api/v1/auth/login` (JSON body).
3. **Next.js** receives `/api/v1/*` on the **Next server** (not the browser).
4. **`app/api/v1/[...path]/route.ts`**: server-side `fetch` to **Nest**  
   `http://127.0.0.1:<PORT>/api/v1/auth/login` where `PORT` comes from `process.env.PORT`,  
   or is read from repo-root `properties.env` if `PORT` is unset (e.g. `next dev` from `frontend/` only).
5. **Nest** (`AuthController` → `AuthService.login`): validates user, returns `{ accessToken, user }`.
6. **Response** flows back through the proxy to the browser.
7. **Client** (`setStoredToken`): stores JWT in `localStorage` and sets cookie `mini_tm_signed_in=1` (see `client.ts`).
8. **Navigation** (`login/page.tsx`): `window.location.assign(from)` so **middleware** on the next document request sees the cookie and allows `/dashboard`.

## Pieces that must be correct

| Layer | File / behavior |
|--------|------------------|
| **Middleware** | `frontend/src/middleware.ts` — **`/api/*` must not redirect to `/login`**. Otherwise login POST gets HTML instead of JSON. |
| **API bridge** | `frontend/src/app/api/v1/[...path]/route.ts` — proxies to Nest using **127.0.0.1** and **PORT**. |
| **Nest listening** | `node app.js` should only start Next **after** the API TCP port is open (`app.js` wait loop). |
| **DB** | MySQL reachable; `users.password_hash` matches password (plain or legacy bcrypt). |
| **Cookie** | `mini_tm_signed_in` set with `path=/; SameSite=Lax` after successful login. |

## What is *not* your app (common confusion)

Console message:

`{ message: 'Could not establish connection. Receiving end does not exist.' }`  
Source: **`performance.js:44`**

- This string **does not exist** in this repository.
- It is the standard **Chrome extension** messaging error (`chrome.runtime.sendMessage` with no listener).
- It is **unrelated** to Nest, MySQL, or JWT. Ignore it or test in **Incognito with extensions disabled** to confirm.

## Historical failure modes (fixed in code)

1. **Middleware blocked `/api/v1/auth/login`** → redirect to `/login` → HTML body → parse errors / infinite “Signing in…”.
2. **Next started before Nest listened** (`node app.js`) → proxy target refused or hung → spinner forever. Mitigated by **waiting for API port** in `app.js` and **fetch timeout** in `email-password-login.ts`.
3. **`NEXT_PUBLIC_API_URL` pointed at the Next port** (e.g. 3008) → browser called the wrong host. Mitigated by forcing **relative `/api/v1`** and a **server proxy**.
4. **next.config `rewrites` proxy** — in some setups POST/streaming to an external `destination` misbehaved. Replaced by an explicit **Route Handler** proxy.

## Environment variables

| Variable | Role |
|----------|------|
| `MINI_TM_BACKEND_URL` | Set automatically by **`node app.js`** (e.g. `http://127.0.0.1:3007`). The Next proxy prefers this so it never guesses the wrong port. |
| `PORT` | Nest listen port; also used if `MINI_TM_BACKEND_URL` is unset. |
| `BACKEND_INTERNAL_URL` | Optional override for the proxy base URL (Docker / custom host). |
| `BACKEND_HOST` | Optional; default `127.0.0.1` when building URL from `PORT`. |

If you start **only** Next (`cd frontend && npm run dev`) without `app.js`, set `MINI_TM_BACKEND_URL` or `BACKEND_INTERNAL_URL` in `frontend/.env.local` to match Nest, or rely on scanning `../properties.env` (may fail with `next start` standalone cwd).

## Quick verification

1. Terminal: API log shows `Listening on port <PORT>`.
2. From machine: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:<PORT>/api/v1/health` → expect `200` (or Terminus JSON).
3. Through Next: `curl -s -X POST http://localhost:<FRONTEND_PORT>/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"owner@example.com","password":"Password123!"}'` → expect JSON with `accessToken` (after seed).

## Seed credentials (default)

- `owner@example.com` / `Password123!` (unless `SEED_USER_PASSWORD` was set when running `npm run seed`).

# Frontend Authentication Strategy

## Current implementation (localStorage + cookie)

- **Token:** Stored in `localStorage` under `mini_tm_token`. Sent on every API request via `Authorization: Bearer <token>`.
- **Middleware cookie:** A **non-httpOnly** cookie `mini_tm_signed_in=1` is set when the user logs in (and cleared on logout). Next.js middleware cannot read `localStorage`, so this cookie is used only to know “user is signed in” and to protect routes (redirect to `/login` when missing).
- **401 handling:** The axios response interceptor clears the token and cookie, dispatches `auth:logout`, and redirects to `/login?from=...`. This is the single place where 401 triggers a full logout and redirect.
- **Explicit logout:** Dashboard “Log out” calls `logout()` (POST /auth/logout) and `clearAuth()` (removes token and cookie).

## Why not httpOnly for the JWT today?

- The backend is a **separate origin** (e.g. `http://localhost:3000`) and the frontend is another (e.g. `http://localhost:3001`). The browser sends cookies only to the same origin (or with `SameSite=None; Secure` to the API origin).
- The backend expects **`Authorization: Bearer <token>`** in the header. It does not currently accept a cookie for auth. So the frontend must have access to the token to put it in the header.
- If the token lived in an **httpOnly** cookie set by the API origin, the frontend (different origin) could not read it to add to `Authorization`. The browser would send that cookie only to the API domain on same-site or CORS-with-credentials requests; the NestJS backend would need to be changed to **accept** that cookie (e.g. `Cookie: mini_tm_token=...`) instead of (or in addition to) the Bearer header.

## How to move to a secure httpOnly cookie strategy

1. **Backend changes (NestJS)**  
   - On `POST /auth/login`, set an **httpOnly, Secure, SameSite** cookie with the JWT (e.g. `Set-Cookie: mini_tm_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=...`).  
   - For protected routes, accept auth from **either** `Authorization: Bearer <token>` **or** that cookie (e.g. in a guard or middleware: read cookie if header is missing).  
   - On `POST /auth/logout`, clear the cookie (e.g. `Set-Cookie: mini_tm_token=; ... Max-Age=0`).

2. **Same-origin API (recommended for httpOnly)**  
   - Run the frontend and API under the **same origin** (e.g. Next.js on `example.com`, API on `example.com/api` via rewrites or a Next.js API route proxy).  
   - Next.js API route receives the request (browser sends the httpOnly cookie to same origin), reads the cookie, and forwards to the NestJS backend with `Authorization: Bearer <token>`.  
   - The frontend then never touches the token; it only calls `/api/...` (same origin). The token stays in the httpOnly cookie and is never exposed to JS.

3. **Cross-origin API with cookie**  
   - If the API stays on a different subdomain (e.g. `api.example.com`), set the cookie on that domain from the backend and use `SameSite=None; Secure`.  
   - Backend must accept the cookie for auth (as above).  
   - Frontend must not need the token in JS; all API calls that need auth would have to go to `api.example.com` with `credentials: "include"` so the browser sends the cookie. The current app uses axios to the API origin; you would keep that and ensure CORS allows credentials and the backend reads the cookie.

## Middleware and API consistency

- **Middleware** only checks the presence of the **cookie** `mini_tm_signed_in` to decide whether to redirect to login. It does not read the JWT.
- **API client** reads the token from `localStorage` and sends it in the header. On 401, it clears both token and cookie and redirects.
- So: login sets token + cookie; logout and 401 clear both. Middleware and API stay in sync because both cookie and token are updated together in the same code paths.

## Summary

| Concern | Current | With httpOnly (same-origin proxy) |
|--------|--------|-----------------------------------|
| Token storage | localStorage | httpOnly cookie (set by backend or proxy) |
| Sent to API | Header `Authorization: Bearer` | Cookie (or proxy forwards from cookie to header) |
| XSS exposure | Token readable by JS | Token not readable by JS |
| 401 handling | Centralized in axios interceptor | Same (interceptor clears cookie via logout call or backend clears cookie) |
| Middleware | Cookie `mini_tm_signed_in` | Same or rely on auth cookie presence |

To get a **secure httpOnly cookie strategy** without changing backend contract from the browser’s perspective, use a **Next.js API route proxy** that stores the token in an httpOnly cookie (set by the proxy after login) and forwards requests to the backend with the token from the cookie. The frontend would then call only `/api/...` and never store or read the JWT.

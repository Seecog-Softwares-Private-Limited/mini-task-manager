# mini-task-manager

## First-time Setup (New Clone)

Run these from repo root.

### 1) Clone and install dependencies

```bash
git clone <repo-url>
cd mini-task-manager
npm install
cd frontend && npm install && cd ..
```

### 2) Configure environment

Create **`properties.env`** at the repo root (copy from `properties.env.example`). **Do not use `.env`** — it is not loaded anywhere.

MySQL and app values:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_DATABASE=mini_task_manager
JWT_SECRET=replace-with-your-secret
```

Optional seed overrides in `properties.env`:

```env
SEED_USER_PASSWORD=YourStrongPassword123!
SEED_INVITED_EMAIL=invitee@example.com
```

The backend, migrations, seed scripts, frontend (`next.config.mjs` + `npm run dev` in `frontend/`), Cypress, and Docker Compose (`env_file: properties.env` for the API) use **only** repo-root **`properties.env`**. There is no `.env` or `.env.example` in this repo. Optional SMTP, OAuth, Razorpay, and test vars belong in `properties.env` (see `properties.env.example`).

### 3) Run migrations

```bash
npm run migration:run
```

**500 on `GET /api/v1/projects` (or “Unknown column `icon_url`” in API logs)?** The `projects` table needs an `icon_url` column. From repo root run **`npm run migration:run`** (idempotent) or **`npm run db:ensure-project-icon-url`**, then restart the API. In development, the JSON error body often includes the MySQL message and this hint.

If database does not exist yet, create it first:

```bash
mysql -u <db_user> -p -e "CREATE DATABASE IF NOT EXISTS mini_task_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 4) Seed sample data

```bash
npm run seed
```

Seed creates these users:

- `owner@example.com`
- `admin@example.com`
- `member@example.com`

Password is:

- `SEED_USER_PASSWORD` (if set), otherwise
- `Password123!`

**Login blocked (“verify email”)?** By default, a **correct password** logs you in and sets `is_email_verified` in the database (so older accounts are not stuck). To require a verified inbox before login (stricter production), set in `properties.env`:

`REQUIRE_EMAIL_VERIFIED_FOR_LOGIN=true`

**Public signup — verification email:** After a successful signup, the API sends a **Verify your email** message via SMTP (`SMTP_*` in `properties.env`). The link uses **`FRONTEND_URL`**, or if unset, **`http://localhost:<FRONTEND_PORT>`** (set `FRONTEND_PORT` to match your Next.js dev port). If no email arrives, check Spam/Promotions and API logs for SMTP errors.

**“Invalid credentials” on seed users?** Ensure password matches `SEED_USER_PASSWORD` or `Password123!`, or run:

```bash
npm run seed:fix-login
```

That sets email verified and resets the seed users’ password to `SEED_USER_PASSWORD` or `Password123!`.

### 5) Start the app

**Canonical backend start: `node app.js`** — waits until the API **TCP port** is open before starting Next.js, so the `/api/v1` proxy does not hang on “Signing in…”.

One entrypoint for both development and production:

```bash
# Development (runs src/main.ts via ts-node; no build required)
node app.js
# or explicitly:
npm run start:app
npm run start:app:dev

# Production (requires build first)
npm run build
NODE_ENV=production node app.js
# or:
npm run start:app:prod
```

Mode is chosen by `NODE_ENV` or `APP_MODE` (development | production). In production, `dist/main.js` must exist (run `npm run build` first).

**Production with PM2 (API + Next):**

```bash
npm install
npm run build:all
npm run pm2:start
```

(PM2 is a devDependency; scripts use `npx pm2`. Global install is optional: `npm install -g pm2`.)

- API: `http://localhost:<PORT>/api/v1` (from `properties.env`, default `3000`)
- Web: `http://localhost:<FRONTEND_PORT>` (default `3001`)

```bash
npm run pm2:logs
npm run pm2:restart
npm run pm2:stop
npm run pm2:delete
```

Logs are written under `logs/`. `ecosystem.config.cjs` loads `properties.env` and sets `MINI_TM_BACKEND_URL` for the Next.js API proxy.

**Option A — Backend + frontend together (recommended for dev):**

```bash
npm run dev
```

Runs backend (port `3000`) and frontend (port `3001`) together (uses Nest in watch mode for backend).

**Option B — Backend only (e.g. `node app.js` or Nest CLI):**

Terminal 1 (backend, port `3000`):

```bash
node app.js
# or: npm run start:dev
```

Terminal 2 (frontend, port `3001`):

```bash
npm run dev:frontend
```

Open:

- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:3000/api/v1`

> **Note:** Prefer same-origin `/api/v1` (leave `NEXT_PUBLIC_API_URL` empty). If the API is on another host, set `NEXT_PUBLIC_API_URL` in repo-root **`properties.env`** only. Ensure the backend is running on `PORT` from that file.

**Migration and seed order (fresh install):** Create DB → run migrations (`npm run migration:run`) → run seed (`npm run seed`) → start app.

---

## Login / API proxy

Full step-by-step (browser → Next → Nest → DB) and past failure modes: **`docs/LOGIN_DEEP_ANALYSIS.md`**.

| Issue | What to do |
|-------|-------------|
| **`node app.js` in prod says "Production mode requires a build"** | Run `npm run build`, then `NODE_ENV=production node app.js` or `npm run start:app:prod`. |
| **Dev: "ts-node" or "tsconfig-paths" not found** | Run `npm install`; both are devDependencies. |
| **DB connection refused / ECONNREFUSED** | Ensure MySQL is running; check `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` in `properties.env`. Create the database if it does not exist: `CREATE DATABASE mini_task_manager ...`. |
| **"Table doesn't exist" or migration errors** | Run migrations: `npm run migration:run`. On a fresh DB, create the database first, then run migrations, then seed. |
| **JWT_SECRET must be set in production** | Set `JWT_SECRET` in `properties.env` to a non-default value when `NODE_ENV=production`. |
| **Port 3000 already in use** | Stop the process using port 3000 or set `PORT` in `properties.env`. |
| **Login never succeeds / "HTML instead of JSON"** | Next **middleware must not protect `/api/*`**. Those paths are rewritten to Nest; redirecting them to `/login` breaks `POST /api/v1/auth/login` (fixed in `frontend/src/middleware.ts`). Restart Next after pulling. |
| **Login shows "Network Error" (0 B in DevTools)** | Ensure the **API** is running on `PORT` from `properties.env` (same port Next rewrites to). Restart the API so it loads `properties.env`. |
| **Console: `Receiving end does not exist` (`performance.js`)** | Comes from a **browser extension**, not this app. Ignore it or use a clean profile / disable extensions to reduce noise. |
| **Frontend can't reach API (CORS)** | In production, set `CORS_ORIGIN` to your frontend origin (e.g. `https://app.example.com`). In local dev, leave `CORS_ORIGIN` unset unless you need a fixed origin. |

More detail: see `docs/RUNTIME_AND_FEATURE_READINESS.md` for startup lifecycle and remediation backlog.

---

## Development Notes

- Frontend uses `3001` to avoid conflict with backend `3000`.
- **User passwords:** the `users.password_hash` column stores the password **in plain text** for local/dev simplicity (so you can read it in SQL tools). Login still accepts old **bcrypt** values until those rows are updated. **Do not use plain storage in production.**
- If you change seed password after users already exist, reseed on a fresh DB (or update `password_hash` manually / run `npm run seed:fix-login`).

## Email (Invitations)

By default, SMTP uses `localhost:1025` (MailHog). Emails are captured locally and do not reach real inboxes.

- MailHog inbox: `http://localhost:8025`

To send real emails (e.g., Gmail), set:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

Create a Gmail App Password: Google Account -> Security -> 2-Step Verification -> App passwords.
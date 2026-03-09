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

Create `properties.env` at the repo root (e.g. copy from `properties.env.example`) with your MySQL and app values:

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

The backend, migrations, seed scripts, and frontend (via `next.config`) all read from `properties.env`. You can copy from `.env.example` as a template for SMTP and other optional vars.

### 3) Run migrations

```bash
npm run migration:run
```

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

### 5) Start the app

**Canonical backend start: `node app.js`**

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

> **Note:** For sign-in and API calls to work reliably, set `NEXT_PUBLIC_API_URL=http://localhost:3000` in root `properties.env` (the frontend loads it via next.config). Alternatively you can use `frontend/.env.local`. Ensure the backend is running.

**Migration and seed order (fresh install):** Create DB → run migrations (`npm run migration:run`) → run seed (`npm run seed`) → start app.

---

## Troubleshooting

| Issue | What to do |
|-------|-------------|
| **`node app.js` in prod says "Production mode requires a build"** | Run `npm run build`, then `NODE_ENV=production node app.js` or `npm run start:app:prod`. |
| **Dev: "ts-node" or "tsconfig-paths" not found** | Run `npm install`; both are devDependencies. |
| **DB connection refused / ECONNREFUSED** | Ensure MySQL is running; check `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` in `properties.env`. Create the database if it does not exist: `CREATE DATABASE mini_task_manager ...`. |
| **"Table doesn't exist" or migration errors** | Run migrations: `npm run migration:run`. On a fresh DB, create the database first, then run migrations, then seed. |
| **JWT_SECRET must be set in production** | Set `JWT_SECRET` in `properties.env` to a non-default value when `NODE_ENV=production`. |
| **Port 3000 already in use** | Stop the process using port 3000 or set `PORT` in `properties.env`. |
| **Frontend can't reach API (CORS)** | In production, set `CORS_ORIGIN` to your frontend origin (e.g. `https://app.example.com`). |

More detail: see `docs/RUNTIME_AND_FEATURE_READINESS.md` for startup lifecycle and remediation backlog.

---

## Development Notes

- Frontend uses `3001` to avoid conflict with backend `3000`.
- If you change seed password after users already exist, reseed on a fresh DB (or update user hashes manually).

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
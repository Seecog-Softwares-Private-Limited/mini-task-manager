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

```bash
cp .env.example .env
```

Update `.env` with your MySQL and app values:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_DATABASE=mini_task_manager
JWT_SECRET=replace-with-your-secret
```

Optional seed overrides:

```env
SEED_USER_PASSWORD=YourStrongPassword123!
SEED_INVITED_EMAIL=invitee@example.com
```

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

**Option A — Single command (recommended):**

```bash
npm run dev
```

Runs backend (port `3000`) and frontend (port `3001`) together.

**Option B — Separate terminals:**

Terminal 1 (backend, port `3000`):

```bash
npm run start:dev
```

Terminal 2 (frontend, port `3001`):

```bash
npm run dev:frontend
```

Open:

- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:3000/api/v1`

> **Note:** For sign-in and API calls to work reliably, create `frontend/.env.local` with:
> ```
> NEXT_PUBLIC_API_URL=http://localhost:3000
> ```
> Then restart the frontend dev server. Without this, the frontend proxies `/api/v1` to the backend; ensure the backend is running.

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
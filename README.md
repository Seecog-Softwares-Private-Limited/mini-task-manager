# mini-task-manager

## Development

Run both servers in separate terminals:

1. **Backend** (port 3000):
   ```bash
   npm run start
   # or for watch mode: npm run start:dev
   ```

2. **Frontend** (port 3001):
   ```bash
   cd frontend && npm run dev
   ```

The frontend is configured to use port 3001 to avoid conflict with the backend on 3000. API requests go to `http://localhost:3000/api/v1`.

## Email (invitations)

By default, SMTP uses `localhost:1025` (MailHog). Emails are **captured locally** and do not reach real inboxes. View them at http://localhost:8025 if MailHog is running.

To send invitations to real Gmail inboxes, add to `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

Create an [App Password](https://support.google.com/accounts/answer/185833) in your Google Account (Security → 2-Step Verification → App passwords).
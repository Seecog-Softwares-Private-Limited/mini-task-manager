# Server config (gitignored secrets)

## Firebase Admin (required for push notifications)

Nest loads Firebase Admin from one of:

1. `FIREBASE_SERVICE_ACCOUNT_JSON` (full JSON string in `properties.env`), or
2. `FIREBASE_SERVICE_ACCOUNT_PATH` (absolute/relative path), or
3. This folder:
   - `config/firebase-service-account.json` (preferred), or
   - `config/firebase-service.json`

Download from Firebase Console → Project settings → Service accounts → Generate new private key.

**Do not commit** the JSON (see `.gitignore`). APNs `.p8` keys are uploaded in the Firebase Console only — they do not belong in this repo.

### Quick check

After placing the file, restart Nest and look for:

`Firebase Admin initialized`

If you see `Firebase Admin not configured… Push disabled`, the JSON/env is still missing on that host.

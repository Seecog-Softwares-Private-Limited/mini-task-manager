# Mini Task Manager Mobile (WebView)

This folder contains a complete React Native app (Expo) that loads the existing Next.js web app inside a `WebView`.

## What it does

- Loads your web app URL in a full-screen WebView
- Shows loading state, error state, and retry action
- Supports refresh and back navigation controls
- Opens external links in the device browser
- Handles local dev URL defaults for Android emulator and iOS simulator

## Quick start

From repo root:

```bash
cd app
npm install
npm run start
```

Then open via Expo Go / simulator:

- `a` for Android
- `i` for iOS

## Configure target web URL

Create `app/.env` from `.env.example`:

```bash
cp .env.example .env
```

Set:

```env
EXPO_PUBLIC_WEB_APP_URL=http://localhost:3008
```

Notes:

- Android emulator cannot use `localhost` for host machine; app defaults to `http://10.0.2.2:3008`.
- On physical devices, set `EXPO_PUBLIC_WEB_APP_URL` to your machine LAN IP, e.g. `http://192.168.1.20:3008`.

## Run web app backend/frontend

From repo root, keep your current stack running:

```bash
node app.js
```

This starts backend + frontend with your existing project setup.

# Mini Task Manager — Flutter Mobile

Native Flutter client for Android and iOS. Talks directly to the NestJS API (`/api/v1`) with JWT auth and `X-Organization-Id` tenant headers — same contract as the web app.

## Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) 3.24+ (Dart 3.5+)
- Xcode (iOS) / Android Studio (Android)
- Backend running from repo root: `node app.js` (default API port **3007**)

### Install Flutter (one-time, macOS)

If `./setup.sh` says **Flutter SDK not found**:

```bash
git clone https://github.com/flutter/flutter.git -b stable ~/development/flutter
echo 'export PATH="$HOME/development/flutter/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
flutter doctor
```

Then install **Xcode** (App Store) for iOS and **Android Studio** for Android builds.

## First-time setup

```bash
cd mobile
chmod +x setup.sh resolve-doctor.sh
./resolve-doctor.sh   # installs Flutter/Android/CocoaPods + fixes doctor (except Xcode)
./setup.sh            # generates ios/android folders + pub get
source ~/.zshrc       # load PATH after resolve-doctor
```

If `./setup.sh` says **Flutter SDK not found**, run `./resolve-doctor.sh` first.

## Run locally

Ensure backend is running from repo root (`node app.js`, API on **3007**).

```bash
cd mobile
source env.sh
./run-chrome.sh       # web on http://localhost:8090
# or
./run-android.sh
# or (requires Xcode)
./run-ios.sh
```

### Chrome (fastest without Xcode)

```bash
flutter run -d chrome \
  --dart-define=API_BASE_URL=http://localhost:3007 \
  --web-port=8090
```

### Android Emulator

```bash
flutter emulators --launch Pixel_7_API_35
flutter run -d emulator --dart-define=FLAVOR=dev
```

### iOS Simulator (requires full Xcode from App Store)

```bash
cd mobile
source env.sh
./run-ios.sh
# or
flutter run -d ios --dart-define=FLAVOR=dev
```

Physical device: set your Apple Team in Xcode (`ios/Runner.xcworkspace` → Signing & Capabilities).

### iOS production build (TestFlight)

```bash
cd mobile
source env.sh
chmod +x build-ipa-prod.sh
./build-ipa-prod.sh
```

Then open `ios/Runner.xcworkspace` → Product → Archive → Distribute to App Store Connect.

## Project structure

```
mobile/lib/
├── main.dart / app.dart
├── core/
│   ├── api/          # Dio client + interceptors + plan-limit snackbars
│   ├── auth/         # Secure token storage
│   ├── cache/        # Offline project list cache
│   ├── config/       # API base URL + flavors
│   ├── messaging/    # Global snackbar key
│   ├── preferences/  # Theme mode + last project id
│   ├── router/       # go_router + auth redirects
│   └── theme/        # Light/dark Material themes
├── data/
│   ├── models/
│   └── repositories/
├── features/
│   ├── auth/         # Login, forgot password, session
│   ├── workspaces/   # Workspace picker
│   ├── home/         # Shell + dashboard tab
│   ├── projects/     # Project list (offline fallback)
│   ├── kanban/       # Board, task detail, create task
│   ├── recurring/    # Planner (calendar + series tabs)
│   ├── notifications/# In-app notification inbox
│   └── profile/      # Account, theme, sign out
└── shared/widgets/   # Buttons, cards, empty states
```

## What's implemented

- Email/password login (`POST /auth/login`) with session restore
- **Forgot password** flow (`POST /auth/forgot-password`)
- Secure JWT + user storage (`flutter_secure_storage`)
- Workspace selection + switcher (`GET /organizations`)
- Projects list with **offline cache** fallback when API is unreachable
- **Kanban board** per project (workflow columns, task cards, move status)
- **Create task** FAB on board (`POST /tasks`)
- Task detail sheet: edit title, toggle checklist items, change status
- **Recurring planner** — Calendar + Series tabs, summary KPIs, pause/resume series
- **Notifications** inbox with unread badge, mark read / read all
- **Home dashboard** — workspace summary, quick actions, open last project board
- **Dark mode** toggle (system / light / dark) persisted locally
- Plan-limit **403 snackbars** from API interceptor
- Session restore on launch, 401 auto-logout
- Premium SaaS theme aligned with web (indigo/violet palette)
- **Task attachments** — upload, image/PDF/SVG preview, open/download on iOS and Android
- **Task comments** — fetch and post on task detail

## Not yet implemented

- Full offline sync for tasks/boards (projects only are cached today)

## Push notifications (FCM)

Android + iOS use Firebase Cloud Messaging. After login the app registers the device token with `POST /device-tokens`. Nest sends push from `NotificationsService.createNotification` via Firebase Admin.

**Manual setup still required:**

1. Place `mobile/android/app/google-services.json` (done when Android app is registered in Firebase).
2. For iOS: add app in Firebase, place `GoogleService-Info.plist` in `mobile/ios/Runner/`, enable Push Notifications capability in Xcode, upload APNs `.p8` key in Firebase.
3. Download Firebase service account JSON → save as `config/firebase-service-account.json` (gitignored) or set `FIREBASE_SERVICE_ACCOUNT_PATH` / `FIREBASE_SERVICE_ACCOUNT_JSON` in `properties.env`.
4. Run migration: `npm run migration:run` (creates `device_tokens`).
5. Rebuild APK/IPA — old binaries do not include FCM.

## API reference

- `docs/BACKEND-FRONTEND-MAPPING.md`
- OpenAPI: `{API_ORIGIN}/api/v1/openapi.yaml`

## iOS HTTP (production server)

Production API uses HTTP on Hostinger `200.97.172.61`. ATS exceptions are configured in `ios/Runner/Info.plist` (same intent as Android `network_security_config.xml`). Prefer HTTPS long-term.

## Build release

```bash
# Android
./build-apk-prod.sh

# iOS
./build-ipa-prod.sh
```

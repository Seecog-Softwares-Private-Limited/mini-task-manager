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
flutter run --dart-define=API_BASE_URL=http://localhost:3007
```

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

## Not yet implemented

- Push notifications (FCM + backend device registration)
- Full offline sync for tasks/boards (projects only are cached today)
- Attachments, comments, and other web-only task features

## API reference

- `docs/BACKEND-FRONTEND-MAPPING.md`
- OpenAPI: `{API_ORIGIN}/api/v1/openapi.yaml`

## iOS HTTP (local dev)

If loading `http://` fails on iOS, allow local networking in `ios/Runner/Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

## Build release

```bash
flutter build appbundle --dart-define=FLAVOR=prod --dart-define=API_BASE_URL=https://your-api-host
flutter build ipa --dart-define=FLAVOR=prod --dart-define=API_BASE_URL=https://your-api-host
```

## Relation to `app/` (Expo WebView)

The existing `app/` folder is a WebView wrapper around the Next.js site. This `mobile/` app is the **native** client and will replace it for production mobile UX over time.

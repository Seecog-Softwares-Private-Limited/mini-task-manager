# Google Play Store Release Checklist

Use this checklist when publishing **OpsPick** (`com.seecog.minitaskmanager.mini_task_manager`).

---

## Developer Account

- [ ] Create a [Google Play Console](https://play.google.com/console) developer account ($25 one-time fee)
- [ ] Complete identity verification if prompted
- [ ] Accept the Developer Distribution Agreement

---

## App Signing

### Generate upload keystore (one-time, you run this locally)

From PowerShell, in the `mobile/android/` folder:

```powershell
cd "d:\Seecog projects\mini-task-manager\mobile\android"
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

- Choose your own passwords when prompted — do not share them
- Back up `upload-keystore.jks` securely (USB drive, password manager vault, etc.)
- If you lose this keystore, you cannot update the app on Play Store

### Configure signing

- [ ] `upload-keystore.jks` placed in `mobile/android/` (gitignored)
- [ ] `mobile/android/key.properties` filled in with your passwords and alias
- [ ] Confirm `key.properties` and `.jks` are **not** committed to git

**Why these files exist:**
- `upload-keystore.jks` — your private signing certificate
- `key.properties` — tells Gradle where the keystore is and how to unlock it (gitignored)
- `android/app/build.gradle.kts` — reads `key.properties` and signs release builds

### Play App Signing

- [ ] On first upload, enroll in **Google Play App Signing** (recommended)
- [ ] Google will manage the app signing key; you keep the upload key

---

## Version Check

Current values (from `pubspec.yaml`):

| Field | Value |
|-------|-------|
| versionName | `1.0.0` |
| versionCode | `1` |
| applicationId | `com.seecog.minitaskmanager.mini_task_manager` |
| minSdk | `24` |
| targetSdk | `36` |

Before each new release:

- [ ] Bump `version` in `pubspec.yaml` — e.g. `1.0.1+2` (`+N` must always increase)

---

## Build AAB

Run from the `mobile/` folder **after** keystore and `key.properties` are configured:

```powershell
cd "d:\Seecog projects\mini-task-manager\mobile"
flutter clean
flutter pub get
flutter build appbundle --release
```

- [ ] Build completes without errors
- [ ] Output file exists at:

```
mobile/build/app/outputs/bundle/release/app-release.aab
```

Upload this `.aab` file to Play Console — not an APK.

---

## Screenshots

Store assets go in `mobile/play_store_assets/`:

- [ ] **Phone screenshots** — at least 2, up to 8 (min 320px, max 3840px on shortest side)
- [ ] **7-inch tablet** — at least 1 if supporting tablets (optional but recommended)
- [ ] **10-inch tablet** — at least 1 if supporting tablets (optional)

Place files in:
- `play_store_assets/phone_screenshots/`
- `play_store_assets/tablet_screenshots/`

---

## App Icon

- [ ] **512×512 PNG** — high-res icon for Play Store listing
- [ ] Launcher icon already configured via `@mipmap/ic_launcher` in the app

Place the 512×512 asset in:
- `play_store_assets/app_icon/`

---

## Feature Graphic

- [ ] **1024×500 PNG or JPEG** — banner shown at the top of your store listing

Place in:
- `play_store_assets/feature_graphic/`

---

## Privacy Policy

- [ ] Host a privacy policy URL publicly accessible on the web
- [ ] Policy must cover: data collected, location, camera, microphone, storage, third parties
- [ ] Add the URL in Play Console → App content → Privacy policy

Draft or notes can go in:
- `play_store_assets/privacy_policy/`

---

## Data Safety

Declare in Play Console → App content → Data safety:

- [ ] Account info (email) — collected for authentication
- [ ] Location — collected for geofenced task completion
- [ ] Photos/videos — collected for task attachments
- [ ] Audio — collected for voice notes on subtasks
- [ ] Device identifiers — if applicable via `device_info_plus`
- [ ] Data is encrypted in transit (note: production API currently uses HTTP — address before claiming encryption in transit)

---

## Content Rating

- [ ] Complete the [IARC content rating questionnaire](https://support.google.com/googleplay/android-developer/answer/9859655) in Play Console
- [ ] Answer honestly about user-generated content, location sharing, etc.

---

## Internal Testing

- [ ] Create an **Internal testing** release track in Play Console
- [ ] Upload `app-release.aab`
- [ ] Add tester email addresses
- [ ] Install and verify on a real device:
  - [ ] Login / logout
  - [ ] Workspace selection
  - [ ] Kanban board loads
  - [ ] Camera / location / microphone permissions work
  - [ ] Notifications inbox loads

Release notes for testers can go in:
- `play_store_assets/release_notes/`

---

## Production Release

- [ ] Promote tested build from Internal → Closed → Open → Production (or go direct to Production after thorough testing)
- [ ] Complete all Play Console sections (store listing, pricing, countries, content rating, data safety)
- [ ] Submit for review
- [ ] Monitor for policy or crash reports after launch

---

## Quick Reference

| Item | Path |
|------|------|
| Keystore | `mobile/android/upload-keystore.jks` (you create) |
| Signing config | `mobile/android/key.properties` |
| Gradle signing | `mobile/android/app/build.gradle.kts` |
| Version | `mobile/pubspec.yaml` |
| Release AAB | `mobile/build/app/outputs/bundle/release/app-release.aab` |
| Store assets | `mobile/play_store_assets/` |

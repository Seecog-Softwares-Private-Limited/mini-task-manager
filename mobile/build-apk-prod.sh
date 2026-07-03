#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
source "$ROOT/env.sh"
cd "$ROOT"

PROD_URL="${API_BASE_URL:-http://3.110.214.243:3000}"

echo "Building production APK → $PROD_URL"
flutter build apk --release \
  --dart-define=FLAVOR=prod \
  --dart-define=API_BASE_URL="$PROD_URL"

echo ""
echo "APK: build/app/outputs/flutter-apk/app-release.apk"
echo "Install: adb install -r build/app/outputs/flutter-apk/app-release.apk"

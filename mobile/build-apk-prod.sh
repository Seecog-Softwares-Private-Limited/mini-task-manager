#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
source "$ROOT/env.sh"
cd "$ROOT"

PROD_URL="${API_BASE_URL:-http://3.110.214.243:3000}"
APK_DIR="$ROOT/build/app/outputs/flutter-apk"

echo "Removing previous APK builds…"
find "$ROOT" -name "*.apk" -delete 2>/dev/null || true
rm -f "$APK_DIR"/*.sha1 2>/dev/null || true

echo "Building Flutter release APK → $PROD_URL"
flutter build apk --release \
  --dart-define=FLAVOR=prod \
  --dart-define=API_BASE_URL="$PROD_URL"

echo ""
echo "APK: $APK_DIR/app-release.apk"
echo "Install: adb install -r \"$APK_DIR/app-release.apk\""

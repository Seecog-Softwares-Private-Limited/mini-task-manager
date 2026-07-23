#!/usr/bin/env bash
# One-shot: sync version from pubspec, build App Store IPA, optionally upload.
# Usage:
#   ./scripts/ship_ios_appstore.sh
#   ./scripts/ship_ios_appstore.sh --upload   # needs ASC API key env vars
#
# Upload env (optional):
#   APP_STORE_CONNECT_API_KEY_ID
#   APP_STORE_CONNECT_ISSUER_ID
#   APP_STORE_CONNECT_API_KEY_PATH  (path to AuthKey_XXX.p8)

set -euo pipefail
cd "$(dirname "$0")/.."

VERSION_LINE=$(grep -E '^version:' pubspec.yaml | head -1 | awk '{print $2}')
BUILD_NAME="${VERSION_LINE%%+*}"
BUILD_NUMBER="${VERSION_LINE##*+}"

if [[ -z "$BUILD_NAME" || -z "$BUILD_NUMBER" || "$BUILD_NAME" == "$BUILD_NUMBER" ]]; then
  echo "Could not parse version from pubspec.yaml (expected name+number, e.g. 1.0.0+13)"
  exit 1
fi

echo "==> Shipping OpsPick iOS $BUILD_NAME ($BUILD_NUMBER)"

flutter pub get
flutter build ios --config-only --release --build-name="$BUILD_NAME" --build-number="$BUILD_NUMBER"

# Keep Xcode UI in sync with Flutter
/usr/libexec/PlistBuddy -c "Set :FLUTTER_BUILD_NAME $BUILD_NAME" ios/Flutter/Generated.xcconfig 2>/dev/null || true
perl -i -pe "s/^FLUTTER_BUILD_NAME=.*/FLUTTER_BUILD_NAME=$BUILD_NAME/" ios/Flutter/Generated.xcconfig
perl -i -pe "s/^FLUTTER_BUILD_NUMBER=.*/FLUTTER_BUILD_NUMBER=$BUILD_NUMBER/" ios/Flutter/Generated.xcconfig

flutter build ipa --release --build-name="$BUILD_NAME" --build-number="$BUILD_NUMBER"

IPA="build/ios/ipa/mini_task_manager.ipa"
if [[ ! -f "$IPA" ]]; then
  IPA=$(ls build/ios/ipa/*.ipa | head -1)
fi

echo ""
echo "==> Built: $IPA"
echo "    Version: $BUILD_NAME   Build: $BUILD_NUMBER"
echo ""

if [[ "${1:-}" != "--upload" ]]; then
  open -R "$IPA"
  echo "Next: drag the IPA into Transporter, or re-run with --upload after setting ASC API key env vars."
  exit 0
fi

: "${APP_STORE_CONNECT_API_KEY_ID:?Set APP_STORE_CONNECT_API_KEY_ID}"
: "${APP_STORE_CONNECT_ISSUER_ID:?Set APP_STORE_CONNECT_ISSUER_ID}"
: "${APP_STORE_CONNECT_API_KEY_PATH:?Set APP_STORE_CONNECT_API_KEY_PATH}"

export API_PRIVATE_KEYS_DIR
API_PRIVATE_KEYS_DIR="$(cd "$(dirname "$APP_STORE_CONNECT_API_KEY_PATH")" && pwd)"

xcrun altool --upload-app --type ios \
  -f "$IPA" \
  --apiKey "$APP_STORE_CONNECT_API_KEY_ID" \
  --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID"

echo "==> Upload started. Wait for processing in TestFlight, then select $BUILD_NAME ($BUILD_NUMBER) on App Store version 1.0."

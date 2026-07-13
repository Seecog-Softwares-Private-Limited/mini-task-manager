#!/usr/bin/env bash
# Bake AWS API settings into the iOS Xcode project (FLAVOR=prod).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$ROOT/env.sh"
cd "$ROOT"

PROD_URL="${API_BASE_URL:-http://3.110.214.243:3000}"

echo "Configuring iOS build for AWS API → ${PROD_URL}/api/v1"
flutter pub get
bash "$ROOT/scripts/write-xcode-env-local.sh"
flutter build ios --simulator --no-codesign \
  --dart-define=FLAVOR=prod \
  --dart-define=API_BASE_URL="$PROD_URL"

cd ios
pod install
cd ..

echo ""
echo "Xcode is ready for AWS."
echo "API: ${PROD_URL}/api/v1"
echo "Open: open ios/Runner.xcworkspace"

#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
source "$ROOT/env.sh"
cd "$ROOT"

PROD_URL="${API_BASE_URL:-http://3.110.214.243:3000}"
IPA_DIR="$ROOT/build/ios/ipa"

echo "Building Flutter release IPA → $PROD_URL"
flutter build ipa --release \
  --dart-define=FLAVOR=prod \
  --dart-define=API_BASE_URL="$PROD_URL"

echo ""
echo "IPA output: $IPA_DIR"
ls -la "$IPA_DIR" 2>/dev/null || true
echo ""
echo "Next: open ios/Runner.xcworkspace → Product → Archive → Distribute to App Store Connect"

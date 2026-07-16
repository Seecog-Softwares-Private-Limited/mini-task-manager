#!/usr/bin/env bash
# Prepare Xcode for Product → Archive (TestFlight / App Store).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$ROOT/env.sh"
cd "$ROOT"

PROD_URL="${API_BASE_URL:-http://200.97.172.61:3000}"

echo "Preparing iOS archive (prod API → ${PROD_URL}/api/v1)"
flutter pub get
bash "$ROOT/scripts/write-xcode-env-local.sh"
cd ios
pod install
cd ..

# Bake prod dart-defines into Generated.xcconfig for Xcode.
flutter build ios --release --no-codesign \
  --dart-define=FLAVOR=prod \
  --dart-define=API_BASE_URL="$PROD_URL"

echo ""
echo "Archive prep complete."
echo ""
echo "In Xcode:"
echo "  1. Quit Xcode, then: open ios/Runner.xcworkspace"
echo "  2. Select destination: Any iOS Device (arm64)"
echo "  3. Runner target → Signing & Capabilities → Team: Pankaj Agarwal"
echo "  4. Xcode → Settings → Accounts → your Apple ID → Manage Certificates"
echo "     → + → Apple Distribution (required for TestFlight)"
echo "  5. Product → Clean Build Folder, then Product → Archive"
echo ""
echo "If Archive fails with codesign / errSecInternalComponent:"
echo "  • Open Keychain Access → login keychain → unlock it"
echo "  • Confirm 'Apple Development: Pankaj Agarwal' has a private key"
echo "  • In Xcode Accounts, click Download Manual Profiles"
echo ""
echo "Alternative (no Xcode Archive): ./build-ipa-prod.sh then upload with Transporter app"

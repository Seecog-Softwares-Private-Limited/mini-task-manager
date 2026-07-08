#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$ROOT/env.sh"
cd "$ROOT"

PROD_URL="${API_BASE_URL:-http://3.110.214.243:3000}"
DEVICE="${IOS_DEVICE:-iPhone 17 Pro}"

xcrun simctl shutdown all 2>/dev/null || true
open -a Simulator
sleep 2
xcrun simctl boot "$DEVICE" 2>/dev/null || true

echo "Running iOS simulator against AWS → ${PROD_URL}/api/v1"
flutter run -d "$DEVICE" \
  --dart-define=FLAVOR=prod \
  --dart-define=API_BASE_URL="$PROD_URL" \
  "$@"

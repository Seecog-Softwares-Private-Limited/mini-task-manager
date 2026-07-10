#!/usr/bin/env bash
# Always use this to open Xcode for this Flutter app (never open Runner.xcodeproj).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$ROOT/env.sh"
cd "$ROOT"

echo "Preparing iOS project for Xcode…"
bash "$ROOT/scripts/write-xcode-env-local.sh"
source "$ROOT/env.sh"
flutter config --no-enable-swift-package-manager >/dev/null 2>&1 || true
bash "$ROOT/ios/prepare_flutter_for_xcode.sh"

# Stale DerivedData often causes recurring Ld / script phase failures after pod changes.
if [[ "${1:-}" == "--clean-derived-data" ]]; then
  rm -rf ~/Library/Developer/Xcode/DerivedData/Runner-*
  echo "Cleared Xcode DerivedData for Runner."
fi

echo ""
echo "Opening Runner.xcworkspace (use iPhone Simulator as destination, then Run)."
open "$ROOT/ios/Runner.xcworkspace"

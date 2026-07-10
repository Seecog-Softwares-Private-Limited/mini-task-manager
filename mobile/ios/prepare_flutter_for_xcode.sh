#!/usr/bin/env bash
# Ensures Flutter iOS artifacts exist before Xcode resolves packages / links.
# Called from the Runner scheme pre-action and from mobile/open-xcode.sh.
set -euo pipefail

IOS_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(cd "$IOS_DIR/.." && pwd)"

source "$IOS_DIR/.xcode.env"
if [[ -f "$IOS_DIR/.xcode.env.local" ]]; then
  # shellcheck disable=SC1091
  source "$IOS_DIR/.xcode.env.local"
fi

if [[ -z "${FLUTTER_ROOT:-}" || ! -x "$FLUTTER_ROOT/bin/flutter" ]]; then
  echo "error: FLUTTER_ROOT is not set. Run: cd mobile && bash scripts/write-xcode-env-local.sh" >&2
  exit 1
fi

need_config=0
if [[ ! -f "$IOS_DIR/Flutter/Generated.xcconfig" ]]; then
  need_config=1
fi
if [[ ! -d "$IOS_DIR/Flutter/ephemeral/Packages/FlutterGeneratedPluginSwiftPackage" ]]; then
  need_config=1
fi
if [[ ! -f "$IOS_DIR/Podfile.lock" || ! -d "$IOS_DIR/Pods" ]]; then
  need_config=1
fi

if [[ "$need_config" -eq 0 ]]; then
  exit 0
fi

echo "Preparing Flutter iOS artifacts for Xcode…"
cd "$MOBILE_DIR"
"$FLUTTER_ROOT/bin/flutter" pub get
"$FLUTTER_ROOT/bin/flutter" build ios --config-only --no-codesign

if command -v pod >/dev/null 2>&1; then
  (cd "$IOS_DIR" && pod install)
else
  echo "warning: CocoaPods (pod) not found in PATH; run 'cd mobile/ios && pod install'" >&2
fi

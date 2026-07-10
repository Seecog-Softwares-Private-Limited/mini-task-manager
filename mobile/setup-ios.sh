#!/usr/bin/env bash
# One-time iOS prep: CocoaPods + Flutter deps + pod install.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$ROOT/env.sh"
cd "$ROOT"

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods not found. Installing..."
  if command -v brew >/dev/null 2>&1; then
    brew install cocoapods
  else
    gem install cocoapods --user-install
    export PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH"
  fi
fi

echo "Using pod: $(command -v pod)"
pod --version

# CocoaPods-only iOS integration avoids Xcode SPM errors
# (e.g. Missing package product 'DKImagePickerController').
flutter config --no-enable-swift-package-manager

flutter pub get
bash "$ROOT/scripts/write-xcode-env-local.sh"
bash "$ROOT/ios/prepare_flutter_for_xcode.sh"
cd ios
pod install
cd ..

# Clear stale Xcode cache that causes "Module flutter_secure_storage not found".
rm -rf ~/Library/Developer/Xcode/DerivedData/Runner-*

echo ""
echo "iOS setup complete."
echo "IMPORTANT: open the workspace (not .xcodeproj):"
echo "  open ios/Runner.xcworkspace"
echo "Then pick an iPhone Simulator (not a physical device) and press Run."
echo "Or run: ./run-ios.sh"

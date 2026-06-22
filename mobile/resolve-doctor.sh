#!/usr/bin/env bash
# Installs/resolves Flutter doctor prerequisites on macOS (Apple Silicon).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

source "$ROOT/env.sh" 2>/dev/null || true

find_flutter() {
  for candidate in \
    "$HOME/development/flutter/bin/flutter" \
    "$HOME/flutter/bin/flutter" \
    "$(command -v flutter 2>/dev/null || true)"
  do
    [[ -n "$candidate" && -x "$candidate" ]] && echo "$candidate" && return 0
  done
  return 1
}

FLUTTER_BIN="$(find_flutter || true)"
if [[ -z "${FLUTTER_BIN}" ]]; then
  echo "Installing Flutter stable..."
  git clone https://github.com/flutter/flutter.git -b stable --depth 1 "$HOME/development/flutter"
  export PATH="$HOME/development/flutter/bin:$PATH"
fi

if [[ ! -x "$HOME/development/jdk/Contents/Home/bin/java" ]]; then
  echo "Installing JDK 17 (Temurin)..."
  mkdir -p "$HOME/development/jdk"
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/jdk.tar.gz" \
    "https://api.adoptium.net/v3/binary/latest/17/ga/mac/aarch64/jdk/hotspot/normal/eclipse?project=jdk"
  tar -xzf "$tmp/jdk.tar.gz" -C "$HOME/development/jdk" --strip-components=1
  rm -rf "$tmp"
fi

export JAVA_HOME="$HOME/development/jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools"

if [[ ! -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]]; then
  echo "Installing Android command-line tools..."
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/cmdline-tools.zip" \
    "https://dl.google.com/android/repository/commandlinetools-mac-13114758_latest.zip"
  unzip -q "$tmp/cmdline-tools.zip" -d "$tmp/extract"
  rm -rf "$ANDROID_HOME/cmdline-tools/latest"
  mv "$tmp/extract/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
  rm -rf "$tmp"
fi

export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

echo "Installing Android SDK packages..."
yes | sdkmanager --licenses >/dev/null || true
sdkmanager \
  "platform-tools" \
  "platforms;android-35" \
  "platforms;android-36" \
  "build-tools;35.0.0" \
  "build-tools;28.0.3"

flutter config --android-sdk "$ANDROID_HOME"

if ! command -v pod >/dev/null 2>&1; then
  echo "Installing CocoaPods (Ruby 2.6 compatible)..."
  gem install ffi -v 1.15.5 --user-install
  gem install cocoapods -v 1.9.3 --user-install
fi

ZSHRC="$HOME/.zshrc"
MARKER="# mini-task-manager mobile toolchain"
if ! grep -q "$MARKER" "$ZSHRC" 2>/dev/null; then
  cat >> "$ZSHRC" <<EOF

$MARKER
source "$ROOT/env.sh"
EOF
  echo "Added toolchain to ~/.zshrc"
fi

echo ""
flutter doctor

if [[ ! -d "/Applications/Xcode.app" ]]; then
  echo ""
  echo "Manual step remaining: install Xcode from the App Store for iOS builds."
  echo "Then run:"
  echo "  sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer"
  echo "  sudo xcodebuild -runFirstLaunch"
  echo "  sudo gem install cocoapods   # optional upgrade after Xcode"
fi

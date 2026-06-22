#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
source "$ROOT/env.sh"
cd "$ROOT"

if ! adb devices | grep -q emulator; then
  echo "Launching Pixel_7_API_35 emulator..."
  flutter emulators --launch Pixel_7_API_35 || true
  echo "Waiting for emulator..."
  for _ in $(seq 1 36); do
    adb devices | grep -q emulator && break
    sleep 5
  done
fi

flutter run -d android --dart-define=FLAVOR=dev "$@"

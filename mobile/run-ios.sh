#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
source "$ROOT/env.sh"
cd "$ROOT"

DEVICE="${IOS_DEVICE:-iPhone 17 Pro}"

# Xcode and Flutter both controlling the same simulator often causes a blank launch screen.
xcrun simctl shutdown all 2>/dev/null || true
open -a Simulator
sleep 2
xcrun simctl boot "$DEVICE" 2>/dev/null || true

API_ORIGIN=""
if API_ORIGIN="$("$ROOT/scripts/resolve-local-api-url.sh")"; then
  echo "Using API: ${API_ORIGIN}/api/v1"
else
  echo ""
  echo "Backend not reachable. In another terminal, from repo root run:"
  echo "  node app.js"
  echo ""
  echo "Waiting up to 60s for API on ports 3007, 3008, or 3000..."
  for _ in $(seq 1 30); do
    if API_ORIGIN="$("$ROOT/scripts/resolve-local-api-url.sh")"; then
      echo "API is up: ${API_ORIGIN}/api/v1"
      break
    fi
    sleep 2
  done
fi

ARGS=(--dart-define=FLAVOR=dev)
if [[ -n "${API_ORIGIN}" ]]; then
  ARGS+=(--dart-define=API_BASE_URL="${API_ORIGIN}")
fi

echo "Running Flutter on $DEVICE (dev flavor)…"
flutter run -d "$DEVICE" "${ARGS[@]}" "$@"

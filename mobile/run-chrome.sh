#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
source "$ROOT/env.sh"
cd "$ROOT"
flutter run -d chrome \
  --dart-define=API_BASE_URL=http://localhost:3007 \
  --web-port=8090 \
  "$@"

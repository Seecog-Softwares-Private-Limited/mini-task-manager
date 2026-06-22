#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/env.sh" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/env.sh"
fi

find_flutter() {
  if command -v flutter >/dev/null 2>&1; then
    command -v flutter
    return 0
  fi

  for candidate in \
    "$HOME/development/flutter/bin/flutter" \
    "$HOME/flutter/bin/flutter" \
    "/opt/homebrew/bin/flutter" \
    "/usr/local/bin/flutter"
  do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

FLUTTER_BIN="$(find_flutter || true)"
if [[ -z "${FLUTTER_BIN}" ]]; then
  echo "Flutter SDK not found."
  echo ""
  echo "Install (Apple Silicon Mac):"
  echo "  git clone https://github.com/flutter/flutter.git -b stable ~/development/flutter"
  echo "  echo 'export PATH=\"\$HOME/development/flutter/bin:\$PATH\"' >> ~/.zshrc"
  echo "  source ~/.zshrc"
  echo ""
  echo "Official guide: https://docs.flutter.dev/get-started/install/macos"
  echo "Then re-run: ./setup.sh"
  exit 1
fi

export PATH="$(dirname "$FLUTTER_BIN"):$PATH"
echo "Using Flutter: $(flutter --version | head -1)"

if [[ ! -d android || ! -d ios ]]; then
  echo "Generating Android/iOS platform folders..."
  flutter create . \
    --org com.seecog.minitaskmanager \
    --project-name mini_task_manager \
    --platforms android,ios
fi

flutter pub get
echo ""
echo "Setup complete."
echo "Run backend from repo root: node app.js"
echo "Then from mobile/: flutter run --dart-define=API_BASE_URL=http://localhost:3007"

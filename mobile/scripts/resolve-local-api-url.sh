#!/usr/bin/env bash
# Resolves the first reachable local API URL for iOS simulator dev runs.
set -euo pipefail

candidates=(
  "http://127.0.0.1:3007/api/v1"
  "http://localhost:3007/api/v1"
  "http://127.0.0.1:3008/api/v1"
  "http://localhost:3008/api/v1"
  "http://127.0.0.1:3000/api/v1"
  "http://localhost:3000/api/v1"
)

for url in "${candidates[@]}"; do
  if curl -sf "${url}/health" >/dev/null 2>&1; then
    # dart-define expects origin without /api/v1 suffix (AppConfig normalizes it).
    origin="${url%/api/v1}"
    echo "$origin"
    exit 0
  fi
done

exit 1

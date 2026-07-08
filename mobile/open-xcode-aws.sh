#!/usr/bin/env bash
# One command: configure AWS API + open Xcode workspace.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
"$ROOT/prepare-xcode-aws.sh"
open "$ROOT/ios/Runner.xcworkspace"

#!/usr/bin/env bash
# sync-enums.sh — Sync shared enum JSON files from contracts/ to remotion src.
#
# Run this after updating contracts/enums/*.json to keep the TypeScript
# copies in sync without drift.
#
# Usage: bash scripts/sync-enums.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ENUM_SRC="$PROJECT_DIR/../../contracts/enums"
ENUM_DST="$PROJECT_DIR/src/enums"

for f in "$ENUM_SRC"/*.json; do
    basename=$(basename "$f")
    cp "$f" "$ENUM_DST/$basename"
    echo "  synced  $basename"
done

echo "Done — enums synced from contracts/enums/"

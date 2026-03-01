#!/usr/bin/env bash
# Packages the extension into a zip file ready for Chrome Web Store upload.
# Run from any directory: bash chrome-extension/package.sh

set -euo pipefail

cd "$(dirname "$0")"

OUTPUT="israel-vehicle-lookup.zip"
rm -f "$OUTPUT"

zip -r "$OUTPUT" \
  manifest.json \
  background/ \
  sidepanel/ \
  icons/icon16.png \
  icons/icon48.png \
  icons/icon128.png

echo "Created $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"

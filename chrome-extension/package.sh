#!/usr/bin/env bash
# Packages the extension into a zip file ready for Chrome Web Store upload.
# Run from any directory: bash chrome-extension/package.sh

set -euo pipefail

cd "$(dirname "$0")"

OUTPUT="israel-vehicle-lookup.zip"

for f in lib/transformers.min.js lib/ort-wasm-simd-threaded.jsep.mjs lib/ort-wasm-simd-threaded.jsep.wasm; do
  if [ ! -f "$f" ]; then
    echo "Error: $f missing. Run setup-lib.sh first." >&2
    exit 1
  fi
done

python3 - <<'EOF'
import zipfile, os, sys

OUTPUT = "israel-vehicle-lookup.zip"
files = [
    "manifest.json",
    "background/service-worker.js",
    "content/region-selector.js",
    "sidepanel/sidepanel.html",
    "sidepanel/sidepanel.css",
    "sidepanel/sidepanel.js",
    "offscreen/offscreen.html",
    "offscreen/offscreen.js",
    "lib/transformers.min.js",
    "lib/ort-wasm-simd-threaded.jsep.mjs",
    "lib/ort-wasm-simd-threaded.jsep.wasm",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png",
]

missing = [f for f in files if not os.path.exists(f)]
if missing:
    print("Error: missing files:", missing, file=sys.stderr)
    sys.exit(1)

with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as z:
    for f in files:
        z.write(f)

size = os.path.getsize(OUTPUT)
print(f"Created {OUTPUT} ({size/1024/1024:.1f} MB)")
EOF

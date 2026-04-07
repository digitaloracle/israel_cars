#!/usr/bin/env bash
# Downloads the libraries required for license plate OCR.
#
# Run once before loading the extension:
#   bash chrome-extension/setup-lib.sh
#
# Chrome MV3 blocks dynamic import() from external URLs (script-src 'self'),
# so the ONNX runtime JS modules AND WASM binaries must be bundled locally.
# The OCR model (~200 MB) is still fetched from HuggingFace on first use
# and cached by the browser.

set -euo pipefail
cd "$(dirname "$0")"
mkdir -p lib

TF_VERSION="3.5.0"
ORT_CDN="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist"

echo "Downloading @huggingface/transformers v${TF_VERSION}..."
curl -fL "https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TF_VERSION}/dist/transformers.min.js" \
  -o lib/transformers.min.js

echo "Downloading ONNX Runtime worker modules (.mjs)..."
for f in \
  ort-wasm-simd-threaded.jsep.mjs \
  ort-wasm-simd-threaded.mjs \
  ort-wasm-simd.jsep.mjs \
  ort-wasm-simd.mjs \
  ort-wasm.mjs; do
  curl -fL "${ORT_CDN}/${f}" -o "lib/${f}"
done

echo "Downloading ONNX Runtime WASM binaries (this may take a minute)..."
for f in \
  ort-wasm-simd-threaded.jsep.wasm \
  ort-wasm-simd-threaded.wasm; do
  curl -fL "${ORT_CDN}/${f}" -o "lib/${f}"
done

echo ""
echo "Done. Files in lib/:"
du -sh lib/*
echo ""
echo "Load the extension as unpacked in Chrome, or run ./package.sh to build the zip."

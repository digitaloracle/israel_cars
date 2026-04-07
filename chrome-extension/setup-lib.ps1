# Downloads the libraries required for license plate OCR.
#
# Run once before loading the extension:
#   .\chrome-extension\setup-lib.ps1
#
# Chrome MV3 blocks dynamic import() from external URLs (script-src 'self'),
# so the ONNX runtime JS modules AND WASM binaries must be bundled locally.
# The OCR model (~200 MB) is still fetched from HuggingFace on first use
# and cached by the browser.

$tfVersion = "3.5.0"
$ortCdn = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist"
$src = Split-Path -Parent $MyInvocation.MyCommand.Path
New-Item -ItemType Directory -Force -Path "$src\lib" | Out-Null

Write-Output "Downloading @huggingface/transformers v$tfVersion..."
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/@huggingface/transformers@$tfVersion/dist/transformers.min.js" `
  -OutFile "$src\lib\transformers.min.js"

$mjsFiles = @(
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd.jsep.mjs",
  "ort-wasm-simd.mjs",
  "ort-wasm.mjs"
)
Write-Output "Downloading ONNX Runtime worker modules (.mjs)..."
foreach ($f in $mjsFiles) {
  Invoke-WebRequest -Uri "$ortCdn/$f" -OutFile "$src\lib\$f"
  Write-Output "  $f"
}

$wasmFiles = @(
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.wasm"
)
Write-Output "Downloading ONNX Runtime WASM binaries (this may take a minute)..."
foreach ($f in $wasmFiles) {
  Invoke-WebRequest -Uri "$ortCdn/$f" -OutFile "$src\lib\$f"
  $size = [math]::Round((Get-Item "$src\lib\$f").Length / 1MB, 1)
  Write-Output "  $f ($size MB)"
}

Write-Output ""
Write-Output "Done. Load the extension as unpacked in Chrome, or run .\package.ps1 to build the zip."

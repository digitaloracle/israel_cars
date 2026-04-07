$src = Split-Path -Parent $MyInvocation.MyCommand.Path
$libJs = Join-Path $src "lib\transformers.min.js"
if (-not (Test-Path $libJs)) {
  Write-Error "lib\transformers.min.js not found. Run .\setup-lib.ps1 first."
  exit 1
}

$zip = "$src\israel-vehicle-lookup.zip"
Remove-Item -Force $zip -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($zip, 'Create')

$files = @(
  'manifest.json',
  'background/service-worker.js',
  'content/region-selector.js',
  'sidepanel/sidepanel.html',
  'sidepanel/sidepanel.css',
  'sidepanel/sidepanel.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png'
)
foreach ($f in $files) {
  $fullPath = Join-Path $src ($f -replace '/', '\')
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $fullPath, $f) | Out-Null
}

# Add all files from lib/
Get-ChildItem (Join-Path $src "lib") | ForEach-Object {
  $entry = "lib/$($_.Name)"
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $entry) | Out-Null
}

$archive.Dispose()
$size = (Get-Item $zip).Length
Write-Output "Created $zip ($size bytes)"

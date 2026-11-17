param(
  [string]$Server = "atopnuc@192.168.1.100",
  [string]$RemoteRoot = "/home/atopnuc/sitios/solvejs-docs"
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

node scripts/prepare-docs-vendor.mjs
node scripts/generate-api-index.mjs

$zip = Join-Path $env:TEMP "solvejs-docs.zip"
$stage = Join-Path $env:TEMP "solvejs-docs-stage"
if (Test-Path $zip) { Remove-Item $zip -Force }
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory $stage | Out-Null
Copy-Item -Path "docs\*" -Destination $stage -Recurse
$version = Get-Date -Format "yyyyMMddHHmmss"
node scripts/version-docs-assets.mjs $stage $version
Compress-Archive -Path "$stage\*" -DestinationPath $zip -Force

scp -o BatchMode=yes $zip "${Server}:${RemoteRoot}/site.zip"
ssh -o BatchMode=yes $Server "cd $RemoteRoot && rm -rf site && mkdir site && unzip -q site.zip -d site && sudo docker restart solvejs-docs >/dev/null && sleep 2"

$status = curl.exe -s -o NUL -w "%{http_code}" --max-time 20 "https://solvejs-documentation.eridu.top/live/"
if ($status -ne "200") {
  throw "Deploy finished but https://solvejs-documentation.eridu.top/live/ returned $status"
}

Write-Host "Docs deployed: https://solvejs-documentation.eridu.top/live/" -ForegroundColor Green

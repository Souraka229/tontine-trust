# Verification locale complete — TontineChain
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "`n=== TontineChain — verification locale ===" -ForegroundColor Magenta

Write-Host "`n[1/4] Tests Vitest..." -ForegroundColor Cyan
npm run test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n[2/4] Build production..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n[3/4] Serveur dev (port 8080)..." -ForegroundColor Cyan
try {
  $status = (Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 5).StatusCode
  Write-Host "OK — http://localhost:8080 ($status)" -ForegroundColor Green
} catch {
  Write-Host "Serveur arrete — demarrez dans un autre terminal : npm run dev" -ForegroundColor Yellow
  exit 0
}

Write-Host "`n[4/4] Bot WhatsApp..." -ForegroundColor Cyan
& "$PSScriptRoot\test-whatsapp-bot.ps1"
exit $LASTEXITCODE

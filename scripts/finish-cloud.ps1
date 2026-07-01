# Finalisation cloud TontineChain : secrets LNbits + migrations + edge functions
# Pre-requis : supabase login (une seule fois)
param(
  [string]$ProjectRef = "slyizcavccnkvxqtmfmd"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== TontineChain - finalisation cloud ===" -ForegroundColor Cyan

Write-Host "`n[1/4] Link projet $ProjectRef..." -ForegroundColor Yellow
npx supabase link --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) {
  Write-Host "Echec link. Lancez: supabase login" -ForegroundColor Red
  exit 1
}

Write-Host "`n[2/4] Secrets LNbits..." -ForegroundColor Yellow
& "$PSScriptRoot\set-lnbits-secrets-cloud.ps1" -ProjectRef $ProjectRef
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n[3/4] Migrations SQL..." -ForegroundColor Yellow
npx supabase db push
if ($LASTEXITCODE -ne 0) {
  Write-Host "Avertissement: db push a echoue" -ForegroundColor DarkYellow
}

Write-Host "`n[4/4] Deploy edge functions (7)..." -ForegroundColor Yellow
$functions = @(
  @{ Name = "whatsapp-webhook"; Jwt = $false },
  @{ Name = "kkiapay-webhook"; Jwt = $false },
  @{ Name = "tontine-automation"; Jwt = $true },
  @{ Name = "btc-treasury-sync"; Jwt = $false },
  @{ Name = "lnbits-create-invoice"; Jwt = $false },
  @{ Name = "lnbits-check-payment"; Jwt = $false },
  @{ Name = "lnbits-webhook"; Jwt = $false }
)

foreach ($fn in $functions) {
  Write-Host "  deploy $($fn.Name)..." -ForegroundColor Gray
  if ($fn.Jwt) {
    npx supabase functions deploy $fn.Name
  } else {
    npx supabase functions deploy $fn.Name --no-verify-jwt
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  Echec deploy $($fn.Name)" -ForegroundColor Red
    exit $LASTEXITCODE
  }
}

Write-Host "`n=== Termine ===" -ForegroundColor Green
Write-Host "7 edge functions deployees sur $ProjectRef"
Write-Host "Test: npm run dev puis page /crypto"

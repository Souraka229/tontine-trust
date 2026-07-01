# Secrets LNbits sur Supabase cloud (apres: supabase login)
param(
  [string]$ProjectRef = "slyizcavccnkvxqtmfmd"
)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Configuration secrets LNbits sur projet $ProjectRef..." -ForegroundColor Cyan

npx supabase secrets set --project-ref $ProjectRef `
  LNBITS_URL="https://demo.lnbits.com" `
  LNBITS_TREASURY_INVOICE_KEY="dd5b498300b545d2884d0d4459ddef16" `
  LNBITS_TREASURY_ADMIN_KEY="8fd7a426c2d5483bb516cf9c641a5fb3" `
  LNBITS_WALLET_ID="8fc2ab0992514123a32025105125c347"

if ($LASTEXITCODE -ne 0) {
  Write-Host "Echec. Lancez d'abord: supabase login" -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "OK. Deployez les fonctions: .\scripts\deploy-cloud.ps1" -ForegroundColor Green

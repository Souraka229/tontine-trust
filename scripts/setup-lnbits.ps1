# Configure LNbits pour TontineChain (secrets Supabase + .env frontend)
param(
  [Parameter(Mandatory = $true)]
  [string]$Url,

  [Parameter(Mandatory = $true)]
  [string]$InvoiceKey,

  [string]$AdminKey = "",

  [string]$WebhookSecret = "",

  [string]$EnvFile = ".env"
)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$base = $Url.Trim().TrimEnd("/")
if (-not $AdminKey) { $AdminKey = $InvoiceKey }

if (-not (Test-Path $EnvFile)) {
  Copy-Item ".env.example" $EnvFile
}

$content = Get-Content $EnvFile -Raw
function Set-EnvLine([string]$key, [string]$value) {
  $pattern = "(?m)^$key=.*$"
  $line = "$key=$value"
  if ($content -match $pattern) {
    $script:content = $content -replace $pattern, $line
  } else {
    $script:content = $content.TrimEnd() + "`n$line`n"
  }
}

Set-EnvLine "VITE_LNBITS_ENABLED" "true"
Set-EnvLine "VITE_LNBITS_URL" $base
Set-Content -Path $EnvFile -Value $content.TrimEnd() -NoNewline
Add-Content -Path $EnvFile -Value ""

Write-Host "`n✓ .env mis à jour (VITE_LNBITS_ENABLED=true)" -ForegroundColor Green

Write-Host "`nSecrets Supabase Dashboard → Edge Functions :" -ForegroundColor Cyan
Write-Host "  LNBITS_URL=$base"
Write-Host "  LNBITS_TREASURY_INVOICE_KEY=$InvoiceKey"
Write-Host "  LNBITS_TREASURY_ADMIN_KEY=$AdminKey"
if ($WebhookSecret) {
  Write-Host "  LNBITS_WEBHOOK_SECRET=$WebhookSecret"
}

Write-Host "`nDéployer les fonctions :" -ForegroundColor Cyan
Write-Host "  npx supabase functions deploy lnbits-create-invoice --no-verify-jwt"
Write-Host "  npx supabase functions deploy lnbits-check-payment --no-verify-jwt"
Write-Host "  npx supabase functions deploy lnbits-webhook --no-verify-jwt"

Write-Host "`nWebhook LNbits (extension) :" -ForegroundColor Cyan
Write-Host "  https://<project>.supabase.co/functions/v1/lnbits-webhook"

Write-Host "`nTest: /crypto puis Generer facture Lightning. WhatsApp: INVOICE 500" -ForegroundColor Green

# Deploiement Supabase cloud (migrations + edge functions)
# Pre-requis : supabase login
param(
  [string]$ProjectRef = "slyizcavccnkvxqtmfmd"
)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Link projet $ProjectRef..." -ForegroundColor Cyan
npx supabase link --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nPush migrations..." -ForegroundColor Cyan
npx supabase db push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nDeploy edge functions..." -ForegroundColor Cyan
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
npx supabase functions deploy kkiapay-webhook --no-verify-jwt
npx supabase functions deploy tontine-automation
npx supabase functions deploy btc-treasury-sync --no-verify-jwt
npx supabase functions deploy lnbits-create-invoice --no-verify-jwt
npx supabase functions deploy lnbits-check-payment --no-verify-jwt
npx supabase functions deploy lnbits-webhook --no-verify-jwt

Write-Host "`nTermine. Configurez les secrets dans le dashboard Supabase :" -ForegroundColor Green
Write-Host "  WHATSAPP_VERIFY_TOKEN, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID"
Write-Host "  CRON_SECRET, APP_ORIGIN"
Write-Host "  BTC_TREASURY_ADDRESS, BTC_NETWORK=mainnet (quand vous avez l'adresse bc1q...)"
Write-Host "  LNBITS_URL, LNBITS_TREASURY_INVOICE_KEY, LNBITS_TREASURY_ADMIN_KEY"
Write-Host "  (SUPABASE_SERVICE_ROLE_KEY est injecte automatiquement)"

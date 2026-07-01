# Configure l'adresse trésor Bitcoin mainnet (local + rappel secrets Supabase)
param(
  [Parameter(Mandatory = $true)]
  [string]$Address,

  [ValidateSet("mainnet", "testnet")]
  [string]$Network = "mainnet",

  [string]$EnvFile = ".env"
)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$addr = $Address.Trim()
if ($addr -notmatch '^(bc1|tb1|1|3)') {
  Write-Error "Adresse Bitcoin invalide : $addr"
  exit 1
}

if (-not (Test-Path $EnvFile)) {
  Copy-Item ".env.example" $EnvFile
  Write-Host "Créé $EnvFile depuis .env.example" -ForegroundColor Yellow
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

Set-EnvLine "VITE_BTC_TREASURY_ADDRESS" $addr
Set-EnvLine "VITE_BTC_NETWORK" $Network
Set-Content -Path $EnvFile -Value $content.TrimEnd() -NoNewline
Add-Content -Path $EnvFile -Value ""

Write-Host "`n✓ .env mis à jour :" -ForegroundColor Green
Write-Host "  VITE_BTC_TREASURY_ADDRESS=$addr"
Write-Host "  VITE_BTC_NETWORK=$Network"

Write-Host "`nÉtapes suivantes :" -ForegroundColor Cyan
Write-Host "  1. Redémarrer : npm run dev"
Write-Host "  2. Dashboard Supabase → Edge Functions → Secrets :"
Write-Host "       BTC_TREASURY_ADDRESS=$addr"
Write-Host "       BTC_NETWORK=$Network"
Write-Host "  3. Déployer la fonction : npx supabase functions deploy btc-treasury-sync --no-verify-jwt"
Write-Host "  4. Envoyer un petit dépôt BTC sur l'adresse, puis /crypto → Sync dépôts"

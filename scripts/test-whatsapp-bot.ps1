# Suite de tests webhook WhatsApp (dev local)
param(
  [string]$Url = "http://localhost:8080/api/whatsapp/webhook",
  [string]$From = "+22990000000",
  [int]$TimeoutSec = 30
)

$commands = @("AIDE", "/aide", "/bitcoin", "/solde", "TONTINE", "CREER")
$passed = 0
$failed = 0

# Health check
try {
  $health = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 5
  if (-not $health.serviceRole) {
    Write-Host "AVERTISSEMENT: SUPABASE_SERVICE_ROLE_KEY absente — /solde et CREER echoueront." -ForegroundColor Yellow
    Write-Host "Ajoutez la cle service_role dans .env puis redemarrez npm run dev`n" -ForegroundColor Yellow
  }
} catch {
  Write-Host "ERREUR: serveur dev inaccessible sur $Url — lancez npm run dev" -ForegroundColor Red
  exit 1
}

foreach ($body in $commands) {
  Write-Host "`n--- $body ---" -ForegroundColor Cyan
  $payload = @{ from = $From; body = $body } | ConvertTo-Json -Compress
  try {
    $response = Invoke-RestMethod -Uri $Url -Method Post -ContentType "application/json" -Body $payload -TimeoutSec $TimeoutSec
    Write-Host "success: $($response.success)" -ForegroundColor Green
    $preview = if ($response.reply.Length -gt 120) { $response.reply.Substring(0, 120) + "..." } else { $response.reply }
    Write-Host $preview
    $passed++
  } catch {
    Write-Host "ERREUR: $_" -ForegroundColor Red
    $failed++
  }
}

Write-Host "`n=== $passed OK / $($passed + $failed) total ===" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
if ($failed -gt 0) { exit 1 }

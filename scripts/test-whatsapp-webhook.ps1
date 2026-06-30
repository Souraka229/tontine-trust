# Test webhook WhatsApp — dev (Vite) ou prod (Supabase Edge Function)
param(
  [string]$Url = "http://localhost:8080/api/whatsapp/webhook",
  [string]$From = "+22990000000",
  [string]$Body = "/aide"
)

$payload = @{ from = $From; body = $Body } | ConvertTo-Json -Compress
Write-Host "POST $Url" -ForegroundColor Cyan
Write-Host $payload

$response = Invoke-RestMethod -Uri $Url -Method Post -ContentType "application/json" -Body $payload
$response | ConvertTo-Json -Depth 5

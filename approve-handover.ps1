$ErrorActionPreference = "Stop"
$base = "http://localhost:3100"

function Login($phone, $pass) {
  $body = @{ phone = $phone; password = $pass } | ConvertTo-Json
  return Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -Body $body -ContentType "application/json"
}

$dir = Login "+79001234567" "superpassword123"
$dirH = @{ Authorization = "Bearer $($dir.accessToken)" }

$reqId = "cf7fa8a3-2617-4b23-9687-7a56c3d720e8"

Write-Host "== Director approves handover ==" -ForegroundColor Cyan
$res = Invoke-RestMethod -Uri "$base/api/handover/$reqId/approve" -Method Post -Headers $dirH
Write-Host "  ok = $($res.ok)"
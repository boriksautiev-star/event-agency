$ErrorActionPreference = "Stop"
$base = "http://localhost:3100"

function Login($phone, $pass) {
  $body = @{ phone = $phone; password = $pass } | ConvertTo-Json
  return Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -Body $body -ContentType "application/json"
}

$dir = Login "+79001234567" "superpassword123"
$an  = Login "+79007778899" "animpass123"
$pet = Login "+79005556677" "animpass123"
$dirH = @{ Authorization = "Bearer $($dir.accessToken)" }
$anH  = @{ Authorization = "Bearer $($an.accessToken)" }
$petH = @{ Authorization = "Bearer $($pet.accessToken)" }

$orderId = "0861449e-f4fd-4a3d-aa23-dea37183f75f"
$slotId  = "240bd478-bcb3-4cef-8e9c-5461953e445b"

Write-Host "== STEP 1: Peter -> candidates ==" -ForegroundColor Cyan
$cands = Invoke-RestMethod -Uri "$base/api/orders/$orderId/slots/$slotId/handover-candidates" -Headers $petH
$cands | ConvertTo-Json -Depth 4
$candidates = if ($cands.items) { $cands.items } else { $cands }
Write-Host "Count = $($candidates.Count)"

Write-Host ""
Write-Host "== STEP 2: Peter -> create handover to Anna ==" -ForegroundColor Cyan
$body = @{ toAnimatorId = $an.user.id; comment = "test from Peter" } | ConvertTo-Json
$req = Invoke-RestMethod -Uri "$base/api/orders/$orderId/slots/$slotId/handover" -Headers $petH -Method Post -Body $body -ContentType "application/json"
$req | ConvertTo-Json -Depth 5
$reqId = $req.id
if (-not $reqId) { $reqId = $req.request.id }
Write-Host "reqId = $reqId"

Write-Host ""
Write-Host "== STEP 3: Anna -> my-incoming ==" -ForegroundColor Cyan
$inc = Invoke-RestMethod -Uri "$base/api/handover/my-incoming?status=all" -Headers $anH
$inc | ConvertTo-Json -Depth 4

Write-Host ""
Write-Host "== STEP 4: Anna -> accept ==" -ForegroundColor Cyan
$acc = Invoke-RestMethod -Uri "$base/api/handover/$reqId/accept" -Headers $anH -Method Post
$acc | ConvertTo-Json -Depth 4

Write-Host ""
Write-Host "== STEP 5: Director -> pending-approval ==" -ForegroundColor Cyan
$pend = Invoke-RestMethod -Uri "$base/api/handover/pending-approval" -Headers $dirH
$pend | ConvertTo-Json -Depth 4

Write-Host ""
Write-Host "== STEP 6: Director -> approve ==" -ForegroundColor Cyan
$appr = Invoke-RestMethod -Uri "$base/api/handover/$reqId/approve" -Headers $dirH -Method Post
$appr | ConvertTo-Json -Depth 5

Write-Host ""
Write-Host "== STEP 7: verify order ==" -ForegroundColor Cyan
$o = Invoke-RestMethod -Uri "$base/api/orders/$orderId" -Headers $dirH
Write-Host "order.status = $($o.order.status)"
$o.order.animators | ForEach-Object {
  Write-Host ("  animator={0} status={1} releaseReason={2} slotId={3} payout={4}" -f `
    $_.animatorId.Substring(0,8), $_.status, $_.releaseReason, $_.slotId.Substring(0,8), $_.payout)
}
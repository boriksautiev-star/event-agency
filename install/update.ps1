# update.ps1 - обновление Event Agency
# Использование (от Администратора):
#   powershell -ExecutionPolicy Bypass -File install\update.ps1

param(
    [string]$InstallDir = "",
    [switch]$SkipBackup
)

$ErrorActionPreference = 'Stop'

function Write-Step { param($msg) Write-Host ""; Write-Host ">>> $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "  [INFO] $msg" -ForegroundColor Gray }
function Write-Err  { param($msg) Write-Host "  [ERROR] $msg" -ForegroundColor Red }

$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($id)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Err "Требуются права администратора."
    exit 1
}

if (-not $InstallDir) {
    $InstallDir = Split-Path $PSScriptRoot -Parent
}
Write-Info "Папка: $InstallDir"

if (-not $SkipBackup) {
    Write-Step "Бэкап БД перед обновлением"
    Push-Location (Join-Path $InstallDir "server")
    try {
        & npm run db:backup 2>&1 | Out-String | Write-Host
        Write-Ok "Бэкап создан"
    } catch {
        Write-Err "Бэкап не выполнен. Используйте -SkipBackup для продолжения без бэкапа."
        exit 1
    } finally { Pop-Location }
}

Write-Step "Остановка службы"
& nssm stop EventAgencyAPI 2>&1 | Out-Null
Start-Sleep -Seconds 2
Write-Ok "Служба остановлена"

Write-Step "Получение обновлений"
Push-Location $InstallDir
try {
    & git pull 2>&1 | Out-String | Write-Host
    if ($LASTEXITCODE -ne 0) { Write-Err "git pull failed"; exit 1 }

    & npm ci 2>&1 | Out-String | Write-Host
    if ($LASTEXITCODE -ne 0) { Write-Err "npm ci failed"; exit 1 }

    Push-Location (Join-Path $InstallDir "server")
    try {
        & npx prisma migrate deploy 2>&1 | Out-String | Write-Host
        if ($LASTEXITCODE -ne 0) { Write-Err "prisma migrate failed"; exit 1 }
    } finally { Pop-Location }
} finally { Pop-Location }
Write-Ok "Код обновлён, миграции применены"

Write-Step "Запуск службы"
& nssm start EventAgencyAPI 2>&1 | Out-Null
Start-Sleep -Seconds 3

$svc = Get-Service -Name "EventAgencyAPI" -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq "Running") {
    Write-Ok "Служба запущена. Обновление завершено."
} else {
    Write-Err "Служба не запустилась. Проверьте логи: $InstallDir\server\logs\service-err.log"
    exit 1
}

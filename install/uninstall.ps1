# uninstall.ps1 - удаление Event Agency
# Использование (от Администратора):
#   powershell -ExecutionPolicy Bypass -File install\uninstall.ps1

param(
    [string]$InstallDir = "",
    [switch]$KeepDatabase,
    [switch]$Force
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
    $input = Read-Host "Путь установки (Enter для C:\EventAgency)"
    $InstallDir = if ([string]::IsNullOrWhiteSpace($input)) { "C:\EventAgency" } else { $input.Trim() }
}

if (-not $Force) {
    Write-Host ""
    Write-Host "!!! ВНИМАНИЕ !!!" -ForegroundColor Red
    Write-Host "Это удалит:" -ForegroundColor Yellow
    Write-Host "  - службы EventAgencyAPI и EventAgencyCaddy" -ForegroundColor Yellow
    Write-Host "  - папку установки: $InstallDir" -ForegroundColor Yellow
    if (-not $KeepDatabase) { Write-Host "  - БД event_agency и пользователя event" -ForegroundColor Yellow }
    Write-Host ""
    $answer = Read-Host "Введите YES для продолжения"
    if ($answer -ne "YES") { Write-Host "Отменено"; exit 0 }
}

Write-Step "Остановка и удаление служб"
foreach ($svc in @("EventAgencyAPI", "EventAgencyCaddy")) {
    $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($s) {
        & nssm stop $svc 2>&1 | Out-Null
        Start-Sleep -Seconds 1
        & nssm remove $svc confirm 2>&1 | Out-Null
        Write-Ok "Служба $svc удалена"
    }
}

Write-Step "Удаление Task Scheduler"
$task = Get-ScheduledTask -TaskName "EventAgency-DB-Backup" -ErrorAction SilentlyContinue
if ($task) {
    Unregister-ScheduledTask -TaskName "EventAgency-DB-Backup" -Confirm:$false
    Write-Ok "Задача бэкапа удалена"
}

if (-not $KeepDatabase) {
    Write-Step "Удаление БД"
    $pgSuper = Read-Host "Введите пароль postgres для удаления БД (Enter = пропустить)" -AsSecureString
    $pgSuperPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgSuper)
    )
    if (-not [string]::IsNullOrWhiteSpace($pgSuperPlain)) {
        $psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
        if (Test-Path $psql) {
            $env:PGPASSWORD = $pgSuperPlain
            try {
                & $psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS event_agency;" 2>&1 | Out-String | Write-Host
                & $psql -U postgres -h localhost -c "DROP ROLE IF EXISTS event;" 2>&1 | Out-String | Write-Host
                Write-Ok "БД удалена"
            } finally { Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue }
        } else {
            Write-Info "psql не найден — БД не удалена"
        }
    } else {
        Write-Info "БД сохранена"
    }
}

Write-Step "Удаление файлов"
if (Test-Path $InstallDir) {
    Remove-Item $InstallDir -Recurse -Force
    Write-Ok "Папка $InstallDir удалена"
}

Write-Host ""
Write-Host "✅ Удаление завершено" -ForegroundColor Green

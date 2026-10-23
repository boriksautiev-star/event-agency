# build-apk.ps1 — сборка release APK для Android
# Использование:
#   powershell -ExecutionPolicy Bypass -File .uild-apk.ps1
#   powershell -ExecutionPolicy Bypass -File .uild-apk.ps1 -Clean  # с очисткой build/

param(
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

function Write-Step { param($msg) Write-Host ""; Write-Host ">>> $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "  [INFO] $msg" -ForegroundColor Gray }
function Write-Err  { param($msg) Write-Host "  [ERROR] $msg" -ForegroundColor Red }

# Проверка окружения
if (-not (Test-Path "mobileandroidgradlew.bat")) {
    Write-Err "mobile/android/gradlew.bat не найден. Запустите из корня репозитория."
    exit 1
}
if (-not (Test-Path "mobilecredentialsandroidkeystore.jks")) {
    Write-Err "keystore.jks не найден. См. docs/INSTALL.md → Сборка APK."
    exit 1
}

# Версия
Write-Step "Чтение версии"
$pkg = Get-Content package.json -Raw | ConvertFrom-Json
$version = $pkg.version
Write-Ok "Версия: $version"

# Чистка (опционально)
if ($Clean) {
    Write-Step "Очистка build/"
    Push-Location mobileandroid
    try {
        .gradlew.bat clean
        if ($LASTEXITCODE -ne 0) { Write-Err "gradlew clean failed"; exit 1 }
    } finally { Pop-Location }
    Write-Ok "Очищено"
}

# Сборка
Write-Step "Сборка APK (5-10 минут)"
Write-Info "Команда: gradlew assembleRelease"
Write-Info "Не закрывайте окно, процесс длительный..."
Push-Location mobileandroid
try {
    .gradlew.bat assembleRelease
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Сборка провалилась (exit code $LASTEXITCODE)"
        exit 1
    }
} finally { Pop-Location }
Write-Ok "APK собран"

# Копирование
$apkPath = "mobileandroidappuildoutputsapkeleaseapp-release.apk"
if (-not (Test-Path $apkPath)) {
    Write-Err "APK не найден: $apkPath"
    exit 1
}

if (-not (Test-Path "releases")) {
    New-Item -ItemType Directory -Path "releases" | Out-Null
}

$dest = "releasesevent-agency-v$version.apk"
Copy-Item $apkPath $dest -Force

$size = [math]::Round((Get-Item $dest).Length / 1MB, 2)

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ✅ APK ГОТОВ" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Файл:     $dest" -ForegroundColor Cyan
Write-Host "  Размер:   $size MB" -ForegroundColor Cyan
Write-Host "  Версия:   $version" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Передать клиенту вместе с ZIP-архивом:" -ForegroundColor Yellow
Write-Host "    - event-agency-v$version.zip (установка сервера)"
Write-Host "    - event-agency-v$version.apk (мобильное приложение)"
Write-Host ""

# build-release.ps1 — сборка ZIP-архива для клиента
# Использование (от обычного пользователя, admin не нужен):
#   powershell -ExecutionPolicy Bypass -File .uild-release.ps1

$ErrorActionPreference = "Stop"

function Write-Step { param($msg) Write-Host ""; Write-Host ">>> $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Err  { param($msg) Write-Host "  [ERROR] $msg" -ForegroundColor Red }

# Проверка: мы в корне репо
if (-not (Test-Path "package.json")) {
    Write-Err "Запустите из корня репозитория (там, где package.json)"
    exit 1
}
if (-not (Test-Path ".git")) {
    Write-Err "Папка .git не найдена — это не git-репозиторий"
    exit 1
}

# Проверка: рабочее дерево чистое (чтобы архив = HEAD)
Write-Step "Проверка git status"
$dirty = git status --porcelain
if ($dirty) {
    Write-Err "Рабочее дерево не чистое. Сначала закоммитьте:"
    Write-Host $dirty
    exit 1
}
Write-Ok "Дерево чистое"

# Проверка: мы на main
Write-Step "Проверка ветки"
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "main") {
    Write-Err "Текущая ветка: $branch. Переключитесь на main: git checkout main"
    exit 1
}
Write-Ok "Ветка: $branch"

# Версия
Write-Step "Чтение версии"
$pkg = Get-Content package.json -Raw | ConvertFrom-Json
$version = $pkg.version
if (-not $version) {
    Write-Err "version не найдена в package.json"
    exit 1
}
Write-Ok "Версия: $version"

# Папка releases
Write-Step "Подготовка releases/"
if (-not (Test-Path "releases")) {
    New-Item -ItemType Directory -Path "releases" | Out-Null
    Write-Ok "Создана папка releases/"
} else {
    Write-Ok "Папка releases/ уже есть"
}

$zipName = "event-agency-v$version.zip"
$zipPath = Join-Path "releases" $zipName

if (Test-Path $zipPath) {
    Write-Host "  Существующий $zipPath будет перезаписан" -ForegroundColor Yellow
    Remove-Item $zipPath -Force
}

# Сборка через git archive (чисто, только то, что в git)
Write-Step "Сборка ZIP (git archive)"
Write-Host "  Это может занять 5-10 секунд..." -ForegroundColor Gray
& git archive HEAD --format=zip "--prefix=event-agency-v$version/" "--output=$zipPath"
if ($LASTEXITCODE -ne 0) {
    Write-Err "git archive завершился с ошибкой $LASTEXITCODE"
    exit 1
}
Write-Ok "ZIP собран: $zipPath"

# Добавляем README-INSTALL.txt в корень ZIP (он в git, но если забыли — добавим вручную)
# git archive уже включает install/README-INSTALL.txt, если он закоммичен

# Размер
$sizeBytes = (Get-Item $zipPath).Length
$sizeMb = [math]::Round($sizeBytes / 1MB, 2)

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ✅ АРХИВ ГОТОВ" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Файл:     $zipPath" -ForegroundColor Cyan
Write-Host "  Размер:   $sizeMb MB" -ForegroundColor Cyan
Write-Host "  Версия:   $version" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Что внутри (без node_modules, .env, license.key, backups):" -ForegroundColor Gray
Write-Host "    - server/         (backend)" -ForegroundColor Gray
Write-Host "    - admin-web/      (веб-админка)" -ForegroundColor Gray
Write-Host "    - mobile/         (исходники RN)" -ForegroundColor Gray
Write-Host "    - shared/         (общий код)" -ForegroundColor Gray
Write-Host "    - install/        (скрипты + README-INSTALL.txt)" -ForegroundColor Gray
Write-Host "    - docs/           (документация)" -ForegroundColor Gray
Write-Host "    - README.md, package.json, package-lock.json" -ForegroundColor Gray
Write-Host ""
Write-Host "  Передать клиенту:" -ForegroundColor Yellow
Write-Host "    1. Отправить этот ZIP" -ForegroundColor Yellow
Write-Host "    2. Распаковать в C:EventAgency" -ForegroundColor Yellow
Write-Host "    3. Запустить installinstall.ps1 от Администратора" -ForegroundColor Yellow
Write-Host ""

# install.ps1 - установка Event Agency на Windows Server
# Использование (от Администратора):
#   powershell -ExecutionPolicy Bypass -File install.ps1

param(
    [string]$InstallDir = "",
    [string]$Domain = "",
    [string]$LicenseKeyPath = "",
    [switch]$SkipWinget,
    [switch]$SkipSeed,
    [switch]$NoCaddy
)

$ErrorActionPreference = 'Stop'

# ============== Утилиты вывода ==============
function Write-Step { param($msg) Write-Host ""; Write-Host ">>> $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "  [INFO] $msg" -ForegroundColor Gray }
function Write-Warn { param($msg) Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Err  { param($msg) Write-Host "  [ERROR] $msg" -ForegroundColor Red }
function Write-Banner {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Magenta
    Write-Host "  Event Agency — установка" -ForegroundColor Magenta
    Write-Host "================================================" -ForegroundColor Magenta
    Write-Host ""
}

# ============== Проверка прав ==============
function Assert-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Err "Требуются права администратора. Запустите PowerShell от имени Администратора."
        exit 1
    }
}

# ============== Проверка winget ==============
function Assert-Winget {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Err "winget не найден. Установите App Installer из Microsoft Store или обновите Windows Server."
        Write-Info "https://aka.ms/winget"
        exit 1
    }
    Write-Ok "winget найден"
}

# ============== Установка пакета через winget ==============
function Install-WingetPackage {
    param([string]$Id, [string]$Name, [string]$TestCommand)
    if ($TestCommand -and (Get-Command $TestCommand -ErrorAction SilentlyContinue)) {
        Write-Ok "$Name уже установлен"
        return
    }
    Write-Info "Устанавливаю $Name через winget..."
    & winget install --id $Id --accept-package-agreements --accept-source-agreements --silent 2>&1 | Out-String | Write-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "${Name}: winget вернул $LASTEXITCODE (возможно, уже установлено или требует ручного вмешательства)"
    }
}

# ============== Запрос параметров ==============
function Ask-Parameters {
    if (-not $InstallDir) {
        $default = "C:\EventAgency"
        $input = Read-Host "Путь установки (Enter для $default)"
        if ([string]::IsNullOrWhiteSpace($input)) { $InstallDir = $default } else { $InstallDir = $input.Trim() }
    }

    if (-not $Domain) {
        Write-Host ""
        Write-Host "  Домен для HTTPS (опционально)." -ForegroundColor Gray
        Write-Host "  Пример: agency-ivanov.ru" -ForegroundColor Gray
        Write-Host "  Оставьте пустым, чтобы установить без HTTPS (доступ по IP:3100)." -ForegroundColor Gray
        $input = Read-Host "Домен"
        if (-not [string]::IsNullOrWhiteSpace($input)) { $Domain = $input.Trim() }
    }

    if (-not $LicenseKeyPath) {
        Write-Host ""
        Write-Host "  Путь к файлу license.key (опционально)." -ForegroundColor Gray
        Write-Host "  Оставьте пустым для demo-режима (14 дней)." -ForegroundColor Gray
        $input = Read-Host "Путь к license.key"
        if (-not [string]::IsNullOrWhiteSpace($input)) { $LicenseKeyPath = $input.Trim().Trim([char]34).Trim([char]39) }
    }
}

# ============== Проверка свободного порта ==============
function Test-Port {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return (-not $conn)
}

# ============== Клонирование репозитория ==============
function Clone-Repo {
    if (Test-Path (Join-Path $InstallDir ".git")) {
        Write-Ok "Репозиторий уже существует: $InstallDir"
        return
    }
    if (Test-Path $InstallDir) {
        $files = Get-ChildItem $InstallDir -ErrorAction SilentlyContinue
        if ($files.Count -gt 0) {
            Write-Err "Папка $InstallDir не пуста. Используйте пустую папку или удалите её."
            exit 1
        }
    } else {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    Write-Info "Клонирую репозиторий в $InstallDir..."
    Push-Location $InstallDir
    try {
        & git clone https://github.com/boriksautiev-star/event-agency.git . 2>&1 | Out-String | Write-Host
        if ($LASTEXITCODE -ne 0) {
            Write-Err "git clone завершился с ошибкой $LASTEXITCODE"
            exit 1
        }
    } finally {
        Pop-Location
    }
    Write-Ok "Репозиторий склонирован"
}

# ============== Основная логика (продолжение в Части 3) ==============

# ---- Шаги (определяются в Части 3 через dot-sourcing не нужен — всё в одном файле) ----
# Здесь только объявление функций, вызовы в конце файла.

Write-Host "Загрузка Части 2 (основная логика)..." -ForegroundColor Yellow
Write-Host "Этот файл должен быть ДОПОЛНЕН Частью 2 (database/env/service)." -ForegroundColor Yellow

# ============================================================
# ОСНОВНАЯ ЛОГИКА (вызовы идут последовательно)
# ============================================================

function Setup-Database {
    param([string]$DbPassword)
    Write-Step "Настройка PostgreSQL"

    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $pgService) {
        Write-Err "Служба PostgreSQL не найдена. Установите PostgreSQL или перезапустите установку."
        exit 1
    }
    Write-Ok "PostgreSQL: $($pgService.Name) ($($pgService.Status))"

    $psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
    if (-not (Test-Path $psql)) {
        # Пробуем найти другую версию
        $candidates = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue
        if ($candidates) {
            $ver = $candidates | Sort-Object Name -Descending | Select-Object -First 1
            $psql = Join-Path $ver.FullName "bin\psql.exe"
        }
    }
    if (-not (Test-Path $psql)) {
        Write-Err "psql.exe не найден. Укажите путь вручную или переустановите PostgreSQL."
        exit 1
    }
    Write-Ok "psql: $psql"

    # Запрашиваем пароль postgres
    $pgSuper = Read-Host "Введите пароль пользователя postgres (superuser PostgreSQL)" -AsSecureString
    $pgSuperPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgSuper)
    )

    # Создаём пользователя и БД через psql
    Write-Info "Создаю пользователя event и БД event_agency..."
    ${env:PGPASSWORD} = $pgSuperPlain
    try {
        # Проверка: существует ли пользователь
        $checkUser = & $psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_roles WHERE rolname='event'" 2>&1
        if ($checkUser -ne "1") {
            & $psql -U postgres -h localhost -c "CREATE ROLE event WITH LOGIN PASSWORD '$DbPassword';" 2>&1 | Out-String | Write-Host
            Write-Ok "Пользователь event создан"
        } else {
            & $psql -U postgres -h localhost -c "ALTER ROLE event WITH PASSWORD '$DbPassword';" 2>&1 | Out-Null
            Write-Ok "Пользователь event уже существует (пароль обновлён)"
        }

        # Проверка БД
        $checkDb = & $psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='event_agency'" 2>&1
        if ($checkDb -ne "1") {
            & $psql -U postgres -h localhost -c "CREATE DATABASE event_agency OWNER event;" 2>&1 | Out-String | Write-Host
            Write-Ok "БД event_agency создана"
        } else {
            Write-Ok "БД event_agency уже существует"
        }

        & $psql -U postgres -h localhost -c "GRANT ALL PRIVILEGES ON DATABASE event_agency TO event;" 2>&1 | Out-Null
    } finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function New-RandomSecret {
    param([int]$Bytes = 48)
    $bytes = New-Object byte[] $Bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

function Write-EnvFile {
    param([string]$DbPassword, [string]$Domain, [string]$InstallDir)
    Write-Step "Создание .env"
    $envPath = Join-Path $InstallDir "server\.env"
    if (Test-Path $envPath) {
        Copy-Item $envPath "$envPath.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"
        Write-Info "Старый .env сохранён как .bak"
    }

    $jwtAccess = New-RandomSecret 48
    $jwtRefresh = New-RandomSecret 48
    $encryptionKey = New-RandomSecret 32
    $setupToken = New-RandomSecret 24

    $appUrl = if ($Domain) { "https://$Domain" } else { "http://localhost:3100" }

    $envLines = @(
        'NODE_ENV=production'
        'PORT=3100'
        "APP_URL=$appUrl"
        'APP_NAME=Event Agency'
        'TIMEZONE=Europe/Moscow'
        'CURRENCY=RUB'
        'DEFAULT_LOCALE=ru'
        ''
        "DATABASE_URL=postgresql://event:$($DbPassword)@localhost:5432/event_agency"
        ''
        "JWT_ACCESS_SECRET=$jwtAccess"
        "JWT_REFRESH_SECRET=$jwtRefresh"
        'JWT_ACCESS_EXPIRES=15m'
        'JWT_REFRESH_EXPIRES=30d'
        ''
        "SETUP_TOKEN=$setupToken"
        ''
        'BACKUP_DIR=./backups'
        'BACKUP_RETENTION_DAYS=30'
        ''
        "ENCRYPTION_KEY=$encryptionKey"
    )
    $envContent = $envLines -join [Environment]::NewLine
    [System.IO.File]::WriteAllText($envPath, $envContent, (New-Object System.Text.UTF8Encoding($false)))
    Write-Ok "Файл .env создан"

    # Возвращаем setupToken для install-info
    return $setupToken
}

function Install-NssmService {
    param([string]$InstallDir)
    Write-Step "Установка Windows-службы (NSSM)"

    $nssm = Get-Command nssm -ErrorAction SilentlyContinue
    if (-not $nssm) {
        Write-Info "NSSM не найден, устанавливаю через winget..."
        & winget install --id NSSM.NSSM --accept-package-agreements --accept-source-agreements --silent 2>&1 | Out-String | Write-Host
        Start-Sleep -Seconds 2
        $nssm = Get-Command nssm -ErrorAction SilentlyContinue
        if (-not $nssm) {
            Write-Err "NSSM not installed. Download from https://nssm.cc/download"
            Write-Info "Распакуйте nssm.exe в папку C:\Windows\System32 (без финального бэкслеша)"
            exit 1
        }
    }
    Write-Ok "NSSM: $($nssm.Source)"

    # Проверка: служба уже есть?
    $existing = Get-Service -Name "EventAgencyAPI" -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Info "Служба EventAgencyAPI уже существует, останавливаю и пересоздаю..."
        & nssm stop EventAgencyAPI 2>&1 | Out-Null
        & nssm remove EventAgencyAPI confirm 2>&1 | Out-Null
        Start-Sleep -Seconds 2
    }

    # Путь к node.exe
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) {
        Write-Err "node.exe не найден в PATH. Перезапустите PowerShell (установка Node.js обновила PATH)."
        exit 1
    }
    $nodeExe = $nodeCmd.Source
    Write-Info "Node.js: $nodeExe"

    # Точка входа: dist/index.js (после сборки) или src/index.ts через tsx
    $serverDir = Join-Path $InstallDir "server"
    $distEntry = Join-Path $serverDir "dist\index.js"
    $srcEntry = Join-Path $serverDir "src\index.ts"

    if (Test-Path $distEntry) {
        $appArgs = "`"$distEntry`""
        Write-Info "Запуск через dist/index.js (production build)"
    } else {
        # Fallback: через tsx
        $tsx = Join-Path (Join-Path $InstallDir "node_modules") ".bin\tsx.cmd"
        if (-not (Test-Path $tsx)) {
            Write-Err "Не найден ни dist/index.js, ни tsx. Убедитесь, что npm ci выполнен."
            exit 1
        }
        $appArgs = "`"$tsx`" `"$srcEntry`""
        Write-Warn "Запуск через tsx (src/index.ts). Для production рекомендуется сделать npm run build."
    }

    # Установка службы
    & nssm install EventAgencyAPI $nodeExe $appArgs
    & nssm set EventAgencyAPI AppDirectory $serverDir
    & nssm set EventAgencyAPI DisplayName "Event Agency API"
    & nssm set EventAgencyAPI Description "Event Agency backend (Express + Prisma)"
    & nssm set EventAgencyAPI Start SERVICE_AUTO_START
    & nssm set EventAgencyAPI AppStdout (Join-Path $serverDir "logs\service-out.log")
    & nssm set EventAgencyAPI AppStderr (Join-Path $serverDir "logs\service-err.log")
    & nssm set EventAgencyAPI AppRotateFiles 1
    & nssm set EventAgencyAPI AppRotateBytes 10485760
    & nssm set EventAgencyAPI AppEnvironmentExtra NODE_ENV=production

    Write-Info "Запускаю службу..."
    & nssm start EventAgencyAPI
    Start-Sleep -Seconds 3

    $svc = Get-Service -Name "EventAgencyAPI" -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq "Running") {
        Write-Ok "Служба EventAgencyAPI запущена"
    } else {
        Write-Warn "Служба создана, но не запустилась. Проверьте: nssm status EventAgencyAPI"
        Write-Info "Логи: $serverDir\logs\service-err.log"
    }
}

function Setup-Caddy {
    param([string]$Domain, [string]$InstallDir)
    if (-not $Domain) {
        Write-Info "Домен не указан — HTTPS не настраиваем. Доступ: http://<IP>:3100"
        return
    }
    if ($NoCaddy) {
        Write-Info "Caddy пропущен (-NoCaddy)"
        return
    }

    Write-Step "Настройка HTTPS через Caddy"
    $caddy = Get-Command caddy -ErrorAction SilentlyContinue
    if (-not $caddy) {
        Write-Info "Caddy не найден, устанавливаю через winget..."
        & winget install --id CaddyServer.Caddy --accept-package-agreements --accept-source-agreements --silent 2>&1 | Out-String | Write-Host
        Start-Sleep -Seconds 2
        $caddy = Get-Command caddy -ErrorAction SilentlyContinue
        if (-not $caddy) {
            Write-Warn "Caddy не установился. Настройте HTTPS вручную."
            return
        }
    }
    Write-Ok "Caddy: $($caddy.Source)"

    $caddyDir = Join-Path $InstallDir "caddy"
    New-Item -ItemType Directory -Path $caddyDir -Force | Out-Null
    $caddyFile = Join-Path $caddyDir "Caddyfile"

    $caddyConfig = @'
__DOMAIN__ {
    reverse_proxy localhost:3100
}
'@
    $caddyConfig = $caddyConfig -replace '__DOMAIN__', $Domain
    [System.IO.File]::WriteAllText($caddyFile, $caddyConfig, (New-Object System.Text.UTF8Encoding($false)))
    Write-Ok "Caddyfile создан: $caddyFile"

    # Служба Caddy через NSSM
    $existing = Get-Service -Name "EventAgencyCaddy" -ErrorAction SilentlyContinue
    if ($existing) {
        & nssm stop EventAgencyCaddy 2>&1 | Out-Null
        & nssm remove EventAgencyCaddy confirm 2>&1 | Out-Null
        Start-Sleep -Seconds 1
    }

    & nssm install EventAgencyCaddy $caddy.Source "run --config `"$caddyFile`""
    & nssm set EventAgencyCaddy AppDirectory $caddyDir
    & nssm set EventAgencyCaddy DisplayName "Event Agency HTTPS (Caddy)"
    & nssm set EventAgencyCaddy Start SERVICE_AUTO_START
    & nssm start EventAgencyCaddy
    Start-Sleep -Seconds 2

    $svc = Get-Service -Name "EventAgencyCaddy" -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq "Running") {
        Write-Ok "Caddy запущен. HTTPS: https://$Domain"
        Write-Info "Первый запуск: Let's Encrypt выдаст сертификат (~30 сек). Убедитесь, что DNS-запись $Domain указывает на этот сервер, а порты 80/443 открыты."
    } else {
        Write-Warn "Caddy не запустился. Проверьте: nssm status EventAgencyCaddy"
    }
}

function Install-License {
    param([string]$LicensePath, [string]$InstallDir)
    if (-not $LicensePath) {
        Write-Info "Лицензия не указана — демо-режим (14 дней)"
        return "Demo (14 дней)"
    }
    if (-not (Test-Path $LicensePath)) {
        Write-Warn "Файл лицензии не найден: $LicensePath — демо-режим"
        return "Demo (файл не найден)"
    }
    $dest = Join-Path $InstallDir "server\license.key"
    Copy-Item $LicensePath $dest -Force
    Write-Ok "Лицензия установлена: $dest"
    return "Активна"
}

function Write-InstallInfo {
    param(
        [string]$InstallDir,
        [string]$DbPassword,
        [string]$SetupToken,
        [string]$AppUrl,
        [string]$Domain,
        [string]$LicenseStatus
    )
    Write-Step "Сохранение install-info.txt"
    $template = Join-Path $InstallDir "install\install-info.template.txt"
    if (-not (Test-Path $template)) { Write-Warn "Шаблон не найден, пропускаю"; return }

    $content = Get-Content $template -Raw
    $content = $content -replace "\{\{INSTALL_DATE\}\}", (Get-Date -Format "yyyy-MM-dd HH:mm")
    $content = $content -replace "\{\{INSTALL_DIR\}\}", $InstallDir
    $content = $content -replace "\{\{PORT\}\}", "3100"
    $content = $content -replace "\{\{DOMAIN\}\}", $Domain
    $content = $content -replace "\{\{APP_URL\}\}", $AppUrl
    $content = $content -replace "\{\{DB_PASSWORD\}\}", $DbPassword
    $content = $content -replace "\{\{SETUP_TOKEN\}\}", $SetupToken
    $content = $content -replace "\{\{LICENSE_STATUS\}\}", $LicenseStatus

    $outFile = Join-Path $InstallDir "install-info.txt"
    [System.IO.File]::WriteAllText($outFile, $content, (New-Object System.Text.UTF8Encoding($false)))
    Write-Ok "Файл сохранён: $outFile"
}

# ============================================================
# ЗАПУСК
# ============================================================

Write-Banner
Assert-Admin

if (-not $SkipWinget) { Assert-Winget }

Ask-Parameters

Write-Step "Установка компонентов через winget"
if (-not $SkipWinget) {
    Install-WingetPackage -Id "OpenJS.NodeJS.LTS" -Name "Node.js LTS" -TestCommand "node"
    Install-WingetPackage -Id "PostgreSQL.PostgreSQL.16" -Name "PostgreSQL 16" -TestCommand "psql"
    Install-WingetPackage -Id "Git.Git" -Name "Git" -TestCommand "git"
    # Обновляем PATH в текущей сессии
    ${env:Path} = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Clone-Repo

if (-not (Test-Port 3100)) {
    Write-Err "Порт 3100 уже занят. Освободите его или измените PORT в .env."
    exit 1
}
Write-Ok "Порт 3100 свободен"

# Пароль БД
$dbPassword = New-RandomSecret 16
Write-Info "Сгенерирован пароль БД (сохранится в install-info.txt)"

Setup-Database -DbPassword $dbPassword
$setupToken = Write-EnvFile -DbPassword $dbPassword -Domain $Domain -InstallDir $InstallDir

Write-Step "Установка npm-зависимостей"
Push-Location $InstallDir
try {
    & npm ci 2>&1 | Out-String | Write-Host
    if ($LASTEXITCODE -ne 0) { Write-Err "npm ci failed"; exit 1 }
    Write-Ok "npm ci завершён"

    Write-Step "Применение миграций Prisma"
    Push-Location (Join-Path $InstallDir "server")
    try {
        & npx prisma migrate deploy 2>&1 | Out-String | Write-Host
        if ($LASTEXITCODE -ne 0) { Write-Err "prisma migrate failed"; exit 1 }
        Write-Ok "Миграции применены"

        if (-not $SkipSeed) {
            Write-Host ""
            $ans = Read-Host "Заполнить БД демо-данными (seed)? [y/N]"
            if ($ans -match "^[yYдД]") {
                & npm run db:seed 2>&1 | Out-String | Write-Host
                Write-Ok "Seed выполнен"
            }
        }
    } finally { Pop-Location }
} finally { Pop-Location }

Install-NssmService -InstallDir $InstallDir
Setup-Caddy -Domain $Domain -InstallDir $InstallDir
$licenseStatus = Install-License -LicensePath $LicenseKeyPath -InstallDir $InstallDir

$appUrl = if ($Domain) { "https://$Domain" } else { "http://localhost:3100" }
Write-InstallInfo -InstallDir $InstallDir -DbPassword $dbPassword -SetupToken $setupToken -AppUrl $appUrl -Domain $Domain -LicenseStatus $licenseStatus

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ✅ УСТАНОВКА ЗАВЕРШЕНА" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Админ-панель: $appUrl" -ForegroundColor Cyan
Write-Host "  Папка:        $InstallDir" -ForegroundColor Cyan
Write-Host "  Инфо:         $InstallDir\install-info.txt" -ForegroundColor Cyan
Write-Host "  Служба:       EventAgencyAPI" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Следующие шаги:" -ForegroundColor Yellow
Write-Host "  1. Откройте $appUrl в браузере" -ForegroundColor Yellow
Write-Host "  2. Пройдите первичную настройку (setup):" -ForegroundColor Yellow
Write-Host "     - токен в install-info.txt (SETUP_TOKEN)" -ForegroundColor Yellow
Write-Host '  3. Скачайте APK мобильного приложения и укажите в нём:' -ForegroundColor Yellow
Write-Host "     $appUrl" -ForegroundColor Yellow
Write-Host ""
# install-backup-scheduler.ps1 — установка задачи Windows Task Scheduler для ежедневного бэкапа
# Запускать от имени администратора!

param(
    [string]$Time = "03:00",
    [string]$TaskName = "EventAgency-DB-Backup"
)

$ErrorActionPreference = 'Stop'

function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

# Проверка прав администратора
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Err "Требуются права администратора. Запустите PowerShell от имени Администратора."
    exit 1
}

$scriptDir = $PSScriptRoot
$backupScript = Join-Path $scriptDir "backup-db.ps1"
if (-not (Test-Path $backupScript)) {
    Write-Err "backup-db.ps1 не найден: $backupScript"
    exit 1
}

Write-Info "Скрипт бэкапа: $backupScript"
Write-Info "Время запуска: ежедневно в $Time"

# Удаляем старую задачу если есть
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Info "Удаляем существующую задачу '$TaskName'..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Действие: powershell.exe с параметрами
$argument = '-NoProfile -ExecutionPolicy Bypass -File "' + $backupScript + '" -TriggeredBy scheduler'
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argument

# Триггер: ежедневно в $Time
$trigger = New-ScheduledTaskTrigger -Daily -At $Time

# Принципал: SYSTEM (не требует логина)
$taskPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Настройки: запускать если пропущено, не останавливать при переходе на батарею
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Регистрируем
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $taskPrincipal -Settings $settings -Description "Event Agency: daily database backup"

Write-Ok "Задача '$TaskName' создана. Следующий запуск: $Time (ежедневно)"
Write-Info "Проверить: Get-ScheduledTask -TaskName '$TaskName'"
Write-Info "Удалить: .\uninstall-backup-scheduler.ps1"
Write-Info "Ручной запуск: Start-ScheduledTask -TaskName '$TaskName'"
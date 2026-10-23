# backup-db.ps1 - DB backup for Event Agency

param(
    [string]$BackupDir = "",
    [int]$RetentionDays = 30,
    [string]$Label = "",
    [string]$TriggeredBy = "manual"
)

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$serverDir = Split-Path $scriptDir -Parent

function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Err "pg_dump not found in PATH"
    exit 1
}

$envFile = Join-Path $serverDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Err ".env not found: $envFile"
    exit 1
}

$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+)$') {
        $envVars[$matches[1]] = $matches[2].Trim().Trim([char]34).Trim([char]39)
    }
}

$dbUrl = $envVars["DATABASE_URL"]
if (-not $dbUrl) {
    Write-Err "DATABASE_URL not found in .env"
    exit 1
}

if (-not $BackupDir) {
    $BackupDir = $envVars["BACKUP_DIR"]
    if (-not $BackupDir) { $BackupDir = ".\backups" }
}
if (-not [System.IO.Path]::IsPathRooted($BackupDir)) {
    $BackupDir = Join-Path $serverDir $BackupDir
}
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

if ($envVars["BACKUP_RETENTION_DAYS"]) {
    $RetentionDays = [int]$envVars["BACKUP_RETENTION_DAYS"]
}

if ($dbUrl -notmatch '^postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?\s]+)') {
    Write-Err "Failed to parse DATABASE_URL"
    exit 1
}
$dbUser = $matches[1]
$dbPass = $matches[2]
$dbHost = $matches[3]
$dbPort = $matches[4]
$dbName = $matches[5]

$startTime = Get-Date
$timestamp = $startTime.ToString('yyyy-MM-dd_HH-mm-ss')
$labelSuffix = if ($Label) { "_$Label" } else { "" }
$backupFile = Join-Path $BackupDir "event_agency_${timestamp}${labelSuffix}.dump"

Write-Info "Backup DB $dbName -> $backupFile"

$env:PGPASSWORD = $dbPass
$dumpOk = $false
$dumpError = $null
try {
    $output = & pg_dump -h $dbHost -p $dbPort -U $dbUser -d $dbName -Fc -f $backupFile 2>&1
    if ($LASTEXITCODE -ne 0) {
        $dumpError = "pg_dump exit: $LASTEXITCODE | $output"
        if (Test-Path $backupFile) { Remove-Item $backupFile -ErrorAction SilentlyContinue }
    } else {
        $dumpOk = $true
    }
} catch {
    $dumpError = $_.Exception.Message
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

$endTime = Get-Date
$durationMs = [int](($endTime - $startTime).TotalMilliseconds)

$fileName = Split-Path $backupFile -Leaf
$logFile = Join-Path $scriptDir "log-backup.js"
$logId = $null
if (Test-Path $logFile) {
    Push-Location $serverDir
    try {
        if ($dumpOk -and (Test-Path $backupFile)) {
            $size = (Get-Item $backupFile).Length
            $logId = & node $logFile $fileName $backupFile $size "success" "-" $durationMs $TriggeredBy
        } else {
            & node $logFile $fileName $backupFile "0" "failed" $dumpError $durationMs $TriggeredBy | Out-Null
        }
    } finally {
        Pop-Location
    }
}

# Upload to S3 targets (если есть enabled)
if ($dumpOk -and $logId) {
    $uploadScript = Join-Path $scriptDir "upload-to-s3.ts"
    if (Test-Path $uploadScript) {
        Write-Info "Checking S3 targets..."
        Push-Location $serverDir
        try {
            $uploadOut = & npx --yes tsx $uploadScript $logId $backupFile $fileName 2>&1
            if ($uploadOut) { Write-Host ($uploadOut | Out-String) }
        } catch {
            Write-Warn "S3 upload failed: $_"
        } finally {
            Pop-Location
        }
    }
}

if (-not $dumpOk) {
    Write-Err "Backup failed: $dumpError"
    exit 1
}
if (-not (Test-Path $backupFile)) {
    Write-Err "Backup file not created"
    exit 1
}

$size = (Get-Item $backupFile).Length
$sizeMb = [math]::Round($size / 1MB, 2)
Write-Ok "Backup created: $fileName ($sizeMb MB, $durationMs ms)"

$cutoff = $startTime.AddDays(-$RetentionDays)
$oldDaily = Get-ChildItem $BackupDir -Filter "event_agency_*.dump" | Where-Object { $_.LastWriteTime -lt $cutoff -and $_.Name -notmatch "_monthly_" }
if ($oldDaily -and $oldDaily.Count -gt 0) {
    $oldDaily | Remove-Item -Force
    Write-Info "Rotation: removed $($oldDaily.Count) old backups"
}

exit 0

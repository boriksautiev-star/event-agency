# restore-db.ps1 - DB restore for Event Agency

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$BackupFile,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$serverDir = Split-Path $scriptDir -Parent

function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

if (-not (Test-Path $BackupFile)) {
    Write-Err "Backup file not found: $BackupFile"
    exit 1
}
if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
    Write-Err "pg_restore not found in PATH"
    exit 1
}

$envFile = Join-Path $serverDir ".env"
if (-not (Test-Path $envFile)) { Write-Err ".env not found"; exit 1 }

$dbUrl = $null
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*DATABASE_URL\s*=\s*(.+)$') {
        $dbUrl = $matches[1].Trim().Trim([char]34).Trim([char]39)
    }
}
if ($dbUrl -notmatch '^postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?\s]+)') {
    Write-Err "Failed to parse DATABASE_URL"
    exit 1
}
$dbUser = $matches[1]; $dbPass = $matches[2]; $dbHost = $matches[3]; $dbPort = $matches[4]; $dbName = $matches[5]

if (-not $Force) {
    Write-Host ""
    Write-Host "!!! WARNING !!!" -ForegroundColor Red
    Write-Host "You will FULLY REPLACE data in DB $dbName" -ForegroundColor Red
    Write-Host "File: $BackupFile" -ForegroundColor Yellow
    Write-Host ""
    $answer = Read-Host "Type YES to continue"
    if ($answer -ne "YES") { Write-Info "Cancelled"; exit 0 }
}

Write-Info "Creating safety backup..."
& "$scriptDir\backup-db.ps1" -Label "pre-restore" -TriggeredBy "pre-restore"
if ($LASTEXITCODE -ne 0) { Write-Err "Safety backup failed"; exit 1 }

Write-Info "Stopping API..."
& pm2 stop event-agency-api 2>&1 | Out-Null

Write-Info "Restoring DB..."
$env:PGPASSWORD = $dbPass
try {
    & pg_restore -h $dbHost -p $dbPort -U $dbUser -d $dbName --clean --if-exists --no-owner --no-acl $BackupFile 2>&1 | Write-Host
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Info "Applying prisma migrate deploy..."
Push-Location $serverDir
try { & npx prisma migrate deploy } finally { Pop-Location }

Write-Info "Starting API..."
& pm2 start event-agency-api 2>&1 | Out-Null

Write-Ok "Done. Check: curl http://localhost:3100/api/health"
exit 0

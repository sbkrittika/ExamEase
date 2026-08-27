$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$mysqlRoot = 'C:\Program Files\MySQL\MySQL Server 8.4'
$mysqld = Join-Path $mysqlRoot 'bin\mysqld.exe'
$mysql = Join-Path $mysqlRoot 'bin\mysql.exe'
$dataDir = Join-Path $projectRoot 'backend\mysql-data-local'
$databaseName = 'examease'

if (-not (Test-Path $mysqld) -or -not (Test-Path $mysql)) {
    throw "MySQL Server 8.4 was not found at $mysqlRoot. Install MySQL Server, then run this script again."
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
$dataMarker = Join-Path $dataDir 'mysql.ibd'
if (-not (Test-Path $dataMarker)) {
    Write-Host 'Initializing the local MySQL data directory...'
    & $mysqld --initialize-insecure --datadir=$dataDir --console
    if ($LASTEXITCODE -ne 0) { throw 'MySQL data directory initialization failed.' }
}

$listener = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
if (-not $listener) {
    Write-Host 'Starting MySQL on 127.0.0.1:3306...'
    $outputLog = Join-Path $dataDir 'startup.log'
    $errorLog = Join-Path $dataDir 'startup-error.log'
    $arguments = @('--datadir="' + $dataDir + '"', '--port=3306', '--bind-address=127.0.0.1', '--console')
    Start-Process -FilePath $mysqld -ArgumentList $arguments -WorkingDirectory $mysqlRoot -RedirectStandardOutput $outputLog -RedirectStandardError $errorLog
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Seconds 1
        $listener = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
        if ($listener) { $ready = $true; break }
    }
    if (-not $ready) { throw 'MySQL did not start listening on port 3306.' }
}

& $mysql --protocol=tcp --host=127.0.0.1 --port=3306 --user=root -e "CREATE DATABASE IF NOT EXISTS $databaseName CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
if ($LASTEXITCODE -ne 0) { throw 'Could not connect to local MySQL as root.' }

$tableCheck = & $mysql --protocol=tcp --host=127.0.0.1 --port=3306 --user=root --batch --skip-column-names -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$databaseName';"
if ([int]$tableCheck -eq 0) {
    Write-Host 'Importing examease.sql...'
    Get-Content (Join-Path $projectRoot 'examease.sql') -Raw | & $mysql --protocol=tcp --host=127.0.0.1 --port=3306 --user=root $databaseName
    if ($LASTEXITCODE -ne 0) { throw 'Database schema import failed.' }
}

Write-Host "Local MySQL is ready: $databaseName on 127.0.0.1:3306"
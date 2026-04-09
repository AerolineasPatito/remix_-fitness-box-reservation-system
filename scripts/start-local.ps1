param(
  [switch]$SkipBuild,
  [switch]$ServerOnlyBuild
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$pgBin = "C:\Program Files\PostgreSQL\10\bin"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$pgIsReady = Join-Path $pgBin "pg_isready.exe"
$pgData = Join-Path $root "tmp\pgdata"
$pgLog = Join-Path $root "tmp\pg-local.log"

if (-not (Test-Path $pgCtl)) {
  throw "No se encontro pg_ctl.exe en '$pgCtl'. Instala PostgreSQL 10 o ajusta la ruta en este script."
}

if (-not (Test-Path $pgIsReady)) {
  throw "No se encontro pg_isready.exe en '$pgIsReady'. Verifica la instalacion de PostgreSQL."
}

if (-not (Test-Path $pgData)) {
  throw "No existe el cluster local en '$pgData'. Inicializalo primero con initdb."
}

$env:PATH = "$pgBin;$env:PATH"
$env:PGHOST = "localhost"
$env:PGPORT = "5433"
$env:PGDATABASE = "cabreu145_focusfitness"
$env:PGUSER = "cabreu145_focusfitness_user"
$env:PGPASSWORD = "z3H11tv743BM"
$env:DB_CLIENT = "postgres"
$env:NODE_ENV = "production"

function Test-PgReady {
  & $pgIsReady -h "localhost" -p "5433" *> $null
  return ($LASTEXITCODE -eq 0)
}

Write-Host "Iniciando PostgreSQL local..."
if (-not (Test-PgReady)) {
  Write-Host "PostgreSQL no responde en puerto 5433. Intentando levantar cluster local..."
  & $pgCtl -D $pgData -l $pgLog -o "-p 5433" -w -t 30 start | Out-Null

  $ready = $false
  for ($i = 0; $i -lt 15; $i++) {
    if (Test-PgReady) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }

  if (-not $ready) {
    throw "PostgreSQL no quedo listo en localhost:5433. Revisa log: $pgLog"
  }
} else {
  Write-Host "PostgreSQL ya estaba corriendo."
}

Write-Host "Variables cargadas:"
Write-Host "PGHOST=$env:PGHOST"
Write-Host "PGPORT=$env:PGPORT"
Write-Host "PGDATABASE=$env:PGDATABASE"
Write-Host "PGUSER=$env:PGUSER"
Write-Host "DB_CLIENT=$env:DB_CLIENT"
Write-Host "NODE_ENV=$env:NODE_ENV"

Set-Location $root

if (-not $SkipBuild) {
  if ($ServerOnlyBuild) {
    Write-Host "Compilando solo servidor..."
    npm run build:server
  } else {
    Write-Host "Compilando frontend + servidor..."
    npm run build
  }
}

$existing3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing3000) {
  $ownerPid = $existing3000.OwningProcess
  $proc = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
  $name = if ($proc) { $proc.ProcessName } else { "desconocido" }
  throw "El puerto 3000 ya esta en uso por PID $ownerPid ($name). Cierra ese proceso o cambia PORT antes de iniciar."
}

Write-Host "Levantando app en http://localhost:3000 ..."
node dist/server.js

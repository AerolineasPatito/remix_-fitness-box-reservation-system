param(
  [switch]$SkipBuild,
  [switch]$ServerOnlyBuild
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$pgBin = "C:\Program Files\PostgreSQL\10\bin"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$pgData = Join-Path $root "tmp\pgdata"
$pgLog = Join-Path $root "tmp\pg-local.log"

if (-not (Test-Path $pgCtl)) {
  throw "No se encontro pg_ctl.exe en '$pgCtl'. Instala PostgreSQL 10 o ajusta la ruta en este script."
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

Write-Host "Iniciando PostgreSQL local..."
$statusCode = 0
& $pgCtl -D $pgData status *> $null
$statusCode = $LASTEXITCODE
if ($statusCode -ne 0) {
  & $pgCtl -D $pgData -l $pgLog -o "-p 5433" start | Out-Null
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

Write-Host "Levantando app en http://localhost:3000 ..."
node dist/server.js

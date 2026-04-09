# Local PostgreSQL Mirror Setup

Este proyecto ya incluye scripts para correr con PostgreSQL:

- `npm run pg:check`
- `npm run pg:init`
- `npm run pg:seed`
- `npm run pg:migrate:data`

## Opcion recomendada (espejo del servidor): Docker + PostgreSQL 10

El servidor remoto reporta PostgreSQL 10.x, asi que para un entorno local similar:

```powershell
docker run --name focusfitness-pg `
  -e POSTGRES_USER=focus_user `
  -e POSTGRES_PASSWORD=focus_pass `
  -e POSTGRES_DB=focusfitness_local `
  -p 5432:5432 `
  -d postgres:10.23
```

> Si `postgres:10.23` no esta disponible en tu Docker, usa `postgres:10`.

### Variables de entorno (PowerShell)

```powershell
$env:PGHOST = "localhost"
$env:PGPORT = "5432"
$env:PGDATABASE = "focusfitness_local"
$env:PGUSER = "focus_user"
$env:PGPASSWORD = "focus_pass"
$env:DB_CLIENT = "postgres"
```

### Inicializar esquema + seed base

```powershell
npm install
npm run pg:check
npm run pg:init
$env:ADMIN_EMAIL = "cabreudev@focusfitnessmvt.com"
$env:ADMIN_NAME = "cabreudev"
$env:ADMIN_PASSWORD_HASH = "$2b$10$AxWze8JjEIvx1ObbMB8sf.YGXH3bD0hWT6DSL/vUp9BOB7KI8Xh0u"
npm run pg:seed
```

### Levantar backend local usando PostgreSQL

```powershell
npm run build:server
node dist/server.js
```

## Cargar un backup despues (si quieres clonar datos)

Si luego exportas backup desde servidor:

```powershell
pg_restore -h localhost -p 5432 -U focus_user -d focusfitness_local --clean --if-exists path\to\backup.dump
```

Para SQL plano:

```powershell
psql -h localhost -p 5432 -U focus_user -d focusfitness_local -f path\to\backup.sql
```

## Notas importantes

- Este espejo es de configuracion/version, no de datos productivos hasta restaurar backup.
- `DB_CLIENT=postgres` asegura que `build:server` use `server-postgres.ts`.
- Si cierras Docker, vuelve a iniciar:

```powershell
docker start focusfitness-pg
```

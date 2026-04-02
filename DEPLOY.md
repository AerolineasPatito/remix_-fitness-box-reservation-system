# Deploy (React + Express)

Este proyecto ya está preparado para despliegue con Express sirviendo el `dist` de Vite.

## Reglas clave

- No subas `node_modules/` al servidor.
- Instala dependencias en servidor con `npm install`.
- No necesitas `.htaccess` porque Express maneja el enrutamiento.
- La ruta comodín `app.get('*', ...)` ya está configurada para React Router.

## Pasos en servidor

1. Subir el código fuente (sin `node_modules`).
2. Instalar dependencias:

```bash
npm install
```

3. Compilar frontend:

```bash
npm run build
```

4. Ejecutar en producción:

```bash
npm run start:prod
```

## Variables importantes

- `PORT`: puerto asignado por el proveedor (el servidor ya lo lee automáticamente).
- `NODE_ENV=production`: habilita modo producción (estáticos desde `dist`).

## Verificación rápida

- Navega directo a una ruta interna (ej. `/coach-panel`) y refresca.
- Debe cargar la app sin 404.
- Rutas `/api/*` inexistentes deben responder JSON 404 de API.


## Migracion de datos a PostgreSQL

Si necesitas mover los datos existentes de SQLite a PostgreSQL:

1. Validar conexion PostgreSQL:

```bash
PGHOST=localhost PGPORT=5432 PGDATABASE=tu_db PGUSER=tu_user PGPASSWORD=tu_password npm run pg:check
```

2. Migrar datos desde `fitness_v4.db`:

```bash
PGHOST=localhost PGPORT=5432 PGDATABASE=tu_db PGUSER=tu_user PGPASSWORD=tu_password SQLITE_PATH=fitness_v4.db npm run pg:migrate:data
```

Notas:
- El script crea esquema, limpia las tablas destino y copia datos.
- Si `SQLITE_PATH` no se envia, usa `fitness_v4.db` por defecto.

## Arranque limpio PostgreSQL (sin migrar datos antiguos)

Si decides iniciar desde base nueva:

```bash
PGHOST=localhost PGPORT=5432 PGDATABASE=tu_db PGUSER=tu_user PGPASSWORD=tu_password npm run pg:init
PGHOST=localhost PGPORT=5432 PGDATABASE=tu_db PGUSER=tu_user PGPASSWORD=tu_password ADMIN_EMAIL=tu_admin_email ADMIN_PASSWORD=tu_admin_password ADMIN_NAME=tu_admin_nombre npm run pg:seed
```

Comando combinado:

```bash
PGHOST=localhost PGPORT=5432 PGDATABASE=tu_db PGUSER=tu_user PGPASSWORD=tu_password npm run pg:reset
```

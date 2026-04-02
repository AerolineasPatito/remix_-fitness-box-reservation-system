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


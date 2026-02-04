# 🗄️ Guía de Migraciones de Base de Datos

## Desarrollo Local

### Generar una nueva migración

Cuando hagas cambios en las entidades (User, Session, Attendance):

```bash
npm run migration:generate src/migrations/NombreDeLaMigracion
```

### Ejecutar migraciones pendientes

```bash
npm run migration:run
```

### Revertir última migración

```bash
npm run migration:revert
```

## Producción (Railway)

### Opción 1: Deploy Automático (Recomendado)

Railway ejecutará las migraciones automáticamente si configuras:

1. Ve a tu proyecto en Railway
2. Settings → Deploy
3. Cambia el **Start Command** a:
   ```
   npm run deploy
   ```

Este comando ejecuta:
- `npm run build` - Compila TypeScript
- `npm run migration:run:prod` - Ejecuta migraciones
- `npm run start:prod` - Inicia el servidor

### Opción 2: Ejecutar Manualmente

Desde tu terminal local:

```bash
# Asegúrate de tener DATABASE_URL en .env
DATABASE_URL=postgresql://usuario:password@host:port/database npm run migration:run:prod
```

### Opción 3: Railway CLI

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Ejecutar migración
railway run npm run migration:run:prod
```

## Estructura de Archivos

```
src/
├── migrations/
│   └── 1738742400000-AddIdentificationToUser.ts
├── config/
│   └── data-source.ts  (configuración TypeORM)
└── entities/
    ├── user.entity.ts
    ├── session.entity.ts
    └── attendance.entity.ts
```

## Variables de Entorno Requeridas en Railway

```env
DATABASE_URL=postgresql://...
NODE_ENV=production
JWT_SECRET=tu_secreto_jwt
QR_SECRET=tu_secreto_qr
CORS_ORIGIN=https://tu-frontend.com
```

## Verificar Estado de Migraciones

En Railway, puedes ver los logs:
1. Ve a tu servicio
2. Pestaña "Deployments"
3. Click en el último deployment
4. Revisa los logs para ver si las migraciones se ejecutaron

## Solución de Problemas

### Error: "relation already exists"
La tabla ya existe. Esto es seguro si ya ejecutaste `synchronize: true` antes.

### Error: "SSL connection required"
Asegúrate que `data-source.ts` tenga `ssl: { rejectUnauthorized: false }` para producción.

### Error: "Cannot find module"
El build no incluyó las migraciones. Verifica que `tsconfig.json` incluya `"src/**/*"`.

## Mejores Prácticas

1. ✅ **Nunca uses `synchronize: true` en producción**
2. ✅ **Prueba migraciones en desarrollo antes de producción**
3. ✅ **Haz backup de la base de datos antes de migraciones grandes**
4. ✅ **Usa nombres descriptivos para las migraciones**
5. ✅ **Implementa `down()` para poder revertir cambios**

## Migración Actual: AddIdentificationToUser

Esta migración agrega el campo `identification` a la tabla `users`:

```sql
ALTER TABLE "users" ADD "identification" character varying;
ALTER TABLE "users" ADD CONSTRAINT "UQ_users_identification" UNIQUE ("identification");
```

Permite login alternativo usando solo el número de documento.

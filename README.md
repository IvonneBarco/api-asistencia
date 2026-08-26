# Emaús Mujeres - Backend API 🌸

Backend en NestJS para el sistema de asistencia con gamificación "Emaús Mujeres - Asistencia con Flores".

## 🎯 Características

- ✅ Autenticación JWT con PIN de 4 dígitos
- 🔐 Validación de QR con HMAC SHA256
- 📊 Sistema de "flores" (gamificación positiva)
- 👥 Roles: user / admin
- 🚫 Rate limiting
- 💾 PostgreSQL + TypeORM
- 🧪 Tests unitarios

## 🛠️ Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Auth**: JWT + Passport
- **Validation**: class-validator
- **QR**: qrcode + HMAC SHA256
- **Testing**: Jest

## 📁 Estructura del Proyecto

```
src/
├── auth/              # Autenticación JWT + PIN
├── admin/             # Gestión de sesiones (solo admin)
├── attendance/        # Escaneo QR y registro
├── leaderboard/       # Ranking de flores
├── entities/          # Entidades TypeORM
├── services/          # QR service
└── config/            # Configuración y DataSource
```

## 🚀 Instalación y Setup

### Prerrequisitos

- Node.js 20.11+
- PostgreSQL 14+
- npm

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env` y configura:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=emaus_asistencia

JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=7d

QR_SECRET=your-super-secret-qr-hmac-key
QR_EXPIRATION_MINUTES=60

THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

### 3. Crear base de datos

```bash
psql -U postgres
CREATE DATABASE emaus_asistencia;
\q
```

### 4. Ejecutar en desarrollo

```bash
npm run start:dev
```

La API estará en `http://localhost:3000/api`

### Fotos de perfil en Railway

Las fotos de perfil se guardan en el directorio definido por `UPLOADS_DIR`. En
desarrollo se usa `./uploads`; en Railway no debe usarse el filesystem normal
del contenedor porque se reemplaza durante los deploys.

Para conservar las fotos:

1. Crea un Volume en el servicio del backend de Railway.
2. Configura el mount path `/uploads`.
3. Define la variable `UPLOADS_DIR=/uploads` en el backend.
4. Ejecuta el siguiente deploy.

La base de datos seguirá guardando las rutas `/uploads/profile-photos/...` y la
API las servirá desde el volumen persistente. Las fotos que ya desaparecieron
en deploys anteriores no pueden recuperarse desde la base de datos; solo se
conservarán las nuevas cargas realizadas después de configurar el volumen.

## 📱 API Endpoints

### Auth

- `POST /api/auth/login` - Login con email + PIN
- `GET /api/auth/me` - Datos del usuario actual (requiere JWT)

### Attendance

- `POST /api/attendance/scan` - Escanear QR y registrar asistencia

### Leaderboard

- `GET /api/leaderboard` - Obtener jardín de flores (ranking)

### Admin (solo admin)

- `POST /api/admin/sessions` - Crear sesión + QR
- `GET /api/admin/sessions` - Listar sesiones
- `GET /api/admin/sessions/:sessionId/qr` - Obtener QR de sesión
- `PATCH /api/admin/sessions/:sessionId/deactivate` - Desactivar sesión
- `POST /api/admin/sync-users` - Sincronizar usuarios (pendiente)

## 🔐 Sistema de QR

El QR contiene un payload JSON firmado con HMAC SHA256:

```json
{
  "sid": "SESSION-2026-01-31-ABC123",
  "exp": 1706731200,
  "sig": "a8f3e2d..."
}
```

**Validaciones:**
1. ✅ Estructura válida (sid, exp, sig)
2. ✅ No vencido (`exp` > now)
3. ✅ Firma HMAC válida: `HMAC(secret, sid + "." + exp)`
4. ✅ Sesión existe y está activa

## 👤 Crear Usuario de Prueba

Para testing, puedes crear usuarios directamente en la BD:

```typescript
// En src/main.ts o crear un seed script
import * as bcrypt from 'bcrypt';

const pinHash = await bcrypt.hash('1234', 10);

// INSERT en PostgreSQL
INSERT INTO users (id, name, email, pin_hash, flowers, role)
VALUES (
  gen_random_uuid(),
  'María García',
  'maria@emaus.com',
  '{pinHash}',
  0,
  'user'
);

// Usuario admin
INSERT INTO users (id, name, email, pin_hash, flowers, role)
VALUES (
  gen_random_uuid(),
  'Admin Emaús',
  'admin@emaus.com',
  '{pinHash}',
  0,
  'admin'
);
```

O usa el método del AdminService:

```typescript
await adminService.createUser({
  name: 'María García',
  email: 'maria@emaus.com',
  pin: '1234',
  role: UserRole.USER,
});
```

## 🧪 Tests

```bash
# Tests unitarios
npm run test

# Tests con coverage
npm run test:cov

# Tests en watch mode
npm run test:watch
```

### Tests Implementados

- ✅ QR Service: generación, validación, firma HMAC
- ✅ Attendance Service: escaneo duplicado, QR vencido, firma inválida

## 📦 Scripts Disponibles

```bash
npm run start          # Producción
npm run start:dev      # Desarrollo con watch
npm run start:debug    # Debug mode
npm run build          # Build para producción
npm run lint           # ESLint
npm run format         # Prettier
npm run test           # Tests
npm run test:e2e       # Tests E2E
```

## 🗄️ Migraciones (TypeORM)

```bash
# Generar migración automática
npm run migration:generate -- src/migrations/InitialSchema

# Ejecutar migraciones
npm run migration:run

# Revertir migración
npm run migration:revert
```

**Nota:** En desarrollo, `synchronize: true` crea las tablas automáticamente.

## 🔒 Rate Limiting

Configurado globalmente con `@nestjs/throttler`:

- **TTL**: 60 segundos
- **Límite**: 10 requests por TTL

Ajusta en `.env`:

```env
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

## 🌐 CORS

CORS habilitado por defecto. Para producción, configura:

```env
CORS_ORIGIN=https://tu-frontend.com
```

## 📝 Modelo de Datos

### User
- `id` (UUID)
- `name`
- `email` (unique)
- `pinHash`
- `flowers` (int, default 0)
- `role` (enum: 'user' | 'admin')

### Session
- `id` (UUID)
- `sessionId` (unique, generado)
- `name`
- `startsAt` (timestamp)
- `endsAt` (timestamp)
- `isActive` (boolean)

### Attendance
- `id` (UUID)
- `userId` (FK User)
- `sessionId` (FK Session)
- `scannedAt` (timestamp)
- `rawQr` (text)
- Unique constraint: `(userId, sessionId)`

## 🚢 Deploy

### Build

```bash
npm run build
```

### Ejecutar en producción

```bash
npm run start:prod
```

### Docker (opcional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["npm", "run", "start:prod"]
```

## 🔧 Troubleshooting

### Error de conexión PostgreSQL

Verifica que PostgreSQL esté corriendo:

```bash
# Windows
pg_ctl status

# Linux/Mac
sudo systemctl status postgresql
```

### Error de módulos no encontrados

```bash
rm -rf node_modules package-lock.json
npm install
```

### Problemas con TypeORM

Asegúrate de que las entidades estén importadas en `app.module.ts`.

## 📚 Documentación Adicional

- [NestJS Docs](https://docs.nestjs.com/)
- [TypeORM Docs](https://typeorm.io/)
- [JWT Best Practices](https://jwt.io/introduction)

## 👥 Equipo

Emaús Mujeres - Comunidad católica femenina

---

Hecho con 🌸 para la comunidad Emaús Mujeres

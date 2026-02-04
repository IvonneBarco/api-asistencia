# 🎯 Sistema de Grupos de Trabajo - Implementación Completa

## ✅ Funcionalidad Implementada

Sistema de grupos de trabajo con reglas estrictas de negocio y auditoría completa para la aplicación Emaús Mujeres.

## 📊 Arquitectura

### Entidades Creadas

#### 1. Group (`src/entities/group.entity.ts`)
```typescript
- id: uuid (PK)
- name: string (unique)
- isActive: boolean (default true)
- createdAt, updatedAt: timestamps
- users: User[] (relación 1:N)
```

#### 2. GroupAssignmentAudit (`src/entities/group-assignment-audit.entity.ts`)
```typescript
- id: uuid (PK)
- userId: uuid (FK → users)
- previousGroupId: uuid (FK → groups, nullable)
- newGroupId: uuid (FK → groups, nullable)
- changedByUserId: uuid (FK → users)
- reason: string (nullable)
- createdAt: timestamp
```

#### 3. User (actualizado)
```typescript
+ groupId: uuid (FK → groups, nullable)
+ group: Group (relación N:1)
```

## 🔐 Endpoints Implementados

### Usuarios Autenticados

#### `GET /api/groups`
- **Auth**: JWT Required
- **Retorna**: Lista de grupos activos con conteo de miembros
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Grupo 1",
      "isActive": true,
      "createdAt": "2026-02-04T...",
      "memberCount": 15
    }
  ]
}
```

#### `POST /api/groups/join`
- **Auth**: JWT Required
- **Body**: `{ "groupId": "uuid" }`
- **Lógica**:
  - ✅ Usa transacción con `SELECT FOR UPDATE` (evita condiciones de carrera)
  - ✅ Valida que usuario NO tenga grupo asignado
  - ✅ Si ya tiene grupo → `409 Conflict`
  - ✅ Valida que grupo existe y está activo
  - ✅ Registra auditoría automática
- **Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Te has unido exitosamente a Grupo 1",
    "group": {
      "id": "uuid",
      "name": "Grupo 1"
    }
  }
}
```

#### `GET /api/groups/my-group`
- **Auth**: JWT Required
- **Retorna**: Grupo actual del usuario autenticado
```json
{
  "success": true,
  "data": {
    "hasGroup": true,
    "group": {
      "id": "uuid",
      "name": "Grupo 1",
      "isActive": true
    }
  }
}
```

### Administradores (ADMIN only)

#### `PATCH /api/admin/users/:userId/group`
- **Auth**: JWT + Role ADMIN
- **Body**: `{ "groupId": "uuid", "reason": "opcional" }`
- **Lógica**:
  - ✅ SOLO admins pueden usar este endpoint
  - ✅ Permite cambiar grupo aunque usuario ya tenga uno
  - ✅ Registra auditoría con razón del cambio
- **Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Grupo actualizado exitosamente para María García",
    "user": { "id": "uuid", "name": "María García", "email": "..." },
    "group": { "id": "uuid", "name": "Grupo 2" },
    "previousGroupId": "uuid-anterior"
  },
  "message": "Grupo asignado exitosamente"
}
```

#### `GET /api/admin/users/:userId/group-history`
- **Auth**: JWT + Role ADMIN
- **Retorna**: Historial completo de cambios de grupo
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "previousGroup": { "id": "uuid", "name": "Grupo 1" },
      "newGroup": { "id": "uuid", "name": "Grupo 2" },
      "changedBy": {
        "id": "uuid",
        "name": "Admin Emaús",
        "email": "admin@emaus.com"
      },
      "reason": "Usuario solicitó cambio",
      "createdAt": "2026-02-04T..."
    }
  ]
}
```

## 🔒 Reglas de Negocio Implementadas

### ✅ Validaciones de Seguridad

1. **Un usuario → Un grupo**: Usuario solo puede pertenecer a un grupo
2. **Una sola elección**: Usuario puede elegir su grupo SOLO UNA VEZ
3. **Inmutabilidad para usuarios**: Si usuario ya tiene grupo, no puede cambiarlo
4. **409 Conflict**: Respuesta HTTP correcta cuando usuario intenta re-asignarse
5. **Solo admin puede reasignar**: Única excepción a la regla de inmutabilidad

### ✅ Protección contra Concurrencia

```typescript
// En joinGroup(): SELECT FOR UPDATE
const user = await manager
  .createQueryBuilder(User, 'user')
  .setLock('pessimistic_write') // 🔒 Bloqueo pessimista
  .where('user.id = :userId', { userId })
  .getOne();
```

- ✅ Evita doble-click / doble-request
- ✅ Previene condiciones de carrera
- ✅ Garantiza atomicidad con transacciones

### ✅ Auditoría Completa

Cada cambio de grupo registra:
- Usuario afectado
- Grupo anterior (null si es primera asignación)
- Grupo nuevo
- Quién realizó el cambio (el mismo usuario o un admin)
- Razón del cambio (opcional)
- Timestamp exacto

## 📦 Módulos y Estructura

```
src/
├── entities/
│   ├── group.entity.ts               ✅ NEW
│   ├── group-assignment-audit.entity.ts ✅ NEW
│   ├── user.entity.ts                ✅ UPDATED (+ groupId, group)
│   └── index.ts                      ✅ UPDATED
├── groups/
│   ├── dto/
│   │   └── groups.dto.ts             ✅ NEW (JoinGroupDto, AssignGroupDto)
│   ├── groups.controller.ts          ✅ NEW
│   ├── groups.service.ts             ✅ NEW
│   └── groups.module.ts              ✅ NEW
├── admin/
│   ├── admin.controller.ts           ✅ UPDATED (+ 2 endpoints)
│   ├── admin.module.ts               ✅ UPDATED (imports GroupsModule)
│   └── dto/admin.dto.ts              ✅ UPDATED (+ AssignGroupDto)
├── database/
│   └── seed.ts                       ✅ UPDATED (crea Grupo 1, 2, 3)
├── migrations/
│   └── 1738742500000-AddGroupsToUsers.ts ✅ NEW
└── app.module.ts                     ✅ UPDATED (imports GroupsModule)
```

## 🗄️ Migración de Base de Datos

### Archivo: `src/migrations/1738742500000-AddGroupsToUsers.ts`

**Crea:**
1. Tabla `groups` (id, name, is_active, timestamps)
2. Tabla `group_assignment_audits` (con todas las FK necesarias)
3. Columna `group_id` en tabla `users`
4. Foreign keys con `ON DELETE` apropiados
5. **3 grupos predeterminados**: Grupo 1, Grupo 2, Grupo 3

**Ejecutar:**
```bash
# Desarrollo (con synchronize: true)
npm run start:dev  # TypeORM crea automáticamente

# Producción
npm run deploy     # Ejecuta migración + inicia servidor
```

## 📮 Postman Collection

Agregada carpeta **"Groups"** con 5 requests:
1. Get All Groups
2. Join Group
3. Get My Group
4. Assign Group (Admin)
5. Get User Group History (Admin)

Variables añadidas:
- `{{user_id}}`: Para endpoints admin
- `{{group_id}}`: Para join/assign

## 🧪 Testing Manual

### 1. Crear grupos (automático con seed)
```bash
npm run seed
```

### 2. Login como usuario
```bash
POST /api/auth/login-identification
{ "identification": "12345678" }
```

### 3. Ver grupos disponibles
```bash
GET /api/groups
Authorization: Bearer {token}
```

### 4. Unirse a un grupo (primera vez)
```bash
POST /api/groups/join
Authorization: Bearer {token}
{ "groupId": "uuid-del-grupo" }
```

### 5. Intentar cambiar grupo (debe fallar)
```bash
POST /api/groups/join
Authorization: Bearer {token}
{ "groupId": "otro-uuid" }

# Respuesta esperada: 409 Conflict
```

### 6. Admin cambia grupo de usuario
```bash
# Login como admin
POST /api/auth/login
{ "email": "admin@emaus.com", "pin": "1234" }

# Cambiar grupo
PATCH /api/admin/users/{userId}/group
Authorization: Bearer {admin-token}
{
  "groupId": "nuevo-grupo-uuid",
  "reason": "Usuario solicitó cambio por reorganización"
}
```

### 7. Ver historial de cambios
```bash
GET /api/admin/users/{userId}/group-history
Authorization: Bearer {admin-token}
```

## ⚠️ Errores y Respuestas

| Código | Escenario | Mensaje |
|--------|-----------|---------|
| 200 | Operación exitosa | - |
| 400 | Grupo no existe o inactivo | "El grupo no existe o no está disponible" |
| 401 | Sin autenticación | "Unauthorized" |
| 403 | Usuario no es admin | "Forbidden resource" |
| 404 | Usuario no encontrado | "Usuario no encontrado" |
| 409 | Usuario ya tiene grupo | "Ya perteneces a un grupo. No puedes cambiarlo..." |

## 🚀 Deploy a Producción

1. **Commit y push** de todos los archivos
2. **Railway ejecutará automáticamente**:
   ```bash
   npm run deploy
   # ↓ ejecuta:
   # - npm run build
   # - npm run migration:run:prod
   # - npm run start:prod
   ```
3. La migración creará automáticamente los 3 grupos iniciales

## 📋 Checklist de Implementación

- [x] Entidad Group con validaciones
- [x] Entidad GroupAssignmentAudit con todas las relaciones
- [x] Relación User ↔ Group
- [x] DTOs con class-validator
- [x] GroupsService con lógica de negocio completa
- [x] Transacciones con SELECT FOR UPDATE
- [x] GroupsController con guards JWT
- [x] AdminController con RolesGuard
- [x] Migración con rollback
- [x] Seed con grupos predeterminados
- [x] Postman collection actualizada
- [x] Exportar entidades en index.ts
- [x] Registrar módulos en AppModule
- [x] Compilación sin errores
- [x] Validación de concurrencia
- [x] Auditoría completa

## 🎓 Características de Producción

✅ **Código limpio y tipado**
✅ **Manejo de errores consistente**
✅ **Validaciones con class-validator**
✅ **Transacciones ACID**
✅ **Protección contra race conditions**
✅ **Auditoría completa de cambios**
✅ **Separación de responsabilidades**
✅ **Guards de autenticación y autorización**
✅ **Mensajes de error claros**
✅ **Respuestas HTTP semánticas**

---

**Estado**: ✅ **LISTO PARA PRODUCCIÓN**

# 👥 Sistema de Usuarios - Cambios Importantes

## Actualización: Identificación como Campo Principal

### ⚠️ BREAKING CHANGES

A partir de esta versión, el sistema de usuarios ha cambiado:

**Antes:**
- ✅ `email` (obligatorio)
- ✅ `pin` (obligatorio)
- ❌ `identification` (no existía)

**Ahora:**
- ✅ `identification` (obligatorio)
- ⚪ `email` (opcional)
- ⚪ `pin` (opcional)

## 🔐 Métodos de Autenticación

El sistema ahora soporta **tres métodos** de autenticación:

### 1. Login con Email + PIN
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "maria@emaus.com",
  "pin": "1234"
}
```

**Requiere:** Usuario con `email` y `pinHash` configurados.

### 2. Login Solo con Identificación
```http
POST /api/auth/login-identification
Content-Type: application/json

{
  "identification": "12345678"
}
```

**Requiere:** Solo el número de identificación. No valida PIN.

### 3. Token JWT (después del login)
```http
GET /api/auth/me
Authorization: Bearer {token}
```

## 📝 Creación de Usuarios

### Endpoint: POST /api/admin/users/bulk

**Formato JSON:**
```json
{
  "users": [
    {
      "name": "María García",
      "identification": "12345678",
      "email": "maria@emaus.com",
      "pin": "1234",
      "role": "user"
    },
    {
      "name": "Pedro Sin Email",
      "identification": "11111111",
      "role": "user"
    },
    {
      "name": "Ana Sin PIN",
      "identification": "22222222",
      "email": "ana@emaus.com",
      "role": "user"
    }
  ]
}
```

### Endpoint: POST /api/admin/users/csv

**Formato CSV:**
```csv
name,identification,email,pin,role
María García,12345678,maria@emaus.com,1234,user
Pedro Sánchez,11111111,,,user
Ana Martínez,22222222,ana@emaus.com,,user
```

**Columnas:**
1. `name` - Obligatorio
2. `identification` - Obligatorio (único)
3. `email` - Opcional (único si se proporciona)
4. `pin` - Opcional
5. `role` - Opcional (default: "user")

## 🔄 Migración de Datos

Si ya tienes usuarios en producción, ejecuta la migración:

```bash
# En Railway (automático)
npm run deploy

# O manualmente
npm run migration:run:prod
```

La migración hará:
1. ✅ Agregar columna `identification` (única)
2. ✅ Hacer `email` opcional (nullable)
3. ✅ Hacer `pin_hash` opcional (nullable)

## ⚠️ Consideraciones

### Usuarios Existentes
Los usuarios existentes **sin identification** no podrán usar el login por identificación hasta que se les asigne un número.

### Recomendaciones
- 🔒 Para usuarios administradores: usar email + PIN
- 📱 Para usuarios en PWA: usar solo identificación
- ✅ Mantener ambos métodos activos para flexibilidad

## 🧪 Testing

### Usuarios de Prueba
```json
// Usuario completo (email + PIN + identification)
{
  "name": "María García",
  "identification": "12345678",
  "email": "maria@emaus.com",
  "pin": "1234"
}

// Usuario solo con identificación
{
  "name": "Pedro Sánchez",
  "identification": "11111111"
}
```

### Login por Identificación
```bash
curl -X POST http://localhost:3000/api/auth/login-identification \
  -H "Content-Type: application/json" \
  -d '{"identification": "12345678"}'
```

### Login por Email
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "maria@emaus.com", "pin": "1234"}'
```

## 📚 Recursos

- [usuarios_ejemplo.csv](usuarios_ejemplo.csv) - Plantilla CSV de ejemplo
- [Emaus_Asistencia_API.postman_collection.json](Emaus_Asistencia_API.postman_collection.json) - Colección Postman actualizada
- [MIGRATIONS_GUIDE.md](MIGRATIONS_GUIDE.md) - Guía de migraciones

## 🆘 Solución de Problemas

### Error: "Usuario ya existe con esa identificación"
La identification debe ser única. Verifica que no haya duplicados en tu CSV/JSON.

### Error: "Credenciales inválidas" en login con email
El usuario debe tener `pinHash` configurado. Si importaste sin PIN, usa login por identificación.

### Error: "Número de identificación no encontrado"
Verifica que el número exacto existe en la base de datos (distingue mayúsculas/minúsculas).

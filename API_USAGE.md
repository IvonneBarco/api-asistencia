# API Usage Examples - Emaús Mujeres

Ejemplos de uso de la API con curl y respuestas esperadas.

## Setup Inicial

```bash
# 1. Copiar .env.example a .env y configurar
cp .env.example .env

# 2. Crear base de datos
createdb emaus_asistencia

# 3. Ejecutar seed para datos de prueba
npm run seed

# 4. Iniciar servidor
npm run start:dev
```

Base URL: `http://localhost:3000/api`

---

## Auth Endpoints

### 1. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@emaus.com",
    "pin": "1234"
  }'
```

**Response:**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-here",
      "email": "maria@emaus.com",
      "name": "María García",
      "flowers": 45
    }
  }
}
```

### 2. Get Current User (Me)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "data": {
    "id": "uuid-here",
    "email": "maria@emaus.com",
    "name": "María García",
    "flowers": 45
  }
}
```

---

## Attendance Endpoints

### Scan QR Code

```bash
curl -X POST http://localhost:3000/api/attendance/scan \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "qrCode": "{\"sid\":\"SESSION-2026-01-31-ABC123\",\"exp\":1706731200,\"sig\":\"a8f3e2d...\"}"
  }'
```

**Response (Primera vez):**
```json
{
  "data": {
    "success": true,
    "message": "Asistencia registrada. +1 flor 🌸",
    "flores": 1,
    "session": {
      "id": "SESSION-2026-01-31-ABC123",
      "name": "Encuentro Semanal",
      "date": "2026-01-31T19:00:00.000Z"
    }
  }
}
```

**Response (Duplicado):**
```json
{
  "data": {
    "success": false,
    "message": "Esta sesión ya fue registrada"
  }
}
```

**Error (QR vencido):**
```json
{
  "statusCode": 400,
  "message": "Código QR vencido",
  "error": "Bad Request"
}
```

**Error (Firma inválida):**
```json
{
  "statusCode": 400,
  "message": "Código QR inválido",
  "error": "Bad Request"
}
```

---

## Leaderboard Endpoint

### Get Leaderboard (Jardín de Emaús)

```bash
curl -X GET http://localhost:3000/api/leaderboard \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "data": {
    "entries": [
      {
        "rank": 1,
        "user": {
          "id": "uuid-1",
          "name": "Ana Martínez"
        },
        "flores": 120,
        "isCurrentUser": false
      },
      {
        "rank": 2,
        "user": {
          "id": "uuid-2",
          "name": "Isabel Rodríguez"
        },
        "flores": 95,
        "isCurrentUser": false
      },
      {
        "rank": 3,
        "user": {
          "id": "uuid-3",
          "name": "María García"
        },
        "flores": 45,
        "isCurrentUser": true
      }
    ],
    "currentUser": {
      "rank": 3,
      "user": {
        "id": "uuid-3",
        "name": "María García"
      },
      "flores": 45,
      "isCurrentUser": true
    }
  }
}
```

---

## Admin Endpoints

**Nota:** Requiere rol `admin`. Login con:
- Email: `admin@emaus.com`
- PIN: `1234`

### 1. Create Session

```bash
curl -X POST http://localhost:3000/api/admin/sessions \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Encuentro Mensual Febrero",
    "startsAt": "2026-02-15T18:00:00Z",
    "endsAt": "2026-02-15T20:00:00Z"
  }'
```

**Response:**
```json
{
  "data": {
    "id": "uuid-here",
    "sessionId": "SESSION-2026-02-15-A3F8B2C1",
    "name": "Encuentro Mensual Febrero",
    "startsAt": "2026-02-15T18:00:00.000Z",
    "endsAt": "2026-02-15T20:00:00.000Z",
    "isActive": true,
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "message": "Sesión creada correctamente"
}
```

### 2. Get All Sessions

```bash
curl -X GET http://localhost:3000/api/admin/sessions \
  -H "Authorization: Bearer {admin-token}"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid-1",
      "sessionId": "SESSION-2026-02-15-A3F8B2C1",
      "name": "Encuentro Mensual Febrero",
      "startsAt": "2026-02-15T18:00:00.000Z",
      "endsAt": "2026-02-15T20:00:00.000Z",
      "isActive": true,
      "createdAt": "2026-01-31T10:00:00.000Z"
    }
  ]
}
```

### 3. Get Session QR

```bash
curl -X GET http://localhost:3000/api/admin/sessions/SESSION-2026-02-15-A3F8B2C1/qr \
  -H "Authorization: Bearer {admin-token}"
```

**Response:**
```json
{
  "data": {
    "sessionId": "SESSION-2026-02-15-A3F8B2C1",
    "name": "Encuentro Mensual Febrero",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

### 4. Deactivate Session

```bash
curl -X PATCH http://localhost:3000/api/admin/sessions/SESSION-2026-02-15-A3F8B2C1/deactivate \
  -H "Authorization: Bearer {admin-token}"
```

**Response:**
```json
{
  "message": "Sesión desactivada correctamente",
  "sessionId": "SESSION-2026-02-15-A3F8B2C1"
}
```

### 5. Sync Users (Pendiente)

```bash
curl -X POST http://localhost:3000/api/admin/sync-users \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheetId": "1234567890abcdef"
  }'
```

**Response:**
```json
{
  "statusCode": 400,
  "message": "La sincronización con Google Sheets aún no está implementada",
  "error": "Bad Request"
}
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden (No admin)

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": ["El PIN debe tener 4 dígitos"],
  "error": "Bad Request"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Sesión no encontrada",
  "error": "Not Found"
}
```

### 429 Too Many Requests (Rate Limit)

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## QR Payload Structure

El QR contiene un JSON con:

```json
{
  "sid": "SESSION-2026-01-31-ABC123",  // Session ID
  "exp": 1706731200,                    // Expiration timestamp (Unix)
  "sig": "a8f3e2d..."                   // HMAC SHA256 signature
}
```

**Firma HMAC:**
```
sig = HMAC-SHA256(QR_SECRET, sid + "." + exp)
```

---

## Testing Flow

### 1. Login as User

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@emaus.com","pin":"1234"}' | jq -r '.data.token')

echo $TOKEN
```

### 2. Login as Admin

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@emaus.com","pin":"1234"}' | jq -r '.data.token')

echo $ADMIN_TOKEN
```

### 3. Create Session (Admin)

```bash
curl -X POST http://localhost:3000/api/admin/sessions \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Session",
    "startsAt": "2026-02-01T10:00:00Z",
    "endsAt": "2026-02-01T12:00:00Z"
  }' | jq
```

### 4. Get QR and Scan (User)

```bash
# Obtener QR
QR_DATA=$(curl -s -X GET http://localhost:3000/api/admin/sessions/SESSION-2026-02-01-XXXXX/qr \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.qrCode')

# Escanear (simular)
# Nota: En producción, el frontend genera el payload del QR
curl -X POST http://localhost:3000/api/attendance/scan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qrCode":"..."}' | jq
```

### 5. Check Leaderboard

```bash
curl -X GET http://localhost:3000/api/leaderboard \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Postman Collection

Importa esta colección en Postman para testing rápido:

```json
{
  "info": {
    "name": "Emaús Mujeres API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"maria@emaus.com\",\n  \"pin\": \"1234\"\n}"
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api"
    }
  ]
}
```

---

Hecho con 🌸 para Emaús Mujeres

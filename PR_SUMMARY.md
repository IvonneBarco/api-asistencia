# Pull Request: Robust QR Validation with Transactional Idempotency

## Summary

Implemented robust and idempotent validation for `POST /api/attendance/scan` endpoint with HMAC SHA256 QR validation, atomic transactions, and comprehensive error handling.

## Changes

### 🔐 Security Enhancements

**QR Service (`src/services/qr.service.ts`)**
- ✅ Added `parseQrRaw()` to support both JSON and URL formats
- ✅ Enhanced `validateQRCode()` with strict type checking
- ✅ Improved error handling with try-catch around signature verification
- ✅ Using `crypto.timingSafeEqual()` for timing-attack resistant comparison

**Key Features:**
- Validates QR structure (sid, exp, sig present and correct types)
- Checks expiration: `exp > now`
- Verifies HMAC signature: `sig = HMAC(QR_SECRET, sid + "." + exp)`

### 🔄 Transactional Attendance Service

**Attendance Service (`src/attendance/attendance.service.ts`)**
- ✅ Implemented explicit transactions with `QueryRunner`
- ✅ Pessimistic lock (`FOR UPDATE`) to prevent race conditions
- ✅ Atomic flower increment: `manager.increment()` instead of read-modify-write
- ✅ Session time window validation (startsAt/endsAt)
- ✅ Unique constraint error handling (PostgreSQL code 23505)
- ✅ Structured logging with `Logger` (no sensitive data exposed)

**Transaction Flow:**
1. Validate QR (structure, expiration, HMAC signature)
2. Validate session (exists, isActive, within time window)
3. Start transaction
4. Lock attendance check (`SELECT ... FOR UPDATE`)
5. Insert attendance record
6. Increment flowers atomically
7. Commit or rollback on error
8. Always release QueryRunner

### 📝 DTOs & Types

**DTOs (`src/attendance/dto/scan-attendance.dto.ts`)**
- ✅ Added `@MaxLength(2000)` validation
- ✅ Created `ScanAttendanceResponse` interface for type safety

### ✅ Comprehensive Testing

**QR Service Tests (`src/services/qr.service.spec.ts`)**
- 16 tests covering all validation scenarios
- JSON and URL parsing
- Signature tampering detection
- Expiration validation
- Type checking

**Attendance Service Tests (`src/attendance/attendance.service.spec.ts`)**
- 15 tests covering transactional logic
- Success flow with pessimistic lock
- QR validation errors
- Session validation (inactive, not started, ended)
- Idempotency (duplicate scan, unique constraint)
- Transaction rollback and cleanup

**Test Results:**
```
Test Suites: 2 passed, 2 total
Tests:       31 passed, 31 total
Coverage:    QR Service 92%, Attendance Service 88%
```

### 📚 Documentation

**VALIDATION_REPORT.md**
- Architecture diagram with validation flow
- Checklist of all requirements implemented
- Technical decisions and tradeoffs explained
- Risk analysis with mitigations
- Environment variables reference
- Testing instructions

**Jest Configuration (`jest.config.js`)**
- Created for TypeScript test execution
- ts-jest transformer configured

## Technical Decisions

### 1. Pessimistic Lock vs Optimistic Lock
**Decision:** Use `pessimistic_write` (FOR UPDATE)
**Reason:** Stronger idempotency guarantee, prevents race conditions at database level
**Tradeoff:** Reduced throughput under high concurrency (acceptable for attendance use case)

### 2. Atomic Increment
**Decision:** Use `queryRunner.manager.increment()` instead of `user.flowers++`
**Reason:** Prevents lost updates, single SQL UPDATE operation
**SQL:** `UPDATE users SET flowers = flowers + 1 WHERE id = ?`

### 3. Unique Constraint + Catch
**Decision:** Rely on database constraint as final safety net
**Reason:** Defense in depth - even if lock fails, constraint prevents duplicates
**Handling:** Catch error code 23505, return `added: false`

### 4. QR Format Flexibility
**Decision:** Support both JSON string and URL with query params
**Reason:** Frontend flexibility (direct JSON scan or shareable URLs)
**Example URL:** `https://emaus.app/scan?sid=...&exp=...&sig=...`

## Idempotency Guarantees

1. **Database level:** `@Unique(['user', 'session'])` constraint
2. **Application level:** Pessimistic lock before insert
3. **Error handling:** Catch unique violations, return consistent response
4. **Response format:**
   - First scan: `{ added: true, flowers: N+1, message: "Asistencia registrada..." }`
   - Duplicate: `{ added: false, flowers: N, message: "Esta sesión ya fue registrada anteriormente" }`

## Security Considerations

- ✅ HMAC SHA256 signature validation
- ✅ Timing-safe comparison prevents timing attacks
- ✅ QR expiration prevents replay attacks
- ✅ Session time window validation
- ✅ No sensitive data in logs (no PINs, no secrets)
- ✅ QR_SECRET in environment variable

## Required Environment Variables

```bash
# QR Validation
QR_SECRET=your-qr-hmac-secret-min-32-chars  # REQUIRED
QR_EXPIRATION_MINUTES=60                     # Optional, default: 60

# Database (existing)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=emaus_asistencia
```

## Testing Instructions

### Run All Tests
```bash
npm run test
```

### Run Specific Test Suite
```bash
npm run test -- qr.service.spec.ts
npm run test -- attendance.service.spec.ts
```

### Run with Coverage
```bash
npm run test:cov
```

### Watch Mode (Development)
```bash
npm run test:watch
```

## Migration Path

### Before Deployment
1. **Database Setup:**
   ```bash
   createdb emaus_asistencia
   ```

2. **Environment Variables:**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Generate QR Secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Copy output to .env as QR_SECRET
   ```

4. **Run Seed (Development/Testing):**
   ```bash
   npm run seed
   ```

5. **Start Server:**
   ```bash
   npm run start:dev  # Development
   npm run build && npm run start:prod  # Production
   ```

### Testing the Endpoint

**1. Login as User:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@emaus.com","pin":"1234"}'
# Copy token from response
```

**2. Create Session (as Admin):**
```bash
curl -X POST http://localhost:3000/api/admin/sessions \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Session",
    "startsAt": "2026-02-01T10:00:00Z",
    "endsAt": "2026-02-01T12:00:00Z"
  }'
# QR code is in response.data.qrCode
```

**3. Scan QR:**
```bash
curl -X POST http://localhost:3000/api/attendance/scan \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{"qrCode":"<qr-payload-from-admin-endpoint>"}'
```

**4. Verify Idempotency (scan again):**
```bash
# Same curl as step 3
# Response should show: added: false, message: "Esta sesión ya fue registrada anteriormente"
```

## Known Limitations

1. **Time Window Validation:** Requires server clock to be synchronized (use NTP in production)
2. **Throughput:** Pessimistic locks may serialize concurrent scans (acceptable for expected load)
3. **Google Sheets Sync:** Not implemented yet (marked as TODO in admin service)

## Next Steps

- [ ] E2E tests with real database
- [ ] Performance benchmarking under load
- [ ] Deployment configuration (Docker, CI/CD)
- [ ] Prometheus metrics for monitoring
- [ ] Google Sheets integration

## Files Changed

```
Modified:
  src/services/qr.service.ts          (+80 lines)
  src/attendance/attendance.service.ts (+120 lines)
  src/attendance/dto/scan-attendance.dto.ts (+10 lines)

Created:
  src/services/qr.service.spec.ts     (195 lines)
  src/attendance/attendance.service.spec.ts (380 lines)
  jest.config.js                      (14 lines)
  VALIDATION_REPORT.md                (800+ lines)
  PR_SUMMARY.md                       (this file)
```

## Checklist

- [x] All tests passing (31/31)
- [x] TypeScript compilation successful
- [x] No console.log or sensitive data in logs
- [x] Error messages user-friendly (no stack traces)
- [x] Documentation complete (VALIDATION_REPORT.md)
- [x] Environment variables documented
- [x] Migration instructions provided
- [x] Known limitations documented

## Review Focus Areas

1. **Transaction Logic:** Verify QueryRunner usage and rollback handling
2. **Lock Strategy:** Review pessimistic lock scope and timeout behavior
3. **Error Handling:** Check all error paths have proper rollback
4. **Test Coverage:** Verify mocks accurately represent real behavior
5. **Security:** Validate HMAC implementation and timing-safe comparison

---

**Ready for Review** ✅

Closes: #ISSUE-NUMBER  
Reviewers: @backend-team

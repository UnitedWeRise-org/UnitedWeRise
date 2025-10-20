# Critical Security Fixes - Tracking

## Issue #1: Token Blacklist ID Generation Mismatch ✅

**Status:** COMPLETED
**Priority:** P0 CRITICAL
**Security Impact:** HIGH

### Problem:
- `backend/src/routes/auth.ts:653` generated token ID: `${decoded.userId}_${token.slice(-10)}`
- `backend/src/middleware/auth.ts:62` expected: SHA-256 hash of full token
- Mismatch caused logout to fail; stolen tokens were NOT revoked

### Solution:
- Standardized on SHA-256 hash method across both files
- Used: `crypto.createHash('sha256').update(token).digest('hex')`

### Files Modified:
- [x] `backend/src/routes/auth.ts` (logout function, lines 654-656)
- [x] Verified `backend/src/middleware/auth.ts` (already correct at line 62)

### Implementation Details:
- Updated logout function to use SHA-256 hash instead of userId + token suffix
- Added security comment explaining the fix and matching with authMiddleware
- Verified crypto module already imported (line 16)
- Both files now use identical token ID generation

### Testing Checklist:
- [ ] User can logout successfully
- [ ] Logged-out token is blacklisted
- [ ] Blacklisted token cannot be reused
- [ ] Token refresh still works

**Completed by:** Agent 1
**Completion Time:** 2025-10-16

---

## Issue #2: CSRF Protection Not Applied ✅

**Status:** COMPLETED
**Priority:** P0 CRITICAL
**Security Impact:** HIGH

### Problem:
- `verifyCsrf` middleware defined but never applied
- All POST/PUT/DELETE endpoints vulnerable to CSRF attacks

### Solution:
Add to `backend/src/server.ts` after cookie parser:
```typescript
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    return verifyCsrf(req, res, next);
  }
  next();
});
```

### Files Modified:
- [x] `backend/src/server.ts` (added CSRF middleware at lines 278-289)

### Implementation Details:
- Added import: `import { verifyCsrf } from './middleware/csrf';` (line 55)
- Applied middleware after cookieParser() and before routes
- Exempts GET and OPTIONS methods (read-only, CORS preflight)
- Applies verifyCsrf() to all POST, PUT, DELETE, PATCH requests

### Testing Checklist:
- [ ] GET requests work without CSRF token
- [ ] POST requests require CSRF token
- [ ] PUT requests require CSRF token
- [ ] DELETE requests require CSRF token
- [ ] Missing CSRF token returns 403
- [ ] Invalid CSRF token returns 403

**Completed by:** Agent 2
**Completion Time:** 2025-10-16

---

## Issue #3: Gallery Routes Missing Error Handling ✅

**Status:** COMPLETED
**Priority:** P0 CRITICAL
**Security Impact:** MEDIUM (Stability HIGH)

### Problem:
- All 4 endpoints in `galleries.ts` lack try-catch blocks
- Database errors crash the server

### Solution:
Add try-catch to all endpoints following `posts.ts` pattern:
```typescript
try {
  // existing logic
} catch (error) {
  console.error('error:', error);
  res.status(500).json({ success: false, error: 'Failed to...' });
}
```

### Files Modified:
- [x] `backend/src/routes/galleries.ts` (all 4 endpoints)

### Endpoints Fixed:
- [x] `GET /api/photos/galleries`
- [x] `PUT /api/photos/:photoId/gallery`
- [x] `DELETE /api/photos/:photoId`
- [x] `POST /api/photos/:photoId/set-profile`

### Testing Checklist:
- [ ] Valid requests work correctly
- [ ] Invalid photoId returns 404/error (not crash)
- [ ] Database errors return 500 (not crash)
- [ ] Unauthorized access returns proper error

**Completed by:** Agent 3
**Completion Time:** 2025-10-16

---

## Issue #4: Metrics Endpoint Publicly Accessible ✅

**Status:** COMPLETED
**Priority:** P0 CRITICAL
**Security Impact:** MEDIUM

### Problem:
- `/metrics`, `/api/metrics`, and `/api/security-metrics` endpoints exposed Prometheus/system metrics publicly
- System performance data visible to anyone (active users, DB stats, auth failures, etc.)

### Solution:
Add authentication middleware chain (requireAuth + requireAdmin):
```typescript
import { requireAuth, requireAdmin } from './middleware/auth';
app.get('/metrics', requireAuth, requireAdmin, (req, res) => { ... });
app.get('/api/metrics', requireAuth, requireAdmin, (req, res) => { ... });
app.get('/api/security-metrics', requireAuth, requireAdmin, (req, res) => { ... });
```

### Files Modified:
- [x] `backend/src/server.ts` (lines 56, 385, 391, 396)

### Implementation Details:
- Added import: `import { requireAuth, requireAdmin } from './middleware/auth';` (line 56)
- Protected 3 endpoints with requireAuth + requireAdmin middleware:
  - Line 385: `GET /metrics` (Prometheus text format)
  - Line 391: `GET /api/metrics` (JSON format)
  - Line 396: `GET /api/security-metrics` (security-focused subset)
- requireAuth: Validates JWT token from cookie/header
- requireAdmin: Checks `req.user.isAdmin === true` AND TOTP verification

### Testing Checklist:
- [ ] Anonymous users get 401 Unauthorized
- [ ] Authenticated non-admin users get 403 Forbidden
- [ ] Admin users with TOTP can access metrics
- [ ] Metrics data still accurate

**Completed by:** Agent 4
**Completion Time:** 2025-10-16

---

## Commit Message (After All 4 Fixed):

```
fix(security): Resolve 4 critical security vulnerabilities

- Fix token blacklist ID generation mismatch (logout now works)
- Apply CSRF protection to all state-changing endpoints
- Add error handling to all gallery route endpoints
- Protect metrics endpoints with admin authentication

BREAKING CHANGE: POST/PUT/DELETE requests now require CSRF tokens

Resolves: Audit findings #1, #2, #3, #4
See: docs/AUDIT-2025-10-16.md
```

---

**Last Updated:** 2025-10-16
**Next Phase:** HIGH Priority Fixes (Phase 3)

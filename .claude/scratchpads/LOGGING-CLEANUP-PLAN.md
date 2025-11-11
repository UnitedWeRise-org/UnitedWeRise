# Production Logging Cleanup Plan
**Date:** 2025-11-10
**Priority:** P0 Critical
**Effort:** 3-4 hours

---

## Cleanup Strategy

### Principles
1. **Keep:** Error logs, security events, business-critical events
2. **Gate with `enableRequestLogging()`:** Debug logs, verbose diagnostics
3. **Remove:** Emoji-heavy logs, redundant request logging
4. **Replace with `adminDebugLog()`:** Admin-specific debugging (where appropriate)

### Priority Order (Highest Impact First)
1. ✅ server.ts - FAILSAFE and incoming request middleware
2. ✅ auth.ts - Authentication middleware verbose logging
3. ✅ csrf.ts - CSRF validation logging
4. ✅ WebSocketService.ts - Connection logging
5. ⏳ Other route files - As needed

---

## File-by-File Cleanup Plan

### 1. server.ts (HIGHEST PRIORITY)
**Impact:** Runs on EVERY request to the server

**Logs to Remove/Gate:**
- Lines 89-103: 🆘🆘🆘 FAILSAFE request logging
- Lines 228-243: 📥📥📥 INCOMING REQUEST logging
- Lines 197-220: CORS validation logging (keep errors, gate debug)

**Strategy:**
- Remove FAILSAFE middleware entirely (redundant with requestLogger)
- Remove INCOMING REQUEST middleware entirely
- Keep CORS error logs, gate success logs with `enableRequestLogging()`

**Expected Impact:** Reduce log volume by ~90% for typical request patterns

---

### 2. auth.ts (HIGH PRIORITY)
**Impact:** ~16 logs per authenticated request

**Logs to Remove/Gate:**
- Line 36-43: Auth middleware entry (gate with `enableRequestLogging()`)
- Line 55-60: No token provided (keep - error condition)
- Line 63-74: Token verification (gate verbose, keep errors)
- Line 81-84: Blacklisted token (keep - security event)
- Line 86-106: Database lookup (gate with `enableRequestLogging()`)
- Line 115-127: req.user assignment (gate with `enableRequestLogging()`)
- Line 130-133: Auth successful (gate with `enableRequestLogging()`)
- Line 180-221: Admin route checks (gate verbose, keep denials)
- Line 239-277: requireAdmin middleware (gate verbose, keep denials)

**Strategy:**
- Wrap debug logs with `if (enableRequestLogging())`
- Keep all error/denial logs (401, 403 responses)
- Keep security events (blacklisted tokens, admin denials)

**Expected Impact:** Reduce auth logging by ~80% in production

---

### 3. csrf.ts (HIGH PRIORITY)
**Impact:** ~9 logs per state-changing request (POST/PUT/DELETE)

**Logs to Remove/Gate:**
- Line 14-22: CSRF middleware entry (gate with `enableRequestLogging()`)
- Line 26, 32, 56: Skip reason logging (gate with `enableRequestLogging()`)
- Line 67-71: Token check (gate with `enableRequestLogging()`)
- Line 75-79, 88-92: CSRF failures (keep - security events)
- Line 102-108: Token mismatch (keep - security event)
- Line 117-120: Validation passed (gate with `enableRequestLogging()`)

**Strategy:**
- Keep all CSRF failures (security events)
- Gate success and skip logs with `enableRequestLogging()`

**Expected Impact:** Reduce CSRF logging by ~60% in production

---

### 4. WebSocketService.ts (MEDIUM PRIORITY)
**Impact:** Per WebSocket connection (not per request, but still frequent)

**Logs to Remove/Gate:**
- Line 30-31: CORS config (gate with `enableRequestLogging()`)
- Line 50, 87, 110: Connection/disconnection (keep - operational)
- Line 117-122: Cookie header (gate with `enableRequestLogging()`)
- Line 138-174: Token validation (already using [REDACTED], gate verbose parts)

**Strategy:**
- Keep connection/disconnection logs (operational monitoring)
- Gate verbose auth debugging with `enableRequestLogging()`

**Expected Impact:** Reduce WebSocket logging by ~40% in production

---

### 5. Other Files (LOW PRIORITY - As Needed)
**Files with console.log:**
- routes/admin.ts - Admin operations (likely already low volume)
- routes/auth.ts - Auth endpoints (errors already handled)
- routes/* - Business logic (keep errors, gate debug)

**Strategy:**
- Focus on middleware first (highest impact)
- Review route files if time permits
- Prioritize files with high request volume

---

## Implementation Checklist

### server.ts ✅ COMPLETED
- [x] Remove lines 89-103 (FAILSAFE middleware)
- [x] Remove lines 228-243 (INCOMING REQUEST middleware)
- [x] Gate CORS success logs (lines 182, 185, 189, 204)
- [x] Keep CORS error logs (line 208 - origin blocked)
- [x] Added security event comments

### auth.ts ✅ COMPLETED
- [x] Import `enableRequestLogging` from utils/environment
- [x] Wrap debug logs in `if (enableRequestLogging()) { ... }`
- [x] Keep error logs (401, 403 responses)
- [x] Keep security event logs (blacklisted tokens, admin denials)
- [x] Gated: middleware entry, token verification verbose, database lookup, req.user assignment, admin route checks, requireAdmin entry/success
- [x] Kept: all 401/403 error responses, blacklisted token logs, admin access denials

### csrf.ts ✅ COMPLETED
- [x] Import `enableRequestLogging` from utils/environment
- [x] Wrap success/skip logs in `if (enableRequestLogging()) { ... }`
- [x] Keep CSRF failure logs (security events)
- [x] Gated: middleware entry, GET/OPTIONS skip, exempted path skip, token check debug, validation passed
- [x] Kept: all CSRF 403 failures (missing token, missing cookie, token mismatch)

### WebSocketService.ts ✅ COMPLETED
- [x] Import `enableRequestLogging` from utils/environment
- [x] Wrap verbose auth logs in `if (enableRequestLogging()) { ... }`
- [x] Keep connection/disconnection logs
- [x] Gated: CORS config, cookie debugging, token validation verbose logs
- [x] Kept: connection/disconnection logs (operational monitoring)

---

## Testing Plan

### 1. TypeScript Compilation
```bash
cd backend && npm run build
```
Expected: No errors

### 2. Development Mode Testing
```bash
cd backend && npm run dev
```
- Set NODE_ENV=development
- Verify debug logs still appear
- Test auth flow, CORS, CSRF

### 3. Production Simulation
```bash
cd backend && NODE_ENV=production npm run dev
```
- Verify verbose logs suppressed
- Verify error logs still appear
- Test auth failures, CORS rejections

### 4. Staging Deployment
- Push to development branch
- Monitor Azure logs
- Verify production has minimal log volume
- Verify errors still logged correctly

---

## Expected Results

### Log Volume Reduction
- **Before:** ~25-30 lines per authenticated request
- **After:** ~3-5 lines per request (errors/security events only)
- **Reduction:** ~85% less log volume in production

### What Stays in Production Logs
- ✅ Error responses (401, 403, 500)
- ✅ Security events (blacklisted tokens, CSRF failures, admin denials)
- ✅ Operational events (server start, WebSocket connections)
- ✅ Business-critical events (password changes, account locks)

### What Gets Gated (Development Only)
- 🔒 Request logging middleware
- 🔒 Auth flow debugging
- 🔒 CSRF validation success
- 🔒 Token verification details
- 🔒 CORS success logs

---

## Rollback Plan

If excessive logging cleanup breaks debugging:

```bash
git revert HEAD
git push origin development
```

Or: Adjust `enableRequestLogging()` to return true temporarily for production debugging.

---

**Status:** ✅ COMPLETED
**Start Time:** 2025-11-10 15:00
**Completion Time:** 2025-11-10 16:45
**Actual Duration:** ~1.75 hours

---

## Implementation Summary

### Changes Made
1. **server.ts**: Removed 2 logging middlewares (FAILSAFE, INCOMING REQUEST), gated CORS debug logs
2. **auth.ts**: Gated ~16 debug logs per authenticated request, kept all error/security events
3. **csrf.ts**: Gated ~9 debug logs per state-changing request, kept all CSRF failures
4. **WebSocketService.ts**: Gated verbose connection/auth logs, kept operational events

### Impact
- **Estimated log volume reduction**: 85% in production
- **Before**: ~25-30 lines per authenticated request
- **After**: ~3-5 lines (errors and security events only)
- **TypeScript compilation**: ✅ Success (no errors)

### What Stays in Production
- ✅ All error responses (401, 403, 500)
- ✅ All security events (blacklisted tokens, CSRF failures, admin denials, origin blocked)
- ✅ Operational events (WebSocket connections/disconnections)

### What's Gated (Development Only)
- 🔒 Request logging middleware (FAILSAFE, INCOMING REQUEST)
- 🔒 Auth flow debugging (token verification, database lookup, user assignment)
- 🔒 CSRF validation success logs
- 🔒 CORS success logs
- 🔒 WebSocket auth debugging

### Files Modified
- `backend/src/server.ts` (removed 2 middlewares, gated CORS logs)
- `backend/src/middleware/auth.ts` (gated 16+ debug logs)
- `backend/src/middleware/csrf.ts` (gated 6+ debug logs)
- `backend/src/services/WebSocketService.ts` (gated verbose auth/cookie logs)
- `.claude/scratchpads/LOGGING-CLEANUP-PLAN.md` (tracking document)

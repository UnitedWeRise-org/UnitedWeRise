# WebSocket CORS Fix Implementation Plan

**Created**: 2025-11-03
**Complexity Score**: 2 (escalated due to CORS/WebSocket)
**Risk Level**: Medium

---

## Problem Statement

WebSocket connections from frontend (https://dev.unitedwerise.org) to backend (https://dev-api.unitedwerise.org) are failing with CORS error:

```
Access to XMLHttpRequest at 'https://dev-api.unitedwerise.org/socket.io/?EIO=4&transport=polling&t=P8xScb-'
from origin 'https://dev.unitedwerise.org' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause

Socket.IO CORS configuration uses origin **callback function** (websocket.ts:29-40):

```typescript
origin: (origin, callback) => {
  if (!origin) return callback(null, true);
  if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
    callback(null, true);  // ❌ Doesn't set Access-Control-Allow-Origin header
  }
}
```

When Socket.IO receives `callback(null, true)`, it understands "allow this origin" but **does NOT set the `Access-Control-Allow-Origin` header** in the OPTIONS preflight response.

**Evidence**:
- ✅ `access-control-allow-credentials: true` present
- ✅ `access-control-allow-methods: GET,POST` present
- ❌ `access-control-allow-origin: https://dev.unitedwerise.org` **MISSING**

---

## Implementation Strategy

### Approach

Replace callback function with direct array of allowed origins. Socket.IO automatically sets `Access-Control-Allow-Origin` header when origin is provided as string/array.

**Change Type**: Configuration modification (no logic changes)

**Why This Approach**:
- Socket.IO's documented behavior: array format = automatic header setting
- Maintains same allowed origins list
- Simpler and more reliable than callback
- Existing code already has `allowedOrigins` array

---

## Change Sequence

### 1. Backend Changes

**File**: `backend/src/websocket.ts`

**Change** (lines 27-44):

```typescript
// BEFORE (callback function):
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        console.warn(`🚫 WebSocket CORS rejected origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST"]
  }
});

// AFTER (direct array):
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,  // Direct array reference
    credentials: true,
    methods: ["GET", "POST"]
  }
});
```

**Risk**: Low
- No functional logic changes
- Same origins allowed
- No database or data changes
- No authentication logic changes

**Note**: Remove callback entirely since:
1. `allowedOrigins` array already contains all valid origins
2. Socket.IO with array format doesn't accept `null` origin (no-origin requests)
3. No-origin requests are edge case (mobile apps should include origin)

### 2. No Frontend Changes

Frontend already correctly configured with `withCredentials: true`. No changes needed.

### 3. No Database Changes

No schema or data modifications required.

---

## Testing Plan

### Local Testing (Development Environment)

**Can't fully test locally because**:
- Local uses `http://localhost:3000` (no CORS issues on same origin)
- CORS only enforced on cross-origin requests

**Local verification**:
- [ ] Backend compiles: `cd backend && npm run build`
- [ ] No TypeScript errors
- [ ] Server starts successfully
- [ ] WebSocket server initializes without errors

### Staging Testing (Required for CORS Verification)

**Deploy to staging and test**:

1. **Preflight Request Test**:
   ```bash
   curl -I -X OPTIONS -H "Origin: https://dev.unitedwerise.org" \
     https://dev-api.unitedwerise.org/socket.io/?EIO=4&transport=polling

   # Should return:
   # access-control-allow-origin: https://dev.unitedwerise.org  ✅ (NEW)
   # access-control-allow-credentials: true  ✅
   # access-control-allow-methods: GET,POST  ✅
   ```

2. **Browser Console Test**:
   - Open https://dev.unitedwerise.org
   - Check browser console
   - **Expected**: No CORS errors
   - **Expected**: WebSocket connects successfully

3. **Functional Test**:
   - [ ] WebSocket connection establishes
   - [ ] Authentication succeeds via httpOnly cookie
   - [ ] Can send test message (if messaging UI available)
   - [ ] Real-time updates work

4. **Cross-Origin Test**:
   - [ ] Test from all allowed origins:
     - dev.unitedwerise.org
     - dev-admin.unitedwerise.org
   - [ ] Verify unauthorized origins still blocked

### Production Testing

**After staging verification passes**:
- [ ] Deploy to production
- [ ] Verify WebSocket connection from www.unitedwerise.org
- [ ] Verify WebSocket connection from admin.unitedwerise.org
- [ ] Monitor for CORS errors in logs

---

## Rollback Plan

### If Issues Found

**Immediate Rollback**:
```bash
git revert HEAD
git push origin development
```

**Estimated Rollback Time**: < 5 minutes
- Single commit revert
- No data migration to undo
- GitHub Actions redeploys automatically

### Rollback Verification

```bash
curl -s "https://dev-api.unitedwerise.org/health" | grep releaseSha
# Verify reverted SHA deployed
```

**Why Rollback is Safe**:
- Reverting to callback function (known to compile, even if CORS broken)
- No database changes to undo
- No authentication logic changes
- No data at risk

---

## Risk Assessment

### Integration Risk: MEDIUM

**Risk**: Socket.IO array format might not set header properly
**Probability**: Low (documented Socket.IO behavior)
**Impact**: Medium (WebSocket remains broken, but REST API fallback works)
**Mitigation**: Test thoroughly in staging before production

### Breaking Change Risk: LOW

**Risk**: Removing no-origin acceptance breaks mobile apps
**Probability**: Very Low (mobile apps should include origin)
**Impact**: Low (mobile apps can still use REST API fallback)
**Mitigation**: Monitor logs for rejected connections after deployment

### Security Risk: LOW

**Risk**: Array format allows unintended origins
**Probability**: Very Low (using same `allowedOrigins` list)
**Impact**: Medium (if misconfigured, could expose WebSocket to attacks)
**Mitigation**: Review `allowedOrigins` list before deployment

---

## Success Criteria

✅ **Fix is successful when**:
1. OPTIONS preflight returns `Access-Control-Allow-Origin: https://dev.unitedwerise.org`
2. Browser console shows **no CORS errors**
3. WebSocket connection establishes successfully
4. Real-time messaging works (if available to test)
5. No errors in backend logs related to CORS

✅ **Verification complete when**:
- Tested from all allowed origins (dev, dev-admin)
- Verified unauthorized origins still blocked
- Monitored production for 15 minutes with no issues

---

## Deployment Sequence

1. **Make code change** to websocket.ts
2. **Build backend**: `npm run build`
3. **Commit change**: `git add . && git commit -m "fix: Socket.IO CORS configuration"`
4. **Push to development**: `git push origin development`
5. **Monitor GitHub Actions** deployment to staging
6. **Run preflight test** (curl command above)
7. **Test in browser** from https://dev.unitedwerise.org
8. **Verify success** per success criteria
9. **If successful**: Deploy to production (merge to main)
10. **If failed**: Execute rollback plan

---

## Notes

- Frontend requires no changes (already has `withCredentials: true`)
- Backend already has `allowedOrigins` array defined
- Change is configuration only, no business logic affected
- CORS is client-enforced, so only affects browser connections (not server-to-server)

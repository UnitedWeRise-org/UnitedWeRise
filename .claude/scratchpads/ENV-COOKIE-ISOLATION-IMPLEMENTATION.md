# Environment-Isolated Auth Cookies Implementation

**Date**: November 13, 2025
**Commit**: f3099e0
**Status**: Deployed to development, pending testing

---

## Problem Statement

Logging into the dev environment logs users out of production and vice versa. This occurs because both environments share the same cookie names (`authToken`, `refreshToken`, `csrf-token`) with domain `.unitedwerise.org`, causing cookies to overwrite each other.

---

## Solution Overview

Implemented environment-specific cookie naming:
- **Production**: `authToken`, `refreshToken`, `csrf-token`
- **Development**: `authToken_dev`, `refreshToken_dev`, `csrf-token_dev`

This allows simultaneous authentication in both environments without conflicts.

---

## Implementation Summary

### Backend Changes (31 changes across 5 files)

1. **New File**: `backend/src/utils/cookies.ts`
   - Environment-aware cookie naming utility
   - Exports `COOKIE_NAMES` constant with environment-specific names
   - `getCookieName()` helper function

2. **WebSocketService.ts** (3 changes):
   - Line 10: Import COOKIE_NAMES
   - Line 139: Use `cookies[COOKIE_NAMES.AUTH_TOKEN]`
   - Line 179: Use `cookies[COOKIE_NAMES.REFRESH_TOKEN]`
   - **CRITICAL**: WebSocket auth would fail without these changes

3. **middleware/csrf.ts** (4 changes):
   - Line 5: Import COOKIE_NAMES
   - Line 23: Debug logging uses `COOKIE_NAMES.CSRF_TOKEN`
   - Line 74: CSRF validation uses `COOKIE_NAMES.CSRF_TOKEN`
   - Line 149: Warning middleware uses `COOKIE_NAMES.CSRF_TOKEN`

4. **middleware/auth.ts** (4 changes):
   - Line 8: Import COOKIE_NAMES
   - Line 42: Debug logging uses `COOKIE_NAMES.AUTH_TOKEN`
   - Line 48: Token extraction uses `COOKIE_NAMES.AUTH_TOKEN`
   - Line 151: Metrics tracking uses `COOKIE_NAMES.AUTH_TOKEN`

5. **routes/auth.ts** (27 changes):
   - Line 16: Import COOKIE_NAMES
   - 12 cookie setting operations (`res.cookie`)
   - 5 cookie reading operations (`req.cookies?.[...]`)
   - 9 cookie clearing operations (`res.clearCookie`)
   - Affects: register, login, TOTP verify, logout, logout-all, change-password, refresh

6. **routes/oauth.ts** (4 changes):
   - Line 7: Import COOKIE_NAMES
   - 3 cookie setting operations for OAuth callback

### Frontend Changes (10 changes across 4 files)

1. **New File**: `frontend/src/utils/cookies.js`
   - Environment-aware cookie naming utility
   - Exports `COOKIE_NAMES` constant
   - Mirrors backend implementation

2. **modules/core/api/client.js** (4 changes):
   - Line 12: Import COOKIE_NAMES
   - Lines 105, 117, 409: Use `COOKIE_NAMES.CSRF_TOKEN` in getCookie calls

3. **modules/admin/api/AdminAPI.js** (2 changes):
   - Line 10: Import COOKIE_NAMES
   - Line 78: Use `COOKIE_NAMES.CSRF_TOKEN`

4. **js/api-manager.js** (2 changes):
   - Line 15: Import COOKIE_NAMES
   - Line 310: Dynamic regex pattern using `COOKIE_NAMES.CSRF_TOKEN`

5. **js/websocket-client.js** (2 changes):
   - Line 3: Import COOKIE_NAMES
   - Line 132: Use `COOKIE_NAMES.AUTH_TOKEN` for fallback check

---

## Testing Checklist

### Pre-Deployment Verification
- [x] Backend TypeScript compiles without errors
- [x] Code committed to development branch
- [x] Pushed to GitHub

### Dev Environment Testing (POST-DEPLOYMENT)

#### Authentication Flows
- [ ] **Login via Google OAuth**
  - Open dev site in browser DevTools → Application → Cookies
  - Verify cookies: `authToken_dev`, `refreshToken_dev`, `csrf-token_dev`
  - Verify NO cookies: `authToken`, `refreshToken`, `csrf-token`

- [ ] **Login via Email/Password**
  - Same verification as OAuth

- [ ] **Token Refresh**
  - Wait 5 minutes or trigger refresh manually
  - Verify new `*_dev` cookies issued

- [ ] **Logout**
  - Verify all `*_dev` cookies cleared
  - Check DevTools → Application → Cookies

#### CSRF Protection
- [ ] **Create Post** (POST endpoint)
  - Should succeed with valid CSRF token
  - Check Network tab → Headers → `X-CSRF-Token` header

- [ ] **Without CSRF Token** (manual test)
  - Remove CSRF token from request
  - Should get 403 "CSRF token missing"

#### WebSocket Connection
- [ ] **Open WebSocket**
  - Check DevTools → Network → WS filter
  - Should show "connected" status
  - Look for "WebSocket authentication successful" in console

- [ ] **Send Test Message**
  - Verify message sent/received
  - No authentication errors

#### Cross-Environment Isolation
- [ ] **Simultaneous Sessions**
  - Log into dev (verify `*_dev` cookies)
  - Log into production in same browser (verify standard cookies)
  - Refresh dev → should still be logged in
  - Refresh production → should still be logged in
  - **SUCCESS CRITERIA**: Both sessions persist independently

### Production Environment Testing (AFTER DEV VALIDATION)

- [ ] **Login to Production**
  - Verify cookies: `authToken`, `refreshToken`, `csrf-token`
  - Verify NO `*_dev` suffix

- [ ] **Create Post**
  - Verify CSRF working

- [ ] **WebSocket Connection**
  - Verify real-time features working

- [ ] **Monitor Logs** (24 hours)
  - Watch for "Authentication failed" errors
  - Watch for "CSRF validation failed" errors
  - Check WebSocket connection metrics

---

## Deployment Commands

### Deploy to Dev (Automatic via GitHub Actions)
```bash
git push origin development
# GitHub Actions deploys automatically to dev environment
```

### Deploy to Production
```bash
# Follow deployment-procedures.md
git checkout main
git merge development
git push origin main
# GitHub Actions deploys automatically to production
```

---

## Rollback Plan

If critical issues found:

```bash
# Revert commit
git revert f3099e0

# Push revert
git push origin development

# GitHub Actions will deploy reverted version
# Users will need to re-login (cookies will reset to old names)
```

**Zero database changes** = zero-risk rollback

---

## Expected Behavior Changes

### For Regular Users (Production Only)
- **No impact** - cookies use same names as before
- **No re-login required** - existing sessions continue working

### For Admins (Dev + Production)
- **First dev login after deployment**: Must re-login (cookies renamed to `*_dev`)
- **After first login**: Can stay logged into dev and production simultaneously
- **No more logouts** when switching between environments

---

## Monitoring

### Key Metrics to Watch

1. **Authentication Success Rate**
   - Endpoint: `/health` → check uptime
   - Log search: "AUTH 401: No token provided"
   - Expected: No increase in 401 errors

2. **CSRF Validation Rate**
   - Log search: "CSRF 403: Token mismatch"
   - Expected: No increase in 403 errors

3. **WebSocket Connection Rate**
   - Log search: "WebSocket authentication successful"
   - Expected: Same connection success rate as before

4. **Cookie Names in Logs**
   - Development: Should see `authToken_dev`, `refreshToken_dev`, `csrf-token_dev`
   - Production: Should see `authToken`, `refreshToken`, `csrf-token`

### Log Queries

```bash
# Check dev backend cookie names
az containerapp logs show --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg --tail 100 | grep "authToken"

# Check for authentication failures
az containerapp logs show --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg --tail 100 | grep "AUTH 401"

# Check WebSocket auth
az containerapp logs show --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg --tail 100 | grep "WebSocket authentication"
```

---

## Architecture Notes

### Why This Approach?

**Alternatives considered:**
1. **Subdomain isolation** - Would require DNS changes, complex
2. **Environment cookie validation** - Adds validation logic, tamper-prone
3. **Token prefixing in value** - Complex validation throughout codebase
4. **Cookie name prefixing** - **CHOSEN**: Minimal code changes, explicit isolation

### Security Considerations

- **No new attack surface**: Uses same httpOnly cookie security model
- **No privilege escalation**: Dev tokens can't access production data (different databases)
- **Clear separation**: Cookie names explicitly show environment
- **Easy auditing**: Browser DevTools clearly shows which environment cookies belong to

### Performance Impact

- **Zero performance impact**: Cookie name length difference is negligible
- **Same number of cookies**: 3 cookies in each environment
- **No additional requests**: Cookie isolation happens at browser level

---

## Files Modified

**Backend** (5 files, 31 changes):
- `backend/src/utils/cookies.ts` (NEW)
- `backend/src/services/WebSocketService.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/middleware/csrf.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/oauth.ts`

**Frontend** (4 files, 10 changes):
- `frontend/src/utils/cookies.js` (NEW)
- `frontend/src/modules/core/api/client.js`
- `frontend/src/modules/admin/api/AdminAPI.js`
- `frontend/src/js/api-manager.js`
- `frontend/src/js/websocket-client.js`

**Total**: 11 files, 41 code changes + 2 new utilities

---

## Success Criteria

- [x] Backend builds without errors
- [x] Code committed and pushed
- [ ] Dev deployment successful
- [ ] All authentication flows working in dev
- [ ] CSRF protection working in dev
- [ ] WebSocket authentication working in dev
- [ ] Simultaneous dev + production sessions confirmed
- [ ] No increase in error rates
- [ ] 24-hour monitoring shows stable metrics
- [ ] Production deployment successful
- [ ] All flows verified in production

---

## Contact

For issues or questions:
- Check logs: `az containerapp logs show --name unitedwerise-backend-staging`
- Review commit: `git show f3099e0`
- Rollback if needed: `git revert f3099e0`
# Handoff: Admin Dashboard 401 Token Refresh Fix

**Date**: 2025-12-22
**Branch**: development
**Commit**: 24520fe - fix(admin): Always attempt token refresh on 401, not just ACCESS_TOKEN_EXPIRED

## Completed Phases

- [x] **Audit**: Identified root cause - backend returns 401 without ACCESS_TOKEN_EXPIRED in 4 of 5 cases
- [x] **Plan**: Designed fix to always try refresh first via AdminAuth.refreshToken() with mutex
- [x] **Execute**: Two fixes implemented
- [x] **Test**: Build compiles successfully
- [x] **Document**: Inline JSDoc added, this handoff
- [x] **Deploy**: Pushed to development, deployed via GitHub Actions (Static Web Apps)

## Root Cause

Backend `auth.ts` returns 401 without `ACCESS_TOKEN_EXPIRED` code in these cases:
- Line 66: "No token provided" - when cookie missing/expired
- Line 101: "Token revoked"
- Line 119: "User not found"

Only line 80 ("Invalid token") includes the code.

Frontend ONLY tried to refresh when it saw `ACCESS_TOKEN_EXPIRED`, causing logout cascade after laptop wake.

## Fixes Applied

### Fix 1: AdminAPI.js 401 Handler (lines 286-365)

**Before**: Only refreshed if `errorData.code === 'ACCESS_TOKEN_EXPIRED'`, otherwise verified session.

**After**: Always attempts `window.adminAuth.refreshToken(true)` for ANY 401 (uses existing mutex).

### Fix 2: AdminAuth.js handleVisibilityChange (lines 186-209)

**Before**: `this.refreshToken(true);` - no await, causing race with API calls.

**After**: `await this.refreshToken(true);` - properly waits for refresh.

## Files Modified

- `frontend/src/modules/admin/api/AdminAPI.js` - 401 handler rewrite
- `frontend/src/modules/admin/auth/AdminAuth.js` - await in visibility change

## Pending Items

- [ ] User to verify fix at dev-admin.unitedwerise.org (test wake from sleep)
- [ ] If verified, merge to main for production

## Testing Instructions

1. Login to https://dev-admin.unitedwerise.org
2. Wait > 5 minutes (or close laptop lid)
3. Wake laptop / switch back to tab
4. Dashboard should load WITHOUT logout
5. Console should show: "🔄 Attempting token refresh via AdminAuth..."

## Expected Console Flow (After Fix)

```
⚠️ Admin API: Received 401 - attempting token refresh...
🔄 Attempting token refresh via AdminAuth...
✅ Token refreshed successfully - retrying request
```

NOT this (old broken flow):
```
⚠️ 401 without ACCESS_TOKEN_EXPIRED code - verifying session...
🔒 Session verification failed - logging out
```

## Rollback

```bash
git revert 24520fe && git push origin development
```

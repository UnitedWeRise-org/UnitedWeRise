# Token Refresh Race Condition Fix - Handoff

**Date**: 2026-01-12
**Status**: Deployed to staging
**Branch**: development
**Commit**: cfdb080

## Problem

Users were being logged out incorrectly when returning to a tab that had been hidden for 30+ minutes.

### Root Cause

The `authToken` cookie has a 30-minute browser-side `maxAge`. When the cookie expires:

1. Browser stops sending `authToken` cookie entirely
2. Any API calls get 401 "No token provided"
3. 401 handler calls `/auth/me` to verify session
4. `/auth/me` also has no cookie → 401
5. User logged out incorrectly

**Meanwhile**: The `refreshToken` cookie (30-90 days) was still valid and refresh would succeed, but the verification had already triggered logout.

### Buggy Flow

```
Tab hidden 30+ min → authToken cookie expires in browser
    ↓
Tab becomes visible → API calls fire
    ↓
API calls have NO authToken → 401 "No token provided"
    ↓
401 handler checks isRefreshPending() → might be false (race)
    ↓
Calls _verifySessionWithRetry() → fetches /auth/me
    ↓
/auth/me ALSO has no authToken → 401
    ↓
User logged out (INCORRECT)
```

## Solution

Skip redundant `/auth/me` verification when token refresh just succeeded (within 5 seconds).

**Security Analysis**: When refresh succeeds, the session IS valid because:
- Valid refresh token was required (30-90 day lifetime)
- Token validated against database (revocation checked)
- Suspended users blocked at refresh time
- No new attack surface (attacker needs valid refresh token = full session access)

## Changes

### unified-manager.js

1. Added `_lastSuccessfulRefresh = 0` property to constructor
2. Set timestamp on successful refresh: `this._lastSuccessfulRefresh = Date.now()`
3. Added method:
```javascript
didJustRefreshSuccessfully(thresholdMs = 5000) {
    return this._lastSuccessfulRefresh && (Date.now() - this._lastSuccessfulRefresh < thresholdMs);
}
```

### backend-integration.js

Added `didJustRefreshSuccessfully(5000)` to the shouldWaitForRefresh check:

```javascript
const shouldWaitForRefresh = manager && (
    manager.isRefreshPending() ||
    manager.didJustWakeUp(3000) ||
    manager.didJustRefreshSuccessfully(5000) // NEW
);
```

## Testing

### To Test (Manual)

1. Login to staging (dev.unitedwerise.org)
2. Leave tab hidden for 35+ minutes (authToken cookie expires)
3. Return to tab
4. **Expected**: Stay logged in (refresh should succeed)

### To Verify Session Expiration Works

1. Login to staging
2. Manually revoke refresh token in database
3. Make API call
4. **Expected**: Logged out correctly

## Timeline/Context

This is the third iteration of auth race condition fixes:

1. **2026-01-07**: Added verification retry logic for transient network issues
2. **2026-01-08**: Added `_refreshPending` flag set immediately on visibility change
3. **2026-01-12** (this fix): Added `didJustRefreshSuccessfully()` to trust successful refresh

## Files Modified

- `frontend/src/modules/core/auth/unified-manager.js`
- `frontend/src/integrations/backend-integration.js`
- `CHANGELOG.md`

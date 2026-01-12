# Handoff: Extended Sleep Auth Race Condition Fix

**Date**: 2026-01-10 (Completed 2026-01-11)
**Branch**: main (production)
**Commit**: a97a61d (merge), c555bc3 (original fix)

## Problem

After computer sleeps overnight (8+ hours), returning to the tab causes logout despite previous fix from 2026-01-08. The 16-minute sleep test passed, but extended sleep failed.

## Root Cause

The previous fix set `_refreshPending = true` on visibility change, but ONLY if `isAuthenticated()` returned true:

```javascript
if (!document.hidden && this.isAuthenticated()) {
    this._refreshPending = true;  // Bug: never set if race condition occurs
}
```

After extended sleep:
1. Scheduled timers (WebSocket reconnection) fire BEFORE visibility change
2. API calls get 401s → session verification → logout
3. `isAuthenticated()` becomes false BEFORE visibility change runs
4. `_refreshPending` is never set → the fix never kicks in

## Solution

Two-part fix to handle race conditions:

### Part 1: Unconditional timestamp tracking
- Set `_lastWakeTimestamp = Date.now()` unconditionally when tab becomes visible
- Removed `isAuthenticated()` guard from immediate flag set (main site only)

### Part 2: Fallback check in 401 handlers
- Added `didJustWakeUp(3000)` method to check if tab became visible within 3 seconds
- 401 handlers now check BOTH `isRefreshPending()` AND `didJustWakeUp()`

## Files Modified

| File | Changes |
|------|---------|
| `frontend/src/modules/core/auth/unified-manager.js` | Added `_lastWakeTimestamp`, `didJustWakeUp()`, removed guard |
| `frontend/src/integrations/backend-integration.js` | Added `didJustWakeUp()` fallback in 401 handler |
| `frontend/src/modules/admin/auth/AdminAuth.js` | Added `lastWakeTimestamp`, `didJustWakeUp()` |
| `frontend/src/modules/admin/api/AdminAPI.js` | Added `didJustWakeUp()` to `waitForTokenRefresh()` |

## Status

- [x] Code changes implemented
- [x] Deployed to staging (c555bc3)
- [x] User tested extended sleep scenario (299 minutes) - verified working
- [x] Merged to main and deployed to production (a97a61d)

**COMPLETED** - Fix is live in production as of 2026-01-11

## Verification Steps

### Test on dev.unitedwerise.org and dev-admin.unitedwerise.org:
1. Log in to the site
2. Let computer sleep overnight (or at least 8+ hours)
3. Wake computer, return to tab
4. Should stay logged in

### Console messages to look for:
- **GOOD**: "⏳ Token refresh pending or just woke - waiting before session verification..."
- **GOOD**: "✅ Token refresh completed - user still authenticated, skipping logout"
- **BAD**: "🔒 Session verification confirmed token expired - updating UI"

## Resolution

Fix deployed to production 2026-01-11. Both main site and admin dashboard now handle extended sleep (8+ hours) gracefully by detecting recent wake-up events and waiting for token refresh before triggering session verification.

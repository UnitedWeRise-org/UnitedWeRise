# Page Wake Logout Issue - Handoff

## Problem
User is still getting logged out when returning to a sleeping/backgrounded tab, despite previous fix (7be3fdf).

## Root Cause Analysis
There are TWO code paths that can cause logout on page wake:

| Code Path | File | Fixed? |
|-----------|------|--------|
| Regular API 401 handling | `frontend/src/integrations/backend-integration.js` | ✅ Yes (7be3fdf) |
| Token refresh on visibility change | `frontend/src/modules/core/auth/unified-manager.js` | ⚠️ Attempted fix (a524e9b) - UNTESTED |

## What Happens on Page Wake
1. Tab becomes visible
2. `_handleVisibilityChange()` in unified-manager.js fires (line ~200)
3. Calls `refreshToken()` which hits `/auth/refresh`
4. If network returns 401 before fully reconnecting → logout

## Fix Attempted (commit a524e9b)
Added retry logic to `refreshToken()` method:
- 2 retry attempts with 1.5s/3s exponential backoff
- Verifies session with `/auth/me` before logging out
- Keeps user logged in on network errors

**Status: Deployed to staging but NOT TESTED**

## Next Steps
1. **Test on staging** - Let tab sleep, wake it, check if logout still happens
2. **If still broken** - Search for other logout triggers:
   ```bash
   grep -rn "logout\|setUserLoggedOut\|handleAuthError" frontend/src/
   ```
3. **Check browser console** - Look for which code path is triggering logout (there are console.log statements)

## Key Files
- `frontend/src/modules/core/auth/unified-manager.js` - Token refresh logic (lines 71-197)
- `frontend/src/integrations/backend-integration.js` - General 401 handling (lines 180-262)
- `frontend/src/modules/core/auth/session.js` - `setUserLoggedOut` function

## To Resume
Tell Claude: "Continue from handoff 2026-01-07-page-wake-logout-fix"

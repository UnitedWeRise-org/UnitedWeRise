# Login Persistence & TOTP Session Fix
**Date:** 2026-10-30

## User Intent
“Keep me logged in” was not working: the app asked for login multiple times a day
and required 2FA again each time. Once 2FA is validated, the session should last
until the refresh token expires.

## Root Cause
- The access-token cookie has a **30-minute** lifetime; the refresh token lasts
  30/90 days.
- `APIClient` only attempted a refresh when a 401 body contained
  `code: 'ACCESS_TOKEN_EXPIRED'`.
- When the access cookie is gone (the normal case after 30 minutes), the backend
  returns `401 { error: 'Access denied. No token provided.' }` with **no code**.
- `APIClient` therefore called `_handleUnauthorized()` → `unifiedAuthManager.logout()`
  → `POST /auth/logout` → **revoked the long-lived refresh token**.
- The old `apiCall`/`api-manager` path had no refresh logic at all.
- Additionally, the TOTP flow dropped the `rememberMe` flag, so “Keep me logged
  in (90 days)” produced a 30-day refresh token.

## What Changed
### Frontend
- `APIClient._makeRequest` now:
  - attempts a single refresh on **any** non-auth 401 (not only
    `ACCESS_TOKEN_EXPIRED`),
  - coalesces concurrent refreshes via `_refreshPromise`,
  - waits for an in-flight unified-manager refresh,
  - retries the original request once with new cookies,
  - only calls logout if refresh fails **and** a session existed.
- `api-manager.executeRequest` mirrors the 401 refresh/retry for legacy
  `apiCall` consumers.
- `UnifiedAuth.login` accepts and forwards `rememberMe`; `unified-manager` and
  `modal.js` pass it through the TOTP flow.

### Backend
- `POST /auth/logout` now uses `optionalAuth` so it can clear cookies/revoke the
  refresh token even when the access token is missing/expired.
- `SessionManager.rotateRefreshToken` no longer returns an existing record while
  the endpoint sets a different, unstored token. It now stores the caller’s new
  token during the rotation grace window, so concurrent refreshes leave a valid
  cookie.
- TOTP state continues to be preserved on refresh via the access-token
  `totpVerified` claim.

## Verification
- Backend `npm run build` passes.
- Headless `apiClient` test:
  - missing-token 401 → 1 refresh → retried request succeeds, no logout
  - `/auth/login` 401 → no refresh, no logout
  - refresh failure on an existing session → exactly one logout
- Local Postgres rotation test: rotating the same old refresh token twice
  within the grace window stores both new tokens, and the second new token
  validates (`C_STORED=true`, `C_VALID=true`, `rememberMe=true`).

## Files Modified
- `frontend/src/modules/core/api/client.js`
- `frontend/src/js/api-manager.js`
- `frontend/src/modules/auth/UnifiedAuth.js`
- `frontend/src/modules/core/auth/unified-manager.js`
- `frontend/src/modules/core/auth/modal.js`
- `backend/src/routes/auth.ts`
- `backend/src/services/sessionManager.ts`

---

*This entry was generated per the [DevLog Protocol](../../CLAUDE.md#devlog-generation).*

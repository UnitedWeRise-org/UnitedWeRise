# Authentication Architecture Refactor
**Date:** 2025-12-19

## User Intent
Eliminate "split-brain" auth state bugs that caused the admin dashboard to crash with popup loops when sessions expired. The goal was to make the platform behave like established, polished products - clean error handling without jarring user experiences.

## What Changed
- **Phase A**: Implemented Content Security Policy (CSP) headers for enhanced XSS protection
- **Phase B**: Established single source of truth pattern (`userState`) for main site auth
- **Phase C**: Extended the same pattern to admin dashboard, fixing 401/403 error handlers

The core fix: `window.currentUser` is now a getter/setter that routes through `userState`, preventing any code from bypassing the central auth store. When a session expires, ALL state locations clear simultaneously instead of creating inconsistent state.

## Technical Decisions
- **Getter/setter enforcement** over simple property assignment - prevents future regressions where new code might set `window.currentUser` directly
- **Same pattern for admin and main site** - reduces cognitive load and ensures consistency
- **httpOnly cookies for tokens** - auth tokens never accessible to JavaScript (XSS mitigation)
- **CSRF token rotation** on each request - defense in depth

## Files Modified
- `frontend/src/modules/core/state/user.js` - Central auth state with getter enforcement
- `frontend/src/modules/admin/auth/AdminAuth.js` - Removed duplicate state, uses window.currentUser
- `frontend/src/modules/admin/api/AdminAPI.js` - Fixed 401/403 handlers to clear all state
- `frontend/admin-dashboard.html` - Early userState initialization
- `frontend/staticwebapp.config.json` - CSP headers

---

*This entry was generated per the [DevLog Protocol](../../CLAUDE.md#devlog-generation).*

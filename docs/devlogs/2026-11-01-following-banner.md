# Following Welcome Banner Lifecycle
**Date:** 2026-11-01

## User Intent
The “Welcome to UnitedWeRise — follow/subscribe/become friends” banner never
went away. It should not be a permanent fixture; hide it once the user’s feed is
seeded enough, and let them dismiss it.

## Root Cause
- `FeedToggle.determineDefaultFeed()` read `followingCount` from
  `followResponse.data.data.followingCount`, but `/auth/me` did not return it.
  The value was always `undefined → 0`, so `showNewUserBanner` stayed true.
- The banner rendered regardless of the active feed, so it also appeared on
  Discover.

## What Changed
- `/auth/me` now returns `followingCount` and `postsCount`.
- `FeedToggle`:
  - evaluates the banner even when a preferred feed is saved
  - shows the welcome prompt only on **Following**
  - hides it when `followingCount > 0`, `postsCount >= 3`, or dismissed
  - adds a per-user/localStorage dismiss (×) button
  - updates banners when switching feeds and after rendering posts
- Discover no longer carries the follow prompt. Following keeps its normal
  empty-state message.

## Verification
- Backend build passes.
- Frontend syntax check passes.
- Manual logic: `followingCount=0, postsCount<3` → banner on Following;
  `followingCount>0` or `postsCount>=3` or dismissed → no banner; Discover → no banner.

## Files
- `backend/src/routes/auth.ts`
- `frontend/src/components/FeedToggle.js`
- `frontend/src/styles/feed-toggle.css`

---

*This entry was generated per the [DevLog Protocol](../../CLAUDE.md#devlog-generation).*

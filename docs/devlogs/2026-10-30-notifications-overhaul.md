# Notifications Overhaul + Map Attribution Polish
**Date:** 2026-10-30

## User Intent
Make the notification bell behave like Facebook/YouTube: show activity from
friends/follows, friend requests, posts, replies, and mentions; let users
customize categories; clear the unread indicator after checking; and make the
map attribution ⓘ genuinely small/unobtrusive.

## What Changed
### Real-time notification delivery
- Fixed `frontend/src/js/websocket-client.js`: it checked unqualified function
  names (`updateNotificationUI`, `showNotificationToast`) inside an ES module.
  Module scope does not resolve `window.*`, so these checks were always false.
  It now calls the `window.*` functions exposed by `notification-handlers.js`.

### Notification panel
- Rebuilt the dropdown with class-based markup/CSS:
  - header + “Mark all read” + close button
  - avatar (or type icon), title, message, timestamp, unread dot
  - “Load more” pagination
  - inline **Accept/Decline** for friend requests
  - empty/loading/error states
- Opening the panel fetches page 1, renders it, then marks the fetched unread
  IDs via `PUT /notifications/mark-read-batch`; the bell badge clears while the
  panel stays open.
- Added Escape/outside-click close, 60s visible-tab refresh fallback, and
  focus/visibility refresh with a 30s throttle.
- `apiClient` is used everywhere so HttpOnly cookie auth works.

### Backend coverage
- `createNotification` now honors per-user in-app preferences and accepts
  pre-resolved preferences for batch sends.
- Added in-app preference keys:
  `inAppNotifyFollows`, `inAppNotifyFriendRequests`, `inAppNotifyLikes`,
  `inAppNotifyComments`, `inAppNotifyMentions`, `inAppNotifyNewPosts`,
  `inAppNotifyMessages` (default true).
- `RelationshipUtils.getPostNotificationAudience(authorId)` returns accepted
  friends, followers, and subscribers with `notifyOnNewPosts`, deduplicated and
  excluding the author.
- New posts/threads notify that audience (previously only opt-in subscribers).
- Comments now notify the parent comment author on replies.
- New `MentionNotificationService` parses `@username` and creates MENTION
  notifications (excludes the sender, `@RiseAI`, and emails).
- `GET /api/notifications/unread-count` for badge refresh; read endpoints return
  the updated `unreadCount`.

### Settings
- Profile → Settings → Notification Preferences now has an **In-App
  Notifications** section for each category. The backend defaults/allow-list
  include the new keys.

### Map attribution
- MapLibre’s compact control can render as a full bar before attribution text
  arrives. `applyAttributionState` now adds `maplibregl-compact` immediately,
  persists open/closed in `localStorage` (`uwrMapAttributionOpenV2`), ignores the
  old bad key, and re-applies on `styledata`/`sourcedata`.
- The ⓘ is a 16px icon with a transparent hit area (no white bubble), 24px
  background icon to fill the button, 2px margin.

## Verification
- Backend `npm run build` and `prisma validate` pass.
- Local Postgres test: audience query returns friend/follower/subscriber;
  filtering excludes a friend with `inAppNotifyNewPosts=false`; mention parser
  ignores emails and `@RiseAI`.
- Frontend modules pass `node --input-type=module --check`.
- Panel mock screenshot reviewed for layout.

## Files Modified
- `backend/src/routes/notifications.ts`
- `backend/src/routes/users.ts`
- `backend/src/routes/posts.ts`
- `backend/src/services/relationshipService.ts`
- `backend/src/services/mentionNotificationService.ts`
- `frontend/src/handlers/notification-handlers.js`
- `frontend/src/js/websocket-client.js`
- `frontend/src/js/app-initialization.js`
- `frontend/src/handlers/navigation-handlers.js`
- `frontend/src/components/Profile.js`
- `frontend/src/styles/notifications.css`
- `frontend/src/styles/map.css`
- `frontend/src/js/map-maplibre.js`

---

*This entry was generated per the [DevLog Protocol](../../CLAUDE.md#devlog-generation).*

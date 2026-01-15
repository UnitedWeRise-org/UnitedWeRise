# Handoff: Organizations Phase 2f - Organization Activity Feed

**Date**: 2026-01-15
**Branch**: development
**Last Commit**: (pending)

## Completed Phases
- [x] Audit: Explored backend Post/CivicEvent/OrganizationEndorsement models
- [x] Plan: Designed activity feed with filters, post composer, event creator
- [x] Execute: Implemented backend endpoint and frontend Activity tab
- [x] Test: Verified TypeScript compiles, JavaScript syntax valid
- [x] Document: Updated CHANGELOG.md

## Session Summary

### Backend Changes

**POST /api/posts - Organization Post Validation**
`backend/src/routes/posts.ts`
- Added `organizationId` to request body destructuring
- Validates organization exists and is active
- Checks user is org head OR has POST_AS_ORG capability
- Includes organization in post response when posting as org

**GET /api/organizations/:id/activity**
`backend/src/routes/organizations.ts`
- New endpoint for combined activity feed
- Query params: `type` (all|posts|events|endorsements), `page`, `limit`
- Requires org membership (uses `requireOrgMembership()` middleware)
- Returns: `{ items: ActivityItem[], hasMore: boolean, page, total }`

**Activity Item Types:**
```typescript
type ActivityItem = {
  type: 'post' | 'event' | 'endorsement' | 'member_milestone';
  timestamp: string;
  data: Post | CivicEvent | OrganizationEndorsement | MilestoneData;
};
```

### Frontend Changes

**Dashboard State Additions:**
```javascript
activityFilter: 'all',
activityItems: [],
activityLoading: false,
activityPage: 1,
activityHasMore: true,
showPostComposer: false,
showEventCreator: false,
newPostContent: '',
newEventData: { title: '', description: '', date: '', time: '', location: '' }
```

**New Tab:**
- Activity tab visible to all org members
- Filter buttons: All, Posts, Events, Endorsements
- Load more pagination

**New Render Functions:**
- `renderActivityTab()` - Main container
- `renderActivityItem(item)` - Dispatcher
- `renderPostActivityItem(post)` - Post card
- `renderEventActivityItem(event)` - Event card
- `renderEndorsementActivityItem(endorsement)` - Endorsement card
- `renderMilestoneActivityItem(milestone)` - Member milestone
- `renderPostComposer()` - Inline post creation form
- `renderEventCreatorModal()` - Event creation modal

**New Action Functions:**
- `loadActivity(append)` - Fetch activity from API
- `submitOrgPost()` - Create organization post
- `submitOrgEvent()` - Create organization event
- `formatTimeAgo(timestamp)` - Relative time formatting

### CSS Additions
`frontend/src/styles/org-dashboard.css` - ~250 lines
- Activity container, filters, feed
- Activity item cards (post, event, endorsement, milestone)
- Post composer styles
- Mobile responsive styles

## Files Modified
1. `backend/src/routes/posts.ts` - Organization post validation
2. `backend/src/routes/organizations.ts` - Activity endpoint
3. `frontend/src/modules/features/organizations/components/org-dashboard.js` - Activity tab
4. `frontend/src/styles/org-dashboard.css` - Activity styles
5. `CHANGELOG.md` - Phase 2f entry

## Current State

### What Works
- Backend activity endpoint with type filtering and pagination
- Organization posts with capability validation
- Activity tab visible to all org members
- Filter by: All, Posts, Events, Endorsements
- Activity cards for each type with appropriate styling
- Post composer (inline) for users with POST_AS_ORG
- Event creator modal for users with CREATE_EVENTS
- Load more pagination
- Relative time formatting (2h, 3d, 1w, etc.)

### What Needs Testing
1. Load Activity tab as org member
2. Filter by Posts only
3. Filter by Events only
4. Filter by Endorsements only
5. Create post as org (requires POST_AS_ORG capability)
6. Create event as org (requires CREATE_EVENTS capability)
7. Verify posts appear in activity feed
8. Verify events appear in activity feed
9. Test load more pagination
10. Test member milestones (recent joins)

### Known Limitations
- No real-time updates (manual refresh required)
- No inline post editing
- No inline event editing
- No comment/like actions in activity cards (display only)
- No image upload in post composer
- Member milestones only show joins from past week

## Capability Requirements

| Action | Required Capability |
|--------|---------------------|
| View Activity tab | Org member (any) |
| Create org post | POST_AS_ORG (or org head) |
| Create org event | CREATE_EVENTS (or org head) |
| View all activity | Org member (any) |

## API Response Examples

**GET /api/organizations/:id/activity**
```json
{
  "items": [
    {
      "type": "post",
      "timestamp": "2026-01-15T10:30:00.000Z",
      "data": {
        "id": "...",
        "content": "Welcome to our organization!",
        "author": { "id": "...", "username": "..." },
        "organization": { "id": "...", "name": "...", "avatar": "..." },
        "_count": { "likes": 5, "comments": 2 }
      }
    },
    {
      "type": "event",
      "timestamp": "2026-01-14T15:00:00.000Z",
      "data": {
        "id": "...",
        "title": "Community Meetup",
        "startDate": "2026-01-20T19:00:00.000Z",
        "location": "City Hall",
        "_count": { "rsvps": 12 }
      }
    }
  ],
  "hasMore": true,
  "page": 1,
  "total": 25
}
```

## Next Steps (Phase 2g+)

1. **Enhanced Activity Feed**
   - Inline comment/like actions
   - Image upload in post composer
   - Real-time updates (WebSocket)

2. **Admin Tools**
   - Content moderation
   - Activity analytics
   - Member management bulk actions

3. **Public Organization Profiles**
   - Public activity feed (posts marked public)
   - Organization map with H3 jurisdiction
   - Follow/unfollow from public view

## Plan File Reference
Implementation plan at: `.claude/plans/concurrent-popping-fairy.md`

## Commits This Session
(Pending commit and deployment)

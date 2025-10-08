# Saved Posts - Architecture & Design Specification

## Status: 🟡 In Progress
**Agent**: Architecture & Design (Terminal 1)
**Started**: 2025-10-07

---

## Overview

Design specification for the Saved Posts feature, allowing users to bookmark posts for later viewing.

## Data Model

### SavedPost Schema

```prisma
model SavedPost {
  id        String   @id @default(uuid())
  userId    String
  postId    String
  savedAt   DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])
  @@index([userId])
  @@index([postId])
  @@index([savedAt])
}
```

**Design Decisions**:
- UUID primary key for scalability
- Composite unique constraint prevents duplicate saves
- Cascade delete: Remove saves when user/post deleted
- savedAt timestamp for "recently saved" sorting
- Indexes on userId (common query), postId (analytics), savedAt (sorting)

## API Endpoints

### 1. Save Post
```
POST /api/posts/:postId/save
```

**Authentication**: Required
**Request Body**: None (postId from URL param)
**Response**:
```json
{
  "success": true,
  "data": {
    "saved": true,
    "savedAt": "2025-10-07T21:30:00.000Z"
  }
}
```

**Error Cases**:
- 401: Not authenticated
- 404: Post not found
- 409: Already saved (idempotent - return success)

### 2. Unsave Post
```
DELETE /api/posts/:postId/save
```

**Authentication**: Required
**Request Body**: None
**Response**:
```json
{
  "success": true,
  "data": {
    "saved": false
  }
}
```

**Error Cases**:
- 401: Not authenticated
- 404: Post or save not found (idempotent - return success)

### 3. Get Saved Posts
```
GET /api/posts/saved
Query params: ?limit=20&offset=0&sort=recent
```

**Authentication**: Required
**Response**:
```json
{
  "success": true,
  "data": {
    "posts": [...], // Full post objects
    "total": 42,
    "hasMore": true
  }
}
```

**Sorting Options**:
- `recent`: Most recently saved first (default)
- `oldest`: Oldest saved first
- `popular`: By post engagement (likes/comments)

### 4. Check Saved Status (Batch)
```
POST /api/posts/saved/check
Body: { "postIds": ["id1", "id2", ...] }
```

**Authentication**: Required
**Response**:
```json
{
  "success": true,
  "data": {
    "saved": {
      "id1": true,
      "id2": false,
      ...
    }
  }
}
```

**Purpose**: Efficiently check saved status for feed of posts

## UI/UX Design

### Save Button Design

**Desktop**:
- Location: Post action bar (alongside like/comment/share)
- Icon: 🔖 (bookmark)
  - Not saved: Outline/empty bookmark
  - Saved: Filled bookmark (yellow/gold)
- Hover text: "Save for later" / "Saved"
- Click: Toggle save/unsave

**Mobile**:
- Location: Same as desktop (post action bar)
- Touch target: Minimum 44x44px
- Visual feedback: Immediate icon state change
- Haptic feedback (if available): Light tap on save

### Saved Posts Feed

**Access**:
- Desktop: Sidebar or main nav → "Saved Posts"
- Mobile: Bottom bar → Feed submenu → "Saved Posts"

**Layout**:
- Same as regular feed (reuse PostComponent)
- Header: "Saved Posts" with count badge
- Empty state:
  - Icon: 🔖
  - Message: "No saved posts yet"
  - Subtitle: "Tap the bookmark icon on any post to save it"

**Features**:
- Infinite scroll
- Pull to refresh (mobile)
- Unsave from feed view
- Sort options dropdown

### Visual States

1. **Not Saved**:
   - Icon: Empty bookmark outline
   - Color: Gray (#6c757d)
   - Hover: Slightly darker

2. **Saved**:
   - Icon: Filled bookmark
   - Color: Gold (#ffd700)
   - Hover: Slightly darker gold

3. **Loading**:
   - Icon: Bookmark with spinner overlay
   - Disabled state

4. **Error**:
   - Icon: Return to previous state
   - Toast notification: "Failed to save post"

## User Flows

### Flow 1: Save Post
1. User sees post in feed
2. Clicks bookmark icon
3. Icon fills immediately (optimistic update)
4. API call saves post
5. If error: Icon reverts, show error toast

### Flow 2: View Saved Posts
1. User clicks "Saved Posts" menu item
2. Loading indicator appears
3. API fetches saved posts
4. Posts render in feed layout
5. Scroll to load more

### Flow 3: Unsave from Feed
1. User in Saved Posts feed
2. Clicks filled bookmark on post
3. Post fades out with animation
4. Post removed from list
5. Count badge updates

## Error Scenarios

1. **Network Failure**:
   - Revert optimistic update
   - Show retry button
   - Cache action to retry when online

2. **Post Deleted**:
   - Return 404 or remove from saved
   - Don't show error to user
   - Silently remove from saved list

3. **User Deleted**:
   - Cascade delete handles cleanup
   - No user-facing error

4. **Duplicate Save Attempt**:
   - Treat as idempotent
   - Return success
   - Don't create duplicate

## Performance Considerations

1. **Batch Status Checks**:
   - Load feed: Check saved status for all posts in one API call
   - Cache results locally
   - Invalidate cache on save/unsave

2. **Optimistic Updates**:
   - Update UI immediately
   - Rollback on error
   - Improves perceived performance

3. **Pagination**:
   - Limit 20 posts per request
   - Infinite scroll for more
   - Total count for "X saved posts" display

4. **Indexes**:
   - userId index for fast "get user's saves"
   - Composite index on (userId, savedAt) for sorted queries

## Security Considerations

1. **Authorization**:
   - Users can only save their own posts list
   - Check JWT token on all requests
   - Validate userId matches token

2. **Rate Limiting**:
   - Max 60 saves per minute per user
   - Prevent spam/abuse

3. **Data Privacy**:
   - Saved posts are private
   - Only user can see their saved posts
   - No public saved posts feature

## Migration Strategy

1. Create SavedPost model in schema
2. Generate migration file
3. Apply to development DB first
4. Test thoroughly on staging
5. Apply to production during low-traffic window
6. Monitor for errors

## Rollback Plan

If issues arise:
1. Keep API endpoints but return empty results
2. Hide UI elements (feature flag)
3. Mark migration as rolled back
4. Don't delete table (preserve data)
5. Fix issues and re-deploy

## Success Metrics

- Save rate: % of users who save at least one post
- Saves per user: Average number of saved posts
- Unsave rate: % of saved posts later unsaved
- Saved feed views: How often users view saved posts
- Error rate: < 0.1% of save/unsave operations

## Open Questions

1. Should there be a max limit on saved posts per user?
   - Recommendation: No hard limit, but show warning at 1000+

2. Should saved posts sync across devices?
   - Yes, stored server-side with user account

3. Should there be collections/folders for organizing saves?
   - Phase 2 feature, start with flat list

---

## Agent Signal

**Status**: ✅ Architecture plan complete

**Next Steps**:
- Agent 2 (Backend): Begin implementation
- Use this design as specification
- Document API changes in API-CHANGES.md

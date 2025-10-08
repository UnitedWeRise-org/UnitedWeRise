# Saved Posts API - Documentation

## Status: ✅ Complete
**Agent**: Backend Implementation (Terminal 2)
**Date**: 2025-10-07

---

## Database Schema

### SavedPost Model

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

**Relations Added**:
- `User.savedPosts` → `SavedPost[]`
- `Post.savedBy` → `SavedPost[]`

---

## API Endpoints

### 1. Save Post
**Endpoint**: `POST /api/posts/:postId/save`
**Authentication**: Required (JWT)

### 2. Unsave Post
**Endpoint**: `DELETE /api/posts/:postId/save`
**Authentication**: Required (JWT)

### 3. Get Saved Posts
**Endpoint**: `GET /api/posts/saved`
**Query**: `?limit=20&offset=0&sort=recent`

### 4. Batch Check Saved Status
**Endpoint**: `POST /api/posts/saved/check`
**Body**: `{ "postIds": [...] }`

---

## Agent Signal
**Status**: ✅ Backend implementation complete
**Next**: Agent 3 (Frontend) can begin implementation

**Files Changed**:
- backend/prisma/schema.prisma
- backend/prisma/migrations/20251007_add_saved_posts/migration.sql  
- backend/src/routes/posts.ts (4 new endpoints)

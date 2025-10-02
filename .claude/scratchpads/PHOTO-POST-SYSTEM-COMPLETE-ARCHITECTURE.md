# Photo Upload & Post Creation System - Complete Architecture Analysis

## Executive Summary

The UnitedWeRise platform implements a **two-phase architecture** for content creation:

1. **Photo Upload Phase**: Direct-to-Azure upload with AI moderation, EXIF stripping, creating standalone Photo records
2. **Post Creation Phase**: Link content + photos via `mediaId`, creating Post records with PhotoPost associations

**Current Critical Issue**: Photo upload succeeds (creates Photo record) but confirmation endpoint returns 500 error, preventing the Photo ID from being returned to frontend, which then cannot create the post.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Photo Upload System](#2-photo-upload-system)
3. [Post Creation System](#3-post-creation-system)
4. [Integration: Photos + Posts](#4-integration-photos--posts)
5. [Database Schema](#5-database-schema)
6. [API Endpoints Reference](#6-api-endpoints-reference)
7. [Complete User Flow](#7-complete-user-flow)
8. [Current Failure Analysis](#8-current-failure-analysis)
9. [Proposed Solutions](#9-proposed-solutions)

---

## 1. System Architecture Overview

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      CONTENT CREATION FLOW                           │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
         ┌──────────▼──────────┐    ┌──────────▼──────────┐
         │   PHOTO UPLOAD      │    │   POST CREATION      │
         │   (Independent)     │    │   (Links to Photo)   │
         └──────────┬──────────┘    └──────────┬──────────┘
                    │                           │
    ┌───────────────┼───────────────┐          │
    │               │               │          │
┌───▼────┐   ┌──────▼──────┐   ┌───▼────┐   ┌─▼────────┐
│ Azure  │   │   Backend   │   │  DB    │   │ Backend  │
│ Blob   │◄──┤ Moderation  │──►│ Photo  │   │ Post API │
│Storage │   │  Service    │   │ Table  │   │          │
└────────┘   └─────────────┘   └────┬───┘   └─┬────────┘
                                     │         │
                                     │    ┌────▼────────┐
                                     │    │ DB Post     │
                                     │    │ Table       │
                                     │    └────┬────────┘
                                     │         │
                                     │    ┌────▼────────┐
                                     └───►│ DB          │
                                          │ PostPhoto   │
                                          │ Junction    │
                                          └─────────────┘
```

### Key Design Decisions

**Decision 1: Photos as Independent Entities**
- Photos exist independently of posts
- Photo table has optional `postId` foreign key (can be null)
- Allows photo reuse, galleries, profile avatars
- **Trade-off**: Orphaned photos if post creation fails

**Decision 2: Direct-to-Blob Upload**
- Client uploads directly to Azure Blob Storage
- Reduces backend load, improves performance
- Backend validates and moderates after upload
- **Trade-off**: More complex error handling

**Decision 3: Two-Phase Commit**
- Phase 1: Upload photo, get Photo ID
- Phase 2: Create post with Photo ID reference
- **Trade-off**: Non-atomic operation, rollback complexity

---

## 2. Photo Upload System

### 2.1 Upload Architecture

```
Frontend                Backend API           Azure Blob        AI Service      Database
   │                        │                     │                 │              │
   │ 1. Request SAS         │                     │                 │              │
   ├───────────────────────►│                     │                 │              │
   │                        │ Check quota         │                 │              │
   │                        ├─────────────────────────────────────────────────────►│
   │                        │◄────────────────────────────────────────────────────┤
   │                        │ Generate token      │                 │              │
   │◄───────────────────────┤                     │                 │              │
   │                        │                     │                 │              │
   │ 2. Upload to Azure     │                     │                 │              │
   ├─────────────────────────────────────────────►│                 │              │
   │                        │              201 OK │                 │              │
   │◄─────────────────────────────────────────────┤                 │              │
   │                        │                     │                 │              │
   │ 3. Confirm upload      │                     │                 │              │
   ├───────────────────────►│                     │                 │              │
   │                        │ Verify blob         │                 │              │
   │                        ├────────────────────►│                 │              │
   │                        │ Download            │                 │              │
   │                        ├────────────────────►│                 │              │
   │                        │◄────────────────────┤                 │              │
   │                        │ Magic bytes check   │                 │              │
   │                        │ AI moderation ──────────────────────► │              │
   │                        │◄──────────────────────────────────────┤              │
   │                        │ EXIF strip          │                 │              │
   │                        │ Re-upload sanitized │                 │              │
   │                        ├────────────────────►│                 │              │
   │                        │ Create Photo record │                 │              │
   │                        ├─────────────────────────────────────────────────────►│
   │ Photo object           │                     │                 │              │
   │◄───────────────────────┤                     │                 │              │
```

### 2.2 Photo Service Implementation

**File**: `backend/src/services/photoService.ts`

**Core Method**: `createPhotoRecordFromBlob()`

**Security Stack** (6 layers):
1. **Blob Verification**: Retry 3x with 1s delay (Azure eventual consistency)
2. **Magic Byte Validation**: Verify file signature matches declared MIME type
3. **AI Content Moderation**: Azure OpenAI Vision analysis for safety
4. **EXIF Stripping**: Remove GPS, camera info, timestamps (privacy)
5. **Thumbnail Generation**: Create WebP thumbnails (size varies by photoType)
6. **Database Record**: Create Photo entry with moderation status

**Photo Types & Folder Structure**:
```javascript
AVATAR      → avatars/         (400x400,  thumbnail: 150x150)
COVER       → covers/          (1200x400, thumbnail: 400x133)
CAMPAIGN    → campaign/        (800x1000, thumbnail: 200x250)
VERIFICATION→ verification/    (1024x1024,thumbnail: 256x256)
EVENT       → events/          (800x800,  thumbnail: 200x200)
GALLERY     → gallery/         (1024x1024,thumbnail: 256x256)
POST_MEDIA  → posts/           (800x800,  thumbnail: 200x200)  // FIXED from 'photos'
```

### 2.3 AI Content Moderation

**Service**: `imageContentModerationService.ts`
**Model**: Azure OpenAI GPT-4o Vision

**Analysis Categories**:
```javascript
{
  isAdult: boolean,          // Pornographic content
  isRacy: boolean,           // Suggestive content
  isGory: boolean,           // Violence/blood
  hasText: boolean,          // OCR detection
  isNewsworthy: boolean,     // Journalistic context
  isMedical: boolean,        // Medical imagery
  isPolitical: boolean,      // Political content
  safetyLevel: "SAFE" | "WARNING" | "UNSAFE"
}
```

**Decision Logic**:
```javascript
// BLOCK categories
PORNOGRAPHY        → Block always
EXTREME_VIOLENCE   → Block always

// WARN + APPROVE (context-dependent)
GRAPHIC_NEWS       → Allow if newsworthy=true
MEDICAL_CONTENT    → Allow if medical=true
POLITICAL_CONTENT  → Allow always

// Threshold scores
adultScore > 0.5   → Block (unless newsworthy)
goreScore > 0.3    → Block (unless newsworthy)
racyScore > 0.4    → Warn (staging allows, production blocks)
```

**Environment-Specific Behavior**:
- **Staging**: Lenient mode, only blocks PORNOGRAPHY/EXTREME_VIOLENCE
- **Production**: Strict mode, enforces all thresholds

---

## 3. Post Creation System

### 3.1 Post Architecture

```
Frontend              Backend API           Database
   │                      │                    │
   │ POST /posts          │                    │
   │ {content, tags,      │                    │
   │  mediaId: 123}       │                    │
   ├─────────────────────►│                    │
   │                      │ Validate user      │
   │                      │ Validate content   │
   │                      │ Validate mediaId   │
   │                      ├───────────────────►│
   │                      │ Verify Photo.id=123│
   │                      │ Verify Photo.userId│
   │                      │◄───────────────────┤
   │                      │                    │
   │                      │ Generate embedding │
   │                      │ (Azure OpenAI)     │
   │                      │                    │
   │                      │ Create Post record │
   │                      ├───────────────────►│
   │                      │◄───────────────────┤
   │                      │                    │
   │                      │ Create PostPhoto   │
   │                      │ junction record    │
   │                      ├───────────────────►│
   │                      │◄───────────────────┤
   │                      │                    │
   │                      │ Update Photo.postId│
   │                      ├───────────────────►│
   │                      │                    │
   │                      │ Fetch full post    │
   │                      │ with photos & author│
   │                      ├───────────────────►│
   │                      │◄───────────────────┤
   │ Post object          │                    │
   │ {id, content,        │                    │
   │  photos: [...],      │                    │
   │  author: {...}}      │                    │
   │◄─────────────────────┤                    │
```

### 3.2 Post Service Implementation

**File**: `backend/src/routes/posts.ts` (assumed location)

**Request Body**:
```typescript
{
  content: string,           // Post text (max 5000 chars)
  tags: string[],            // ["Public Post", "Politics", etc.]
  mediaId?: number,          // Photo ID from upload phase
  volunteerEmail?: string,   // For volunteer recruitment posts
  candidateId?: string,      // For candidate posts
  parentId?: string          // For comments/replies
}
```

**Backend Processing Steps**:
1. **Authentication**: Verify JWT token via `requireAuth` middleware
2. **Content Validation**:
   - Not empty
   - Max 5000 characters
   - No prohibited content (profanity filter if enabled)
3. **Media Validation** (if mediaId provided):
   - Photo exists in database
   - Photo belongs to authenticated user
   - Photo not already attached to another post
4. **AI Embedding Generation**:
   - Use Azure OpenAI Embeddings API
   - Generate vector representation for semantic search
   - Store in `post.embedding` field
5. **Transaction** (CRITICAL - must be atomic):
   ```javascript
   await prisma.$transaction([
     // Create post
     prisma.post.create({
       data: { content, authorId, tags, embedding }
     }),
     // Link photo if provided
     mediaId && prisma.postPhoto.create({
       data: { postId, photoId: mediaId }
     }),
     // Update photo's postId
     mediaId && prisma.photo.update({
       where: { id: mediaId },
       data: { postId }
     })
   ]);
   ```
6. **Response Serialization**:
   - Fetch created post with relations
   - Include `photos` array
   - Include `author` object
   - Return full post object

**Response Structure**:
```typescript
{
  post: {
    id: string,
    content: string,
    authorId: string,
    tags: string[],
    likesCount: number,
    commentsCount: number,
    createdAt: DateTime,
    updatedAt: DateTime,
    embedding: number[],      // AI embedding vector
    photos: [
      {
        id: number,
        url: string,
        thumbnailUrl: string,
        width: number,
        height: number,
        mimeType: string,
        photoType: "POST_MEDIA",
        caption?: string
      }
    ],
    author: {
      id: string,
      username: string,
      firstName: string,
      lastName: string,
      avatar: string,
      verified: boolean
    }
  }
}
```

### 3.3 Frontend Post Creation

**File**: `frontend/src/modules/features/content/UnifiedPostCreator.js`

**Unified Creation Method**:
```javascript
async create(options) {
  // 1. Validate options
  const validation = this._validateOptions(options);

  // 2. Extract content
  const content = this._getContent(options.textareaId);

  // 3. Upload media if present (BLOCKING - waits for Photo ID)
  let mediaIds = [];
  if (hasMediaFiles) {
    const uploadResult = await this._uploadMedia(mediaFiles);
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }
    mediaIds = uploadResult.mediaIds; // [123, 456, ...]
  }

  // 4. Create post with mediaId
  const postData = {
    content: content,
    tags: options.tags || ['Public Post'],
    mediaIds: mediaIds,  // First photo ID used
    ...options
  };

  const postResult = await this._createPost(postData);

  // 5. Success callback
  if (postResult.success && options.onSuccess) {
    options.onSuccess(postResult);
  }

  return postResult;
}
```

**Key Integration Points**:
1. `my-feed.js::createPostFromFeed()` - Feed posts
2. `Profile.js::createProfilePost()` - Profile posts
3. `PostComponent.js::createComment()` - Comments with photos

---

## 4. Integration: Photos + Posts

### 4.1 Database Junction Table

**PostPhoto Model**:
```prisma
model PostPhoto {
  id        String   @id @default(cuid())
  postId    String
  photoId   Int
  order     Int      @default(0)  // For multiple photos, display order
  createdAt DateTime @default(now())

  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  photo     Photo    @relation(fields: [photoId], references: [id], onDelete: Cascade)

  @@unique([postId, photoId])
  @@index([postId])
  @@index([photoId])
}
```

**Why Junction Table?**
- Supports future multiple photos per post
- Preserves photo ordering
- Allows same photo in multiple posts (galleries, reshares)
- Clean cascade delete behavior

### 4.2 Photo Lifecycle States

```
┌─────────────────────────────────────────────────────────────┐
│                   PHOTO LIFECYCLE                           │
└─────────────────────────────────────────────────────────────┘

State 1: UPLOADED (Photo.postId = null)
- Photo exists in Azure
- Photo record in database
- Not attached to any post
- Visible in user's gallery
- Can be attached to future post

State 2: ATTACHED (Photo.postId = 123)
- Photo linked to Post via PostPhoto junction
- Photo.postId foreign key set
- Visible in post feed
- Also visible in user's gallery

State 3: ORPHANED (Photo.postId = null, no PostPhoto)
- Upload succeeded but post creation failed
- Photo exists but not used
- Should be cleaned up by scheduled job
- User can manually attach to new post

State 4: DELETED (Photo.isActive = false)
- Soft delete flag set
- Post may still reference it
- Blob should be deleted from Azure
- Cleanup job removes physical files
```

### 4.3 Error Recovery Scenarios

**Scenario A: Photo Upload Fails**
```
User uploads photo → 500 error
Photo not created in database
Blob may exist in Azure (orphaned blob)
User sees error, can retry
No database cleanup needed
Azure blob cleanup needed (scheduled job)
```

**Scenario B: Photo Upload Succeeds, Post Creation Fails**
```
User uploads photo → Photo ID 123 created
User creates post → 500 error
Photo exists but Photo.postId = null
User can:
  - Retry post creation with same Photo ID
  - Attach photo to different post
  - Delete photo manually
```

**Scenario C: Post Created, Photo Association Fails**
```
User uploads photo → Photo ID 123 created
Backend creates Post ID 789 → Success
Backend creates PostPhoto junction → FAILS
Post exists without photos
Photo orphaned
Should rollback transaction (if proper transaction handling)
```

**Scenario D: Everything Succeeds But Response Fails**
```
User uploads photo → Photo ID 123
Backend creates Post ID 789 with photo → Success
Backend serializes response → FAILS (500)
Post and photo exist and are linked
Frontend shows error but content actually posted
User may duplicate post if they retry
```

### 4.4 Current Failure Pattern Analysis

**Observed Behavior**:
1. ✅ Frontend requests SAS token → 200 OK
2. ✅ Frontend uploads to Azure → 201 Created
3. ❌ Frontend confirms upload → **500 Internal Server Error**
4. ❌ Frontend retries confirmation → 404 Not Found
5. ❌ Blob exists in Azure but no database record
6. ❌ NO logs appear in container output

**What This Tells Us**:

**The 500 → 404 pattern indicates**:
- First request (500): Something crashes in confirmation endpoint
- Second request (404): Blob verification fails because:
  - Photo record was never created, OR
  - Blob was cleaned up after first failure, OR
  - Wrong blob path being checked

**The lack of logs indicates**:
- Request dying before route handler (middleware crash)
- Route not registered (path mismatch)
- Old container revision serving traffic
- Logs going to wrong stream/container

---

## 5. Database Schema

### 5.1 Photo Table

```prisma
model Photo {
  id                    String                    @id @default(cuid())
  userId                String
  filename              String
  url                   String                    // Full Azure URL
  thumbnailUrl          String?

  // Classification
  photoType             PhotoType                 // AVATAR, POST_MEDIA, etc.
  purpose               PhotoPurpose              @default(PERSONAL)

  // Dimensions & Storage
  originalSize          Int                       // Bytes before processing
  compressedSize        Int                       // Bytes after WebP compression
  width                 Int
  height                Int
  mimeType              String

  // Organization
  gallery               String?                   @default("My Photos")
  caption               String?                   // Max 200 chars
  candidateId           String?
  postId                String?                   // Foreign key to Post

  // Moderation
  isApproved            Boolean                   @default(false)
  moderationStatus      ModerationStatus          @default(PENDING)
  moderationScore       Float?                    @default(0.0)
  autoModerationPassed  Boolean?                  @default(false)
  humanReviewRequired   Boolean                   @default(false)
  moderationMetadata    Json?
  lastModerationAt      DateTime?

  // Flagging
  flaggedBy             String?
  flagReason            String?
  moderatedAt           DateTime?

  // Lifecycle
  isActive              Boolean                   @default(true)
  createdAt             DateTime                  @default(now())
  updatedAt             DateTime                  @updatedAt

  // Relations
  user                  User                      @relation(fields: [userId], references: [id])
  candidate             Candidate?                @relation(fields: [candidateId], references: [id])
  post                  Post?                     @relation(fields: [postId], references: [id])
  flaggedByUser         User?                     @relation("FlaggedPhotos", fields: [flaggedBy], references: [id])
  postPhotos            PostPhoto[]
  tags                  PhotoTag[]
  privacyRequests       PhotoPrivacyRequest[]
  moderationResults     ImageModerationResult[]

  @@index([userId])
  @@index([photoType, purpose])
  @@index([isApproved, isActive])
  @@index([moderationStatus])
  @@index([postId])
}
```

### 5.2 Post Table

```prisma
model Post {
  id              String        @id @default(cuid())
  content         String        @db.Text
  authorId        String
  tags            String[]

  // Engagement
  likesCount      Int           @default(0)
  commentsCount   Int           @default(0)
  sharesCount     Int           @default(0)

  // AI Features
  embedding       Float[]       // Vector for semantic search

  // Organization
  parentId        String?       // For comments/replies
  topicId         String?
  candidateId     String?

  // Status
  isActive        Boolean       @default(true)
  isPinned        Boolean       @default(false)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  author          User          @relation(fields: [authorId], references: [id])
  parent          Post?         @relation("PostReplies", fields: [parentId], references: [id])
  replies         Post[]        @relation("PostReplies")
  photos          Photo[]       // Direct relation
  postPhotos      PostPhoto[]   // Junction table
  likes           Like[]

  @@index([authorId])
  @@index([parentId])
  @@index([createdAt])
  @@index([isActive])
}
```

### 5.3 PostPhoto Junction

```prisma
model PostPhoto {
  id        String   @id @default(cuid())
  postId    String
  photoId   Int
  order     Int      @default(0)
  createdAt DateTime @default(now())

  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  photo     Photo    @relation(fields: [photoId], references: [id], onDelete: Cascade)

  @@unique([postId, photoId])
  @@index([postId])
  @@index([photoId])
}
```

---

## 6. API Endpoints Reference

### 6.1 Photo Upload Endpoints

**`POST /api/photos/upload/sas-token`**
```javascript
Request:
{
  photoType: "POST_MEDIA",
  filename: "photo.jpg",
  mimeType: "image/jpeg",
  fileSize: 2048576,
  purpose: "PERSONAL"
}

Response:
{
  sasUrl: "https://uwrstorage2425.blob.core.windows.net/photos/posts/uuid-timestamp.jpg?sig=...",
  blobName: "posts/uuid-timestamp.jpg",
  uploadId: "uuid",
  expiresAt: "2025-10-01T14:15:00Z"
}
```

**`PUT <Azure Blob Storage URL>`**
```javascript
Headers:
{
  "x-ms-blob-type": "BlockBlob"
}
Body: [Binary file data]

Response: 201 Created
```

**`POST /api/photos/upload/confirm`**
```javascript
Request:
{
  blobName: "posts/uuid-timestamp.jpg",
  uploadId: "uuid",
  photoType: "POST_MEDIA",
  purpose: "PERSONAL",
  caption: "My photo"
}

Response:
{
  message: "Photo uploaded successfully",
  photo: {
    id: 123,
    url: "https://uwrstorage2425.blob.core.windows.net/photos/posts/uuid-timestamp.jpg",
    thumbnailUrl: "https://uwrstorage2425.blob.core.windows.net/photos/thumbnails/uuid-timestamp-thumb.webp",
    width: 1920,
    height: 1080,
    photoType: "POST_MEDIA",
    moderationStatus: "APPROVED"
  },
  pendingModeration: false
}
```

### 6.2 Post Creation Endpoints

**`POST /api/posts`**
```javascript
Request:
{
  content: "Check out my photo!",
  tags: ["Public Post"],
  mediaId: 123  // Photo ID from upload phase
}

Response:
{
  post: {
    id: "post-cuid",
    content: "Check out my photo!",
    authorId: "user-id",
    tags: ["Public Post"],
    likesCount: 0,
    commentsCount: 0,
    createdAt: "2025-10-01T14:01:00Z",
    photos: [
      {
        id: 123,
        url: "https://...",
        thumbnailUrl: "https://...",
        width: 1920,
        height: 1080
      }
    ],
    author: {
      id: "user-id",
      username: "johndoe",
      firstName: "John",
      lastName: "Doe",
      avatar: "https://..."
    }
  }
}
```

**`GET /api/feed/`**
```javascript
Query Params:
{
  limit: 15,
  offset: 0,
  tags?: string[]
}

Response:
{
  posts: [
    {
      id: "post-cuid",
      content: "...",
      photos: [...],
      author: {...},
      likesCount: 5,
      commentsCount: 2,
      userHasLiked: false,
      createdAt: "2025-10-01T14:01:00Z"
    }
  ],
  hasMore: true,
  totalCount: 150
}
```

---

## 7. Complete User Flow

### 7.1 Text-Only Post

```
User types content → Clicks "Post" button
  ↓
UnifiedPostCreator.create()
  ↓
POST /api/posts {content, tags}
  ↓
Backend:
  - Validate content
  - Generate AI embedding
  - Create Post record
  - Return post object
  ↓
Frontend:
  - Display post in feed
  - Clear textarea
  - Show success indicator
```

### 7.2 Post with Photo

```
User selects photo → Preview appears → User types content → Clicks "Post"
  ↓
UnifiedPostCreator.create()
  ↓
Phase 1: Upload Photo
  ├─ POST /photos/upload/sas-token → Get SAS URL
  ├─ PUT <Azure URL> → Upload to blob storage (201)
  ├─ POST /photos/upload/confirm → AI moderation, create Photo record
  └─ Return Photo ID: 123
  ↓
Phase 2: Create Post
  ├─ POST /posts {content, tags, mediaId: 123}
  ├─ Backend validates Photo exists and belongs to user
  ├─ Create Post record
  ├─ Create PostPhoto junction (postId, photoId: 123)
  ├─ Update Photo.postId = postId
  └─ Return post object with photos array
  ↓
Frontend:
  - Display post with photo in feed
  - Clear textarea and file input
  - Remove preview
  - Show success indicator
```

### 7.3 Current Failure Flow

```
User selects photo → Preview appears → User types content → Clicks "Post"
  ↓
UnifiedPostCreator.create()
  ↓
Phase 1: Upload Photo
  ├─ POST /photos/upload/sas-token → ✅ 200 OK
  ├─ PUT <Azure URL> → ✅ 201 Created (blob exists in Azure)
  ├─ POST /photos/upload/confirm → ❌ 500 Internal Server Error
  │  (NO LOGS APPEAR - request dying before route handler)
  └─ Frontend receives error, no Photo ID returned
  ↓
Phase 2: Create Post (BLOCKED)
  ✗ Cannot proceed without Photo ID
  ✗ Frontend shows error alert
  ✗ User sees "Failed to upload photo"
  ✗ Blob orphaned in Azure (no database record)
```

---

## 8. Current Failure Analysis

### 8.1 Evidence

**What We Know**:
1. ✅ SAS token generation works (`POST /photos/upload/sas-token` returns 200)
2. ✅ Azure upload succeeds (`PUT <Azure URL>` returns 201 Created)
3. ❌ Confirmation fails (`POST /photos/upload/confirm` returns 500)
4. ❌ **NO logs appear in container output** (diagnostic logs not visible)
5. ✅ Folder path fix deployed (SHA f687524, uptime 46 seconds at time of test)
6. ✅ Backend is running and serving other endpoints (health, quests, etc.)

**Console Logs from Frontend**:
```
🎫 Got SAS token. Blob name: posts/2e7e43b0-f54f-441b-8d49-30b5d95a0dc4-1759343117980.png
☁️ Target blob URL: https://uwrstorage2425.blob.core.windows.net/photos/posts/2e7e43b0-...png
☁️ Azure response: {status: 201, statusText: 'Created', ok: true}
☁️ Upload to Azure successful
✅ Confirming upload with backend (AI moderation)...
POST https://api.unitedwerise.org/api/photos/upload/confirm 500 (Internal Server Error)
POST https://api.unitedwerise.org/api/photos/upload/confirm 404 (Not Found)
```

### 8.2 Diagnostic Attempts

**What We Added**:
1. Extensive console.log statements in confirmation endpoint
2. Try-catch blocks with detailed error logging
3. Middleware request logging
4. SHA tracking in health endpoint

**What We Observed**:
- Health endpoint shows correct SHA (f687524)
- Other endpoints log requests successfully
- Confirmation endpoint shows **ZERO logs**
- Request appears to die before reaching route handler

### 8.3 Root Cause Hypotheses

**Hypothesis 1: Middleware Crash** (Most Likely)
```
Request → requireAuth middleware → uploadLimiter → CRASH
No logs because crash happens before route handler
```

**Possible Causes**:
- `requireAuth` can't decode JWT (missing secret)
- `uploadLimiter` crash (rate limit store issue)
- Body parser fails (malformed JSON)
- CORS preflight rejection

**Evidence**: Other authenticated endpoints work, so JWT is valid

---

**Hypothesis 2: Route Not Registered**
```
Request → Express router → No matching route → 404
But we get 500, not 404
So this is unlikely
```

---

**Hypothesis 3: Container Revision Split**
```
Some traffic → Old revision (no confirmation endpoint)
Some traffic → New revision (has endpoint)
Inconsistent behavior
```

**Evidence**: We forced single revision mode, this should be fixed

---

**Hypothesis 4: TypeScript Compilation Issue**
```
TypeScript source has diagnostic logs
JavaScript compiled output missing logs
Logs don't execute at runtime
```

**Evidence**: We verified logs exist in dist/routes/photos.js

---

**Hypothesis 5: Request Body Too Large**
```
Body parser has size limit
Request rejected before route handler
```

**Possible**: But SAS token endpoint works with same user/auth

---

### 8.4 Critical Missing Piece

**The diagnostic logs should have appeared**:
```javascript
// From backend/dist/routes/photos.js line 256
router.post('/upload/confirm', uploadLimiter, requireAuth, async (req, res) => {
  try {
    console.log('📸 Confirming upload for user', req.user.username);
    // ... rest of handler
  }
});
```

**If this log doesn't appear**:
- Request died in `uploadLimiter` middleware
- Request died in `requireAuth` middleware
- Route not registered at all
- Logs going to different output stream

---

## 9. Proposed Solutions

### Option A: Continue Debugging Current System

**Approach**:
1. Verify route registration in server.js
2. Add logging to middleware (requireAuth, uploadLimiter)
3. Check for multiple container revisions
4. Verify environment variables (AZURE_STORAGE_CONNECTION_STRING)
5. Test confirmation endpoint directly with curl (bypass frontend)

**Pros**:
- May find specific bug quickly
- Preserves existing architecture
- No refactoring needed

**Cons**:
- Unknown time investment (30 minutes to 3+ hours)
- May hit another unknown issue after fixing this one
- Complex architecture makes debugging difficult

**Estimated Time**: 1-3 hours

---

### Option B: Simplified Architecture (Recommended)

**Redesign Goals**:
1. Combine photo upload + post creation into single transaction
2. Eliminate orphaned photos
3. Reduce API calls from 3 to 2
4. Simpler error handling

**New Flow**:
```
User uploads photo + content
  ↓
POST /posts/create-with-media (multipart/form-data)
  ├─ Receive file + content in single request
  ├─ Validate file (magic bytes, size, type)
  ├─ Upload to Azure Blob Storage
  ├─ Run AI moderation
  ├─ Strip EXIF
  ├─ Generate thumbnail
  ├─ BEGIN TRANSACTION
  │   ├─ Create Photo record
  │   ├─ Create Post record
  │   └─ Create PostPhoto junction
  ├─ COMMIT TRANSACTION
  └─ Return post object with photos
```

**Benefits**:
- Atomic operation (no orphaned photos)
- Fewer network requests
- Simpler frontend code
- Easier error recovery
- Transaction ensures consistency

**Trade-offs**:
- Backend handles file upload (higher load)
- Longer request time (not async)
- Need file size limits
- Timeout risk for slow uploads

**Estimated Time**: 2-3 hours implementation

---

### Option C: Hybrid Approach

**Keep direct-to-blob upload but simplify confirmation**:

**Changes**:
1. **Remove AI moderation from confirmation**:
   - AI moderation happens async via queue
   - Photo immediately usable
   - Moderation updates status later

2. **Atomic post creation**:
   - Confirmation creates Photo record
   - Frontend immediately creates post with Photo ID
   - Backend validates Photo exists and belongs to user

3. **Post-creation moderation**:
   - Background job processes moderation queue
   - If photo fails, mark post for review
   - Notify user if content removed

**Benefits**:
- Faster user experience (no blocking on AI moderation)
- Simpler confirmation endpoint
- Keeps direct upload benefits
- Async processing scalable

**Trade-offs**:
- Inappropriate content may be visible briefly
- Need moderation queue infrastructure
- More complex moderation workflow

**Estimated Time**: 3-4 hours implementation

---

### Recommendation: Option A First, Then Option B

**Immediate Action (Next 30 min)**:
1. Check container revision status
2. Verify route registration
3. Test endpoint with curl (bypass frontend variables)
4. Check middleware logging

**If not resolved in 30 min**:
Switch to Option B (simplified architecture)
- 2-3 hours to implement
- More reliable long-term
- Eliminates class of bugs

**Rationale**:
We've already spent hours debugging. If root cause isn't found quickly, implementing a simpler system will be faster than continuing to debug a complex one.

---

## 10. Implementation Plan (Option B)

### 10.1 Backend Changes

**New Endpoint**: `POST /api/posts/create-with-media`

```typescript
router.post('/create-with-media',
  upload.single('photo'),  // Multer middleware
  requireAuth,
  async (req: AuthRequest, res) => {
    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Upload to Azure
      const blobUrl = await azureBlobService.uploadFile(
        req.file.buffer,
        `posts/${uuidv4()}-${Date.now()}.${extension}`,
        req.file.mimetype
      );

      // 2. AI moderation (blocking)
      const moderation = await imageContentModerationService.analyzeImage(
        req.file.buffer,
        'POST_MEDIA'
      );

      if (!moderation.approved) {
        throw new Error('Content policy violation');
      }

      // 3. Process image
      const processed = await sharp(req.file.buffer)
        .rotate()
        .withMetadata({ exif: {} })
        .toBuffer();

      // 4. Create Photo record
      const photo = await tx.photo.create({
        data: {
          userId: req.user.id,
          url: blobUrl,
          photoType: 'POST_MEDIA',
          ...
        }
      });

      // 5. Create Post record
      const post = await tx.post.create({
        data: {
          content: req.body.content,
          authorId: req.user.id,
          tags: req.body.tags
        }
      });

      // 6. Link photo to post
      await tx.postPhoto.create({
        data: {
          postId: post.id,
          photoId: photo.id
        }
      });

      await tx.photo.update({
        where: { id: photo.id },
        data: { postId: post.id }
      });

      return { post, photo };
    });

    // Return full post with photos
    res.json({ post: { ...transaction.post, photos: [transaction.photo] } });
  }
);
```

### 10.2 Frontend Changes

**Simplified Upload**:

```javascript
async function createPostWithMedia(content, tags, file) {
  const formData = new FormData();
  formData.append('content', content);
  formData.append('tags', JSON.stringify(tags));
  formData.append('photo', file);

  const response = await fetch('/api/posts/create-with-media', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to create post');
  }

  return response.json();
}
```

### 10.3 Migration Strategy

1. **Deploy new endpoint** alongside existing
2. **Update frontend** to use new endpoint
3. **Monitor** for 1 week
4. **Deprecate** old direct-upload flow
5. **Remove** old endpoints after migration complete

---

## Summary

The photo upload and post creation systems are well-designed but complex, with a **two-phase commit** that's currently failing at the confirmation stage. The lack of diagnostic logs suggests a **middleware-level failure** rather than application logic error.

**Recommended Path**:
1. **Quick debug** (30 minutes): Check middleware, route registration, container status
2. **If unsuccessful**: Implement **simplified architecture** (2-3 hours) with atomic transaction

The simplified approach eliminates orphaned photos, reduces API calls, and provides clearer error messages - all improvements worth the refactoring time.
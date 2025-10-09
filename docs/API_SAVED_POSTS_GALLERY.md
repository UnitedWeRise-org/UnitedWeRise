# Saved Posts & Gallery API Reference

**Status**: ✅ Production Ready
**Last Updated**: 2025-10-09
**Version**: 1.0.0

## Overview

This API provides comprehensive functionality for managing saved posts (bookmarks) and photo galleries. Users can save posts for later reading, organize photos into galleries, and manage profile pictures with complete AI moderation and security.

**Key Features:**
- Idempotent save/unsave operations
- Batch saved status checking for feed optimization
- Photo gallery organization with custom gallery names
- AI-powered content moderation for all uploads
- EXIF metadata stripping for privacy
- WebP conversion for optimal performance
- Profile picture management

---

## Saved Posts System

### Database Model

The `SavedPost` model provides a many-to-many relationship between users and posts with timestamp tracking:

```prisma
model SavedPost {
  id        String   @id @default(uuid())
  userId    String
  postId    String
  savedAt   DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([userId, postId])  // Prevents duplicate saves
  @@index([userId])            // Fast user queries
  @@index([postId])            // Fast post queries
  @@index([savedAt])           // Chronological sorting
}
```

**Important Constraints:**
- **Unique Constraint**: `[userId, postId]` ensures a user can only save a post once
- **Cascade Deletes**: Saved posts are automatically removed if user or post is deleted
- **Indexes**: Optimized for listing saved posts, checking save status, and sorting

---

### API Endpoints

#### POST /api/posts/:postId/save

Save a post to the user's saved collection (bookmarks).

**Authentication:** Required

**Path Parameters:**
- `postId` (string, required): The ID of the post to save

**Request Body:** None

**Response Schema:**

```typescript
{
  success: boolean;
  data: {
    saved: true;
    savedAt: string; // ISO 8601 datetime
  }
}
```

**Idempotent Behavior:**

This endpoint uses Prisma's `upsert` operation to ensure idempotency. If the post is already saved:
- The `savedAt` timestamp is updated to the current time
- No duplicate record is created
- Response indicates success with updated timestamp

**Implementation Detail:**

```typescript
const savedPost = await prisma.savedPost.upsert({
  where: {
    userId_postId: { userId, postId }
  },
  update: {
    savedAt: new Date() // Update timestamp if already saved
  },
  create: {
    userId,
    postId
  }
});
```

**Example Request:**

```bash
curl -X POST https://dev-api.unitedwerise.org/api/posts/cm1abc123/save \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "saved": true,
    "savedAt": "2025-10-09T14:32:15.123Z"
  }
}
```

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 401 | Unauthorized | Missing or invalid JWT token |
| 404 | Post not found | The specified post does not exist |
| 500 | Failed to save post | Server error during save operation |

---

#### DELETE /api/posts/:postId/save

Remove a post from the user's saved collection.

**Authentication:** Required

**Path Parameters:**
- `postId` (string, required): The ID of the post to unsave

**Request Body:** None

**Response Schema:**

```typescript
{
  success: boolean;
  data: {
    saved: false;
  }
}
```

**Idempotent Behavior:**

This endpoint uses `deleteMany` instead of `delete` to ensure idempotency:
- If the post is not saved, no error is thrown
- Always returns success with `saved: false`
- Safe to call multiple times

**Example Request:**

```bash
curl -X DELETE https://dev-api.unitedwerise.org/api/posts/cm1abc123/save \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "saved": false
  }
}
```

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 401 | Unauthorized | Missing or invalid JWT token |
| 500 | Failed to unsave post | Server error during unsave operation |

---

#### GET /api/posts/saved

Retrieve the user's saved posts with pagination and sorting.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Number of posts per page (max: 100) |
| `offset` | integer | 0 | Number of posts to skip for pagination |
| `sort` | string | 'recent' | Sort order: 'recent', 'oldest', or 'popular' |

**Sort Options Explained:**

- **recent**: Most recently saved posts first (`savedAt DESC`)
- **oldest**: Oldest saved posts first (`savedAt ASC`)
- **popular**: Sorted by post engagement (`likesCount DESC` on the underlying post)

**Response Schema:**

```typescript
{
  success: boolean;
  data: {
    posts: Array<{
      id: string;
      content: string;
      extendedContent: string | null;
      createdAt: string;
      updatedAt: string;
      likesCount: number;
      commentsCount: number;
      sharesCount: number;
      viewsCount: number;
      author: {
        id: string;
        username: string;
        displayName: string;
        avatar: string | null;
        verified: boolean;
        politicalProfileType: string;
      };
      photos: Array<{
        id: string;
        url: string;
        thumbnailUrl: string | null;
      }>;
      // Additional post fields...
    }>;
    total: number;
    hasMore: boolean;
  }
}
```

**Example Request:**

```bash
# Get first page of recently saved posts
curl -X GET "https://dev-api.unitedwerise.org/api/posts/saved?limit=20&offset=0&sort=recent" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get popular saved posts
curl -X GET "https://dev-api.unitedwerise.org/api/posts/saved?sort=popular&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "cm1xyz789",
        "content": "Important announcement about local election...",
        "extendedContent": null,
        "createdAt": "2025-10-08T10:30:00.000Z",
        "updatedAt": "2025-10-08T10:30:00.000Z",
        "likesCount": 42,
        "commentsCount": 15,
        "sharesCount": 8,
        "viewsCount": 256,
        "author": {
          "id": "cm1user123",
          "username": "john_doe",
          "displayName": "John Doe",
          "avatar": "https://uwrstorage2425.blob.core.windows.net/avatars/xyz.webp",
          "verified": true,
          "politicalProfileType": "ELECTED_OFFICIAL"
        },
        "photos": [
          {
            "id": "cm1photo456",
            "url": "https://uwrstorage2425.blob.core.windows.net/photos/abc.webp",
            "thumbnailUrl": "https://uwrstorage2425.blob.core.windows.net/photos/abc_thumb.webp"
          }
        ]
      }
    ],
    "total": 47,
    "hasMore": true
  }
}
```

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 401 | Unauthorized | Missing or invalid JWT token |
| 500 | Failed to retrieve saved posts | Server error during query |

**Performance Notes:**

- Includes full post data with author details and photos
- Uses indexed queries for fast retrieval
- Photos filtered to only show active images (`isActive: true`)
- Efficient pagination with `take` and `skip`

---

#### POST /api/posts/saved/check

Batch check the saved status of multiple posts (optimized for feed rendering).

**Authentication:** Required

**Request Body:**

```typescript
{
  postIds: string[]; // Array of post IDs to check
}
```

**Response Schema:**

```typescript
{
  success: boolean;
  data: {
    saved: {
      [postId: string]: boolean;
    }
  }
}
```

**Use Case:**

This endpoint is designed for efficient feed rendering. Instead of querying saved status for each post individually, the frontend can batch check multiple posts in a single request.

**Example Request:**

```bash
curl -X POST https://dev-api.unitedwerise.org/api/posts/saved/check \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "postIds": ["cm1post001", "cm1post002", "cm1post003"]
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "saved": {
      "cm1post001": true,
      "cm1post002": false,
      "cm1post003": true
    }
  }
}
```

**Implementation Detail:**

```typescript
// Efficiently query saved posts in batch
const savedPosts = await prisma.savedPost.findMany({
  where: {
    userId,
    postId: { in: postIds }
  },
  select: { postId: true }
});

// Build result object with all post IDs
const saved: Record<string, boolean> = {};
postIds.forEach(postId => {
  saved[postId] = savedPosts.some(sp => sp.postId === postId);
});
```

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | postIds must be an array | Invalid request body format |
| 401 | Unauthorized | Missing or invalid JWT token |
| 500 | Failed to check saved status | Server error during query |

---

### Frontend Integration

The `SavedPostsView` component (`frontend/src/components/SavedPostsView.js`) provides a complete UI for browsing saved posts:

**Key Features:**
- Infinite scroll with lazy loading
- Empty state with instructions
- Loading indicators
- Error handling with retry
- Integration with `PostComponent` for consistent rendering

**Usage Example:**

```javascript
// Show saved posts view
window.savedPostsView.show();

// Component automatically:
// - Fetches saved posts with pagination
// - Renders posts using PostComponent
// - Handles infinite scroll
// - Marks all posts as saved (isSaved: true)
```

**API Integration:**

```javascript
// Fetch saved posts with pagination
const response = await window.apiCall(
  `/posts/saved?limit=${this.limit}&offset=${offset}`,
  { method: 'GET' }
);

const data = response.data.data;
const posts = data.posts || [];

// Mark posts as saved
posts.forEach(post => {
  post.isSaved = true;
});
```

---

## Photo Gallery System

### Database Model

The `Photo` model supports multiple photo types and gallery organization:

```prisma
model Photo {
  id                String    @id @default(uuid())
  userId            String
  postId            String?   // Optional - for post attachments
  url               String
  blobName          String
  mimeType          String    // Final type (always image/webp)
  originalMimeType  String    // Original upload type
  originalSize      Int       // Bytes before processing
  processedSize     Int       // Bytes after WebP conversion
  width             Int?
  height            Int?
  moderationStatus  String    // 'APPROVE', 'WARN', 'BLOCK'
  moderationReason  String?
  moderationConfidence Float?
  moderationType    String?   // Content type detected by AI
  exifStripped      Boolean   @default(true)
  uploadedAt        DateTime  @default(now())
  deletedAt         DateTime?
  photoType         String?   // 'AVATAR', 'GALLERY', 'POST_MEDIA'
  gallery           String?   // Gallery name for organization
  caption           String?   // Photo description
  thumbnailUrl      String?   // Optimized thumbnail
  isActive          Boolean   @default(true)

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  post              Post?     @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([postId])
  @@index([uploadedAt])
  @@index([moderationStatus])
}
```

**Photo Types:**
- **AVATAR**: Profile picture
- **GALLERY**: Personal gallery photo
- **POST_MEDIA**: Attached to a post

**Moderation Status:**
- **APPROVE**: Safe content, fully approved
- **WARN**: Potentially sensitive, shown with warning
- **BLOCK**: Rejected, not displayed

---

### API Endpoints

#### GET /api/photos/galleries

List all galleries for the authenticated user, grouped by gallery name.

**Authentication:** Required

**Query Parameters:** None

**Response Schema:**

```typescript
{
  success: boolean;
  galleries: Array<{
    name: string;
    photos: Array<{
      id: string;
      url: string;
      thumbnailUrl: string | null;
      caption: string | null;
      uploadedAt: string;
      photoType: string;
      width: number | null;
      height: number | null;
      moderationStatus: string;
    }>;
    count: number;
  }>;
}
```

**Implementation Detail:**

```typescript
const photos = await prisma.photo.findMany({
  where: {
    userId,
    isActive: true,
    photoType: { not: 'POST_MEDIA' } // Exclude post attachments
  },
  orderBy: { uploadedAt: 'desc' }
});

// Group by gallery
const galleryMap = new Map();
photos.forEach(photo => {
  const galleryName = photo.gallery || 'My Photos';
  if (!galleryMap.has(galleryName)) {
    galleryMap.set(galleryName, []);
  }
  galleryMap.get(galleryName).push(photo);
});
```

**Example Request:**

```bash
curl -X GET https://dev-api.unitedwerise.org/api/photos/galleries \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "success": true,
  "galleries": [
    {
      "name": "Campaign Photos",
      "photos": [
        {
          "id": "cm1photo001",
          "url": "https://uwrstorage2425.blob.core.windows.net/photos/abc123.webp",
          "thumbnailUrl": "https://uwrstorage2425.blob.core.windows.net/photos/abc123_thumb.webp",
          "caption": "Town hall meeting 2025",
          "uploadedAt": "2025-10-09T10:30:00.000Z",
          "photoType": "GALLERY",
          "width": 1920,
          "height": 1080,
          "moderationStatus": "APPROVE"
        }
      ],
      "count": 1
    },
    {
      "name": "My Photos",
      "photos": [
        {
          "id": "cm1photo002",
          "url": "https://uwrstorage2425.blob.core.windows.net/photos/def456.webp",
          "thumbnailUrl": null,
          "caption": null,
          "uploadedAt": "2025-10-08T15:20:00.000Z",
          "photoType": "GALLERY",
          "width": 800,
          "height": 600,
          "moderationStatus": "APPROVE"
        }
      ],
      "count": 1
    }
  ]
}
```

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 401 | Unauthorized | Missing or invalid JWT token |
| 500 | Internal server error | Database or server error |

---

#### PUT /api/photos/:photoId/gallery

Move a photo to a different gallery or rename its gallery.

**Authentication:** Required

**Path Parameters:**
- `photoId` (string, required): ID of the photo to move

**Request Body:**

```typescript
{
  gallery: string; // New gallery name (or null for default "My Photos")
}
```

**Response Schema:**

```typescript
{
  success: boolean;
  photo: any; // Updated photo record
}
```

**Security:**

Ownership verification is enforced via `updateMany`:

```typescript
const photo = await prisma.photo.updateMany({
  where: {
    id: photoId,
    userId // Verify ownership
  },
  data: { gallery }
});
```

**Example Request:**

```bash
curl -X PUT https://dev-api.unitedwerise.org/api/photos/cm1photo001/gallery \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gallery": "Campaign Photos"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "photo": {
    "count": 1
  }
}
```

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | User does not own this photo |
| 500 | Internal server error | Database or server error |

---

#### DELETE /api/photos/:photoId

Soft delete a photo (sets `isActive: false` and records deletion time).

**Authentication:** Required

**Path Parameters:**
- `photoId` (string, required): ID of the photo to delete

**Request Body:** None

**Response Schema:**

```typescript
{
  success: boolean;
}
```

**Soft Delete Behavior:**

Photos are never hard-deleted to maintain referential integrity:

```typescript
await prisma.photo.updateMany({
  where: {
    id: photoId,
    userId
  },
  data: {
    isActive: false,
    deletedAt: new Date()
  }
});
```

**Example Request:**

```bash
curl -X DELETE https://dev-api.unitedwerise.org/api/photos/cm1photo001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "success": true
}
```

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | User does not own this photo |
| 500 | Internal server error | Database or server error |

---

#### POST /api/photos/:photoId/set-profile

Set a photo as the user's profile picture (avatar).

**Authentication:** Required

**Path Parameters:**
- `photoId` (string, required): ID of the photo to set as avatar

**Request Body:** None

**Response Schema:**

```typescript
{
  success: boolean;
  avatarUrl: string; // URL of the new avatar
}
```

**Implementation:**

```typescript
const photo = await prisma.photo.findFirst({
  where: {
    id: photoId,
    userId
  }
});

if (!photo) {
  return res.status(404).json({ error: 'Photo not found' });
}

await prisma.user.update({
  where: { id: userId },
  data: { avatar: photo.url }
});
```

**Example Request:**

```bash
curl -X POST https://dev-api.unitedwerise.org/api/photos/cm1photo001/set-profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "success": true,
  "avatarUrl": "https://uwrstorage2425.blob.core.windows.net/photos/abc123.webp"
}
```

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 401 | Unauthorized | Missing or invalid JWT token |
| 404 | Photo not found | Photo does not exist or user doesn't own it |
| 500 | Internal server error | Database or server error |

---

## Photo Upload System

### 6-Layer Photo Pipeline

The photo upload system uses a pipeline architecture with six layers of processing:

**Layer 0: File Transport** - Multer handles multipart/form-data with 5MB limit

**Layer 1: Authentication** - JWT verification via `requireAuth` middleware

**Layer 2: File Validation**
- Allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp`
- Allowed extensions: `jpg`, `jpeg`, `png`, `gif`, `webp`
- Size limits: 100 bytes (min) to 5MB (max)
- Dimension limits: 10px (min) to 8000px (max)

**Layer 3: EXIF Stripping + WebP Conversion**
- Removes all EXIF metadata for privacy (GPS, camera info, timestamps)
- Converts to WebP format for optimal compression
- Preserves image quality while reducing file size

**Layer 4: AI Content Moderation**
- Azure OpenAI analyzes image content
- Detects: violence, nudity, hate symbols, spam, political extremism
- Returns moderation decision: APPROVE, WARN, or BLOCK
- Confidence scores for each category

**Layer 5: Database Persistence**
- Creates Photo record with all metadata
- Links to user and optionally to post
- Records moderation results

**Layer 6: Pipeline Architecture** - All logic extracted to `PhotoPipeline` service for reusability

---

### API Endpoints

#### POST /api/photos/upload

Upload a new photo with automatic processing and moderation.

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file (JPG, PNG, GIF, WebP) |
| `photoType` | string | No | 'AVATAR', 'GALLERY', or 'POST_MEDIA' (default: 'POST_MEDIA') |
| `gallery` | string | No | Gallery name for organization |
| `caption` | string | No | Photo description |

**Response Schema:**

```typescript
{
  success: boolean;
  data: {
    photo: {
      id: string;
      userId: string;
      url: string;
      blobName: string;
      mimeType: string;
      originalMimeType: string;
      originalSize: number;
      processedSize: number;
      width: number;
      height: number;
      moderationStatus: string;
      moderationReason: string | null;
      moderationConfidence: number;
      moderationType: string | null;
      exifStripped: boolean;
      uploadedAt: string;
      photoType: string;
      gallery: string | null;
      caption: string | null;
      thumbnailUrl: string | null;
      isActive: boolean;
    };
    moderation: {
      decision: string;        // 'APPROVE', 'WARN', 'BLOCK'
      approved: boolean;
      confidence: number;      // 0-1
      contentType: string;     // 'SAFE', 'VIOLENT', etc.
      reason: string | null;
    };
  }
}
```

**Response Headers:**

Debug headers are included for transparency:

```
X-Moderation-Decision: APPROVE
X-Moderation-Approved: true
X-Moderation-Confidence: 0.98
X-Moderation-ContentType: SAFE
X-Pipeline-Version: layer6-with-debugging
X-Request-ID: uuid-v4
```

**Moderation Status Values:**

| Status | Behavior | Use Case |
|--------|----------|----------|
| APPROVE | Display normally | Safe content |
| WARN | Show with warning overlay | Potentially sensitive |
| BLOCK | Reject upload | Policy violations |

**Example Request:**

```bash
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/photo.jpg" \
  -F "photoType=GALLERY" \
  -F "gallery=Campaign Photos" \
  -F "caption=Town hall meeting"
```

**Example Response (Successful):**

```json
{
  "success": true,
  "data": {
    "photo": {
      "id": "cm1photo789",
      "userId": "cm1user123",
      "url": "https://uwrstorage2425.blob.core.windows.net/photos/xyz789.webp",
      "blobName": "xyz789.webp",
      "mimeType": "image/webp",
      "originalMimeType": "image/jpeg",
      "originalSize": 2456789,
      "processedSize": 345678,
      "width": 1920,
      "height": 1080,
      "moderationStatus": "APPROVE",
      "moderationReason": null,
      "moderationConfidence": 0.98,
      "moderationType": "SAFE",
      "exifStripped": true,
      "uploadedAt": "2025-10-09T14:45:30.123Z",
      "photoType": "GALLERY",
      "gallery": "Campaign Photos",
      "caption": "Town hall meeting",
      "thumbnailUrl": "https://uwrstorage2425.blob.core.windows.net/photos/xyz789_thumb.webp",
      "isActive": true
    },
    "moderation": {
      "decision": "APPROVE",
      "approved": true,
      "confidence": 0.98,
      "contentType": "SAFE",
      "reason": null
    }
  }
}
```

**Example Response (Moderation Failure):**

```json
{
  "success": false,
  "error": "Content moderation failed",
  "details": "Image contains inappropriate content",
  "category": "VIOLENCE",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | No file uploaded | Missing file in request |
| 401 | Unauthorized | Missing or invalid JWT token |
| 422 | Content moderation failed | AI detected policy violation |
| 500 | Internal server error | Processing error |

**Performance Notes:**

- EXIF stripping removes privacy-sensitive metadata (GPS, camera info)
- WebP conversion typically reduces file size by 50-80%
- Moderation adds ~2-3 seconds to upload time
- Large images may take longer to process

---

#### GET /api/photos/health

Health check endpoint for monitoring the photo upload system.

**Authentication:** Not required

**Response Schema:**

```typescript
{
  status: string;           // 'ok'
  layer: number;            // 6
  description: string;
  features: {
    authentication: boolean;
    validation: boolean;
    exifStripping: boolean;
    webpConversion: boolean;
    moderation: boolean;
    database: boolean;
    pipelineArchitecture: boolean;
  };
  validation: {
    allowedTypes: string[];
    allowedExtensions: string[];
    maxSize: number;
    minSize: number;
    maxDimension: number;
    minDimension: number;
  };
  environment: {
    hasConnectionString: boolean;
    hasAccountName: boolean;
    accountName: string;
    hasAzureOpenAI: boolean;
  };
}
```

**Example Request:**

```bash
curl -X GET https://dev-api.unitedwerise.org/api/photos/health
```

**Example Response:**

```json
{
  "status": "ok",
  "layer": 6,
  "description": "Pipeline-based photo upload with reusable architecture",
  "features": {
    "authentication": true,
    "validation": true,
    "exifStripping": true,
    "webpConversion": true,
    "moderation": true,
    "database": true,
    "pipelineArchitecture": true
  },
  "validation": {
    "allowedTypes": ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
    "allowedExtensions": ["jpg", "jpeg", "png", "gif", "webp"],
    "maxSize": 5242880,
    "minSize": 100,
    "maxDimension": 8000,
    "minDimension": 10
  },
  "environment": {
    "hasConnectionString": true,
    "hasAccountName": true,
    "accountName": "uwrstorage2425",
    "hasAzureOpenAI": true
  }
}
```

---

## Complete Workflow Examples

### Example 1: Saving a Post for Later Reading

```javascript
// User clicks bookmark icon on a post
async function toggleSavePost(postId, currentlySaved) {
  if (currentlySaved) {
    // Unsave the post
    const response = await window.apiCall(`/posts/${postId}/save`, {
      method: 'DELETE'
    });

    if (response.ok) {
      console.log('Post unsaved');
      return false; // Not saved anymore
    }
  } else {
    // Save the post
    const response = await window.apiCall(`/posts/${postId}/save`, {
      method: 'POST'
    });

    if (response.ok) {
      console.log('Post saved at:', response.data.data.savedAt);
      return true; // Now saved
    }
  }
}
```

### Example 2: Creating a Gallery with Photos

```javascript
// Upload multiple photos to a campaign gallery
async function createCampaignGallery(photoFiles) {
  const galleryName = 'Campaign 2025';
  const uploadedPhotos = [];

  for (const file of photoFiles) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('photoType', 'GALLERY');
    formData.append('gallery', galleryName);
    formData.append('caption', file.name);

    const response = await fetch('https://dev-api.unitedwerise.org/api/photos/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getJwtToken()}`
      },
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      uploadedPhotos.push(result.data.photo);
      console.log('Uploaded:', result.data.photo.url);
      console.log('Moderation:', result.data.moderation.decision);
    } else {
      console.error('Upload failed:', result.error);
    }
  }

  return uploadedPhotos;
}
```

### Example 3: Setting Profile Picture

```javascript
// Complete flow: Upload photo -> Set as avatar
async function updateProfilePicture(photoFile) {
  // Step 1: Upload photo
  const formData = new FormData();
  formData.append('file', photoFile);
  formData.append('photoType', 'AVATAR');

  const uploadResponse = await fetch('https://dev-api.unitedwerise.org/api/photos/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getJwtToken()}`
    },
    body: formData
  });

  const uploadResult = await uploadResponse.json();

  if (!uploadResult.success) {
    throw new Error('Upload failed: ' + uploadResult.error);
  }

  // Check moderation status
  if (uploadResult.data.moderation.decision === 'BLOCK') {
    throw new Error('Photo rejected by moderation: ' + uploadResult.data.moderation.reason);
  }

  const photoId = uploadResult.data.photo.id;

  // Step 2: Set as profile picture
  const setAvatarResponse = await window.apiCall(`/photos/${photoId}/set-profile`, {
    method: 'POST'
  });

  if (setAvatarResponse.ok) {
    const newAvatarUrl = setAvatarResponse.data.data.avatarUrl;
    console.log('Profile picture updated:', newAvatarUrl);

    // Update UI
    document.querySelector('.user-avatar').src = newAvatarUrl;

    return newAvatarUrl;
  }
}
```

### Example 4: Batch Checking Saved Status for Feed

```javascript
// Optimize feed rendering by batch-checking saved status
async function enrichFeedWithSavedStatus(posts) {
  const postIds = posts.map(post => post.id);

  const response = await window.apiCall('/posts/saved/check', {
    method: 'POST',
    body: JSON.stringify({ postIds })
  });

  if (response.ok) {
    const savedStatus = response.data.data.saved;

    // Enrich posts with saved status
    return posts.map(post => ({
      ...post,
      isSaved: savedStatus[post.id] || false
    }));
  }

  return posts;
}

// Usage in feed component
async function renderFeed() {
  const feedPosts = await fetchFeedPosts();
  const enrichedPosts = await enrichFeedWithSavedStatus(feedPosts);

  enrichedPosts.forEach(post => {
    const bookmarkIcon = post.isSaved ? 'bookmark-filled' : 'bookmark-outline';
    renderPost(post, { bookmarkIcon });
  });
}
```

---

## Security & Privacy

### EXIF Metadata Stripping

All uploaded photos have EXIF data stripped to protect user privacy:

**Removed Metadata:**
- GPS coordinates (latitude, longitude, altitude)
- Camera make and model
- Date and time of photo capture
- Software used to edit photo
- Copyright information
- Thumbnail embedded in EXIF

**Why This Matters:**
- Prevents location tracking from photo metadata
- Protects against camera fingerprinting
- Removes potentially sensitive timestamps
- Complies with privacy best practices

### AI Moderation Categories

Azure OpenAI analyzes images for the following content types:

| Category | Examples | Decision |
|----------|----------|----------|
| SAFE | Normal photos, landscapes, portraits | APPROVE |
| VIOLENCE | Weapons, blood, physical altercations | BLOCK |
| NUDITY | Inappropriate exposure | BLOCK |
| HATE | Hate symbols, extremist imagery | BLOCK |
| SPAM | Repeated watermarks, excessive text | WARN |
| POLITICAL_EXTREMISM | Extremist flags, prohibited symbols | BLOCK |

**Confidence Thresholds:**
- **0.90+**: High confidence, automatic decision
- **0.70-0.89**: Medium confidence, apply default policy
- **<0.70**: Low confidence, flag for manual review

### WebP Conversion Benefits

All images are converted to WebP format for:

1. **File Size Reduction**: 50-80% smaller than JPEG/PNG
2. **Quality Preservation**: Lossy and lossless compression
3. **Transparency Support**: Like PNG but smaller
4. **Browser Support**: All modern browsers (95%+ coverage)
5. **Bandwidth Savings**: Faster page loads, lower hosting costs

---

## Rate Limiting & Quotas

**Photo Uploads:**
- 10 uploads per minute per user
- 100 uploads per hour per user
- 5MB max file size per upload

**Saved Posts:**
- No hard limit on total saved posts
- 100 requests per minute for batch checking
- Recommended pagination: 20-50 posts per page

**Gallery Operations:**
- No rate limits on moving photos between galleries
- Soft delete is instant and not rate-limited

---

## Error Handling Best Practices

### Frontend Error Handling

```javascript
async function savePostWithErrorHandling(postId) {
  try {
    const response = await window.apiCall(`/posts/${postId}/save`, {
      method: 'POST'
    });

    if (response.ok) {
      return { success: true, data: response.data.data };
    } else {
      // API returned error
      return {
        success: false,
        error: response.data.error || 'Failed to save post'
      };
    }
  } catch (error) {
    // Network error or timeout
    console.error('Save post failed:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}
```

### Retry Logic for Uploads

```javascript
async function uploadPhotoWithRetry(file, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://dev-api.unitedwerise.org/api/photos/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getJwtToken()}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        return result;
      }

      // Don't retry moderation failures
      if (response.status === 422) {
        throw new Error('Content rejected by moderation');
      }

      // Retry on server errors
      if (response.status >= 500 && attempt < maxRetries) {
        console.log(`Upload failed, retrying (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      throw new Error(result.error);

    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
}
```

---

## Performance Optimization Tips

### Saved Posts Feed

1. **Use Pagination**: Request 20-50 posts at a time
2. **Implement Infinite Scroll**: Load more as user scrolls
3. **Cache Results**: Store recent saved posts in memory
4. **Batch Status Checks**: Use `/posts/saved/check` for multiple posts

### Photo Galleries

1. **Load Thumbnails First**: Use `thumbnailUrl` for gallery views
2. **Lazy Load Full Images**: Only load full resolution when needed
3. **Preload Common Galleries**: Cache "My Photos" on app load
4. **Use WebP**: Leverage automatic WebP conversion for smaller files

### Upload Optimization

1. **Client-Side Resize**: Reduce image dimensions before upload
2. **Show Progress**: Display upload progress bar
3. **Queue Uploads**: Upload photos sequentially to avoid rate limits
4. **Validate Before Upload**: Check file size and type on client

---

## Appendix: Response Headers Reference

### Photo Upload Headers

All photo upload responses include debug headers:

```
X-Moderation-Decision: APPROVE | WARN | BLOCK
X-Moderation-Approved: true | false
X-Moderation-Confidence: 0.00 - 1.00
X-Moderation-ContentType: SAFE | VIOLENCE | NUDITY | HATE | SPAM | POLITICAL_EXTREMISM
X-Pipeline-Version: layer6-with-debugging
X-Request-ID: <uuid-v4>
```

**Use Cases:**
- Debugging moderation decisions
- Tracking requests across systems
- Monitoring content safety metrics
- Building moderation dashboards

---

## Migration Notes

### From Legacy Photo System

If migrating from a system without moderation:

1. **Backfill Moderation**: Run AI moderation on existing photos
2. **Add Indexes**: Ensure `moderationStatus` index exists
3. **Update Queries**: Filter by `isActive: true` and `moderationStatus: 'APPROVE'`
4. **Handle Legacy URLs**: Old photo URLs may not be WebP

### From Manual Save System

If implementing saved posts for the first time:

1. **Create SavedPost Table**: Run Prisma migration
2. **Migrate Existing Bookmarks**: Import from old system
3. **Update Frontend**: Replace old bookmark UI with new API
4. **Test Idempotency**: Verify repeated saves don't create duplicates

---

## Support & Resources

**API Base URLs:**
- Development: `https://dev-api.unitedwerise.org`
- Production: `https://api.unitedwerise.org`

**Related Documentation:**
- `MASTER_DOCUMENTATION.md`: Complete system architecture
- `API_DOCUMENTATION.md`: All other API endpoints
- `SYSTEM-ARCHITECTURE-DESIGN.md`: System design patterns

**Azure Resources:**
- Storage Account: `uwrstorage2425`
- Container: `photos`
- OpenAI Endpoint: `https://unitedwerise-openai.openai.azure.com/`

**Source Code:**
- Saved Posts: `backend/src/routes/posts.ts` (lines 1958-2164)
- Photo Galleries: `backend/src/routes/galleries.ts`
- Photo Upload: `backend/src/routes/photos/index.ts`
- Frontend: `frontend/src/components/SavedPostsView.js`

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-09
**Maintained By**: Development Team

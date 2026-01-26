# Video API Documentation

## Overview

The Video (Snippets) API enables short-form video content similar to TikTok Reels. Videos are uploaded, encoded to HLS for adaptive streaming, moderated, and then published to feeds.

## Architecture

### Storage
- **videos-raw**: Private container for original uploads
- **videos-encoded**: Public container for encoded outputs (HLS + MP4)
- **videos-thumbnails**: Public container for poster images

### Processing Pipeline
1. **Upload** - Video validated and stored in raw container
2. **Encoding** - FFmpeg creates HLS variants (720p/480p/360p) + MP4 fallback
3. **Moderation** - Content safety check (thumbnail analysis)
4. **Publishing** - Video made visible in feeds

### Encoding Output Structure
```
videos-encoded/{videoId}/
├── manifest.m3u8      # Master HLS playlist
├── 720p/playlist.m3u8 # 720p variant
├── 720p/seg_*.ts      # 720p segments
├── 480p/playlist.m3u8 # 480p variant
├── 480p/seg_*.ts      # 480p segments
├── 360p/playlist.m3u8 # 360p variant
├── 360p/seg_*.ts      # 360p segments
└── fallback.mp4       # MP4 fallback (720p)
```

---

## Public Endpoints

### Health Check
```
GET /api/videos/health
```

**Response:**
```json
{
  "status": "healthy|degraded|unavailable",
  "storage": true,
  "encoding": true,
  "config": {
    "maxFileSizeMB": 500,
    "maxDurationSeconds": 180,
    "allowedTypes": ["video/mp4", "video/webm", "video/quicktime"]
  }
}
```

---

### Upload Video
```
POST /api/videos/upload
Authorization: Cookie (requires staging auth)
Content-Type: multipart/form-data
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Video file (max 500MB, max 3 min) |
| videoType | String | No | `REEL` (default) or `POST_ATTACHMENT` |
| caption | String | No | Caption with optional hashtags |
| postId | String | No | Post ID if attaching to a post |

**Response:**
```json
{
  "success": true,
  "video": {
    "id": "uuid",
    "thumbnailUrl": "https://...",
    "duration": 45.5,
    "width": 1080,
    "height": 1920,
    "aspectRatio": "VERTICAL_9_16",
    "originalSize": 52428800,
    "encodingStatus": "PENDING",
    "publishStatus": "DRAFT"
  },
  "requestId": "uuid"
}
```

---

### Get Video Feed
```
GET /api/videos/feed?limit=10&cursor=xxx
```

Returns published reels for the TikTok-style feed.

**Response:**
```json
{
  "success": true,
  "videos": [
    {
      "id": "uuid",
      "hlsManifestUrl": "https://.../manifest.m3u8",
      "mp4Url": "https://.../fallback.mp4",
      "thumbnailUrl": "https://...",
      "duration": 45.5,
      "aspectRatio": "VERTICAL_9_16",
      "caption": "Check this out! #civic",
      "viewCount": 1234,
      "likeCount": 56,
      "commentCount": 12,
      "shareCount": 8,
      "user": {
        "id": "userId",
        "username": "johndoe",
        "displayName": "John Doe",
        "avatar": "https://...",
        "verified": true
      }
    }
  ],
  "nextCursor": "cursorId"
}
```

---

### Get Video Details
```
GET /api/videos/{id}
```

**Response:**
```json
{
  "success": true,
  "video": {
    "id": "uuid",
    "videoType": "REEL",
    "hlsManifestUrl": "https://...",
    "mp4Url": "https://...",
    "thumbnailUrl": "https://...",
    "duration": 45.5,
    "width": 1080,
    "height": 1920,
    "aspectRatio": "VERTICAL_9_16",
    "caption": "...",
    "hashtags": ["civic", "local"],
    "viewCount": 1234,
    "likeCount": 56,
    "commentCount": 12,
    "shareCount": 8,
    "encodingStatus": "READY",
    "publishStatus": "PUBLISHED",
    "publishedAt": "2024-01-15T12:00:00Z",
    "createdAt": "2024-01-15T11:30:00Z",
    "user": { ... }
  }
}
```

---

### Get User's Drafts
```
GET /api/videos/drafts
Authorization: Cookie
```

Returns the authenticated user's draft videos.

---

### Get User's Scheduled Videos
```
GET /api/videos/scheduled
Authorization: Cookie
```

Returns the authenticated user's scheduled videos.

---

### Stream Video
```
GET /api/videos/{id}/stream
```

Redirects to the HLS manifest URL or MP4 fallback.

---

### Record View
```
POST /api/videos/{id}/view
```

Increments view count for analytics.

---

### Publish Video
```
PATCH /api/videos/{id}/publish
Authorization: Cookie
```

Publishes a draft video immediately.

**Requirements:**
- `encodingStatus` must be `READY`
- `moderationStatus` must be `APPROVED`

---

### Schedule Video
```
PATCH /api/videos/{id}/schedule
Authorization: Cookie
Content-Type: application/json
```

**Body:**
```json
{
  "publishAt": "2024-01-20T10:00:00Z"
}
```

---

### Unschedule Video
```
PATCH /api/videos/{id}/unschedule
Authorization: Cookie
```

Cancels scheduled publish and returns video to DRAFT status.

---

### Delete Video
```
DELETE /api/videos/{id}
Authorization: Cookie
```

Soft deletes a video (owner only).

---

### Get User's Videos
```
GET /api/videos/user/{userId}?limit=20&cursor=xxx
```

Returns a user's published videos.

---

## Interaction Endpoints

### Like Video
```
POST /api/videos/{id}/like
Authorization: Cookie
```

### Unlike Video
```
POST /api/videos/{id}/unlike
Authorization: Cookie
```

### Check Like Status
```
GET /api/videos/{id}/like-status
Authorization: Cookie
```

### Get Comments
```
GET /api/videos/{id}/comments?limit=20&cursor=xxx
```

### Add Comment
```
POST /api/videos/{id}/comments
Authorization: Cookie
Content-Type: application/json

{
  "content": "Great video!",
  "parentId": "optionalParentCommentId"
}
```

### Delete Comment
```
DELETE /api/videos/{videoId}/comments/{commentId}
Authorization: Cookie
```

### Record Share
```
POST /api/videos/{id}/share
```

---

## Admin Endpoints

All admin endpoints require `requireStagingAuth` + `requireAdmin` middleware.

### List All Videos
```
GET /api/videos/admin/list?encodingStatus=PENDING&moderationStatus=APPROVED&limit=50
Authorization: Cookie (Admin)
```

### Get Moderation Queue
```
GET /api/videos/admin/moderation-queue?limit=50
Authorization: Cookie (Admin)
```

### Get Video Stats
```
GET /api/videos/admin/stats
Authorization: Cookie (Admin)
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalVideos": 150,
    "pendingEncoding": 5,
    "pendingModeration": 12,
    "published": 120,
    "failedEncoding": 3,
    "rejected": 10,
    "totalViews": 45000,
    "totalLikes": 3200,
    "encodingQueue": {
      "pending": 2,
      "processing": 1,
      "completed": 100,
      "failed": 3,
      "total": 106
    }
  }
}
```

### Reprocess Video
```
POST /api/videos/{id}/reprocess
Authorization: Cookie (Admin)
```

Re-runs encoding for stuck videos.

### Approve Video
```
POST /api/videos/admin/{id}/approve
Authorization: Cookie (Admin)
```

### Reject Video
```
POST /api/videos/admin/{id}/reject
Authorization: Cookie (Admin)
Content-Type: application/json

{
  "reason": "Violation of community guidelines"
}
```

### Hard Delete Video
```
DELETE /api/videos/admin/{id}/delete
Authorization: Cookie (Admin)
```

Permanently deletes video and storage blobs.

---

## Status Enums

### Encoding Status
| Value | Description |
|-------|-------------|
| PENDING | Queued for encoding |
| ENCODING | Currently being encoded |
| READY | Encoding complete, playable |
| FAILED | Encoding failed |

### Moderation Status
| Value | Description |
|-------|-------------|
| PENDING | Awaiting review |
| APPROVED | Safe for publishing |
| REJECTED | Blocked from publishing |

### Publish Status
| Value | Description |
|-------|-------------|
| DRAFT | Not visible, owner-only |
| SCHEDULED | Auto-publish at scheduled time |
| PUBLISHED | Live and visible in feeds |

### Video Type
| Value | Description |
|-------|-------------|
| REEL | Standalone full-screen vertical video |
| POST_ATTACHMENT | Video embedded in a post |

### Aspect Ratio
| Value | Description |
|-------|-------------|
| VERTICAL_9_16 | 9:16 (TikTok/Reels) |
| PORTRAIT_4_5 | 4:5 (Instagram Portrait) |
| SQUARE_1_1 | 1:1 (Square) |
| HORIZONTAL_16_9 | 16:9 (YouTube/Landscape) |

---

## Error Codes

| HTTP Status | Error | Description |
|-------------|-------|-------------|
| 400 | Invalid file type | Upload is not a valid video format |
| 400 | Video too long | Exceeds max duration (3 min) |
| 400 | Video encoding not complete | Cannot publish until READY |
| 400 | Video not approved | Cannot publish without moderation approval |
| 401 | Access denied | Not authenticated |
| 403 | Not authorized | Not owner or not admin |
| 404 | Video not found | Video doesn't exist or was deleted |
| 413 | File too large | Exceeds max size (500MB) |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| VIDEO_MAX_SIZE_BYTES | 524288000 | Max upload size (500MB) |
| VIDEO_MAX_DURATION_SECONDS | 180 | Max duration (3 minutes) |
| VIDEO_ENCODING_QUEUE | false | Enable background queue mode |
| AZURE_STORAGE_CONNECTION_STRING | - | Azure Blob Storage connection |
| AZURE_STORAGE_ACCOUNT_NAME | uwrstorage2425 | Storage account name |

---

## Frontend Integration

### HLS.js Setup
Include HLS.js via CDN (already in index.html):
```html
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js"></script>
```

### Playing Videos
```javascript
const videoEl = document.querySelector('video');

if (hlsUrl && Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(hlsUrl);
  hls.attachMedia(videoEl);
} else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
  // Safari native HLS
  videoEl.src = hlsUrl;
} else {
  // MP4 fallback
  videoEl.src = mp4Url;
}
```

### Components
- `VideoPlayer` - HLS.js adaptive player
- `VideoUploader` - Drag-drop upload with progress
- `SnippetsDashboard` - User video management
- `ReelsFeed` - TikTok-style feed
- `VideoCard` - Grid thumbnail cards

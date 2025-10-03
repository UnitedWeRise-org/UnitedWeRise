# Photo Upload API Contract
**Status:** 🟢 COMPLETE - Ready for Implementation
**Created:** October 2, 2025
**Version:** 1.0.0

---

## Overview

This document defines the precise API contract for the new backend-first photo upload endpoint. Both frontend and backend agents MUST follow these specifications exactly.

---

## Endpoint Specification

### POST /api/photos/upload

**Purpose:** Upload and process a single photo with backend-first security validation.

**Authentication:** Required (JWT Bearer token)

**Rate Limiting:** 50 requests per 15 minutes (existing uploadLimiter)

**Content-Type:** `multipart/form-data`

**Maximum Request Size:** 10 MB (enforced by multer)

---

## Request Specification

### Multipart Form Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `file` | File | ✅ Yes | See File Constraints | The image file to upload |
| `photoType` | string | ✅ Yes | Enum: AVATAR, COVER, CAMPAIGN, VERIFICATION, EVENT, GALLERY, POST_MEDIA | Type of photo being uploaded |
| `purpose` | string | ❌ No | Enum: PERSONAL, CAMPAIGN, BOTH. Default: PERSONAL | How the photo will be used |
| `caption` | string | ❌ No | Max 200 chars | Optional caption for the photo |
| `gallery` | string | ❌ No | Max 100 chars | Optional gallery/folder name |
| `candidateId` | string | ❌ No | Must be valid candidate UUID | Required if purpose is CAMPAIGN or BOTH |

### File Constraints

| Constraint | Value | Error Code |
|------------|-------|------------|
| Maximum file size | 10 MB (10,485,760 bytes) | 413 Payload Too Large |
| Maximum GIF size | 5 MB (5,242,880 bytes) | 413 Payload Too Large |
| Allowed MIME types | image/jpeg, image/png, image/webp, image/gif | 400 Bad Request |
| File field name | `file` (exactly) | 400 Bad Request |

### PhotoType Enum Values

```typescript
enum PhotoType {
  AVATAR = 'AVATAR',           // User profile picture
  COVER = 'COVER',             // User cover photo
  CAMPAIGN = 'CAMPAIGN',       // Campaign materials
  VERIFICATION = 'VERIFICATION', // Identity verification
  EVENT = 'EVENT',             // Event photos
  GALLERY = 'GALLERY',         // Personal gallery
  POST_MEDIA = 'POST_MEDIA'    // Social media post photos
}
```

### PhotoPurpose Enum Values

```typescript
enum PhotoPurpose {
  PERSONAL = 'PERSONAL',  // Personal use only
  CAMPAIGN = 'CAMPAIGN',  // Campaign use only (requires candidateId)
  BOTH = 'BOTH'          // Both personal and campaign (requires candidateId)
}
```

---

## Response Specification

### Success Response (201 Created)

```json
{
  "success": true,
  "photo": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://uwrstorage2425.blob.core.windows.net/photos/abc123-post_media.webp",
    "thumbnailUrl": "https://uwrstorage2425.blob.core.windows.net/thumbnails/abc123-post_media-thumb.webp",
    "width": 800,
    "height": 600
  },
  "pendingModeration": false
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for successful uploads |
| `photo.id` | string (UUID) | Unique database ID for the photo |
| `photo.url` | string (URL) | Full Azure Blob Storage URL for the photo |
| `photo.thumbnailUrl` | string (URL) | Full Azure Blob Storage URL for the thumbnail |
| `photo.width` | number | Image width in pixels after processing |
| `photo.height` | number | Image height in pixels after processing |
| `pendingModeration` | boolean | `true` if photo requires manual moderation approval |

**Moderation Logic:**
- `photoType === 'CAMPAIGN'` → `pendingModeration = true`
- `photoType === 'VERIFICATION'` → `pendingModeration = true`
- All other types → `pendingModeration = false`

---

## Error Responses

### 400 Bad Request

**Scenarios:**
1. No file uploaded
2. Missing required field (photoType)
3. Invalid photoType value
4. Invalid purpose value
5. Invalid file type (not JPEG/PNG/WebP/GIF)
6. Invalid image file (magic bytes check failed)

**Response Format:**
```json
{
  "error": "Error type",
  "message": "User-friendly explanation"
}
```

**Examples:**

```json
{
  "error": "No file uploaded",
  "message": "Please select a photo to upload"
}
```

```json
{
  "error": "Missing required fields",
  "message": "photoType is required"
}
```

```json
{
  "error": "Invalid photo type",
  "message": "Photo type must be one of: AVATAR, COVER, CAMPAIGN, VERIFICATION, EVENT, GALLERY, POST_MEDIA"
}
```

```json
{
  "error": "Invalid purpose",
  "message": "Purpose must be one of: PERSONAL, CAMPAIGN, BOTH"
}
```

```json
{
  "error": "Invalid file type",
  "message": "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed."
}
```

```json
{
  "error": "Invalid image file",
  "message": "File is not a valid image (magic bytes check failed)"
}
```

---

### 401 Unauthorized

**Scenario:** No valid JWT token provided

**Response:**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

### 403 Forbidden

**Scenarios:**
1. User doesn't own the candidate (invalid candidateId)
2. Permission denied for candidate relationship

**Response:**
```json
{
  "error": "Permission denied",
  "message": "Invalid candidate permissions"
}
```

```json
{
  "error": "Candidate ID required",
  "message": "Candidate ID is required for campaign photos"
}
```

---

### 413 Payload Too Large

**Scenarios:**
1. File exceeds 10 MB
2. GIF exceeds 5 MB
3. Storage limit exceeded

**Response:**
```json
{
  "error": "File too large",
  "message": "Photos must be smaller than 10MB"
}
```

```json
{
  "error": "GIF too large",
  "message": "GIF files must be smaller than 5MB"
}
```

```json
{
  "error": "Storage limit exceeded",
  "message": "Storage limit exceeded. Current usage: 95MB, Limit: 100MB. Please delete some photos to free up space."
}
```

---

### 422 Unprocessable Entity

**Scenario:** Content moderation failed (AI detected inappropriate content)

**Response:**
```json
{
  "error": "Content moderation failed",
  "message": "This image contains content that violates our community guidelines"
}
```

---

### 500 Internal Server Error

**Scenarios:**
1. Database error
2. Azure Blob Storage error
3. Image processing error (Sharp library)
4. Unexpected errors

**Response:**
```json
{
  "error": "Upload failed",
  "message": "Failed to upload photo. Please try again.",
  "details": "Stack trace (development only)"
}
```

**Note:** `details` field only present when `NODE_ENV === 'development'`

---

## Request Examples

### Example 1: Upload Profile Avatar (JavaScript/Fetch)

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('photoType', 'AVATAR');
formData.append('purpose', 'PERSONAL');

const response = await fetch('https://dev-api.unitedwerise.org/api/photos/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`
    // DO NOT set Content-Type - browser sets it automatically with boundary
  },
  body: formData
});

const result = await response.json();
console.log('Avatar uploaded:', result.photo.url);
```

---

### Example 2: Upload Campaign Photo (JavaScript/apiClient)

```javascript
const formData = new FormData();
formData.append('file', photoFile);
formData.append('photoType', 'CAMPAIGN');
formData.append('purpose', 'CAMPAIGN');
formData.append('candidateId', '123e4567-e89b-12d3-a456-426614174000');
formData.append('caption', 'Campaign rally in downtown');

const response = await apiClient.call('/photos/upload', {
  method: 'POST',
  body: formData
  // apiClient handles auth token automatically
});

// Response is wrapped: response.data.photo
const photo = response.data.photo;
console.log('Campaign photo:', photo.url);
```

---

### Example 3: Upload Gallery Photo with Caption (JavaScript)

```javascript
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('photoType', 'GALLERY');
formData.append('purpose', 'PERSONAL');
formData.append('gallery', 'Vacation 2025');
formData.append('caption', 'Beach sunset on the last day of our trip');

const response = await apiClient.call('/photos/upload', {
  method: 'POST',
  body: formData
});

const photo = response.data.photo;
console.log('Gallery photo added:', photo.thumbnailUrl);
```

---

### Example 4: Upload Post Media (Multiple Photos)

```javascript
async function uploadMultiplePhotos(files) {
  const uploadedPhotos = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('photoType', 'POST_MEDIA');
    formData.append('purpose', 'PERSONAL');

    const response = await apiClient.call('/photos/upload', {
      method: 'POST',
      body: formData
    });

    uploadedPhotos.push(response.data.photo);
  }

  return uploadedPhotos;
}
```

---

### Example 5: cURL Command (Testing)

```bash
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/path/to/photo.jpg" \
  -F "photoType=GALLERY" \
  -F "purpose=PERSONAL" \
  -F "caption=My awesome photo" \
  -F "gallery=My Photos"
```

---

### Example 6: Postman Configuration

**Method:** POST

**URL:** `https://dev-api.unitedwerise.org/api/photos/upload`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Body (form-data):**
```
file: [Select File]
photoType: GALLERY
purpose: PERSONAL
caption: Test upload from Postman
gallery: Test Gallery
```

---

## Frontend Integration Guide

### Using with apiClient

**DO:**
- ✅ Use FormData for multipart uploads
- ✅ Let browser set Content-Type automatically (includes boundary)
- ✅ Access response via `response.data.photo`
- ✅ Handle errors with try/catch

**DON'T:**
- ❌ Don't set Content-Type header manually
- ❌ Don't use JSON.stringify() on FormData
- ❌ Don't assume response.photo exists (use response.data.photo)

**Correct Pattern:**
```javascript
async function uploadPhoto(file, photoType, purpose) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('photoType', photoType);
    formData.append('purpose', purpose);

    const response = await apiClient.call('/photos/upload', {
      method: 'POST',
      body: formData
      // No Content-Type header - browser handles it
    });

    // apiClient returns { ok, status, data }
    // Backend returns { success, photo }
    // So photo is at response.data.photo
    return response.data.photo;

  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

---

## Backend Implementation Guide

### Multer Configuration

```typescript
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  }
});
```

### Route Handler Pattern

```typescript
router.post('/upload',
  uploadLimiter,
  requireAuth,
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      // 1. Validate file exists
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please select a photo to upload'
        });
      }

      // 2. Extract and validate fields
      const { photoType, purpose = 'PERSONAL', caption, gallery, candidateId } = req.body;

      // 3. Validate enums
      // ... validation logic ...

      // 4. Call service method
      const result = await PhotoService.processAndUploadPhoto({
        fileBuffer: req.file.buffer,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        userId: req.user!.id,
        photoType: photoType as PhotoType,
        purpose: purpose as PhotoPurpose,
        caption: caption ? caption.substring(0, 200) : undefined,
        gallery: gallery || undefined,
        candidateId: candidateId || undefined
      });

      // 5. Return success response
      res.status(201).json({
        success: true,
        photo: {
          id: result.id,
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          width: result.width,
          height: result.height
        },
        pendingModeration: photoType === 'CAMPAIGN' || photoType === 'VERIFICATION'
      });

    } catch (error: any) {
      // Error handling based on message patterns
      // See PHOTO-UPLOAD-ARCHITECTURE-DESIGN.md for full error handling
    }
  }
);
```

---

## Testing Checklist

### Required Test Scenarios

| # | Scenario | Expected Status | Expected Response |
|---|----------|----------------|-------------------|
| 1 | Upload valid JPEG (2MB) | 201 | Photo record with valid URLs |
| 2 | Upload valid PNG (5MB) | 201 | Photo record with valid URLs |
| 3 | Upload valid GIF (4MB) | 201 | Photo record with valid URLs |
| 4 | Upload valid WebP (3MB) | 201 | Photo record with valid URLs |
| 5 | Upload file > 10MB | 413 | File too large error |
| 6 | Upload GIF > 5MB | 413 | GIF too large error |
| 7 | Upload .txt file | 400 | Invalid file type error |
| 8 | Upload without photoType | 400 | Missing required fields error |
| 9 | Upload with invalid photoType | 400 | Invalid photo type error |
| 10 | Upload without authentication | 401 | Unauthorized error |
| 11 | Upload campaign photo without candidateId | 400 | Candidate ID required error |
| 12 | Upload with wrong candidateId | 403 | Permission denied error |
| 13 | Upload with inappropriate content | 422 | Content moderation failed error |
| 14 | Upload when storage limit exceeded | 413 | Storage limit exceeded error |
| 15 | Upload with EXIF metadata | 201 | Photo uploaded, EXIF stripped |

---

## Security Validation

### Server-Side Validation (MUST implement)

1. ✅ **File Type Validation:** Check MIME type in Multer fileFilter
2. ✅ **Magic Bytes Validation:** Verify file signature matches declared type
3. ✅ **File Size Validation:** Enforce 10MB limit (5MB for GIFs)
4. ✅ **Storage Quota Validation:** Check user hasn't exceeded 100MB limit
5. ✅ **Permission Validation:** Verify user owns candidate for campaign photos
6. ✅ **AI Content Moderation:** Scan for inappropriate content with Azure OpenAI Vision
7. ✅ **EXIF Stripping:** Remove all metadata before storage

### Client-Side Validation (SHOULD implement)

1. ✅ **File Type Check:** Filter file picker to image types only
2. ✅ **File Size Check:** Show error before upload if > 10MB
3. ✅ **Preview Image:** Show thumbnail before upload
4. ✅ **Upload Progress:** Show progress bar during upload

**IMPORTANT:** Client-side validation is for UX only. Server-side validation is mandatory.

---

## Performance Benchmarks

### Expected Upload Times

| File Size | Expected Time | Maximum Acceptable Time |
|-----------|---------------|------------------------|
| 1 MB | 2-4 seconds | 6 seconds |
| 5 MB | 4-8 seconds | 12 seconds |
| 10 MB | 6-12 seconds | 18 seconds |

**Factors:**
- Network speed: 2-5 seconds
- Image processing (Sharp): 0.5-2 seconds
- AI moderation: 1-3 seconds
- Azure blob upload: 2-5 seconds

**Optimization Opportunities:**
- Run AI moderation and image processing in parallel
- Use Azure CDN for faster blob uploads
- Compress images before upload (client-side)

---

## Backward Compatibility

### Deprecated Endpoints (Keep during migration)

**Do NOT delete immediately:**
- `POST /api/photos/upload/sas-token` - Mark as deprecated
- `POST /api/photos/upload/confirm` - Mark as deprecated

**Add deprecation notice:**
```typescript
// DEPRECATED: Use POST /api/photos/upload instead
// This endpoint will be removed after 2025-11-01
router.post('/upload/sas-token', ...);
```

### Migration Timeline

- **Week 1:** Deploy new endpoint, test in staging
- **Week 2:** Update frontend to use new endpoint
- **Week 3:** Monitor usage, ensure old endpoints unused
- **Week 4:** Delete deprecated endpoints and old frontend code

---

## Monitoring and Logging

### Success Logs (Console)

```
📸 Processing photo upload for user abc123 (POST_MEDIA)
🔍 Content moderation (staging): POST_MEDIA - APPROVED (0.95)
✅ Photo uploaded to Azure Blob Storage: https://...
✅ Photo upload complete: 550e8400-e29b-41d4-a716-446655440000
```

### Error Logs (Console)

```
❌ Photo upload failed: Content moderation failed
🚫 Content blocked: {
  userId: "abc123",
  photoType: "POST_MEDIA",
  category: "BLOCK",
  reason: "Inappropriate content detected"
}
```

### Metrics to Track

1. Upload success rate
2. Average upload time
3. Content moderation block rate
4. Storage usage per user
5. Most common error types

---

## API Version

**Current Version:** 1.0.0

**Breaking Changes Policy:**
- Any change that affects request/response format requires version bump
- Old versions supported for minimum 90 days
- Deprecation notices provided 30 days before removal

**Future Enhancements (v1.1.0):**
- Batch upload support (multiple files in single request)
- Image cropping parameters
- Custom thumbnail size
- Progress events via WebSocket

---

**API Contract Status:** ✅ COMPLETE

This contract is comprehensive and ready for implementation. All frontend and backend behaviors are precisely specified.

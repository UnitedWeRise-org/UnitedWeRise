# Photo & Gallery System Documentation Reference

You are assisting with the Photo Upload, Gallery Management, and Content Moderation system for UnitedWeRise. This command provides quick access to all relevant documentation and implementation files.

## REQUIRED READING ORDER

Before implementing any photo or gallery features, read in this order:

### 1. Complete System Documentation (WHAT & HOW)
**File:** `docs/API_SAVED_POSTS_GALLERY.md`
**Read:** Sections 2-3 (Photo Gallery System, Photo Upload & Content Moderation)
**Purpose:** Complete documentation of photo system, gallery endpoints, and 6-layer upload pipeline

Gallery Endpoints (4 total):
- `GET /api/galleries` - Get user's photo gallery
- `PUT /api/galleries/:photoId/gallery` - Add/remove photo from gallery
- `DELETE /api/galleries/:photoId` - Delete photo from gallery
- `POST /api/galleries/:photoId/set-profile` - Set photo as profile picture

Photo Upload Pipeline (6 layers):
1. **Client-side validation** - File type, size check
2. **Multer upload** - Memory storage, 10MB limit
3. **EXIF stripping** - Privacy protection (GPS, camera metadata removed)
4. **Azure Content Safety** - AI moderation for inappropriate content
5. **Image optimization** - WebP conversion, compression
6. **Azure Blob Storage** - Permanent storage with CDN delivery

### 2. Backend Implementation (HOW - Backend)
**File:** `backend/src/routes/galleries.ts`
**Purpose:** Gallery management endpoints

**File:** `backend/src/routes/photos.ts`
**Purpose:** Photo upload endpoint with full 6-layer pipeline

Key patterns:
- JWT authentication required for all endpoints
- Multer middleware handles multipart/form-data
- Sharp library for image processing (EXIF strip, WebP conversion)
- Azure Content Safety API for moderation
- Azure Blob Storage SDK for cloud upload
- Database transaction for photo + user profile updates

### 3. Database Schema (DATA)
**File:** `backend/prisma/schema.prisma`
**Search for:** `model Photo`, `model PhotoGallery`

Key models:
```prisma
model Photo {
  id                String        @id @default(uuid())
  userId            String
  blobUrl           String        // Azure Blob Storage URL
  thumbnailUrl      String?       // Optional thumbnail
  caption           String?
  uploadedAt        DateTime      @default(now())
  moderationStatus  String        @default("pending")  // pending, approved, rejected
  moderationDetails Json?

  user              User          @relation(fields: [userId], references: [id])
  galleries         PhotoGallery[]
}

model PhotoGallery {
  id        String   @id @default(uuid())
  userId    String
  photoId   String
  addedAt   DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
  photo     Photo    @relation(fields: [photoId], references: [id], onDelete: Cascade)

  @@unique([userId, photoId])  // Prevent duplicate gallery entries
}

model User {
  profilePhotoUrl   String?  // URL to current profile photo
  // ... other fields
}
```

### 4. Frontend Integration (HOW - Frontend)
**File:** `frontend/src/js/components/photo-upload.js` (if exists)
**File:** `frontend/src/js/components/gallery.js` (if exists)

Frontend patterns:
- File input with `accept="image/*"`
- FormData for multipart upload
- Progress indicator during upload
- Preview before upload
- Thumbnail display in gallery grid
- Lightbox/modal for full-size view

### 5. Azure Services Configuration
**Environment Variables:**
```bash
AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425
AZURE_STORAGE_CONTAINER_NAME=photos
AZURE_CONTENT_SAFETY_ENDPOINT=<endpoint>
AZURE_CONTENT_SAFETY_KEY=<key>
```

**Azure Content Safety Categories:**
- Hate (0-6 severity)
- SelfHarm (0-6 severity)
- Sexual (0-6 severity)
- Violence (0-6 severity)

Threshold: Severity >= 4 triggers rejection

## Photo Upload Pipeline Deep Dive

### Layer 1: Client-side Validation
```javascript
// Frontend validation before upload
const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const maxSize = 10 * 1024 * 1024; // 10MB

if (!validTypes.includes(file.type)) {
  throw new Error('Invalid file type');
}
if (file.size > maxSize) {
  throw new Error('File too large (max 10MB)');
}
```

### Layer 2: Multer Upload
```typescript
// backend/src/routes/photos.ts
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.post('/upload', authMiddleware, upload.single('photo'), async (req, res) => {
  // req.file.buffer contains image data
});
```

### Layer 3: EXIF Stripping (Privacy Protection)
```typescript
import sharp from 'sharp';

// Remove EXIF metadata (GPS, camera, timestamp)
const strippedBuffer = await sharp(req.file.buffer)
  .rotate() // Auto-rotate based on EXIF orientation
  .withMetadata({ exif: {} }) // Remove all EXIF data
  .toBuffer();
```

**Why:** EXIF data can contain:
- GPS coordinates (privacy risk)
- Camera make/model (fingerprinting)
- Timestamp (exposure risk)
- Software used (security risk)

### Layer 4: Azure Content Safety Moderation
```typescript
import { ContentSafetyClient } from '@azure/ai-content-safety';

const client = new ContentSafetyClient(endpoint, credential);

const result = await client.analyzeImage({
  image: { content: base64Image }
});

// Check severity thresholds
const categories = ['hate', 'selfHarm', 'sexual', 'violence'];
for (const category of categories) {
  if (result.categoriesAnalysis[category].severity >= 4) {
    return res.status(400).json({
      success: false,
      error: 'Content violates community guidelines',
      moderationDetails: result.categoriesAnalysis
    });
  }
}
```

### Layer 5: Image Optimization
```typescript
// Convert to WebP (smaller file size, good quality)
const optimizedBuffer = await sharp(strippedBuffer)
  .webp({ quality: 85 })
  .resize(1920, 1920, {
    fit: 'inside',
    withoutEnlargement: true
  })
  .toBuffer();

// Generate thumbnail
const thumbnailBuffer = await sharp(strippedBuffer)
  .webp({ quality: 80 })
  .resize(300, 300, { fit: 'cover' })
  .toBuffer();
```

### Layer 6: Azure Blob Storage Upload
```typescript
import { BlobServiceClient } from '@azure/storage-blob';

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient('photos');

const blobName = `${userId}/${Date.now()}-${uuid()}.webp`;
const blockBlobClient = containerClient.getBlockBlobClient(blobName);

await blockBlobClient.upload(optimizedBuffer, optimizedBuffer.length, {
  blobHTTPHeaders: { blobContentType: 'image/webp' }
});

const blobUrl = blockBlobClient.url;

// Save to database
await prisma.photo.create({
  data: {
    userId,
    blobUrl,
    thumbnailUrl: thumbnailBlobUrl,
    caption: req.body.caption,
    moderationStatus: 'approved',
    moderationDetails: result.categoriesAnalysis
  }
});
```

## Common Implementation Tasks

### Adding Photo Upload to a Feature
1. Read `docs/API_SAVED_POSTS_GALLERY.md` section 3.1 (Upload Pipeline)
2. Add file input to frontend form
3. Use existing `/api/photos/upload` endpoint (don't recreate)
4. Handle success response with `blobUrl`
5. Display uploaded photo with `<img src={blobUrl}>`

### Implementing Gallery View
1. Fetch photos: `GET /api/galleries`
2. Display in grid layout (CSS Grid or Flexbox)
3. Show thumbnails for performance
4. Implement lightbox for full-size view
5. Add actions: set profile photo, delete

### Debugging Upload Failures
**Issue: "Invalid file type"**
- Check client-side `accept` attribute
- Check Multer fileFilter whitelist
- Verify file.mimetype matches allowed types

**Issue: "File too large"**
- Check client-side maxSize validation
- Check Multer limits.fileSize (10MB)
- Check Azure Blob Storage limits (none for this tier)

**Issue: "Content moderation rejection"**
- Review moderationDetails in response
- Check severity thresholds (4+ triggers rejection)
- Consider if threshold is too strict/lenient

**Issue: "EXIF stripping fails"**
- Sharp library may not support exotic formats
- Use try/catch around sharp operations
- Fallback to original buffer if EXIF strip fails

### Handling Profile Photo Updates
1. Upload photo via `/api/photos/upload`
2. Get blobUrl from response
3. Call `POST /api/galleries/:photoId/set-profile`
4. Backend updates `User.profilePhotoUrl`
5. Frontend updates UI with new profile photo

## Security Considerations

**Content Moderation:**
- Never trust client-side moderation
- Always use Azure Content Safety API
- Log moderation results for audit trail
- Allow admin review of borderline cases

**Privacy Protection:**
- Always strip EXIF metadata
- Never expose original upload buffer
- Use signed URLs for sensitive content
- Consider user consent for public galleries

**Access Control:**
- Users can only delete their own photos
- Gallery operations require photo ownership
- Admin can view all photos for moderation
- Profile photo changes must be authenticated

## Related Systems

- **User Profile** - Profile photos stored in User.profilePhotoUrl
- **Posts** - Posts can include photo attachments (different from gallery)
- **Moderation Dashboard** - Admin reviews flagged content
- **Azure Blob Storage** - CDN delivery for performance

## Quick Commands

**Test photo upload:**
```bash
# Upload photo (requires auth)
curl -X POST -H "Cookie: token=YOUR_JWT" \
  -F "photo=@/path/to/image.jpg" \
  -F "caption=My photo caption" \
  https://dev-api.unitedwerise.org/api/photos/upload
```

**Test gallery endpoints:**
```bash
# Get user's gallery (requires auth)
curl -H "Cookie: token=YOUR_JWT" \
  https://dev-api.unitedwerise.org/api/galleries

# Add photo to gallery (requires auth)
curl -X PUT -H "Cookie: token=YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"action":"add"}' \
  https://dev-api.unitedwerise.org/api/galleries/PHOTO_ID/gallery

# Set profile photo (requires auth)
curl -X POST -H "Cookie: token=YOUR_JWT" \
  https://dev-api.unitedwerise.org/api/galleries/PHOTO_ID/set-profile
```

## Next Steps

After reading documentation, typical workflow:
1. Identify which component you're modifying (upload, gallery, moderation)
2. Use existing endpoints (don't recreate upload pipeline)
3. Follow established security patterns (auth, moderation, EXIF stripping)
4. Test on development environment first
5. Monitor Azure Content Safety costs (charged per API call)

---

**Last Updated:** October 2025
**Documentation Coverage:** 100% (all photo endpoints and pipeline documented)

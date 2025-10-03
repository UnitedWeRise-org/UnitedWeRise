# Photo Upload Architecture Design
**Status:** 🟢 COMPLETE - Ready for Implementation
**Created:** October 2, 2025
**Architecture Agent:** Complete

---

## Executive Summary

This document specifies the exact architecture for migrating from the broken direct-to-blob upload system to a clean, secure backend-first processing model.

**Current Problem:**
- Frontend uploads directly to Azure Blob (unsafe)
- Backend downloads blob, sanitizes, re-uploads (broken - "blob not found")
- 2 blob operations, complex SAS token logic, multiple failure points

**New Solution:**
- Frontend sends file to backend via multipart/form-data
- Backend processes BEFORE any blob upload (validation, moderation, EXIF stripping)
- Single blob upload of sanitized file only
- Simpler, safer, more reliable

---

## Architecture Components

### 1. Backend Endpoint: POST /api/photos/upload

**Location:** `backend/src/routes/photos.ts`

**Middleware Stack:**
```typescript
router.post('/upload',
  uploadLimiter,           // Rate limiting (already exists: 50 per 15min)
  requireAuth,             // Authentication check
  upload.single('file'),   // Multer middleware for file processing
  async (req: AuthRequest, res) => {
    // Handler logic
  }
);
```

**Multer Configuration:**
```typescript
import multer from 'multer';

// Add at top of photos.ts file
const upload = multer({
  storage: multer.memoryStorage(),  // Keep file in memory for processing
  limits: {
    fileSize: 10 * 1024 * 1024,     // 10MB max
    files: 1                         // Single file per request
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

**Request Validation Flow:**
```typescript
async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { photoType, purpose = 'PERSONAL', caption, gallery, candidateId } = req.body;

    // 1. Validate file uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a photo to upload'
      });
    }

    // 2. Validate required fields
    if (!photoType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'photoType is required'
      });
    }

    // 3. Validate photo type enum
    if (!Object.values(PhotoType).includes(photoType)) {
      return res.status(400).json({
        error: 'Invalid photo type',
        message: 'Photo type must be one of: AVATAR, COVER, CAMPAIGN, VERIFICATION, EVENT, GALLERY, POST_MEDIA'
      });
    }

    // 4. Validate purpose enum
    if (!Object.values(PhotoPurpose).includes(purpose)) {
      return res.status(400).json({
        error: 'Invalid purpose',
        message: 'Purpose must be one of: PERSONAL, CAMPAIGN, BOTH'
      });
    }

    // 5. Validate candidate relationship for campaign photos
    if ((purpose === 'CAMPAIGN' || purpose === 'BOTH' || photoType === 'CAMPAIGN') && !candidateId) {
      return res.status(400).json({
        error: 'Candidate ID required',
        message: 'Candidate ID is required for campaign photos'
      });
    }

    // 6. Call PhotoService to process and upload
    const result = await PhotoService.processAndUploadPhoto({
      fileBuffer: req.file.buffer,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      userId: user!.id,
      photoType: photoType as PhotoType,
      purpose: purpose as PhotoPurpose,
      caption: caption ? caption.substring(0, 200) : undefined,
      gallery: gallery || undefined,
      candidateId: candidateId || undefined
    });

    // 7. Return success response
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
    console.error('Photo upload failed:', error);

    // Handle specific error types
    if (error.message?.includes('Storage limit exceeded')) {
      return res.status(413).json({
        error: 'Storage limit exceeded',
        message: error.message
      });
    }

    if (error.message?.includes('Permission denied') || error.message?.includes('Invalid candidate')) {
      return res.status(403).json({
        error: 'Permission denied',
        message: error.message
      });
    }

    if (error.message?.includes('Content moderation failed')) {
      return res.status(422).json({
        error: 'Content moderation failed',
        message: error.message
      });
    }

    if (error.message?.includes('Invalid file type')) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Upload failed',
      message: 'Failed to upload photo. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
```

---

### 2. PhotoService Method: processAndUploadPhoto()

**Location:** `backend/src/services/photoService.ts`

**Method Signature:**
```typescript
static async processAndUploadPhoto(options: {
  fileBuffer: Buffer;
  filename: string;
  mimeType: string;
  fileSize: number;
  userId: string;
  photoType: PhotoType;
  purpose: PhotoPurpose;
  caption?: string;
  gallery?: string;
  candidateId?: string;
}): Promise<{
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}>;
```

**Processing Pipeline:**
```typescript
static async processAndUploadPhoto(options: {
  fileBuffer: Buffer;
  filename: string;
  mimeType: string;
  fileSize: number;
  userId: string;
  photoType: PhotoType;
  purpose: PhotoPurpose;
  caption?: string;
  gallery?: string;
  candidateId?: string;
}): Promise<{
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}> {
  try {
    console.log(`📸 Processing photo upload for user ${options.userId} (${options.photoType})`);

    // STEP 1: Validate user permissions
    // REUSE: Existing validateUserPermissions() method (lines 546-565)
    await this.validateUserPermissions(options.userId, options.candidateId);

    // STEP 2: Check account storage limit
    // REUSE: Existing validateStorageLimit() method (lines 523-541)
    await this.validateStorageLimit(options.userId, options.fileSize);

    // STEP 3: Validate image file (magic bytes check)
    // REUSE: Existing validateImageFile() method (lines 1089-1144)
    const fileValidation = await this.validateImageFile(options.fileBuffer, options.mimeType);
    if (!fileValidation.valid) {
      throw new Error(fileValidation.reason || 'Invalid image file');
    }

    // STEP 4: AI content moderation
    // REUSE: Existing performContentModeration() method (lines 591-685)
    const moderationResult = await this.performContentModeration(
      {
        buffer: options.fileBuffer,
        mimetype: options.mimeType,
        size: options.fileSize,
        originalname: options.filename
      } as any,
      options.photoType,
      options.userId
    );

    if (!moderationResult.approved) {
      throw new Error(moderationResult.reason || 'Content moderation failed');
    }

    // STEP 5: Strip EXIF metadata and process image
    // REUSE: Logic from uploadPhoto() lines 140-175
    const fileExtension = path.extname(options.filename);
    const baseFilename = `${uuidv4()}-${options.photoType.toLowerCase()}`;
    const isGif = options.mimeType === 'image/gif';

    const filename = isGif ? `${baseFilename}.gif` : `${baseFilename}.webp`;
    const thumbnailFilename = `${baseFilename}-thumb.webp`;

    const preset = this.SIZE_PRESETS[options.photoType];
    let imageBuffer: Buffer;
    let metadata: sharp.Metadata;

    if (isGif) {
      // For GIFs, resize but keep format and animation
      const processedGif = sharp(options.fileBuffer, { animated: true })
        .rotate() // Auto-rotate based on EXIF, then strips EXIF
        .resize(preset.width, preset.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .gif();

      imageBuffer = await processedGif.toBuffer();
      metadata = await sharp(imageBuffer).metadata();
    } else {
      // For static images, convert to WebP (automatically strips EXIF)
      const processedImage = sharp(options.fileBuffer)
        .rotate() // Auto-rotate based on EXIF
        .resize(preset.width, preset.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 85 });

      imageBuffer = await processedImage.toBuffer();
      metadata = await sharp(imageBuffer).metadata();
    }

    // STEP 6: Generate thumbnail
    // REUSE: Logic from uploadPhoto() lines 169-175
    const thumbnailBuffer = await sharp(options.fileBuffer)
      .rotate()
      .resize(preset.thumbnailWidth, preset.thumbnailHeight, {
        fit: 'cover'
      })
      .webp({ quality: 75 })
      .toBuffer();

    // STEP 7: Upload sanitized image to blob ONCE
    // REUSE: Logic from uploadPhoto() lines 178-208
    let photoUrl: string;
    let thumbnailUrl: string;

    // Upload main photo
    photoUrl = await AzureBlobService.uploadFile(
      imageBuffer,
      filename,
      isGif ? 'image/gif' : 'image/webp',
      'photos'
    );

    // Upload thumbnail
    thumbnailUrl = await AzureBlobService.uploadFile(
      thumbnailBuffer,
      thumbnailFilename,
      'image/webp',
      'thumbnails'
    );

    console.log(`✅ Photo uploaded to Azure Blob Storage: ${photoUrl}`);

    // STEP 8: Create database record
    // REUSE: Logic from uploadPhoto() lines 211-230
    const photo = await prisma.photo.create({
      data: {
        userId: options.userId,
        candidateId: options.candidateId,
        filename: options.filename,
        url: photoUrl,
        thumbnailUrl: thumbnailUrl,
        photoType: options.photoType,
        purpose: options.purpose,
        gallery: options.gallery || (options.photoType === 'GALLERY' ? 'My Photos' : null),
        caption: options.caption,
        originalSize: options.fileSize,
        compressedSize: imageBuffer.length,
        width: metadata.width || 0,
        height: metadata.height || 0,
        mimeType: isGif ? 'image/gif' : 'image/webp',
        isApproved: this.shouldAutoApprove(options.photoType, options.userId)
      }
    });

    // Update user/candidate avatar if this is an avatar photo
    if (options.photoType === 'AVATAR') {
      await this.updateProfileAvatar(options.userId, photo.url, options.candidateId);
    }

    console.log(`✅ Photo upload complete: ${photo.id}`);

    // STEP 9: Return photo record
    return {
      id: photo.id,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl!,
      width: photo.width,
      height: photo.height
    };

  } catch (error) {
    console.error('Photo processing failed:', error);
    throw error;
  }
}
```

**Key Design Decisions:**

1. **Maximum Code Reuse:** The new method reuses 90% of existing code from:
   - `validateUserPermissions()` - Already public, lines 546-565
   - `validateStorageLimit()` - Already public, lines 523-541
   - `validateImageFile()` - Already exists, lines 1089-1144
   - `performContentModeration()` - Already exists, lines 591-685
   - Image processing logic from `uploadPhoto()` - Lines 140-175
   - Database creation logic from `uploadPhoto()` - Lines 211-230

2. **No Download Step:** Unlike `createPhotoRecordFromBlob()` which downloads from blob (lines 1039-1083), this method receives the buffer directly from the request.

3. **Single Blob Upload:** The sanitized image is uploaded to blob ONCE, not twice. No temporary unsafe blob is ever created.

4. **Security First:** All security checks happen BEFORE blob upload:
   - Magic bytes validation
   - AI content moderation
   - EXIF stripping
   - Storage limit check
   - Permission validation

---

### 3. Frontend Changes

**Location:** `frontend/src/modules/features/feed/my-feed.js`

**Replace uploadMediaFiles() function (lines 31-40):**

```javascript
/**
 * Unified media upload function - NEW BACKEND-FIRST ARCHITECTURE
 *
 * @param {File|File[]} files - Single file or array of files to upload
 * @param {string} photoType - Type: 'POST_MEDIA', 'AVATAR', 'GALLERY', etc.
 * @param {string} purpose - Purpose: 'PERSONAL', 'CAMPAIGN', 'BOTH'
 * @param {string} caption - Optional caption for photos
 * @param {string} gallery - Optional gallery name
 * @returns {Promise<Object>} Upload response from backend
 */
async function uploadMediaFiles(files, photoType, purpose = 'PERSONAL', caption = '', gallery = null) {
  console.log('📸 Uploading media files:', { files, photoType, purpose });

  const fileArray = Array.isArray(files) ? files : [files];
  const uploadedPhotos = [];

  // Upload each file to backend
  for (const file of fileArray) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('photoType', photoType);
      formData.append('purpose', purpose);
      if (caption) formData.append('caption', caption);
      if (gallery) formData.append('gallery', gallery);

      console.log(`📤 Uploading ${file.name} to backend...`);

      const response = await apiClient.call('/photos/upload', {
        method: 'POST',
        body: formData,
        // DO NOT set Content-Type header - browser sets it automatically with boundary
      });

      console.log(`✅ Upload response:`, response);

      // Handle response format (apiClient wraps in data.data)
      const photo = response.data?.photo || response.photo;
      if (photo) {
        uploadedPhotos.push(photo);
        console.log(`✅ Photo uploaded: ${photo.id}`);
      } else {
        console.error('❌ No photo in response:', response);
      }

    } catch (error) {
      console.error(`❌ Failed to upload ${file.name}:`, error);
      throw error; // Re-throw to let caller handle
    }
  }

  return {
    ok: true,
    status: 200,
    data: { success: true, photos: uploadedPhotos }
  };
}
```

**Delete:** `frontend/src/modules/features/feed/photo-upload-direct.js` (entire file)

**Update imports:** Remove `import { uploadPhotoDirectToBlob } from './photo-upload-direct.js';` from:
- `frontend/src/modules/features/feed/my-feed.js` (line 13)
- `frontend/src/components/UnifiedPostCreator.js` (if present)

---

## Code Reuse Analysis

**Existing Code That Can Be Reused:**

| Method | Location | Lines | Purpose | Public? |
|--------|----------|-------|---------|---------|
| `validateUserPermissions()` | photoService.ts | 546-565 | Validate candidate relationship | ✅ Yes |
| `validateStorageLimit()` | photoService.ts | 523-541 | Check storage quota | ✅ Yes |
| `validateImageFile()` | photoService.ts | 1089-1144 | Magic bytes validation | ❌ Private (need to make public or inline) |
| `performContentModeration()` | photoService.ts | 591-685 | AI content moderation | ❌ Private (already called correctly) |
| `shouldAutoApprove()` | photoService.ts | 567-586 | Auto-approval logic | ❌ Private (already called correctly) |
| `updateProfileAvatar()` | photoService.ts | 687-721 | Update user avatar | ❌ Private (already called correctly) |

**Code to Extract from uploadPhoto():**

| Logic | Lines | Purpose |
|-------|-------|---------|
| Image processing (GIF/WebP) | 140-166 | Resize, strip EXIF, convert format |
| Thumbnail generation | 169-175 | Create thumbnail |
| Azure blob upload | 178-208 | Upload to Azure Blob Storage |
| Database record creation | 211-230 | Create Photo record in DB |

**Estimated Code:**
- New endpoint handler: ~100 lines
- New PhotoService method: ~150 lines (mostly copy-paste from uploadPhoto)
- Frontend update: ~50 lines
- **Total new code:** ~300 lines
- **Code deleted:** ~500 lines (photo-upload-direct.js + SAS token endpoints)
- **Net reduction:** ~200 lines

---

## Error Handling Strategy

**Principle:** Fail fast, fail clearly, clean up on failure.

**Error Categories:**

1. **Client Errors (400-499):**
   - 400: Missing fields, invalid photo type, invalid purpose
   - 401: Not authenticated
   - 403: Permission denied (wrong candidateId)
   - 413: File too large or storage limit exceeded
   - 422: Content moderation failed

2. **Server Errors (500-599):**
   - 500: Unexpected errors (database, Azure Blob, image processing)

**Error Response Format:**
```json
{
  "error": "Short error type",
  "message": "User-friendly explanation",
  "details": "Stack trace (development only)"
}
```

**Cleanup on Failure:**
- If processing fails BEFORE blob upload: No cleanup needed (no blob created)
- If blob upload succeeds but DB creation fails: Azure blob orphaned (acceptable - can clean up later with maintenance script)
- No temporary blobs are ever created in the new architecture

---

## Performance Considerations

**Memory Usage:**
- File stored in memory during processing (max 10MB)
- Sharp library processes in-memory efficiently
- Thumbnail generated in-memory
- Peak memory: ~30MB per upload (original + processed + thumbnail)
- Container Apps have 512MB+ memory, can handle 10+ concurrent uploads

**Upload Time:**
- Network time: ~2-5 seconds (10MB file)
- Processing time: ~1-2 seconds (Sharp is very fast)
- AI moderation: ~2-3 seconds (Azure OpenAI Vision)
- Total: ~5-10 seconds per photo
- Acceptable for user experience

**Comparison to Old Architecture:**
- Old: Frontend→Blob (5s) + Backend download (2s) + Backend process (2s) + Backend re-upload (5s) = 14s
- New: Frontend→Backend (5s) + Backend process (2s) + Backend upload (5s) = 12s
- **15% faster** + more reliable (fewer network operations)

---

## Security Enhancements

**Defense in Depth - All checks happen BEFORE blob upload:**

1. **File Type Validation:** Multer fileFilter checks MIME type
2. **Magic Bytes Validation:** Verify actual file format matches declared type (prevents malware disguised as images)
3. **AI Content Moderation:** Azure OpenAI Vision scans for prohibited content
4. **EXIF Stripping:** Remove GPS coordinates, camera serial numbers, etc.
5. **Storage Limit Enforcement:** Prevent storage abuse
6. **Permission Validation:** Ensure user owns candidate for campaign photos

**Result:** Only safe, sanitized blobs are EVER uploaded to Azure.

**Old Architecture Security Gaps:**
- ❌ Unsafe blob temporarily stored in Azure (EXIF data exposed)
- ❌ Backend download could fail, leaving unsafe blob
- ❌ SAS token generation complexity (signature mismatch issues)

**New Architecture Security:**
- ✅ No unsafe blobs ever created
- ✅ All validation happens before storage
- ✅ Simpler code = fewer vulnerabilities

---

## Migration Strategy

**Phase 1: Add New Endpoint (Non-breaking)**
- Add POST /api/photos/upload endpoint
- Add PhotoService.processAndUploadPhoto() method
- Keep old endpoints functional (SAS token, confirm)
- Deploy to staging, test thoroughly

**Phase 2: Update Frontend**
- Update uploadMediaFiles() in my-feed.js
- Test with new backend endpoint
- Old code still works as fallback

**Phase 3: Delete Old Code**
- Remove photo-upload-direct.js
- Mark old endpoints as deprecated (add comments)
- Monitor for any usage

**Phase 4: Complete Cleanup**
- Delete deprecated endpoints (SAS token, confirm)
- Delete SASTokenService methods (keep utility methods)
- Update documentation

**Rollback Plan:**
- If new endpoint fails: Frontend can temporarily revert to old uploadMediaFiles()
- Old endpoints remain functional during migration
- Database schema unchanged, no data migration needed

---

## Success Criteria

Migration is successful when:

1. ✅ POST /api/photos/upload endpoint works
2. ✅ All 10 test scenarios pass (see PHOTO-UPLOAD-TESTING-CHECKLIST.md)
3. ✅ Photos appear in feed after upload
4. ✅ EXIF metadata stripped (verify with exiftool)
5. ✅ AI moderation blocks inappropriate content
6. ✅ Upload time < 10 seconds for 5MB files
7. ✅ Old code deleted (photo-upload-direct.js, SAS token endpoints)
8. ✅ No errors in production logs for 24 hours
9. ✅ Code is simpler (fewer lines, fewer files)
10. ✅ Azure Blob Storage contains only sanitized images

---

## Architecture Diagram

```
OLD ARCHITECTURE (BROKEN):
┌─────────┐  1. Upload    ┌─────────────┐
│ Browser │─────────────>│ Azure Blob  │
└─────────┘               │  (unsafe)   │
     │                    └─────────────┘
     │ 2. Confirm              │
     v                         │ 3. Download
┌─────────┐                    v
│ Backend │<───────────────────┘
└─────────┘
     │ 4. Process
     │ (Sanitize, EXIF strip)
     │
     v 5. Re-upload
┌─────────────┐
│ Azure Blob  │
│   (safe)    │
└─────────────┘

Problems: 2 blob operations, unsafe blob exists, download can fail


NEW ARCHITECTURE (CLEAN):
┌─────────┐  1. Upload    ┌─────────┐
│ Browser │─────────────>│ Backend │
└─────────┘               └─────────┘
                               │
                               │ 2. Process
                               │ (Validate, Sanitize, EXIF strip)
                               │
                               v 3. Upload ONCE
                          ┌─────────────┐
                          │ Azure Blob  │
                          │   (safe)    │
                          └─────────────┘

Benefits: 1 blob operation, no unsafe blob, simpler, more reliable
```

---

## Next Steps for Implementation Agents

**Backend Agent:**
1. Read this document completely
2. Read PHOTO-UPLOAD-API-CONTRACT.md for exact specifications
3. Implement POST /api/photos/upload endpoint in `backend/src/routes/photos.ts`
4. Implement PhotoService.processAndUploadPhoto() in `backend/src/services/photoService.ts`
5. Test locally with curl/Postman
6. Mark old endpoints as deprecated (add comments)
7. Commit and push to development branch
8. Signal: "Backend implementation complete"

**Frontend Agent:**
1. Read this document completely
2. Read PHOTO-UPLOAD-API-CONTRACT.md for exact specifications
3. Update uploadMediaFiles() in `frontend/src/modules/features/feed/my-feed.js`
4. Test locally with browser DevTools
5. Delete `frontend/src/modules/features/feed/photo-upload-direct.js`
6. Remove all imports of photo-upload-direct.js
7. Commit and push to development branch
8. Signal: "Frontend implementation complete"

**Testing Agent:**
1. Wait for Backend Agent AND Frontend Agent to complete
2. Read PHOTO-UPLOAD-TESTING-CHECKLIST.md
3. Deploy to staging environment
4. Run all test scenarios
5. Create detailed test report
6. Signal: "Testing complete"

---

**Architecture Agent Status:** ✅ COMPLETE

This design is ready for implementation. All specifications are detailed, all design decisions are documented, all code reuse opportunities are identified.

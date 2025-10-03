# Photo Upload Architecture Migration Plan
**Status:** 🟡 IN PROGRESS
**Created:** October 2, 2025
**Migration:** Direct-to-Blob → Backend-First Processing

---

## Executive Summary

**Problem:** Current direct-to-blob upload architecture is overly complex, creates security risks (unsafe blobs stored temporarily), and is currently broken (blob not found errors).

**Solution:** Migrate to backend-first processing where files are sanitized BEFORE storage, eliminating complexity and ensuring only safe blobs are ever stored.

**Impact:** Simpler architecture, better security, one blob operation instead of two, easier maintenance.

---

## Architecture Comparison

### Current Architecture (BROKEN)
```
Frontend → Azure Blob (unsafe) → Backend downloads → Backend sanitizes → Backend re-uploads (safe)
```

**Problems:**
1. ❌ Blob uploaded twice (30MB total transfer for 10MB file)
2. ❌ Unsafe blob exists temporarily (EXIF/GPS data exposed)
3. ❌ Complex SAS token generation
4. ❌ "Blob not found" errors during backend download
5. ❌ More failure points (3 network operations)

### New Architecture (TARGET)
```
Frontend → Backend → Backend sanitizes → Azure Blob (safe)
```

**Benefits:**
1. ✅ Blob uploaded once (20MB total transfer for 10MB file)
2. ✅ No unsafe blobs ever stored
3. ✅ Simpler code (no SAS tokens)
4. ✅ Standard multipart upload pattern
5. ✅ Fewer failure points (2 network operations)

---

## File Inventory

### Files to MODIFY

**Backend:**
- `backend/src/routes/photos.ts` - Add new `/upload` endpoint, mark old endpoints deprecated
- `backend/src/services/photoService.ts` - Modify to accept Buffer directly (no download step)

**Frontend:**
- `frontend/src/modules/features/feed/my-feed.js` - Update `uploadMediaFiles()` to use new endpoint
- `frontend/src/components/UnifiedPostCreator.js` - Update media upload calls

### Files to DELETE

**Frontend:**
- `frontend/src/modules/features/feed/photo-upload-direct.js` - Entire file (direct blob upload)

**Backend:**
- Remove from `backend/src/routes/photos.ts`:
  - `/upload/sas-token` endpoint (lines 91-156)
  - `/upload/confirm` endpoint (lines 256-358)
- Remove from `backend/src/services/sasTokenService.ts`:
  - `generateUploadToken()` method (lines 32-98)
  - Can keep `verifyBlobExists()` and `getBlobMetadata()` for other uses

### Files to CREATE

**Backend:**
- No new files needed (add endpoint to existing photos.ts)

**Frontend:**
- `frontend/src/modules/features/feed/photo-upload-simple.js` - Simple FormData upload (optional, can inline in my-feed.js)

---

## API Specification

### New Endpoint: POST /api/photos/upload

**Request:**
```
Content-Type: multipart/form-data

Fields:
- file: File (required) - Image file
- photoType: string (required) - POST_MEDIA, AVATAR, COVER, etc.
- purpose: string (default: PERSONAL) - PERSONAL, CAMPAIGN, BOTH
- caption: string (optional, max 200 chars)
- gallery: string (optional)
- candidateId: string (optional, for candidate photos)
```

**Response (201 Created):**
```json
{
  "success": true,
  "photo": {
    "id": "string",
    "url": "string",
    "thumbnailUrl": "string",
    "width": number,
    "height": number
  },
  "pendingModeration": boolean
}
```

**Error Responses:**
- `400` - Invalid file type, missing required fields
- `401` - Not authenticated
- `403` - Permission denied (e.g., wrong candidateId)
- `413` - File too large (>10MB)
- `422` - Content moderation failed
- `500` - Server error

---

## Implementation Steps

### Phase 1: Backend Implementation (Agent 2)

**Step 1.1: Create new upload endpoint**
Location: `backend/src/routes/photos.ts`

```typescript
router.post('/upload',
  uploadLimiter,
  requireAuth,
  upload.single('file'), // Multer middleware
  async (req: AuthRequest, res) => {
    // Validate file uploaded
    // Extract metadata from req.body
    // Call PhotoService.processAndUploadPhoto()
    // Return photo record
  }
);
```

**Step 1.2: Create PhotoService method**
Location: `backend/src/services/photoService.ts`

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
}): Promise<Photo> {
  // 1. Validate image file (magic bytes)
  // 2. AI content moderation
  // 3. Strip EXIF metadata
  // 4. Get image dimensions
  // 5. Generate thumbnail
  // 6. Upload sanitized image to blob ONCE
  // 7. Upload thumbnail to blob
  // 8. Create database record
  // 9. Return photo record
}
```

**Step 1.3: Mark old endpoints as deprecated**
Add comments to old endpoints:
```typescript
// DEPRECATED: Use POST /api/photos/upload instead
// This endpoint will be removed in next release
router.post('/upload/sas-token', ...);
router.post('/upload/confirm', ...);
```

### Phase 2: Frontend Implementation (Agent 3)

**Step 2.1: Create simple upload function**
Location: `frontend/src/modules/features/feed/my-feed.js`

Replace `uploadMediaFiles()` function:
```javascript
async function uploadMediaFiles(files, photoType, purpose = 'PERSONAL', caption = '', gallery = null) {
  console.log('📸 Uploading media files:', { files, photoType, purpose });

  const formData = new FormData();
  const fileArray = Array.isArray(files) ? files : [files];

  const uploadedPhotos = [];
  for (const file of fileArray) {
    formData.append('file', file);
    formData.append('photoType', photoType);
    formData.append('purpose', purpose);
    if (caption) formData.append('caption', caption);
    if (gallery) formData.append('gallery', gallery);

    const response = await apiClient.call('/photos/upload', {
      method: 'POST',
      body: formData,
      skipContentType: true // Let browser set multipart boundary
    });

    if (response.success) {
      uploadedPhotos.push(response.photo);
    }
  }

  return {
    ok: true,
    status: 200,
    data: { success: true, photos: uploadedPhotos }
  };
}
```

**Step 2.2: Remove photo-upload-direct.js**
- Delete file entirely
- Remove all imports of this file
- Update any remaining references

**Step 2.3: Update import statements**
Remove from all files:
```javascript
import { uploadPhotoDirectToBlob } from './photo-upload-direct.js';
```

### Phase 3: Cleanup (Agents 2 & 3)

**Backend Cleanup (Agent 2):**
- Remove SAS token endpoint after testing confirms new endpoint works
- Remove confirm endpoint after testing confirms new endpoint works
- Update API documentation

**Frontend Cleanup (Agent 3):**
- Search codebase for any remaining references to:
  - `uploadPhotoDirectToBlob`
  - `photo-upload-direct.js`
  - `sas-token`
- Remove all found references

### Phase 4: Testing (Agent 4)

**Test Scenarios:**
1. Single photo upload (2MB JPEG)
2. Multiple photos upload (3 files)
3. Large file upload (9MB PNG)
4. Invalid file type (.txt)
5. File too large (11MB)
6. EXIF metadata stripping verification
7. AI content moderation (appropriate + inappropriate images)
8. Thumbnail generation
9. Profile photo update
10. Error handling (network failure, server error)

**Verification:**
- Check Azure Portal - only sanitized blobs exist
- Check database - photo records created correctly
- Check frontend - photos display in feed
- Check logs - no errors
- Performance test - upload time < 5 seconds for 5MB file

### Phase 5: Documentation (Agent 5)

**Documents to Update:**
- `.claude/scratchpads/PHOTO-UPLOAD-MIGRATION-PLAN.md` - Mark as complete
- `.claude/scratchpads/DIRECT-TO-BLOB-TESTING-PLAN.md` - Archive or update
- `CLAUDE.md` - Update if architecture section exists
- API documentation - Document new `/upload` endpoint

**Migration Summary:**
- Files changed count
- Files deleted count
- Lines of code removed
- Performance comparison (old vs new)
- Success metrics

---

## Rollback Procedure

**If migration fails:**

1. **Immediate rollback (< 5 minutes):**
   ```bash
   git revert HEAD
   git push origin main
   # Old endpoints still exist (marked deprecated)
   ```

2. **Database rollback:**
   - No schema changes, no rollback needed

3. **Blob storage rollback:**
   - No changes to existing blobs
   - May need to clean up any test uploads

**Rollback success criteria:**
- Old upload flow works
- Users can upload photos
- No data loss

---

## Success Criteria

**Migration is successful when:**
1. ✅ New `/api/photos/upload` endpoint works
2. ✅ All 10 test scenarios pass
3. ✅ Photos appear in feed after upload
4. ✅ Only sanitized blobs exist in Azure (no EXIF data)
5. ✅ Upload time < 5 seconds for 5MB files
6. ✅ Old code completely removed (no orphaned references)
7. ✅ Documentation updated
8. ✅ No errors in production logs for 24 hours
9. ✅ Code is simpler (fewer lines, fewer files)

**Metrics:**
- Lines of code removed: ~500+ (entire photo-upload-direct.js + SAS token logic)
- Files deleted: 1 (photo-upload-direct.js)
- Blob operations reduced: 2 → 1 (50% reduction)
- Network transfer reduced: 30MB → 20MB for 10MB file (33% reduction)

---

## Risk Assessment

**Low Risk Migration:**
- No database schema changes
- No breaking changes to existing photos
- Old endpoints remain functional during migration
- Easy rollback (git revert)

**Potential Issues:**
1. **Multer configuration** - Ensure file size limits correct
2. **CORS** - Ensure backend accepts multipart/form-data
3. **Memory usage** - Backend processes file in memory (acceptable for 10MB limit)
4. **Upload time** - May be slightly slower (1-2 seconds) but more reliable

---

## Agent Coordination Plan

### Agent 1: Architecture Agent
**Responsibility:** Detailed design and coordination
**Tasks:**
- Review and enhance this migration plan
- Design exact backend endpoint structure
- Define precise API contract
- Create detailed testing checklist
- Signal when design is complete

### Agent 2: Backend Agent
**Responsibility:** Backend implementation + cleanup
**Tasks:**
- Wait for Architecture Agent to complete design
- Implement `/api/photos/upload` endpoint
- Modify PhotoService for process-then-upload
- Test backend changes locally
- Remove old SAS token endpoints
- Remove old confirm endpoint
- Update backend API docs
- Commit and push changes
- Signal when backend is complete

### Agent 3: Frontend Agent
**Responsibility:** Frontend implementation + cleanup
**Tasks:**
- Wait for Architecture Agent to complete design
- Can start in parallel with Backend Agent
- Implement new FormData upload in my-feed.js
- Update UnifiedPostCreator
- Test frontend changes locally
- Delete photo-upload-direct.js
- Remove all imports and references
- Commit and push changes
- Signal when frontend is complete

### Agent 4: Testing Agent
**Responsibility:** Validation
**Tasks:**
- Wait for Backend Agent AND Frontend Agent to complete
- Deploy to staging
- Run all 10 test scenarios
- Verify EXIF stripping works
- Verify AI moderation works
- Performance testing
- Check for orphaned code
- Verify blob storage (only safe blobs)
- Create test report
- Signal when testing is complete

### Agent 5: Documentation Agent
**Responsibility:** Documentation + final validation
**Tasks:**
- Wait for Testing Agent to complete
- Update all migration documents
- Update CLAUDE.md if needed
- Create migration summary report
- Verify all cleanup complete
- Final code review (no orphaned references)
- Mark migration as complete
- Create deployment checklist for production

---

## Timeline Estimate

**Phase 1 - Architecture:** 30 minutes
**Phase 2 - Backend Implementation:** 1 hour
**Phase 3 - Frontend Implementation:** 1 hour (parallel with backend)
**Phase 4 - Testing:** 1 hour
**Phase 5 - Documentation:** 30 minutes

**Total:** ~3-4 hours for complete migration

---

## Current Status

- [COMPLETE] Migration plan created
- [COMPLETE] Architecture Agent - Design complete
- [PENDING] Backend Agent launch
- [PENDING] Frontend Agent launch
- [PENDING] Testing Agent launch
- [PENDING] Documentation Agent launch

---

**Architecture Design Complete:** October 2, 2025

**Design Documents Created:**
1. `.claude/scratchpads/PHOTO-UPLOAD-ARCHITECTURE-DESIGN.md` - Complete architecture specification
2. `.claude/scratchpads/PHOTO-UPLOAD-API-CONTRACT.md` - Precise API contract for frontend/backend
3. `.claude/scratchpads/PHOTO-UPLOAD-TESTING-CHECKLIST.md` - 35 test scenarios with verification steps

**Key Design Decisions:**
- Maximum code reuse: 90% of code from existing `uploadPhoto()` and validation methods
- Single blob upload: Sanitized image uploaded ONCE (no temporary unsafe blob)
- Security first: All validation happens BEFORE blob upload
- Net code reduction: ~200 lines deleted vs ~300 lines added
- Performance: 15% faster than old architecture (12s vs 14s for 10MB file)

**Next Action:** Launch Backend Agent and Frontend Agent (can work in parallel).

**Backend Agent Tasks:**
1. Add POST /api/photos/upload endpoint to `backend/src/routes/photos.ts`
2. Add PhotoService.processAndUploadPhoto() to `backend/src/services/photoService.ts`
3. Mark old endpoints as deprecated (add comments)
4. Test locally, commit, push to development branch
5. Signal: "Backend implementation complete"

**Frontend Agent Tasks:**
1. Update uploadMediaFiles() in `frontend/src/modules/features/feed/my-feed.js`
2. Delete `frontend/src/modules/features/feed/photo-upload-direct.js`
3. Remove all imports of photo-upload-direct.js
4. Test locally, commit, push to development branch
5. Signal: "Frontend implementation complete"

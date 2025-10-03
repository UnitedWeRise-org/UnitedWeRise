# Photo Upload Migration - Agent Coordination
**Status:** 🟢 READY FOR IMPLEMENTATION
**Created:** October 2, 2025
**Architecture Agent:** Complete

---

## Overview

This document coordinates the multi-agent implementation of the photo upload migration. Each agent has specific tasks and dependencies.

---

## Agent Roles and Dependencies

```
┌──────────────────┐
│ Architecture     │ ✅ COMPLETE
│ Agent (Agent 1)  │
└────────┬─────────┘
         │
         │ Design Documents
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Backend │ │Frontend│ ⏳ READY TO START (can run in parallel)
│Agent 2 │ │Agent 3 │
└────┬───┘ └───┬────┘
     │         │
     │         │
     └────┬────┘
          │
          │ Both complete
          │
          ▼
     ┌────────┐
     │Testing │ ⏳ WAITING
     │Agent 4 │
     └───┬────┘
         │
         │ Tests pass
         │
         ▼
    ┌────────────┐
    │Documentation│ ⏳ WAITING
    │  Agent 5   │
    └────────────┘
```

---

## Agent 1: Architecture Agent (YOU)

**Status:** ✅ COMPLETE

**Deliverables:**
1. ✅ PHOTO-UPLOAD-ARCHITECTURE-DESIGN.md - Complete architecture specification
2. ✅ PHOTO-UPLOAD-API-CONTRACT.md - Precise API contract
3. ✅ PHOTO-UPLOAD-TESTING-CHECKLIST.md - 35 test scenarios
4. ✅ PHOTO-UPLOAD-AGENT-COORDINATION.md - This coordination document

**Key Decisions Made:**
- Backend-first processing (no direct-to-blob upload)
- Maximum code reuse from existing PhotoService methods
- Single blob upload of sanitized files only
- Multer for file handling (same pattern as badges.ts)
- FormData for frontend uploads (standard pattern)

**Design Review:**
- ✅ All error cases covered (400, 401, 403, 413, 422, 500)
- ✅ Security validation specified (magic bytes, AI moderation, EXIF stripping)
- ✅ Performance benchmarks defined (5-10 seconds per upload)
- ✅ Code reuse maximized (90% existing code)
- ✅ Migration path defined (non-breaking, phased rollout)

**Signal to other agents:** "Architecture design complete. Backend and Frontend agents can begin implementation."

---

## Agent 2: Backend Agent

**Status:** ⏳ READY TO START

**Responsibility:** Implement backend photo upload endpoint and processing logic

**Prerequisites:**
- ✅ Architecture design complete
- ✅ API contract defined

**Tasks:**

### Task 2.1: Add Multer Configuration
**File:** `backend/src/routes/photos.ts`
**Location:** Top of file (after imports)

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

**Reference:** See PHOTO-UPLOAD-ARCHITECTURE-DESIGN.md, Section 1

---

### Task 2.2: Add POST /upload Endpoint
**File:** `backend/src/routes/photos.ts`
**Location:** After line 182 (after sas-token endpoint)

**Full implementation:** See PHOTO-UPLOAD-ARCHITECTURE-DESIGN.md, Section 1

**Key points:**
- Use `upload.single('file')` middleware
- Validate all required fields
- Call `PhotoService.processAndUploadPhoto()`
- Return 201 status with photo data
- Handle all error types (see API contract)

**Estimated lines:** ~100

---

### Task 2.3: Add processAndUploadPhoto() Method
**File:** `backend/src/services/photoService.ts`
**Location:** After line 253 (after uploadPhoto method)

**Method signature:**
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

**Implementation:** See PHOTO-UPLOAD-ARCHITECTURE-DESIGN.md, Section 2

**Code reuse:**
- `validateUserPermissions()` - Already exists (line 546)
- `validateStorageLimit()` - Already exists (line 523)
- `validateImageFile()` - Already exists (line 1089)
- `performContentModeration()` - Already exists (line 591)
- Image processing logic from `uploadPhoto()` (lines 140-175)
- Database creation logic from `uploadPhoto()` (lines 211-230)

**Estimated lines:** ~150 (mostly copy-paste)

---

### Task 2.4: Mark Old Endpoints as Deprecated
**File:** `backend/src/routes/photos.ts`
**Location:** Lines 91 and 256

**Add comments:**
```typescript
/**
 * DEPRECATED: Use POST /api/photos/upload instead
 * This endpoint will be removed after 2025-11-01
 * Kept temporarily for backward compatibility during migration
 */
router.post('/upload/sas-token', uploadLimiter, requireAuth, async (req: AuthRequest, res) => {
  // ... existing code ...
});

/**
 * DEPRECATED: Use POST /api/photos/upload instead
 * This endpoint will be removed after 2025-11-01
 * Kept temporarily for backward compatibility during migration
 */
router.post('/upload/confirm', uploadLimiter, requireAuth, async (req: AuthRequest, res) => {
  // ... existing code ...
});
```

---

### Task 2.5: Local Testing

**Test with cURL:**
```bash
# Get auth token
TOKEN="your-jwt-token"

# Test upload
curl -X POST http://localhost:3001/api/photos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-photo.jpg" \
  -F "photoType=POST_MEDIA" \
  -F "purpose=PERSONAL"

# Expected: 201 status with photo data
```

**Test checklist:**
- [ ] Endpoint responds to POST requests
- [ ] File validation works (rejects .txt files)
- [ ] Size validation works (rejects >10MB files)
- [ ] Required field validation works
- [ ] Photo uploaded to Azure Blob Storage
- [ ] Database record created
- [ ] Response format matches API contract

---

### Task 2.6: Commit and Push

```bash
cd backend
npm run build  # Verify TypeScript compiles
git add src/routes/photos.ts src/services/photoService.ts
git commit -m "feat: Add backend-first photo upload endpoint

- Add POST /api/photos/upload endpoint with multer
- Add PhotoService.processAndUploadPhoto() method
- Reuse 90% of existing validation and processing code
- Mark old SAS token endpoints as deprecated
- Single blob upload of sanitized files only

Part of photo upload migration (direct-to-blob → backend-first)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin development
```

---

### Success Criteria

- [ ] TypeScript compiles without errors
- [ ] All 6 tasks completed
- [ ] Local testing passed (cURL test successful)
- [ ] Code committed and pushed to development branch
- [ ] Signal sent to coordination channel

**Signal:** "Backend implementation complete. POST /api/photos/upload endpoint is live and tested."

---

## Agent 3: Frontend Agent

**Status:** ⏳ READY TO START (can run in parallel with Backend Agent)

**Responsibility:** Update frontend to use new backend endpoint and delete old direct-to-blob code

**Prerequisites:**
- ✅ Architecture design complete
- ✅ API contract defined

**Tasks:**

### Task 3.1: Update uploadMediaFiles() Function
**File:** `frontend/src/modules/features/feed/my-feed.js`
**Location:** Lines 31-40 (replace entire function)

**New implementation:**
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

**Reference:** See PHOTO-UPLOAD-ARCHITECTURE-DESIGN.md, Section 3

---

### Task 3.2: Remove Old Import
**File:** `frontend/src/modules/features/feed/my-feed.js`
**Location:** Line 13

**Delete:**
```javascript
import { uploadPhotoDirectToBlob } from './photo-upload-direct.js';
```

---

### Task 3.3: Delete Old Upload File
**File:** `frontend/src/modules/features/feed/photo-upload-direct.js`

**Action:** Delete entire file

```bash
rm frontend/src/modules/features/feed/photo-upload-direct.js
```

---

### Task 3.4: Search for Remaining References

**Search commands:**
```bash
# Search for any remaining imports
grep -r "photo-upload-direct" frontend/

# Search for any remaining function calls
grep -r "uploadPhotoDirectToBlob" frontend/

# Search for SAS token references
grep -r "sas-token" frontend/
```

**Expected:** No results (all references removed)

**If found:** Remove them

---

### Task 3.5: Update UnifiedPostCreator (if needed)

**File:** `frontend/src/components/UnifiedPostCreator.js` (check if exists)

**Search for:**
- Import of photo-upload-direct.js
- Calls to uploadPhotoDirectToBlob()

**Action:** Replace with calls to uploadMediaFiles() from my-feed.js

---

### Task 3.6: Local Testing

**Test in browser:**
1. Start frontend dev server: `npm run dev`
2. Navigate to `http://localhost:5173`
3. Log in as test user
4. Open post creator
5. Select test image
6. Click upload
7. Open browser DevTools → Network tab
8. Verify request goes to `/api/photos/upload`
9. Verify request is `multipart/form-data`
10. Verify response is 201 with photo data
11. Verify photo appears in feed

**Test checklist:**
- [ ] Upload works from post creator
- [ ] Upload works from gallery
- [ ] Upload works for avatar
- [ ] Multiple file upload works
- [ ] Error messages display correctly
- [ ] No console errors
- [ ] No references to old code

---

### Task 3.7: Commit and Push

```bash
git add frontend/src/modules/features/feed/my-feed.js
git add frontend/src/modules/features/feed/photo-upload-direct.js  # Records deletion
git commit -m "feat: Migrate to backend-first photo upload

- Update uploadMediaFiles() to use POST /api/photos/upload
- Delete photo-upload-direct.js (500+ lines removed)
- Remove all SAS token logic from frontend
- Use standard FormData multipart upload
- Simpler, more reliable upload flow

Part of photo upload migration (direct-to-blob → backend-first)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin development
```

---

### Success Criteria

- [ ] All 7 tasks completed
- [ ] Old file deleted (photo-upload-direct.js)
- [ ] No remaining references to old code
- [ ] Local testing passed (browser test successful)
- [ ] Code committed and pushed to development branch
- [ ] Signal sent to coordination channel

**Signal:** "Frontend implementation complete. Photo uploads now use backend-first architecture."

---

## Agent 4: Testing Agent

**Status:** ⏳ WAITING (for Backend Agent AND Frontend Agent)

**Responsibility:** Validate migration on staging environment with comprehensive testing

**Prerequisites:**
- ✅ Architecture design complete
- ✅ API contract defined
- ⏳ Backend implementation complete (Agent 2)
- ⏳ Frontend implementation complete (Agent 3)

**Wait Condition:**
Wait until BOTH signals received:
1. "Backend implementation complete"
2. "Frontend implementation complete"

**Tasks:**

### Task 4.1: Deploy to Staging

**Backend deployment:**
```bash
# Verify latest code on development branch
git checkout development
git pull origin development

# Deploy backend to staging (see CLAUDE.md deployment procedures)
GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-dev-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"

az acr build --registry uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --no-wait \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#development:backend

# Wait for build to complete (3-5 minutes)
sleep 180

# Update container app
DIGEST=$(az acr repository show --name uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --query "digest" -o tsv)

az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "stg-$GIT_SHA-$(date +%H%M%S)"

# Verify deployment
curl -s "https://dev-api.unitedwerise.org/health" | grep releaseSha
```

**Frontend deployment:**
- Automatic via GitHub Actions when pushed to development branch
- Verify at: `https://dev.unitedwerise.org`

---

### Task 4.2: Execute Test Scenarios

**Reference:** PHOTO-UPLOAD-TESTING-CHECKLIST.md

**Execute all 35 test scenarios:**
1. Basic Upload Functionality (4 tests)
2. File Size Validation (2 tests)
3. File Type Validation (2 tests)
4. Required Fields Validation (3 tests)
5. Authentication & Authorization (3 tests)
6. Security Validation (3 tests)
7. Storage Limits (2 tests)
8. Image Processing (2 tests)
9. Different Photo Types (4 tests)
10. Multiple Uploads (2 tests)
11. Edge Cases (3 tests)
12. Performance Benchmarks (3 tests)
13. Cleanup Verification (2 tests)

**Documentation:**
- Mark each test as Pass/Fail in checklist
- Document any issues found
- Capture screenshots for failures
- Record performance metrics

---

### Task 4.3: Post-Testing Validation

**Azure Blob Storage Audit:**
```bash
# List blobs created during testing
az storage blob list \
  --account-name uwrstorage2425 \
  --container-name photos \
  --output table | grep [test-timestamp]

# Verify EXIF metadata stripped
exiftool [downloaded-blob-url]
```

**Database Audit:**
```sql
-- Count test photos
SELECT COUNT(*) FROM "Photo"
WHERE "createdAt" > '2025-10-02T00:00:00Z'
AND "userId" = [test-user-id];

-- Verify no orphaned photos
SELECT COUNT(*) FROM "Photo"
WHERE "url" IS NULL OR "thumbnailUrl" IS NULL;
```

**Log Analysis:**
```bash
# Check for errors
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 500 | grep -i "error"
```

---

### Task 4.4: Create Test Report

**File:** `.claude/scratchpads/PHOTO-UPLOAD-TEST-REPORT.md`

**Include:**
- Test execution date
- Total tests: 35
- Tests passed: X
- Tests failed: X
- Pass rate: X%
- Performance metrics
- Issues found (if any)
- Resolution status
- Approval status

**Template:**
```markdown
# Photo Upload Migration - Test Report
**Date:** October X, 2025
**Tester:** Testing Agent
**Environment:** Staging (dev.unitedwerise.org)

## Summary
- Total Tests: 35
- Passed: X
- Failed: X
- Pass Rate: X%

## Performance Metrics
- 1MB upload: X seconds (target: <6s)
- 5MB upload: X seconds (target: <12s)
- 10MB upload: X seconds (target: <18s)

## Critical Validations
- [X] EXIF metadata stripped
- [X] AI content moderation working
- [X] No unsafe blobs created
- [X] Old code deleted

## Issues Found
[List any issues with severity and resolution]

## Approval
Status: [APPROVED FOR PRODUCTION / NEEDS FIXES]
```

---

### Success Criteria

- [ ] All 35 tests executed
- [ ] 100% pass rate (or all failures resolved)
- [ ] Performance benchmarks met
- [ ] Security validation passed
- [ ] Test report created and documented
- [ ] Signal sent to coordination channel

**Signal:** "Testing complete. All tests passed. Ready for production deployment."

---

## Agent 5: Documentation Agent

**Status:** ⏳ WAITING (for Testing Agent)

**Responsibility:** Final documentation and migration completion

**Prerequisites:**
- ✅ Architecture design complete
- ⏳ Testing complete and approved (Agent 4)

**Wait Condition:**
Wait for signal: "Testing complete. All tests passed."

**Tasks:**

### Task 5.1: Update Migration Plan Status

**File:** `.claude/scratchpads/PHOTO-UPLOAD-MIGRATION-PLAN.md`

**Update Current Status section:**
```markdown
## Current Status

- [COMPLETE] Migration plan created
- [COMPLETE] Architecture Agent - Design complete
- [COMPLETE] Backend Agent - Implementation complete
- [COMPLETE] Frontend Agent - Implementation complete
- [COMPLETE] Testing Agent - All tests passed
- [IN_PROGRESS] Documentation Agent - Final documentation

**Migration Status:** ✅ COMPLETE - Ready for Production
```

---

### Task 5.2: Create Migration Summary

**File:** `.claude/scratchpads/PHOTO-UPLOAD-MIGRATION-SUMMARY.md`

**Include:**
- Migration goals (what was achieved)
- Files changed (list all modified/deleted files)
- Lines of code (added/deleted/net change)
- Performance improvements
- Security improvements
- Architecture simplification
- Test results summary
- Production deployment checklist

---

### Task 5.3: Final Code Review

**Check for orphaned code:**
```bash
# Search for any remaining references to old system
grep -r "sas-token" backend/
grep -r "photo-upload-direct" frontend/
grep -r "uploadPhotoDirectToBlob" frontend/
```

**Expected:** No results (all old code removed)

**If found:** Document as technical debt for cleanup

---

### Task 5.4: Update CLAUDE.md (if needed)

**File:** `CLAUDE.md`

**Check if photo upload architecture is documented:**
- If yes: Update to reflect new architecture
- If no: No changes needed

---

### Task 5.5: Create Production Deployment Checklist

**File:** `.claude/scratchpads/PHOTO-UPLOAD-PRODUCTION-DEPLOYMENT.md`

**Include:**
- Pre-deployment checklist
- Deployment commands
- Post-deployment verification steps
- Rollback procedure
- Monitoring checklist (24-hour watch)

---

### Success Criteria

- [ ] All 5 tasks completed
- [ ] Migration summary document created
- [ ] No orphaned code found
- [ ] Production deployment checklist ready
- [ ] Signal sent to coordination channel

**Signal:** "Documentation complete. Migration is production-ready. Awaiting user approval for production deployment."

---

## Communication Protocol

### Signal Format

Each agent must send a clear signal when complete:

**Format:**
```
Agent [X]: [Status Message]

Completed Tasks:
1. [Task description]
2. [Task description]
...

Next Agent: [Agent name or "None"]
```

**Example:**
```
Agent 2 (Backend): Backend implementation complete

Completed Tasks:
1. Added POST /api/photos/upload endpoint
2. Added PhotoService.processAndUploadPhoto() method
3. Marked old endpoints as deprecated
4. Local testing passed
5. Code committed to development branch

Next Agent: Frontend Agent (Agent 3) - can proceed
```

---

### Blocking vs Non-Blocking

**Non-Blocking (Parallel):**
- Backend Agent (2) and Frontend Agent (3) can work simultaneously
- They have no dependencies on each other

**Blocking (Sequential):**
- Testing Agent (4) MUST wait for both Backend (2) AND Frontend (3)
- Documentation Agent (5) MUST wait for Testing (4)

---

### Error Escalation

**If an agent encounters a blocker:**

1. **Document the issue:**
   - File: `.claude/scratchpads/PHOTO-UPLOAD-ISSUES.md`
   - Include: Description, severity, attempted solutions

2. **Signal the blocker:**
   ```
   Agent [X]: BLOCKED - [Issue description]

   Issue: [Detailed description]
   Impact: [What is blocked]
   Attempted Solutions: [What was tried]
   Requires: [Architecture review / Code fix / External dependency]
   ```

3. **Notify Architecture Agent:**
   - Architecture Agent reviews issue
   - Provides updated design or solution
   - Blocked agent resumes work

---

## Timeline Tracking

**Estimated Duration:**
- Backend Agent: 1 hour
- Frontend Agent: 1 hour (parallel with backend)
- Testing Agent: 1 hour
- Documentation Agent: 30 minutes

**Total:** ~3 hours

**Actual Duration:**
- Backend Agent: _______ (Start: ______, End: ______)
- Frontend Agent: _______ (Start: ______, End: ______)
- Testing Agent: _______ (Start: ______, End: ______)
- Documentation Agent: _______ (Start: ______, End: ______)

**Total Actual:** _______

---

## Completion Criteria

**Migration is complete when:**

1. ✅ Architecture Agent: Design complete
2. ⏳ Backend Agent: Implementation complete and tested
3. ⏳ Frontend Agent: Implementation complete and tested
4. ⏳ Testing Agent: All 35 tests passed on staging
5. ⏳ Documentation Agent: All documentation updated

**AND:**

- ✅ No TypeScript compilation errors
- ⏳ No console errors in browser
- ⏳ No backend errors in logs
- ⏳ Old code deleted (photo-upload-direct.js, no orphaned references)
- ⏳ Performance benchmarks met
- ⏳ Security validation passed (EXIF stripped, AI moderation working)
- ⏳ Ready for production deployment

---

**Coordination Document Status:** ✅ COMPLETE

All agents have clear instructions, dependencies, and success criteria. Ready for parallel Backend and Frontend implementation.

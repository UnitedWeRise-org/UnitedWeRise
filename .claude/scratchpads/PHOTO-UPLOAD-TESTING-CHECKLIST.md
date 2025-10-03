# Photo Upload Testing Checklist
**Status:** 🟢 COMPLETE - Ready for Testing Agent
**Created:** October 2, 2025
**Version:** 1.0.0

---

## Overview

This checklist defines all test scenarios that must pass before the photo upload migration is considered complete. The Testing Agent must execute these tests in order and document results.

---

## Pre-Testing Setup

### Environment Preparation

- [ ] **Backend deployed to staging:** `https://dev-api.unitedwerise.org`
- [ ] **Frontend deployed to staging:** `https://dev.unitedwerise.org`
- [ ] **Test user account created:** Non-admin user with known credentials
- [ ] **Test candidate created:** Linked to test user account
- [ ] **Storage quota verified:** Test user has < 50MB used (room for testing)
- [ ] **Azure Blob Storage accessible:** Can view `photos` and `thumbnails` containers

### Test Files Prepared

Create these test files locally:

1. **valid-jpeg-2mb.jpg** - 2MB JPEG photo (no EXIF metadata)
2. **valid-jpeg-exif.jpg** - 2MB JPEG photo WITH GPS EXIF metadata
3. **valid-png-5mb.png** - 5MB PNG photo
4. **valid-gif-4mb.gif** - 4MB animated GIF
5. **valid-webp-3mb.webp** - 3MB WebP photo
6. **oversized-11mb.jpg** - 11MB JPEG photo (exceeds limit)
7. **oversized-gif-6mb.gif** - 6MB GIF (exceeds GIF limit)
8. **fake-image.txt** - Text file renamed to .jpg (malicious test)
9. **inappropriate-content.jpg** - Image that should be blocked by AI moderation (test with meme or text image)

### Testing Tools

- [ ] **Browser DevTools:** For network inspection
- [ ] **Postman or cURL:** For API testing
- [ ] **exiftool:** For verifying EXIF metadata removal
- [ ] **Azure Portal:** For viewing blob storage

---

## Test Scenarios

### Category 1: Basic Upload Functionality

#### Test 1.1: Upload Valid JPEG (2MB)

**Steps:**
1. Navigate to `https://dev.unitedwerise.org`
2. Log in as test user
3. Open post creator
4. Select `valid-jpeg-2mb.jpg`
5. Set photoType: `POST_MEDIA`
6. Click upload

**Expected Results:**
- ✅ Upload completes within 10 seconds
- ✅ Status: 201 Created
- ✅ Response contains: `{ success: true, photo: { id, url, thumbnailUrl, width, height } }`
- ✅ Photo appears in feed
- ✅ Photo URL is Azure Blob Storage URL
- ✅ Thumbnail URL is Azure Blob Storage URL
- ✅ Image loads in browser

**Verification:**
```bash
# Check blob exists in Azure
az storage blob list --account-name uwrstorage2425 --container-name photos --output table | grep [blob-name]
az storage blob list --account-name uwrstorage2425 --container-name thumbnails --output table | grep [blob-name]
```

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 1.2: Upload Valid PNG (5MB)

**Steps:**
1. Upload `valid-png-5mb.png`
2. Set photoType: `GALLERY`
3. Set gallery: `Test Photos`

**Expected Results:**
- ✅ Upload completes within 12 seconds
- ✅ Status: 201 Created
- ✅ Photo appears in gallery
- ✅ Photo converted to WebP format
- ✅ File size reduced (compression applied)

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 1.3: Upload Valid GIF (4MB)

**Steps:**
1. Upload `valid-gif-4mb.gif`
2. Set photoType: `POST_MEDIA`

**Expected Results:**
- ✅ Upload completes within 12 seconds
- ✅ Status: 201 Created
- ✅ GIF remains animated (not converted to static)
- ✅ GIF format preserved (not converted to WebP)
- ✅ Animation plays in feed

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 1.4: Upload Valid WebP (3MB)

**Steps:**
1. Upload `valid-webp-3mb.webp`
2. Set photoType: `AVATAR`

**Expected Results:**
- ✅ Upload completes within 10 seconds
- ✅ Status: 201 Created
- ✅ Avatar updates in profile
- ✅ Avatar URL matches photo.url in response

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Category 2: File Size Validation

#### Test 2.1: Upload Oversized File (11MB)

**Steps:**
1. Attempt to upload `oversized-11mb.jpg`
2. Set photoType: `POST_MEDIA`

**Expected Results:**
- ✅ Upload rejected by multer BEFORE processing
- ✅ Status: 413 Payload Too Large
- ✅ Response: `{ error: "File too large", message: "Photos must be smaller than 10MB" }`
- ✅ No blob created in Azure

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 2.2: Upload Oversized GIF (6MB)

**Steps:**
1. Attempt to upload `oversized-gif-6mb.gif`
2. Set photoType: `POST_MEDIA`

**Expected Results:**
- ✅ Upload rejected
- ✅ Status: 413 Payload Too Large
- ✅ Response: `{ error: "GIF too large", message: "GIF files must be smaller than 5MB" }`

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Category 3: File Type Validation

#### Test 3.1: Upload Text File Disguised as Image

**Steps:**
1. Attempt to upload `fake-image.txt` (renamed to .jpg)
2. Set photoType: `POST_MEDIA`

**Expected Results:**
- ✅ Upload rejected by magic bytes validation
- ✅ Status: 400 Bad Request
- ✅ Response: `{ error: "Invalid image file", message: "File is not a valid image (magic bytes check failed)" }`
- ✅ No blob created in Azure

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 3.2: Upload with Wrong MIME Type

**Steps:**
1. Using Postman/cURL, upload valid JPEG with MIME type: `image/bmp`

**Expected Results:**
- ✅ Upload rejected by multer fileFilter
- ✅ Status: 400 Bad Request
- ✅ Response: `{ error: "Invalid file type", message: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." }`

**cURL Command:**
```bash
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@valid-jpeg-2mb.jpg;type=image/bmp" \
  -F "photoType=POST_MEDIA"
```

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Category 4: Required Fields Validation

#### Test 4.1: Upload Without File

**Steps:**
1. Using Postman, send request without `file` field
2. Include photoType in body

**Expected Results:**
- ✅ Status: 400 Bad Request
- ✅ Response: `{ error: "No file uploaded", message: "Please select a photo to upload" }`

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 4.2: Upload Without photoType

**Steps:**
1. Upload valid file without `photoType` field

**Expected Results:**
- ✅ Status: 400 Bad Request
- ✅ Response: `{ error: "Missing required fields", message: "photoType is required" }`

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 4.3: Upload with Invalid photoType

**Steps:**
1. Upload valid file with `photoType: "INVALID_TYPE"`

**Expected Results:**
- ✅ Status: 400 Bad Request
- ✅ Response: `{ error: "Invalid photo type", message: "Photo type must be one of: AVATAR, COVER, CAMPAIGN, VERIFICATION, EVENT, GALLERY, POST_MEDIA" }`

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Category 5: Authentication & Authorization

#### Test 5.1: Upload Without Authentication

**Steps:**
1. Send upload request without Authorization header

**Expected Results:**
- ✅ Status: 401 Unauthorized
- ✅ Response: `{ error: "Unauthorized", message: "Authentication required" }`

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 5.2: Upload Campaign Photo Without candidateId

**Steps:**
1. Upload valid file
2. Set photoType: `CAMPAIGN`
3. Omit candidateId field

**Expected Results:**
- ✅ Status: 400 Bad Request
- ✅ Response: `{ error: "Candidate ID required", message: "Candidate ID is required for campaign photos" }`

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 5.3: Upload with Wrong candidateId

**Steps:**
1. Upload valid file
2. Set photoType: `CAMPAIGN`
3. Set candidateId to another user's candidate

**Expected Results:**
- ✅ Status: 403 Forbidden
- ✅ Response: `{ error: "Permission denied", message: "Invalid candidate permissions" }`

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Category 6: Security Validation

#### Test 6.1: EXIF Metadata Stripping

**Steps:**
1. Upload `valid-jpeg-exif.jpg` (contains GPS coordinates)
2. Download uploaded photo from Azure Blob Storage
3. Check EXIF metadata with exiftool

**Expected Results:**
- ✅ Upload succeeds (201 Created)
- ✅ Original file contains EXIF GPS data
- ✅ Uploaded file has NO EXIF GPS data
- ✅ Uploaded file has NO camera serial number
- ✅ Uploaded file has NO timestamp metadata

**Verification Commands:**
```bash
# Check original file (should have EXIF)
exiftool valid-jpeg-exif.jpg | grep GPS
exiftool valid-jpeg-exif.jpg | grep -i "camera"

# Download uploaded file
curl -o downloaded-photo.webp [photo.url from response]

# Check downloaded file (should have NO EXIF)
exiftool downloaded-photo.webp | grep GPS
exiftool downloaded-photo.webp | grep -i "camera"
```

**Actual Results:**
- [ ] Pass (EXIF fully stripped)
- [ ] Partial (some EXIF remains):
- [ ] Fail (EXIF not stripped):

---

#### Test 6.2: Content Moderation (Appropriate Content)

**Steps:**
1. Upload `valid-jpeg-2mb.jpg` (appropriate content)
2. Set photoType: `POST_MEDIA`

**Expected Results:**
- ✅ Upload succeeds (201 Created)
- ✅ Backend logs show: `Content moderation (staging): POST_MEDIA - APPROVED`
- ✅ Photo appears in feed immediately

**Check Logs:**
```bash
# View backend logs
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 50 | grep "Content moderation"
```

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 6.3: Content Moderation (Inappropriate Content)

**Steps:**
1. Upload `inappropriate-content.jpg` (image with profanity or explicit content)
2. Set photoType: `POST_MEDIA`

**Expected Results:**
- ✅ Upload rejected (422 Unprocessable Entity)
- ✅ Response: `{ error: "Content moderation failed", message: "This image contains content that violates our community guidelines" }`
- ✅ Backend logs show: `Content blocked: { category: "BLOCK", ... }`
- ✅ No blob created in Azure

**Note:** In staging, moderation is more lenient. May need to use production environment for this test.

**Actual Results:**
- [ ] Pass (content blocked)
- [ ] Skipped (staging too lenient)
- [ ] Fail (inappropriate content allowed):

---

### Category 7: Storage Limits

#### Test 7.1: Upload When Near Storage Limit

**Setup:**
1. Upload photos until user has ~95MB of 100MB limit used

**Steps:**
1. Attempt to upload 8MB photo

**Expected Results:**
- ✅ Status: 413 Payload Too Large
- ✅ Response: `{ error: "Storage limit exceeded", message: "Storage limit exceeded. Current usage: 95MB, Limit: 100MB..." }`
- ✅ No blob created

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 7.2: Upload When Under Storage Limit

**Steps:**
1. Delete some photos to free up space
2. Upload 5MB photo

**Expected Results:**
- ✅ Upload succeeds (201 Created)
- ✅ Storage usage updated in database

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Category 8: Image Processing

#### Test 8.1: Large Image Resizing

**Setup:**
1. Create test JPEG: 5000x5000 pixels (very large)

**Steps:**
1. Upload large image
2. Set photoType: `POST_MEDIA`

**Expected Results:**
- ✅ Upload succeeds (201 Created)
- ✅ Image resized to max 800x800 (POST_MEDIA preset)
- ✅ response.photo.width <= 800
- ✅ response.photo.height <= 800
- ✅ Aspect ratio preserved

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 8.2: Thumbnail Generation

**Steps:**
1. Upload any valid image
2. Check thumbnail URL in response
3. Load thumbnail in browser

**Expected Results:**
- ✅ thumbnailUrl is valid Azure Blob URL
- ✅ Thumbnail loads successfully
- ✅ Thumbnail is smaller than original (file size)
- ✅ Thumbnail dimensions match preset (e.g., 200x200 for POST_MEDIA)
- ✅ Thumbnail is WebP format (regardless of original format)

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Category 9: Different Photo Types

#### Test 9.1: Upload Avatar Photo

**Steps:**
1. Upload valid image
2. Set photoType: `AVATAR`
3. Check user profile

**Expected Results:**
- ✅ Upload succeeds (201 Created)
- ✅ User avatar updated in profile
- ✅ Avatar URL matches response.photo.url
- ✅ Avatar appears in navigation bar
- ✅ pendingModeration: false

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 9.2: Upload Campaign Photo

**Steps:**
1. Upload valid image
2. Set photoType: `CAMPAIGN`
3. Set candidateId: [test candidate ID]

**Expected Results:**
- ✅ Upload succeeds (201 Created)
- ✅ pendingModeration: true (requires manual approval)
- ✅ Photo NOT visible in public feed
- ✅ Photo appears in "Pending Moderation" admin panel

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 9.3: Upload Verification Photo

**Steps:**
1. Upload valid ID photo
2. Set photoType: `VERIFICATION`

**Expected Results:**
- ✅ Upload succeeds (201 Created)
- ✅ pendingModeration: true
- ✅ Photo NOT visible in gallery
- ✅ Photo available to moderators only

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 9.4: Upload Gallery Photo with Caption

**Steps:**
1. Upload valid image
2. Set photoType: `GALLERY`
3. Set gallery: `Vacation 2025`
4. Set caption: `Beautiful sunset at the beach on our last day`

**Expected Results:**
- ✅ Upload succeeds (201 Created)
- ✅ Photo appears in "Vacation 2025" gallery
- ✅ Caption saved and displayed
- ✅ Caption truncated to 200 chars if longer

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Category 10: Multiple Uploads

#### Test 10.1: Sequential Uploads (3 Photos)

**Steps:**
1. Upload 3 different photos one after another
2. All with photoType: `POST_MEDIA`

**Expected Results:**
- ✅ All 3 uploads succeed
- ✅ Each gets unique ID
- ✅ Each gets unique blob name
- ✅ All 3 appear in feed
- ✅ Total upload time < 30 seconds

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 10.2: Rapid Uploads (Rate Limiting)

**Steps:**
1. Attempt 51 uploads within 15 minutes

**Expected Results:**
- ✅ First 50 uploads succeed
- ✅ 51st upload rejected
- ✅ Status: 429 Too Many Requests
- ✅ Response: Rate limit error message

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Category 11: Edge Cases

#### Test 11.1: Upload with Very Long Caption (>200 chars)

**Steps:**
1. Upload valid image
2. Set caption to 250 characters

**Expected Results:**
- ✅ Upload succeeds (201 Created)
- ✅ Caption truncated to 200 characters in database
- ✅ No error thrown

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 11.2: Upload with Special Characters in Gallery Name

**Steps:**
1. Upload valid image
2. Set gallery: `Photos & Memories (2025) 🎉`

**Expected Results:**
- ✅ Upload succeeds (201 Created)
- ✅ Gallery name saved correctly with special chars
- ✅ Gallery displays correctly in UI

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 11.3: Upload During High Server Load

**Steps:**
1. Start 10 concurrent uploads from different browser tabs
2. Monitor completion

**Expected Results:**
- ✅ All uploads eventually complete
- ✅ No timeouts
- ✅ No database deadlocks
- ✅ Each upload takes 5-15 seconds

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Category 12: Performance Benchmarks

#### Test 12.1: Small File Upload Speed (1MB)

**Steps:**
1. Upload 1MB JPEG
2. Measure total time from request to response

**Expected Results:**
- ✅ Total time: 2-6 seconds
- ✅ Network time: < 3 seconds
- ✅ Processing time: < 2 seconds
- ✅ AI moderation: < 3 seconds

**Use browser DevTools Network tab to measure.**

**Actual Results:**
- Total time: _______ seconds
- [ ] Pass (< 6 seconds)
- [ ] Fail (> 6 seconds)

---

#### Test 12.2: Medium File Upload Speed (5MB)

**Expected Results:**
- ✅ Total time: 4-12 seconds

**Actual Results:**
- Total time: _______ seconds
- [ ] Pass (< 12 seconds)
- [ ] Fail (> 12 seconds)

---

#### Test 12.3: Large File Upload Speed (10MB)

**Expected Results:**
- ✅ Total time: 6-18 seconds

**Actual Results:**
- Total time: _______ seconds
- [ ] Pass (< 18 seconds)
- [ ] Fail (> 18 seconds)

---

### Category 13: Cleanup Verification

#### Test 13.1: Old Endpoints Deprecated

**Steps:**
1. Check backend code for deprecation comments

**Expected Results:**
- ✅ `/upload/sas-token` endpoint has deprecation comment
- ✅ `/upload/confirm` endpoint has deprecation comment
- ✅ Comments indicate removal date
- ✅ Endpoints still functional (backward compatibility)

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

#### Test 13.2: Old Frontend Code Deleted

**Steps:**
1. Search codebase for `photo-upload-direct.js`
2. Search for `uploadPhotoDirectToBlob` function

**Expected Results:**
- ✅ `photo-upload-direct.js` file deleted
- ✅ No imports of `uploadPhotoDirectToBlob`
- ✅ No references to SAS token logic in frontend

**Search Commands:**
```bash
find frontend -name "photo-upload-direct.js"
grep -r "uploadPhotoDirectToBlob" frontend/
grep -r "sas-token" frontend/
```

**Actual Results:**
- [ ] Pass (all old code removed)
- [ ] Fail (old code still present):

---

## Test Summary

### Overall Statistics

- **Total Tests:** 35
- **Tests Passed:** _______
- **Tests Failed:** _______
- **Tests Skipped:** _______
- **Pass Rate:** _______% (should be 100%)

### Critical Test Results

| Category | Pass/Fail | Notes |
|----------|-----------|-------|
| Basic Upload | ☐ Pass ☐ Fail | |
| File Size Validation | ☐ Pass ☐ Fail | |
| File Type Validation | ☐ Pass ☐ Fail | |
| Required Fields | ☐ Pass ☐ Fail | |
| Authentication | ☐ Pass ☐ Fail | |
| Security (EXIF) | ☐ Pass ☐ Fail | |
| Security (Moderation) | ☐ Pass ☐ Fail | |
| Storage Limits | ☐ Pass ☐ Fail | |
| Image Processing | ☐ Pass ☐ Fail | |
| Performance | ☐ Pass ☐ Fail | |

### Issues Found

| Test # | Issue Description | Severity | Resolution |
|--------|------------------|----------|------------|
| | | | |

### Performance Metrics

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| 1MB upload | < 6s | _____ s | ☐ Pass ☐ Fail |
| 5MB upload | < 12s | _____ s | ☐ Pass ☐ Fail |
| 10MB upload | < 18s | _____ s | ☐ Pass ☐ Fail |
| Concurrent uploads (10) | All complete | _____ / 10 | ☐ Pass ☐ Fail |

---

## Post-Testing Validation

### Azure Blob Storage Audit

**Steps:**
1. List all blobs created during testing
2. Verify all are sanitized (no EXIF)
3. Verify no orphaned blobs (without DB records)

**Commands:**
```bash
# List recent blobs
az storage blob list \
  --account-name uwrstorage2425 \
  --container-name photos \
  --output table

# Count total blobs created
az storage blob list \
  --account-name uwrstorage2425 \
  --container-name photos \
  --output json | jq 'length'
```

**Results:**
- Total blobs created: _______
- Orphaned blobs: _______ (should be 0)
- ☐ All blobs sanitized
- ☐ No orphaned blobs

---

### Database Audit

**Steps:**
1. Query Photo table for test uploads
2. Verify all uploads have corresponding blobs
3. Check for data integrity

**SQL Queries:**
```sql
-- Count photos created during testing
SELECT COUNT(*) FROM "Photo"
WHERE "createdAt" > '2025-10-02T00:00:00Z'
AND "userId" = [test-user-id];

-- Check for photos without blob URLs
SELECT COUNT(*) FROM "Photo"
WHERE "url" IS NULL OR "thumbnailUrl" IS NULL;

-- Verify storage usage calculation
SELECT "userId", SUM("compressedSize") as total_usage
FROM "Photo"
WHERE "userId" = [test-user-id]
GROUP BY "userId";
```

**Results:**
- Photos created: _______
- Photos with invalid URLs: _______ (should be 0)
- Total storage usage: _______ MB

---

### Log Analysis

**Steps:**
1. Review backend logs for errors
2. Check for any warnings or failures
3. Verify all security checks logged correctly

**Commands:**
```bash
# Get recent backend logs
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 200

# Search for errors
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 500 | grep -i "error"

# Search for upload success logs
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 500 | grep "Photo upload complete"
```

**Results:**
- ☐ No unexpected errors
- ☐ All uploads logged correctly
- ☐ Security checks logged
- ☐ No stack traces or crashes

---

## Final Approval

### Approval Checklist

- [ ] All 35 test scenarios executed
- [ ] 100% pass rate achieved (or all failures documented and resolved)
- [ ] Performance benchmarks met
- [ ] Security validation passed (EXIF stripped, moderation working)
- [ ] Old code deleted
- [ ] Azure Blob Storage audit passed
- [ ] Database audit passed
- [ ] No errors in logs
- [ ] Ready for production deployment

### Sign-Off

**Testing Agent:** _________________________
**Date:** _________________________
**Status:** ☐ APPROVED FOR PRODUCTION ☐ NEEDS FIXES

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Production Deployment Checklist

After all tests pass in staging:

- [ ] Merge to main branch
- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Monitor production logs for 1 hour
- [ ] Verify first production upload succeeds
- [ ] Monitor error rates for 24 hours
- [ ] Update documentation with production metrics

---

**Testing Checklist Status:** ✅ COMPLETE

This checklist is comprehensive and ready for the Testing Agent to execute.

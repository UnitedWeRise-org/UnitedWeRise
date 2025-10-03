# Photo Upload System - Minimal Viable Design

**Created:** 2025-10-02
**Purpose:** Design minimal photo upload endpoint with incremental layer addition
**Status:** ARCHITECTURE DESIGN PHASE

---

## Executive Summary

**Problem:** Current photo upload system has ~1 week of failed debugging due to Azure Container Apps Envoy ingress blocking multipart/form-data POST requests. The existing implementation has all layers (authentication, validation, EXIF stripping, AI moderation, database persistence) built in one monolithic flow at ~186 lines in `processAndUploadPhoto()`.

**Solution:** Build minimal viable upload endpoint (~50 lines) that ONLY uploads to blob storage. Add layers incrementally with testing after each layer. This approach allows us to:
1. Identify where Envoy blocking occurs
2. Test each security/validation layer independently
3. Avoid circular return to direct-to-blob approach (already rejected)

**Core Strategy:** Start with absolute minimum code to get a file from browser → Azure Blob Storage, then add ONE security layer at a time with verification between each.

---

## 🎯 Minimal Upload Endpoint Design (~100 lines total)

### Route: POST /api/photos/upload/minimal

**Purpose:** Upload file to Azure Blob Storage with ZERO processing, validation, or security layers. Pure file transport test.

**Location:** `backend/src/routes/photos.ts` (new endpoint alongside existing /upload)

```typescript
/**
 * MINIMAL UPLOAD ENDPOINT - FOR DEBUGGING ONLY
 * NO authentication, NO validation, NO moderation
 * Tests if Azure Envoy ingress allows multipart uploads at all
 */
router.post('/upload/minimal',
  multer({ storage: multer.memoryStorage() }).single('file'),
  async (req: any, res) => {
    const requestId = uuidv4();

    try {
      // Log 1: Endpoint reached
      process.stderr.write(`[${requestId}] MINIMAL: Endpoint reached\n`);

      // Log 2: Check if file exists
      if (!req.file) {
        process.stderr.write(`[${requestId}] MINIMAL: No file in request\n`);
        return res.status(400).json({ error: 'No file uploaded' });
      }

      process.stderr.write(`[${requestId}] MINIMAL: File received - ${req.file.originalname} (${req.file.size} bytes)\n`);

      // Log 3: Generate blob name
      const blobName = `minimal-test/${requestId}-${req.file.originalname}`;
      process.stderr.write(`[${requestId}] MINIMAL: Blob name: ${blobName}\n`);

      // Log 4: Upload to blob
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connectionString) {
        process.stderr.write(`[${requestId}] MINIMAL: No connection string\n`);
        return res.status(500).json({ error: 'Storage not configured' });
      }

      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient('photos');
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      process.stderr.write(`[${requestId}] MINIMAL: Starting blob upload\n`);

      await blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: {
          blobContentType: req.file.mimetype
        }
      });

      const blobUrl = blockBlobClient.url;
      process.stderr.write(`[${requestId}] MINIMAL: Upload complete - ${blobUrl}\n`);

      // Log 5: Success response
      res.status(201).json({
        success: true,
        requestId,
        url: blobUrl,
        filename: req.file.originalname,
        size: req.file.size
      });

    } catch (error: any) {
      process.stderr.write(`[${requestId}] MINIMAL: ERROR - ${error.message}\n`);
      process.stderr.write(`[${requestId}] MINIMAL: Stack - ${error.stack}\n`);

      res.status(500).json({
        error: 'Upload failed',
        message: error.message,
        requestId
      });
    }
  }
);
```

**Line Count:** ~60 lines
**Dependencies:** `multer`, `@azure/storage-blob`, `uuid`
**No Database:** Does not create Photo record (just tests blob upload)
**No Auth:** Intentionally public to isolate Envoy blocking issue

---

## 📋 Required Environment Variables

### Already Configured (Verified in Container Apps)

```bash
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=uwrstorage2425;...
AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425
NODE_ENV=staging  # or production
```

### How to Verify

```bash
# Check if variables are set in Container App
az containerapp show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --query "properties.template.containers[0].env[?name=='AZURE_STORAGE_CONNECTION_STRING']"

# Expected output:
[
  {
    "name": "AZURE_STORAGE_CONNECTION_STRING",
    "value": "DefaultEndpointsProtocol=https;AccountName=uwrstorage2425;AccountKey=***;..."
  }
]
```

**If Missing:**

```bash
STORAGE_KEY=$(az storage account keys list \
  --resource-group unitedwerise-rg \
  --account-name uwrstorage2425 \
  --query "[0].value" --output tsv)

az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --set-env-vars \
    "AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=uwrstorage2425;AccountKey=$STORAGE_KEY;EndpointSuffix=core.windows.net"
```

---

## 🧱 Incremental Layer Addition Plan

### Layer 0: Minimal Endpoint (BASELINE)
**Status:** Starting point
**Code:** 60 lines
**What it does:**
- Accepts multipart/form-data POST
- Receives file via Multer memory storage
- Uploads raw buffer to Azure Blob Storage in `minimal-test/` folder
- Returns blob URL

**What it does NOT do:**
- ❌ No authentication
- ❌ No file type validation
- ❌ No size limits (relies on Multer default 10MB)
- ❌ No EXIF stripping
- ❌ No AI moderation
- ❌ No database record

**Purpose:** Prove Envoy ingress allows multipart uploads at all

---

### Layer 1: Authentication (+15 lines)
**Add:** `requireAuth` middleware
**New Total:** 75 lines

```typescript
router.post('/upload/minimal',
  requireAuth,  // <-- ADD THIS
  multer({ storage: multer.memoryStorage() }).single('file'),
  async (req: AuthRequest, res) => {
    // Add to logs:
    process.stderr.write(`[${requestId}] MINIMAL: User ${req.user!.id}\n`);
    // ... rest of handler
  }
);
```

**Testing:**
- Test 1: Upload without Authorization header → Expect 401
- Test 2: Upload with valid JWT → Expect 201 success
- Test 3: Check stderr logs for user ID

**Rollback if blocked:** Remove `requireAuth`, redeploy, retest

---

### Layer 2: File Type Validation (+20 lines)
**Add:** Magic bytes check and MIME type validation
**New Total:** 95 lines

```typescript
// Add before blob upload:
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
if (!allowedTypes.includes(req.file.mimetype)) {
  process.stderr.write(`[${requestId}] MINIMAL: Invalid MIME type ${req.file.mimetype}\n`);
  return res.status(400).json({ error: 'Invalid file type' });
}

// Magic bytes validation
const magicBytes = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'image/gif': [0x47, 0x49, 0x46]
};

const expectedBytes = magicBytes[req.file.mimetype as keyof typeof magicBytes];
const actualBytes = Array.from(req.file.buffer.slice(0, 4));

if (!expectedBytes.every((byte, i) => actualBytes[i] === byte)) {
  process.stderr.write(`[${requestId}] MINIMAL: Magic bytes mismatch\n`);
  return res.status(400).json({ error: 'File content does not match MIME type' });
}
```

**Testing:**
- Test 1: Upload .jpg → Expect 201
- Test 2: Rename .txt to .jpg → Expect 400 (magic bytes fail)
- Test 3: Upload .exe → Expect 400 (MIME type fail)

**Rollback if blocked:** Remove validation logic, redeploy

---

### Layer 3: EXIF Stripping (+25 lines)
**Add:** Sharp processing to remove metadata
**New Total:** 120 lines

```typescript
// Add after validation, before blob upload:
import sharp from 'sharp';

const isGif = req.file.mimetype === 'image/gif';
let processedBuffer: Buffer;

if (isGif) {
  // GIFs: rotate only (strips EXIF)
  processedBuffer = await sharp(req.file.buffer, { animated: true })
    .rotate()
    .gif()
    .toBuffer();
} else {
  // Static images: rotate and convert to WebP (strips EXIF)
  processedBuffer = await sharp(req.file.buffer)
    .rotate()
    .webp({ quality: 85 })
    .toBuffer();
}

process.stderr.write(`[${requestId}] MINIMAL: EXIF stripped - ${req.file.size} → ${processedBuffer.length} bytes\n`);

// Upload processedBuffer instead of req.file.buffer
await blockBlobClient.uploadData(processedBuffer, {
  blobHTTPHeaders: {
    blobContentType: isGif ? 'image/gif' : 'image/webp'
  }
});
```

**Testing:**
- Test 1: Upload photo with GPS EXIF data
- Test 2: Download from blob URL
- Test 3: Verify EXIF removed using `exiftool` or online checker

**Rollback if blocked:** Upload raw buffer again

---

### Layer 4: AI Content Moderation (+30 lines)
**Add:** Azure OpenAI Vision API call
**New Total:** 150 lines

```typescript
// Add after EXIF stripping, before blob upload:
import { imageContentModerationService } from '../services/imageContentModerationService';

const moderationResult = await imageContentModerationService.analyzeImage(
  {
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    size: req.file.size,
    originalname: req.file.originalname
  } as any,
  'GALLERY',  // Default photo type for minimal test
  req.user!.id
);

if (!moderationResult.approved) {
  process.stderr.write(`[${requestId}] MINIMAL: Moderation REJECTED - ${moderationResult.reason}\n`);
  return res.status(422).json({
    error: 'Content moderation failed',
    reason: moderationResult.reason
  });
}

process.stderr.write(`[${requestId}] MINIMAL: Moderation APPROVED\n`);
```

**Testing:**
- Test 1: Upload safe photo → Expect 201
- Test 2: Upload photo with text overlay (test OCR)
- Test 3: Check Azure OpenAI usage logs

**Rollback if blocked:** Skip moderation call

---

### Layer 5: Database Persistence (+40 lines)
**Add:** Create Photo record in Prisma
**New Total:** 190 lines

```typescript
// Add after successful blob upload:
import { prisma } from '../lib/prisma';

const photo = await prisma.photo.create({
  data: {
    userId: req.user!.id,
    filename: req.file.originalname,
    url: blobUrl,
    thumbnailUrl: blobUrl,  // Same as main for minimal version
    photoType: 'GALLERY',
    purpose: 'PERSONAL',
    originalSize: req.file.size,
    compressedSize: processedBuffer.length,
    width: 0,  // Would need Sharp metadata for accurate values
    height: 0,
    mimeType: isGif ? 'image/gif' : 'image/webp',
    isApproved: true
  }
});

process.stderr.write(`[${requestId}] MINIMAL: Database record created - ${photo.id}\n`);

res.status(201).json({
  success: true,
  requestId,
  photo: {
    id: photo.id,
    url: photo.url
  }
});
```

**Testing:**
- Test 1: Upload photo
- Test 2: Verify record in database: `SELECT * FROM "Photo" WHERE id = 'xxx'`
- Test 3: Query via API: `GET /api/photos/my`

**Rollback if blocked:** Remove database write

---

### Layer 6: Pipeline Architecture Refactor
**Goal:** Extract layers into reusable PhotoPipeline class
**New Total:** Back to ~100 lines in route, +150 lines in new `photoPipeline.ts` service

```typescript
// backend/src/services/photoPipeline.ts
export class PhotoPipeline {
  async validate(buffer: Buffer, mimeType: string): Promise<void>
  async stripExif(buffer: Buffer, mimeType: string): Promise<Buffer>
  async moderate(buffer: Buffer, mimeType: string, userId: string): Promise<void>
  async upload(buffer: Buffer, blobName: string, mimeType: string): Promise<string>
  async persist(metadata: PhotoMetadata): Promise<Photo>
}

// backend/src/routes/photos.ts - now just orchestration
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  const pipeline = new PhotoPipeline();
  const sanitized = await pipeline.stripExif(req.file.buffer, req.file.mimetype);
  await pipeline.moderate(sanitized, req.file.mimetype, req.user.id);
  const url = await pipeline.upload(sanitized, blobName, mimeType);
  const photo = await pipeline.persist({ url, userId: req.user.id });
  res.json({ photo });
});
```

**Testing:**
- Test all previous scenarios still work
- Verify logs show same layer execution order
- Check no performance regression

---

## 🧪 Testing Strategy for Each Layer

### General Test Protocol

**For each layer addition:**

1. **Write Code:** Add layer as documented above
2. **Compile:** `cd backend && npm run build`
3. **Deploy:** Follow deployment procedure (see below)
4. **Test Positive Case:** Upload valid photo, expect success
5. **Test Negative Case:** Upload invalid input, expect rejection
6. **Check Logs:** Verify stderr logs show layer executed
7. **Verify Output:** Check blob storage, database, etc.
8. **Document:** Record results in `PHOTO-UPLOAD-TEST-RESULTS.md`

**If layer causes blocking:**
- Rollback code to previous working layer
- Redeploy
- Document in testing log
- Investigate why that specific layer triggers Envoy blocking

---

### Layer 0 (Minimal) - Test Commands

**Test 1: Basic Upload (No Auth)**

```bash
# Create test image
curl -o test.jpg https://via.placeholder.com/150

# Upload to minimal endpoint
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload/minimal \
  -F "file=@test.jpg" \
  -v

# Expected: 201 Created
# Expected Response:
{
  "success": true,
  "requestId": "uuid-here",
  "url": "https://uwrstorage2425.blob.core.windows.net/photos/minimal-test/uuid-test.jpg",
  "filename": "test.jpg",
  "size": 12345
}
```

**Test 2: Check Blob Created**

```bash
# List blobs in minimal-test folder
az storage blob list \
  --account-name uwrstorage2425 \
  --container-name photos \
  --prefix "minimal-test/" \
  --output table
```

**Test 3: Check Logs**

```bash
# View Container App logs
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 50 \
  --follow

# Look for:
[uuid] MINIMAL: Endpoint reached
[uuid] MINIMAL: File received - test.jpg (12345 bytes)
[uuid] MINIMAL: Blob name: minimal-test/uuid-test.jpg
[uuid] MINIMAL: Starting blob upload
[uuid] MINIMAL: Upload complete - https://...
```

**Expected Outcomes:**
- ✅ Blob appears in Azure Storage
- ✅ All stderr logs appear in Container App logs
- ✅ Response includes blob URL
- ❌ IF NO LOGS APPEAR: Envoy blocking at Layer 0 (multipart itself blocked)

---

### Layer 1 (Authentication) - Test Commands

**Test 1: Upload Without Auth (Expect 401)**

```bash
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload/minimal \
  -F "file=@test.jpg" \
  -v

# Expected: 401 Unauthorized
```

**Test 2: Upload With Valid JWT (Expect 201)**

```bash
# Get JWT token (replace with actual login)
TOKEN=$(curl -X POST https://dev-api.unitedwerise.org/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.token')

# Upload with Authorization header
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload/minimal \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.jpg" \
  -v

# Expected: 201 Created
```

**Test 3: Check Logs Show User ID**

```bash
# Look for user ID in logs
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 50 | grep "MINIMAL: User"

# Expected:
[uuid] MINIMAL: User clxxxx (user's actual ID)
```

**Expected Outcomes:**
- ✅ 401 without token
- ✅ 201 with valid token
- ✅ Logs show authenticated user ID
- ❌ IF BLOCKED: Authentication layer triggers Envoy blocking

---

### Layer 2 (File Validation) - Test Commands

**Test 1: Valid JPEG Upload**

```bash
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload/minimal \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.jpg" \
  -v

# Expected: 201 Created
```

**Test 2: Fake File Extension (Magic Bytes Fail)**

```bash
# Create fake image (text file with .jpg extension)
echo "This is not an image" > fake.jpg

curl -X POST https://dev-api.unitedwerise.org/api/photos/upload/minimal \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@fake.jpg" \
  -v

# Expected: 400 Bad Request
# Expected Response:
{
  "error": "File content does not match MIME type"
}
```

**Test 3: Invalid File Type**

```bash
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload/minimal \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf" \
  -v

# Expected: 400 Bad Request
# Expected Response:
{
  "error": "Invalid file type"
}
```

**Expected Outcomes:**
- ✅ Valid images pass
- ✅ Invalid MIME types rejected
- ✅ Magic bytes mismatch rejected
- ❌ IF BLOCKED: File validation triggers Envoy blocking

---

### Layer 3 (EXIF Stripping) - Test Commands

**Test 1: Upload Photo With GPS Data**

```bash
# Download image with EXIF/GPS metadata
curl -o photo-with-exif.jpg "https://github.com/ianare/exif-samples/raw/master/jpg/gps/DSCN0010.jpg"

# Verify EXIF exists BEFORE upload
exiftool photo-with-exif.jpg | grep GPS

# Upload
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload/minimal \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@photo-with-exif.jpg" \
  -v

# Expected: 201 Created, returns blob URL
```

**Test 2: Verify EXIF Removed From Uploaded Blob**

```bash
# Download blob from Azure
curl -o downloaded.webp "https://uwrstorage2425.blob.core.windows.net/photos/minimal-test/uuid-photo-with-exif.webp"

# Check for EXIF metadata
exiftool downloaded.webp | grep GPS

# Expected: No GPS data found
# Expected: "Warning: No EXIF data found"
```

**Test 3: Verify File Size Reduction**

```bash
# Check logs for size change
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 50 | grep "EXIF stripped"

# Expected log:
[uuid] MINIMAL: EXIF stripped - 2457600 → 1843200 bytes
```

**Expected Outcomes:**
- ✅ Photo uploaded successfully
- ✅ Downloaded blob has NO EXIF metadata
- ✅ File size reduced (WebP conversion)
- ❌ IF BLOCKED: Sharp processing triggers Envoy blocking

---

### Layer 4 (AI Moderation) - Test Commands

**Test 1: Safe Photo Upload**

```bash
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload/minimal \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@landscape.jpg" \
  -v

# Expected: 201 Created
# Expected log:
[uuid] MINIMAL: Moderation APPROVED
```

**Test 2: Photo With Text (OCR Test)**

```bash
# Create image with text overlay (use design tool or online generator)
# Upload
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload/minimal \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@photo-with-text.jpg" \
  -v

# Expected: Depends on text content
# Safe text → 201
# Inappropriate text → 422
```

**Test 3: Check Azure OpenAI Usage**

```bash
# View Azure OpenAI logs
az monitor activity-log list \
  --resource-group unitedwerise-rg \
  --namespace Microsoft.CognitiveServices \
  --max-events 10

# Or check Container App logs for Vision API call
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 100 | grep "Vision API"
```

**Expected Outcomes:**
- ✅ Safe photos approved (201)
- ✅ Inappropriate content rejected (422)
- ✅ Logs show moderation decision
- ✅ Azure OpenAI usage appears in metrics
- ❌ IF BLOCKED: AI moderation API call triggers Envoy blocking

---

### Layer 5 (Database Persistence) - Test Commands

**Test 1: Upload Photo and Get Database ID**

```bash
RESPONSE=$(curl -X POST https://dev-api.unitedwerise.org/api/photos/upload/minimal \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.jpg")

PHOTO_ID=$(echo $RESPONSE | jq -r '.photo.id')

echo "Photo ID: $PHOTO_ID"

# Expected: clxxxxxxxxxxxx (Prisma cuid)
```

**Test 2: Verify Database Record**

```bash
# Query database directly (requires DATABASE_URL)
psql $DATABASE_URL -c "SELECT id, \"userId\", filename, url, \"photoType\" FROM \"Photo\" WHERE id = '$PHOTO_ID';"

# Expected:
#       id       |  userId  | filename | url                          | photoType
# ---------------+----------+----------+------------------------------+-----------
#  clxxxxxxxxxx  | clxxxxxx | test.jpg | https://uwrstorage2425...    | GALLERY
```

**Test 3: Query Via API**

```bash
curl -X GET https://dev-api.unitedwerise.org/api/photos/my \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.photos[] | select(.id == "'$PHOTO_ID'")'

# Expected: Photo object with matching ID
```

**Expected Outcomes:**
- ✅ Photo record created in database
- ✅ Database ID returned in response
- ✅ Record queryable via API
- ✅ Blob URL matches database URL
- ❌ IF BLOCKED: Database write triggers Envoy blocking

---

## 📊 Log Patterns to Watch For

### Success Pattern (All Layers Working)

```
[abc-123] MINIMAL: Endpoint reached
[abc-123] MINIMAL: File received - test.jpg (12345 bytes)
[abc-123] MINIMAL: User clxxxx
[abc-123] MINIMAL: MIME type validated - image/jpeg
[abc-123] MINIMAL: Magic bytes verified
[abc-123] MINIMAL: EXIF stripped - 12345 → 9876 bytes
[abc-123] MINIMAL: Moderation APPROVED
[abc-123] MINIMAL: Blob name: minimal-test/abc-123-test.jpg
[abc-123] MINIMAL: Starting blob upload
[abc-123] MINIMAL: Upload complete - https://uwrstorage2425.blob.core.windows.net/...
[abc-123] MINIMAL: Database record created - clyyyyy
```

### Failure Pattern (Envoy Blocking at Layer X)

```
# Scenario: Layer 3 (EXIF) triggers blocking

# Last successful test (Layer 2):
[abc-123] MINIMAL: Endpoint reached
[abc-123] MINIMAL: File received - test.jpg (12345 bytes)
[abc-123] MINIMAL: User clxxxx
[abc-123] MINIMAL: MIME type validated - image/jpeg
[abc-123] MINIMAL: Magic bytes verified
[abc-123] MINIMAL: Upload complete - https://...

# After adding Layer 3:
<NO LOGS AT ALL>

# Conclusion: Sharp processing in Layer 3 triggers Envoy blocking
```

### Intermittent Failure Pattern

```
# Test 1:
[abc-123] MINIMAL: Upload complete - https://...

# Test 2:
<NO LOGS>

# Test 3:
[def-456] MINIMAL: Upload complete - https://...

# Conclusion: Envoy has intermittent blocking (time-based? size-based?)
```

---

## 🚀 Deployment Procedure

**After each layer addition:**

```bash
# 1. Compile TypeScript
cd backend
npm run build

# 2. Verify build succeeded
ls -lh dist/routes/photos.js

# 3. Commit changes
git add .
git commit -m "feat: Add Layer X (description) to photo upload"

# 4. Push to development branch
git push origin development

# 5. Wait for GitHub Actions deployment (~3 minutes)
# Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions

# 6. Verify deployment completed
curl -s "https://dev-api.unitedwerise.org/health" | jq '.releaseSha'
git rev-parse --short HEAD
# These should match

# 7. Run layer-specific tests (see above)

# 8. Document results in PHOTO-UPLOAD-TEST-RESULTS.md
```

---

## ⚠️ Rollback Procedure

**If a layer causes blocking:**

```bash
# 1. Revert code to previous working state
git diff HEAD~1 backend/src/routes/photos.ts

# 2. Restore previous version
git checkout HEAD~1 backend/src/routes/photos.ts

# 3. Rebuild and redeploy
cd backend && npm run build
git add .
git commit -m "revert: Rollback Layer X due to Envoy blocking"
git push origin development

# 4. Wait for deployment
# 5. Verify rollback successful (run previous layer tests)

# 6. Document in PHOTO-UPLOAD-TEST-RESULTS.md:
# - Which layer caused blocking
# - Symptoms observed
# - Hypothesis for why
```

---

## 🔍 Key Differences From Current Implementation

| Aspect | Current Implementation | Minimal Design |
|--------|----------------------|----------------|
| **Entry Point** | `POST /api/photos/upload` | `POST /api/photos/upload/minimal` |
| **Line Count** | ~186 lines (processAndUploadPhoto) | 60 lines → 190 lines (incremental) |
| **Layers** | All 5 layers in one function | One layer at a time |
| **Logging** | Mixed console.log/stderr | Consistent stderr with requestId |
| **Testing** | All-or-nothing | Test each layer independently |
| **Debugging** | Hard to isolate failing layer | Easy to identify blocking layer |
| **Rollback** | Full revert required | Rollback to last working layer |
| **Database** | Always creates Photo record | Optional (Layer 5 only) |
| **Pipeline** | Monolithic service method | Refactored in Layer 6 |

---

## 🎯 Success Criteria

**Layer 0 (Minimal):**
- ✅ Request reaches `/upload/minimal` endpoint
- ✅ Multer parses file from multipart/form-data
- ✅ File buffer uploads to Azure Blob Storage
- ✅ Blob appears in Azure Portal
- ✅ All stderr logs appear in Container App logs

**Layer 1 (Auth):**
- ✅ Unauthenticated requests rejected (401)
- ✅ Authenticated requests succeed (201)
- ✅ User ID logged in stderr

**Layer 2 (Validation):**
- ✅ Valid image types accepted
- ✅ Invalid MIME types rejected (400)
- ✅ Magic bytes mismatches rejected (400)

**Layer 3 (EXIF):**
- ✅ Original EXIF metadata removed from uploaded blob
- ✅ File size reduced (WebP conversion)
- ✅ Image dimensions preserved

**Layer 4 (Moderation):**
- ✅ Azure OpenAI Vision API called
- ✅ Safe content approved (201)
- ✅ Inappropriate content rejected (422)

**Layer 5 (Database):**
- ✅ Photo record created in database
- ✅ Record queryable via API
- ✅ Blob URL matches database URL

**Layer 6 (Refactor):**
- ✅ All previous tests still pass
- ✅ Code organized into PhotoPipeline service
- ✅ Route handler reduced to orchestration logic

---

## 📝 Next Steps After Design

1. **Get User Approval:** Confirm this incremental approach is acceptable
2. **Implement Layer 0:** Write minimal endpoint code
3. **Deploy to Staging:** Test in dev-api.unitedwerise.org
4. **Document Results:** Record findings in PHOTO-UPLOAD-TEST-RESULTS.md
5. **Add Layers Incrementally:** One layer per deployment cycle
6. **Identify Blocking Point:** Determine which layer triggers Envoy blocking
7. **Investigate Solution:** Research workaround for blocking layer

---

## 🚨 Critical Reminders

**DO NOT:**
- ❌ Add multiple layers at once (defeats incremental testing)
- ❌ Skip testing between layers (won't know which layer broke)
- ❌ Deploy to production before staging verification
- ❌ Remove logging until all layers working

**DO:**
- ✅ Test EVERY layer independently
- ✅ Document results after each test
- ✅ Use consistent requestId in all logs
- ✅ Keep minimal endpoint separate from production /upload
- ✅ Verify each deployment completes before testing

---

**End of Design Document**

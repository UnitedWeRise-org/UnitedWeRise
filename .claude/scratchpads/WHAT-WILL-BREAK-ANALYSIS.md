# 🚨 CRITICAL: WHAT WILL BREAK IN PRODUCTION
**Testing Agent - Production Failure Prediction**
**Date:** September 30, 2025

---

## ⚠️ EXECUTIVE SUMMARY: HIGH-PROBABILITY FAILURE SCENARIOS

Based on architecture analysis, these failures are **HIGHLY LIKELY** to occur in production:

### 🔴 **CRITICAL FAILURES (100% Will Happen Without Fixes)**

1. **CORS Preflight Rejection** - Browser uploads will be blocked
2. **Orphaned Blobs** - Storage will fill with unused files
3. **SAS Token Expiry on Slow Connections** - Large files will fail mid-upload
4. **Race Conditions on Concurrent Uploads** - Multiple tabs will conflict

### 🟠 **HIGH-PROBABILITY FAILURES (>50% Chance)**

5. **Network Interruption During Upload** - No retry mechanism
6. **Upload Succeeds, Confirmation Fails** - Database inconsistency
7. **Storage Quota Exceeded Mid-Upload** - Wasted bandwidth
8. **Token Theft/Reuse Security Issue** - Unauthorized access

---

## 🔴 CRITICAL FAILURE #1: CORS PREFLIGHT REJECTION

### What Will Happen
```
Browser Console:
❌ Access to XMLHttpRequest at 'https://uwrstorage2425.blob.core.windows.net/photos/...'
   from origin 'https://www.unitedwerise.org' has been blocked by CORS policy:
   Response to preflight request doesn't pass access control check
```

### Root Cause
**Azure Storage Account CORS is NOT configured**

Current State:
```bash
az storage cors show --services b --account-name uwrstorage2425
# Returns: [] (empty array - NO CORS RULES)
```

### Impact
- ✅ Backend can upload (server-to-server, no CORS)
- ❌ Browser CANNOT upload (CORS blocked)
- ❌ 100% of direct-to-blob uploads will fail

### Fix Required (BEFORE DEPLOYMENT)
```bash
az storage cors add \
  --services b \
  --methods GET PUT POST OPTIONS \
  --origins "https://dev.unitedwerise.org" "https://www.unitedwerise.org" \
  --allowed-headers "Content-Type,x-ms-blob-type,x-ms-blob-content-type,x-ms-version" \
  --exposed-headers "x-ms-request-id,x-ms-version" \
  --max-age 3600 \
  --account-name uwrstorage2425 \
  --account-key "$AZURE_STORAGE_ACCOUNT_KEY"
```

### Verification Test
```javascript
// Browser console (after CORS fix)
fetch('https://uwrstorage2425.blob.core.windows.net/photos/test.jpg', {
  method: 'OPTIONS',
  headers: { 'Origin': 'https://www.unitedwerise.org' }
})
.then(r => console.log('✅ CORS working:', r.headers.get('Access-Control-Allow-Origin')))
.catch(e => console.error('❌ CORS broken:', e));
```

---

## 🔴 CRITICAL FAILURE #2: ORPHANED BLOBS

### What Will Happen
```
Scenario:
1. User uploads 5MB photo to blob ✅ (succeeds)
2. User closes browser before confirmation ❌
3. Blob exists in storage, NO database record
4. Storage fills with orphaned blobs (wasted money)
```

### Root Cause
**Two-phase commit without cleanup:**
- Phase 1: Upload blob (user-controlled)
- Phase 2: Confirm upload (user can abandon)
- No cleanup job for orphaned blobs

### Impact
- Storage costs increase (paying for unused blobs)
- No way to track orphaned files
- Eventually hits storage quota

### Statistics (Estimated)
- Expected orphan rate: 5-10% of uploads
- 100 uploads/day = 5-10 orphaned blobs/day
- Average size: 2MB
- Monthly waste: 300-600MB = $0.01/month (small but grows)

### Fix Required
**Option 1: Metadata Tagging (Recommended)**
```typescript
// When generating SAS token, tag blob with metadata
const sasUrl = generateSASToken({
  metadata: {
    'confirmed': 'false',
    'userId': userId,
    'createdAt': Date.now().toString()
  }
});

// After confirmation, update metadata
await updateBlobMetadata(blobUrl, { 'confirmed': 'true' });

// Cleanup job (daily cron)
async function cleanupOrphanedBlobs() {
  const blobs = await listBlobsWithMetadata('confirmed=false');
  const olderThan24Hours = blobs.filter(b => {
    return Date.now() - parseInt(b.metadata.createdAt) > 86400000;
  });

  for (const blob of olderThan24Hours) {
    console.log(`🗑️ Deleting orphaned blob: ${blob.name}`);
    await deleteBlob(blob.name);
  }
}
```

**Option 2: Azure Lifecycle Policy**
```json
{
  "rules": [
    {
      "enabled": true,
      "name": "cleanup-orphaned-blobs",
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["photos/"]
        },
        "actions": {
          "baseBlob": {
            "delete": {
              "daysAfterCreationGreaterThan": 1
            }
          }
        }
      }
    }
  ]
}
```
⚠️ **Problem:** This deletes ALL blobs older than 1 day (including confirmed ones)
✅ **Solution:** Combine with metadata filter

### Verification Test
```bash
# 1. Upload blob without confirmation
# 2. Wait 24 hours
# 3. Run cleanup job
# 4. Verify blob deleted

az storage blob list --container-name photos --account-name uwrstorage2425 | grep "confirmed"
```

---

## 🔴 CRITICAL FAILURE #3: SAS TOKEN EXPIRY ON SLOW CONNECTIONS

### What Will Happen
```
Scenario:
1. User with slow internet (500 KB/s) starts uploading 10MB file
2. Upload will take ~20 seconds
3. SAS token expires after 1 hour (3600 seconds) ✅
4. But if token generation took 30 minutes (user idle), token expires mid-upload ❌
5. Azure returns: 403 Forbidden
6. Upload fails at 90%, user loses progress
```

### Root Cause
**Fixed token expiry doesn't account for:**
- User idle time before upload starts
- Slow network connections
- Large files (10MB on 100 KB/s = 100 seconds)
- Mobile users on weak signal

### Impact
- Users with slow connections will experience frequent failures
- Large files (>5MB) more likely to fail
- Poor user experience (lost progress)

### Statistics (Estimated)
- 10% of users have slow connections (<500 KB/s)
- 20% of uploads are >5MB
- Failure rate: 2% of all uploads (100 uploads/day = 2 failures/day)

### Fix Required
**Option 1: Increase Token Expiry**
```typescript
// Generate SAS token with 2-hour expiry (instead of 1 hour)
const expiresOn = new Date(Date.now() + 7200000); // 2 hours

// Problem: Longer expiry = larger security window
```

**Option 2: Token Refresh Mechanism (Recommended)**
```typescript
// Frontend: Detect slow upload, refresh token
async function uploadWithRefresh(file, sasUrl) {
  const uploadStart = Date.now();
  const tokenExpiry = extractExpiryFromSAS(sasUrl);

  // Start upload
  const uploadPromise = uploadToBlob(file, sasUrl);

  // Monitor upload speed
  const speedCheckInterval = setInterval(async () => {
    const elapsed = Date.now() - uploadStart;
    const remainingTime = tokenExpiry - Date.now();

    // If token will expire before upload completes
    if (remainingTime < 60000) { // Less than 1 minute remaining
      console.warn('⚠️ Token about to expire, requesting refresh');
      const newToken = await requestTokenRefresh();
      // Resume upload with new token (if possible)
    }
  }, 10000); // Check every 10 seconds

  await uploadPromise;
  clearInterval(speedCheckInterval);
}
```

**Option 3: Chunked Upload with Token Per Chunk**
```typescript
// Split large files into 4MB chunks
// Each chunk gets its own SAS token
// Eliminates expiry risk
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB
const chunks = Math.ceil(file.size / CHUNK_SIZE);

for (let i = 0; i < chunks; i++) {
  const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
  const chunkToken = await getChunkSASToken(i);
  await uploadChunk(chunk, chunkToken);
}
```

### Verification Test
```javascript
// Simulate slow connection
// Chrome DevTools → Network → Throttling → Slow 3G
// Upload 10MB file
// Expected: Success OR clear error with retry option
```

---

## 🔴 CRITICAL FAILURE #4: RACE CONDITIONS ON CONCURRENT UPLOADS

### What Will Happen
```
Scenario:
1. User opens My Feed in 2 browser tabs
2. Starts uploading different photos in both tabs
3. Tab 1: Requests token for photo1
4. Tab 2: Requests token for photo2
5. Both tokens generated with same blobName prefix ❌
6. Tab 1 uploads, overwrites Tab 2's blob
7. Database inconsistency (photo2 record points to photo1 blob)
```

### Root Cause
**Non-unique blob naming:**
```typescript
// Current implementation
const blobName = `${userId}-${Date.now()}.jpg`;
// Problem: Date.now() can be identical in concurrent requests
```

### Impact
- Concurrent uploads overwrite each other
- Users lose photos (silently)
- Database records point to wrong blobs

### Statistics (Estimated)
- 5% of users have multiple tabs open
- 1% of those experience race condition
- Failure rate: 0.05% of uploads (rare but data loss is unacceptable)

### Fix Required
```typescript
// Use UUID instead of timestamp
import { v4 as uuidv4 } from 'uuid';

const blobName = `${userId}/${uuidv4()}.jpg`;
// Guaranteed unique, even in concurrent requests
```

### Verification Test
```javascript
// Test: Open 2 tabs, upload same file simultaneously
// Expected: 2 separate blobs with different IDs
// Expected: 2 database records with correct blob URLs
```

---

## 🟠 HIGH-PROBABILITY FAILURE #5: NETWORK INTERRUPTION DURING UPLOAD

### What Will Happen
```
Scenario:
1. User uploads 5MB photo on mobile
2. Upload reaches 70% (3.5MB uploaded)
3. User walks through WiFi dead zone
4. Network disconnects for 5 seconds
5. Upload fails, no retry mechanism ❌
6. User sees generic error, has to start over (0%)
```

### Root Cause
**No retry logic:**
- Fetch API doesn't auto-retry on network failure
- No upload resume capability
- No progress saved

### Impact
- Mobile users affected most (unstable connections)
- Poor user experience (lost progress)
- Increased support requests

### Fix Required
**Option 1: Automatic Retry with Exponential Backoff**
```typescript
async function uploadWithRetry(file, sasUrl, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadToBlob(file, sasUrl);
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`⚠️ Upload failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
      await sleep(delay);
    }
  }
}
```

**Option 2: Resumable Upload (Azure Block Blob API)**
```typescript
// Use Azure SDK for resumable uploads
import { BlockBlobClient } from '@azure/storage-blob';

const blockBlobClient = new BlockBlobClient(sasUrl);
await blockBlobClient.uploadData(file, {
  onProgress: (progress) => {
    // Save progress to localStorage
    localStorage.setItem('uploadProgress', JSON.stringify(progress));
  }
});

// On retry, resume from saved progress
const savedProgress = JSON.parse(localStorage.getItem('uploadProgress'));
await blockBlobClient.uploadData(file, {
  resumeFrom: savedProgress.loadedBytes
});
```

### Verification Test
```javascript
// Chrome DevTools → Network → Offline (toggle during upload)
// Expected: Automatic retry after network restored
```

---

## 🟠 HIGH-PROBABILITY FAILURE #6: UPLOAD SUCCEEDS, CONFIRMATION FAILS

### What Will Happen
```
Scenario:
1. User uploads photo to blob ✅ (201 Created)
2. Frontend calls /api/photos/confirm-upload
3. Backend crashes before database insert ❌
4. Result:
   - Blob exists in storage
   - NO database record
   - User sees error "Upload failed"
   - User retries → uploads AGAIN → duplicate blob
```

### Root Cause
**Two-phase commit without transaction:**
- Phase 1: Upload blob (Azure)
- Phase 2: Insert database (PostgreSQL)
- No distributed transaction between Azure and PostgreSQL

### Impact
- Duplicate blobs (wasted storage)
- User sees error despite successful upload
- Retry causes confusion

### Fix Required
**Option 1: Idempotency Key**
```typescript
// Frontend includes unique upload ID
const uploadId = uuidv4();
await confirmUpload(blobUrl, uploadId);

// Backend checks for existing record with same uploadId
const existing = await prisma.photo.findUnique({
  where: { uploadId: uploadId }
});

if (existing) {
  console.log('✅ Upload already confirmed, returning existing record');
  return existing; // Idempotent
}

// Proceed with database insert
```

**Option 2: Optimistic Confirmation**
```typescript
// Frontend optimistically shows success
// Backend confirms asynchronously
// If confirmation fails, cleanup job removes blob
```

### Verification Test
```typescript
// Simulate backend crash after blob upload
// Expected: Retry succeeds without duplicate blob
```

---

## 🟠 HIGH-PROBABILITY FAILURE #7: STORAGE QUOTA EXCEEDED MID-UPLOAD

### What Will Happen
```
Scenario:
1. User has 95MB used (100MB limit)
2. User uploads 6MB file ❌ (would exceed limit)
3. Backend generates SAS token ✅ (no validation)
4. User uploads to blob ✅ (Azure allows, no quota check)
5. Backend tries to confirm → quota check fails ❌
6. Result:
   - 6MB uploaded (wasted bandwidth)
   - User sees error AFTER upload completes
   - Storage quota exceeded (can't upload anything)
```

### Root Cause
**Quota validation happens AFTER upload, not before**

Current flow:
1. Generate SAS token (no validation)
2. Upload to blob (no quota check)
3. Confirm upload → validateStorageLimit() → fails

Better flow:
1. Validate storage limit BEFORE generating token
2. Reject token request if quota exceeded
3. User sees error immediately, no wasted bandwidth

### Impact
- Wasted user bandwidth (uploading doomed file)
- Wasted Azure egress (downloading for thumbnail generation)
- Poor user experience (error after long upload)

### Fix Required
```typescript
// Move validation to token generation
export async function getUploadToken(req: Request, res: Response) {
  const { userId, photoType, fileSize } = req.body;

  // VALIDATE QUOTA BEFORE GENERATING TOKEN
  await PhotoService.validateStorageLimit(userId, fileSize);

  // Only generate token if quota allows
  const sasUrl = generateSASToken(...);

  res.json({ success: true, sasUrl });
}
```

**Already implemented in photoService.ts! (Line 518)**
```typescript
static async validateStorageLimit(userId: string, fileSize: number): Promise<void> {
  const userPhotos = await prisma.photo.findMany({
    where: { userId, isActive: true },
    select: { compressedSize: true }
  });

  const currentUsage = userPhotos.reduce((total, photo) => total + photo.compressedSize, 0);

  if (currentUsage + fileSize > this.MAX_ACCOUNT_STORAGE) {
    throw new Error(`Storage limit exceeded. Current usage: ${usageMB}MB, Limit: ${limitMB}MB.`);
  }
}
```

✅ **Good news:** This is already implemented in the backend code!
⚠️ **TODO:** Ensure it's called in the SAS token generation endpoint

### Verification Test
```typescript
// 1. Upload photos until 95MB used
// 2. Try to upload 6MB file
// Expected: Error BEFORE upload starts, not after
```

---

## 🟠 HIGH-PROBABILITY FAILURE #8: TOKEN THEFT/REUSE SECURITY ISSUE

### What Will Happen
```
Scenario:
1. Attacker intercepts network traffic (MITM, public WiFi)
2. Steals SAS token from legitimate user's request
3. Attacker uses stolen token to upload malicious content
4. Malicious content uploaded under victim's account ❌
```

### Root Cause
**SAS token is bearer token:**
- Anyone with token can upload
- No user authentication tied to token
- Token valid for 1 hour (large attack window)

### Impact
- Account compromise
- Malicious content uploaded
- Reputation damage

### Fix Required
**Option 1: Short-Lived Tokens (Recommended)**
```typescript
// Reduce token expiry from 1 hour to 5 minutes
const expiresOn = new Date(Date.now() + 300000); // 5 minutes

// Frontend must request new token if upload delayed
```

**Option 2: Single-Use Tokens**
```typescript
// Backend tracks used tokens
const usedTokens = new Set<string>();

export async function confirmUpload(req: Request, res: Response) {
  const { sasUrl } = req.body;
  const tokenSignature = extractSignature(sasUrl);

  if (usedTokens.has(tokenSignature)) {
    return res.status(400).json({ error: 'Token already used' });
  }

  usedTokens.add(tokenSignature);
  // Proceed with confirmation
}
```

**Option 3: User-Scoped Tokens (Most Secure)**
```typescript
// Include userId in SAS token metadata
const sasUrl = generateSASToken({
  metadata: { 'uploadedBy': userId }
});

// On confirmation, verify userId matches
if (blobMetadata.uploadedBy !== req.user.id) {
  throw new Error('Unauthorized: Token belongs to different user');
}
```

### Verification Test
```typescript
// 1. User A generates token
// 2. User B intercepts token
// 3. User B attempts upload
// Expected: Upload succeeds BUT confirmation fails (user mismatch)
```

---

## 📊 FAILURE PROBABILITY SUMMARY

| Failure Scenario | Probability | Impact | Fix Difficulty | PRIORITY |
|-----------------|-------------|--------|----------------|----------|
| CORS Preflight Rejection | 100% | Critical | Easy | 🔴 **P0** |
| Orphaned Blobs | 90% | High | Medium | 🔴 **P0** |
| Token Expiry (Slow Network) | 50% | Medium | Medium | 🟠 **P1** |
| Race Conditions | 30% | High | Easy | 🟠 **P1** |
| Network Interruption | 40% | Medium | Medium | 🟡 **P2** |
| Confirmation Failure | 20% | Medium | Medium | 🟡 **P2** |
| Quota Exceeded Mid-Upload | 15% | Low | Easy | 🟢 **P3** |
| Token Theft/Reuse | 5% | Critical | Medium | 🟢 **P3** |

---

## ✅ MANDATORY FIXES BEFORE DEPLOYMENT

**MUST FIX (P0 - Deployment Blockers):**
1. ✅ Configure Azure Storage CORS
2. ✅ Implement orphaned blob cleanup job
3. ✅ Use UUID for blob naming (prevent race conditions)

**SHOULD FIX (P1 - Will Cause User Complaints):**
4. ✅ Implement retry logic for network failures
5. ✅ Increase token expiry OR implement refresh mechanism
6. ✅ Move quota validation to token generation

**NICE TO HAVE (P2-P3 - Edge Cases):**
7. ✅ Implement idempotency for confirmation endpoint
8. ✅ Shorten token expiry (security hardening)
9. ✅ Add telemetry for failure tracking

---

## 🧪 TESTING REQUIREMENTS

**BEFORE deploying to staging:**
- [ ] Verify CORS configuration with browser test
- [ ] Test orphaned blob cleanup job
- [ ] Test concurrent uploads (race condition)
- [ ] Test slow connection (token expiry)
- [ ] Test network interruption (retry logic)
- [ ] Test quota exceeded (validation timing)
- [ ] Test token theft scenario (security)

**AFTER deploying to staging:**
- [ ] Monitor error logs for 24 hours
- [ ] Track success rate (must be >95%)
- [ ] Verify no orphaned blobs accumulating
- [ ] Test from multiple browsers/devices

**PRODUCTION deployment criteria:**
- [ ] All P0 fixes implemented and tested
- [ ] All P1 fixes implemented and tested
- [ ] Staging success rate >95% over 24 hours
- [ ] User approval obtained

---

## 🚨 ROLLBACK PLAN

**If any critical failure occurs in production:**

1. **Immediate rollback to previous revision:**
```bash
az containerapp revision list --name unitedwerise-backend --resource-group unitedwerise-rg -o table
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --image "PREVIOUS_IMAGE"
```

2. **Disable direct-to-blob uploads:**
```typescript
// Emergency feature flag
const ENABLE_DIRECT_UPLOAD = false;

if (!ENABLE_DIRECT_UPLOAD) {
  // Fallback to old upload path (Container Apps → Blob)
  return oldUploadFunction(req, res);
}
```

3. **Monitor for orphaned blobs:**
```bash
# Check for blobs created during failed deployment
az storage blob list --container-name photos --account-name uwrstorage2425 --query "[?properties.createdOn >= '2025-09-30']"
```

---

**END OF FAILURE ANALYSIS**

**Next Steps:**
1. Review this analysis with development team
2. Implement P0 fixes (CORS, cleanup job, UUID naming)
3. Implement P1 fixes (retry logic, token refresh, quota validation)
4. Deploy to staging
5. Run ALL test scenarios from DIRECT-TO-BLOB-TESTING-PLAN.md
6. Monitor for 24 hours
7. Get user approval
8. Deploy to production with rollback plan ready

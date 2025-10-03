# Layer 0 Testing Plan

## Deployment Status

**Commit:** `45ddafb` - Layer 0 minimal photo upload
**Branch:** main
**Target:** Staging (dev-api.unitedwerise.org)

### Check Deployment Progress

```bash
# Monitor GitHub Actions
# Visit: https://github.com/UnitedWeRise-org/UnitedWeRise/actions

# Or via CLI
gh run list --branch main --limit 3
```

---

## Test 1: Health Check

**Objective:** Verify endpoint is deployed and environment variables are set

```bash
curl https://dev-api.unitedwerise.org/api/photos/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "layer": 0,
  "description": "Minimal photo upload - no auth, no validation",
  "environment": {
    "hasConnectionString": true,
    "hasAccountName": true,
    "accountName": "uwrstorage2425"
  }
}
```

**Success Criteria:**
- ✅ HTTP 200 status
- ✅ `environment.hasConnectionString: true`
- ✅ `environment.hasAccountName: true`

---

## Test 2: Minimal Upload (Tiny File)

**Objective:** Prove basic file transport works

```bash
# Create 1KB test image
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > test-tiny.png

# Upload to Layer 0 endpoint
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload \
  -F "photo=@test-tiny.png" \
  -v
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://uwrstorage2425.blob.core.windows.net/photos/layer0-XXXXX.png",
    "blobName": "layer0-XXXXX.png",
    "requestId": "XXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
    "size": 95,
    "mimeType": "image/png"
  }
}
```

**Success Criteria:**
- ✅ HTTP 201 status
- ✅ `success: true`
- ✅ `data.url` contains Azure blob URL
- ✅ File accessible at returned URL
- ✅ `requestId` present for log tracing

**Logs to Check:**
```bash
# Watch container logs during upload
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --follow

# Look for these log stages:
# - REQUEST_RECEIVED
# - FILE_RECEIVED
# - ENV_VARS_VERIFIED
# - AZURE_CLIENT_CREATED
# - CONTAINER_VERIFIED
# - BLOB_NAME_GENERATED
# - AZURE_UPLOAD_SUCCESS
# - UPLOAD_COMPLETE
```

---

## Test 3: Medium File Upload

**Objective:** Verify 1MB file uploads successfully

```bash
# Create 1MB test file
dd if=/dev/urandom of=test-1mb.jpg bs=1024 count=1024

# Upload
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload \
  -F "photo=@test-1mb.jpg" \
  -v
```

**Success Criteria:**
- ✅ HTTP 201 status
- ✅ Upload completes within 3 seconds
- ✅ File size in response matches ~1MB

---

## Test 4: 5MB File (At Limit)

**Objective:** Verify max file size works

```bash
# Create 5MB test file
dd if=/dev/urandom of=test-5mb.jpg bs=1024 count=5120

# Upload
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload \
  -F "photo=@test-5mb.jpg" \
  -v
```

**Success Criteria:**
- ✅ HTTP 201 status
- ✅ Upload completes within 10 seconds

---

## Test 5: File Too Large (Should Fail)

**Objective:** Verify Multer rejects files > 5MB

```bash
# Create 6MB test file
dd if=/dev/urandom of=test-6mb.jpg bs=1024 count=6144

# Upload
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload \
  -F "photo=@test-6mb.jpg" \
  -v
```

**Expected Response:**
```json
{
  "success": false,
  "error": "File too large",
  "requestId": "..."
}
```

**Success Criteria:**
- ✅ HTTP 400 or 413 status
- ✅ Error message about file size

---

## Test 6: No File Provided

**Objective:** Verify validation catches missing file

```bash
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload \
  -F "caption=test" \
  -v
```

**Expected Response:**
```json
{
  "success": false,
  "error": "No file uploaded",
  "requestId": "..."
}
```

**Success Criteria:**
- ✅ HTTP 400 status
- ✅ Clear error message

---

## Test 7: Verify Azure Blob Storage

**Objective:** Confirm files actually reach Azure

```bash
# List recent blobs
az storage blob list \
  --account-name uwrstorage2425 \
  --container-name photos \
  --prefix "layer0-" \
  --output table \
  --num-results 5

# Download one blob to verify
az storage blob download \
  --account-name uwrstorage2425 \
  --container-name photos \
  --name "layer0-XXXXX.png" \
  --file downloaded-test.png

# Verify file integrity
file downloaded-test.png
```

**Success Criteria:**
- ✅ Blobs with `layer0-` prefix exist
- ✅ Downloaded file is valid image
- ✅ File size matches uploaded size

---

## Critical Discovery: Does Envoy Allow Multipart?

**This is the KEY test** - if Layer 0 works, it proves Azure Container Apps + Envoy ingress DO allow multipart/form-data uploads.

**If Test 2 succeeds:**
- ✅ Envoy allows multipart uploads
- ✅ Week-long failure was due to code issues, not infrastructure
- ✅ Can proceed with adding layers 1-5

**If Test 2 fails:**
- ❌ Need to investigate Envoy configuration
- ❌ May need Dapr or service migration
- ❌ Confirms infrastructure blocker

---

## Deployment Verification

Before testing, verify deployment completed:

```bash
# Check latest container revision
az containerapp revision list \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --output table | head -3

# Verify health endpoint
curl https://dev-api.unitedwerise.org/health | jq .
```

**Expected:**
- Recent revision timestamp
- Health check returns 200

---

## Next Steps After Testing

**If all tests pass:**
- ✅ Mark Layer 0 complete
- ✅ Proceed to Layer 1 (add authentication)
- ✅ Document successful upload flow

**If tests fail:**
- ❌ Review container logs for actual error
- ❌ Check environment variables
- ❌ Verify Azure connection string
- ❌ Test network connectivity from container

---

## Test Execution Log

Run tests and document results here:

### Test 1: Health Check
- [x] Executed: 2025-10-03 00:43 UTC
- [x] Status: SUCCESS
- [x] Notes:
  - Environment variables: ALL PRESENT
  - Connection string: ✅
  - Account name: uwrstorage2425 ✅
  - Deployed SHA: 45ddafb ✅

### Test 2: Tiny File Upload
- [x] Executed: 2025-10-03 01:01 UTC
- [x] Status: SUCCESS ✅ **MULTIPART UPLOADS WORK!**
- [x] URL returned: https://uwrstorage2425.blob.core.windows.net/photos/layer0-de56a815-21af-425c-9fe7-328d23fa8dfd.png
- [x] Request ID: de56a815-21af-425c-9fe7-328d23fa8dfd
- [x] Notes:
  - HTTP 201 Created
  - File size: 70 bytes (correct)
  - MIME type: image/png (correct)
  - Blob accessible and downloadable
  - File integrity verified
  - **CRITICAL DISCOVERY: Azure Container Apps + Envoy ALLOW multipart uploads**
  - **Week-long failure was due to code issues, NOT infrastructure**

### Test 3: 1MB File
- [ ] Executed
- [ ] Status:
- [ ] Duration:

### Test 4: 5MB File
- [ ] Executed
- [ ] Status:
- [ ] Duration:

### Test 5: 6MB File (fail)
- [ ] Executed
- [ ] Status:
- [ ] Error message:

### Test 6: No File
- [ ] Executed
- [ ] Status:

### Test 7: Azure Verification
- [ ] Executed
- [ ] Blobs found:
- [ ] File valid:

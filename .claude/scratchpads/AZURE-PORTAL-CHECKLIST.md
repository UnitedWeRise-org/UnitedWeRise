# ☁️ AZURE PORTAL PRE-DEPLOYMENT CHECKLIST
**Testing Agent - Azure Configuration Verification**
**Date:** September 30, 2025
**Target:** Direct-to-Blob Upload Prerequisites

---

## 📋 OVERVIEW

This checklist MUST be completed BEFORE deploying the direct-to-blob upload feature.
Each item includes:
- ✅ Azure Portal navigation path
- ✅ Required configuration
- ✅ Verification command (Azure CLI)
- ✅ Expected result

---

## 🔐 SECTION 1: STORAGE ACCOUNT ACCESS

### 1.1 Storage Account Credentials
**Goal:** Verify backend has access to storage account

**Azure Portal Path:**
```
Home → Storage accounts → uwrstorage2425 → Security + networking → Access keys
```

**Verification:**
- [ ] **Connection string exists:**
  ```
  DefaultEndpointsProtocol=https;AccountName=uwrstorage2425;AccountKey=...;EndpointSuffix=core.windows.net
  ```
- [ ] **Key1 or Key2 is accessible**
- [ ] **Connection string is in backend environment variables:**
  ```bash
  # Check Azure Container Apps environment variables
  az containerapp show \
    --name unitedwerise-backend-staging \
    --resource-group unitedwerise-rg \
    --query "properties.template.containers[0].env[?name=='AZURE_STORAGE_CONNECTION_STRING']"
  ```

**Expected Result:**
```json
[
  {
    "name": "AZURE_STORAGE_CONNECTION_STRING",
    "value": "DefaultEndpointsProtocol=https;AccountName=uwrstorage2425;..."
  }
]
```

**Verification Command:**
```bash
# Test connection from CLI
az storage blob list \
  --container-name photos \
  --connection-string "$AZURE_STORAGE_CONNECTION_STRING" \
  --num-results 1
```

✅ **Pass Criteria:** Returns blob list (or empty list if no blobs)
❌ **Fail Criteria:** Authentication error

---

## 🌐 SECTION 2: CORS CONFIGURATION (CRITICAL)

### 2.1 Blob Service CORS Rules
**Goal:** Allow browser uploads from unitedwerise.org domains

**Azure Portal Path:**
```
Home → Storage accounts → uwrstorage2425 → Settings → Resource sharing (CORS) → Blob service
```

**Required Configuration:**

| Field | Value |
|-------|-------|
| **Allowed origins** | `https://dev.unitedwerise.org`, `https://www.unitedwerise.org`, `http://localhost:3000` |
| **Allowed methods** | `GET`, `PUT`, `POST`, `OPTIONS`, `HEAD` |
| **Allowed headers** | `*` (or specific: `Content-Type,x-ms-blob-type,x-ms-blob-content-type,x-ms-version`) |
| **Exposed headers** | `*` (or specific: `x-ms-request-id,x-ms-version,x-ms-meta-*`) |
| **Max age** | `3600` (1 hour) |

**Screenshot Verification:**
- [ ] CORS rules table shows 1+ rows
- [ ] Origins include `www.unitedwerise.org`
- [ ] Methods include `PUT` (required for upload)

**Verification Command:**
```bash
# Check current CORS configuration
az storage cors show \
  --services b \
  --account-name uwrstorage2425 \
  --account-key "$(az storage account keys list --account-name uwrstorage2425 --resource-group unitedwerise-rg --query '[0].value' -o tsv)"
```

**Expected Result:**
```json
[
  {
    "allowedOrigins": "https://dev.unitedwerise.org,https://www.unitedwerise.org,http://localhost:3000",
    "allowedMethods": "GET,PUT,POST,OPTIONS,HEAD",
    "allowedHeaders": "*",
    "exposedHeaders": "*",
    "maxAgeInSeconds": 3600
  }
]
```

✅ **Pass Criteria:** CORS rule exists with correct origins and methods
❌ **Fail Criteria:** Empty array `[]` (NO CORS CONFIGURED)

**If CORS is missing, run this command:**
```bash
# Configure CORS for blob service
az storage cors add \
  --services b \
  --methods GET PUT POST OPTIONS HEAD \
  --origins "https://dev.unitedwerise.org" "https://www.unitedwerise.org" "http://localhost:3000" \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 3600 \
  --account-name uwrstorage2425 \
  --account-key "$(az storage account keys list --account-name uwrstorage2425 --resource-group unitedwerise-rg --query '[0].value' -o tsv)"
```

**Browser Test (After CORS Configuration):**
```javascript
// Open browser console on https://www.unitedwerise.org
fetch('https://uwrstorage2425.blob.core.windows.net/photos/test.txt', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://www.unitedwerise.org',
    'Access-Control-Request-Method': 'PUT',
    'Access-Control-Request-Headers': 'Content-Type'
  }
})
.then(response => {
  console.log('✅ CORS preflight succeeded');
  console.log('Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
  console.log('Access-Control-Allow-Methods:', response.headers.get('Access-Control-Allow-Methods'));
})
.catch(error => {
  console.error('❌ CORS preflight failed:', error);
});
```

✅ **Pass Criteria:** Console shows "CORS preflight succeeded"
❌ **Fail Criteria:** CORS policy error in console

---

## 📦 SECTION 3: CONTAINER CONFIGURATION

### 3.1 Photos Container Exists
**Goal:** Verify "photos" container exists and is accessible

**Azure Portal Path:**
```
Home → Storage accounts → uwrstorage2425 → Data storage → Containers
```

**Verification:**
- [ ] **Container "photos" exists**
- [ ] **Public access level:** Blob (anonymous read access for blobs only)
  - ✅ Correct: "Blob" (allows public read of blobs via URL)
  - ❌ Wrong: "Private" (blocks all public access)
  - ❌ Wrong: "Container" (allows listing all blobs - security risk)

**Verification Command:**
```bash
# Check if container exists
az storage container exists \
  --name photos \
  --account-name uwrstorage2425 \
  --account-key "$(az storage account keys list --account-name uwrstorage2425 --resource-group unitedwerise-rg --query '[0].value' -o tsv)"
```

**Expected Result:**
```json
{
  "exists": true
}
```

**Check Public Access Level:**
```bash
az storage container show \
  --name photos \
  --account-name uwrstorage2425 \
  --account-key "$(az storage account keys list --account-name uwrstorage2425 --resource-group unitedwerise-rg --query '[0].value' -o tsv)" \
  --query "properties.publicAccess" \
  -o tsv
```

**Expected Result:**
```
blob
```

✅ **Pass Criteria:** Container exists, access level is "blob"
❌ **Fail Criteria:** Container doesn't exist OR access level is "off" (private)

**If access level is wrong:**
```bash
# Set public access level to blob
az storage container set-permission \
  --name photos \
  --public-access blob \
  --account-name uwrstorage2425 \
  --account-key "$(az storage account keys list --account-name uwrstorage2425 --resource-group unitedwerise-rg --query '[0].value' -o tsv)"
```

### 3.2 Thumbnails Container Exists
**Goal:** Verify "thumbnails" container exists for thumbnail images

**Verification:**
```bash
az storage container exists \
  --name thumbnails \
  --account-name uwrstorage2425 \
  --account-key "$(az storage account keys list --account-name uwrstorage2425 --resource-group unitedwerise-rg --query '[0].value' -o tsv)"
```

**If container doesn't exist:**
```bash
# Create thumbnails container
az storage container create \
  --name thumbnails \
  --public-access blob \
  --account-name uwrstorage2425 \
  --account-key "$(az storage account keys list --account-name uwrstorage2425 --resource-group unitedwerise-rg --query '[0].value' -o tsv)"
```

---

## 🔄 SECTION 4: BLOB LIFECYCLE POLICIES (ORPHAN CLEANUP)

### 4.1 Lifecycle Management Policy
**Goal:** Automatically delete orphaned blobs after 24 hours

**Azure Portal Path:**
```
Home → Storage accounts → uwrstorage2425 → Data management → Lifecycle management
```

**Required Policy:**
```json
{
  "rules": [
    {
      "enabled": true,
      "name": "cleanup-unconfirmed-blobs",
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["photos/"]
        },
        "actions": {
          "baseBlob": {
            "delete": {
              "daysAfterModificationGreaterThan": 1
            }
          }
        }
      }
    }
  ]
}
```

⚠️ **NOTE:** This policy deletes ALL blobs in photos/ older than 1 day.
To delete ONLY orphaned blobs, we need metadata-based filtering (not currently supported by Azure Lifecycle).

**Alternative: Backend Cleanup Job** (Recommended)
```typescript
// Cron job in backend (runs daily)
import { AzureBlobService } from './azureBlobService';
import { prisma } from './lib/prisma';

export async function cleanupOrphanedBlobs() {
  // Get all blobs in storage
  const blobs = await AzureBlobService.listBlobs('photos/');

  for (const blob of blobs) {
    // Check if blob has corresponding database record
    const photo = await prisma.photo.findFirst({
      where: { url: { contains: blob.name } }
    });

    // If no database record AND blob is older than 24 hours
    const blobAge = Date.now() - blob.properties.createdOn.getTime();
    if (!photo && blobAge > 86400000) {
      console.log(`🗑️ Deleting orphaned blob: ${blob.name}`);
      await AzureBlobService.deleteFile(blob.name);
    }
  }
}
```

**Verification:**
- [ ] Lifecycle policy exists (Azure Portal)
  OR
- [ ] Backend cleanup job implemented and scheduled

**Verification Command:**
```bash
# Check if lifecycle policy exists
az storage account management-policy show \
  --account-name uwrstorage2425 \
  --resource-group unitedwerise-rg
```

✅ **Pass Criteria:** Policy exists OR backend job implemented
❌ **Fail Criteria:** No cleanup mechanism (orphaned blobs will accumulate)

---

## 🔐 SECTION 5: SHARED ACCESS SIGNATURE (SAS) CONFIGURATION

### 5.1 SAS Token Generation Test
**Goal:** Verify backend can generate SAS tokens with correct permissions

**Test SAS Token Generation:**
```typescript
// Backend test (run in backend console)
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

// Generate SAS token for write access
const containerClient = blobServiceClient.getContainerClient('photos');
const blobName = 'test-upload.jpg';
const blobClient = containerClient.getBlobClient(blobName);

const sasOptions = {
  containerName: 'photos',
  blobName: blobName,
  permissions: BlobSASPermissions.parse('w'), // Write only
  expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hour
};

const sasToken = generateBlobSASQueryParameters(
  sasOptions,
  blobServiceClient.credential
).toString();

const sasUrl = `${blobClient.url}?${sasToken}`;

console.log('✅ SAS URL generated:', sasUrl);
```

**Manual Test:**
```bash
# Upload file using generated SAS URL
curl -X PUT "GENERATED_SAS_URL" \
  --data-binary @test-image.jpg \
  -H "x-ms-blob-type: BlockBlob" \
  -H "Content-Type: image/jpeg"
```

✅ **Pass Criteria:** Returns 201 Created
❌ **Fail Criteria:** Returns 403 Forbidden (invalid credentials)

### 5.2 SAS Token Permissions Validation
**Goal:** Ensure SAS tokens have ONLY write permission (security)

**Test Read Access (Should Fail):**
```bash
# Try to read blob using write-only SAS token
curl "GENERATED_SAS_URL"
```

✅ **Pass Criteria:** Returns 403 Forbidden (read not allowed)
❌ **Fail Criteria:** Returns 200 OK (token has excessive permissions)

**Test List Access (Should Fail):**
```bash
# Try to list blobs using write-only SAS token
curl "https://uwrstorage2425.blob.core.windows.net/photos/?comp=list&${SAS_TOKEN}"
```

✅ **Pass Criteria:** Returns 403 Forbidden (list not allowed)
❌ **Fail Criteria:** Returns blob list (security risk)

---

## 📊 SECTION 6: STORAGE ACCOUNT METRICS & MONITORING

### 6.1 Enable Storage Analytics
**Goal:** Monitor blob upload success rate and errors

**Azure Portal Path:**
```
Home → Storage accounts → uwrstorage2425 → Monitoring → Diagnostic settings
```

**Required Configuration:**
- [ ] **Diagnostic setting exists:** "blob-upload-monitoring"
- [ ] **Logs enabled:**
  - StorageRead ✅
  - StorageWrite ✅
  - StorageDelete ✅
- [ ] **Destination:** Log Analytics workspace OR Storage account

**Verification Command:**
```bash
# Check if diagnostic settings exist
az monitor diagnostic-settings list \
  --resource /subscriptions/.../uwrstorage2425 \
  --resource-type Microsoft.Storage/storageAccounts
```

**If not enabled:**
```bash
# Enable blob storage logging
az monitor diagnostic-settings create \
  --name blob-upload-monitoring \
  --resource /subscriptions/.../uwrstorage2425 \
  --resource-type Microsoft.Storage/storageAccounts \
  --logs '[{"category": "StorageWrite", "enabled": true}]' \
  --workspace LOG_ANALYTICS_WORKSPACE_ID
```

### 6.2 Configure Alerts
**Goal:** Get notified of upload failures

**Azure Portal Path:**
```
Home → Storage accounts → uwrstorage2425 → Monitoring → Alerts → Create alert rule
```

**Recommended Alert Rules:**
1. **High 403 Error Rate (CORS issues)**
   - Metric: Transactions
   - Filter: ResponseType = "ClientOtherError" (403)
   - Threshold: > 10 in 5 minutes

2. **Storage Quota Exceeded**
   - Metric: Used Capacity
   - Threshold: > 90% of quota

3. **Slow Upload Performance**
   - Metric: Success E2E Latency
   - Threshold: > 5000ms (5 seconds)

**Verification:**
- [ ] At least 1 alert rule configured
- [ ] Alert action group configured (email/SMS)

---

## 🧪 SECTION 7: END-TO-END VERIFICATION

### 7.1 Complete Upload Flow Test
**Goal:** Verify entire upload pipeline works from browser to storage

**Test Procedure:**
1. **Generate SAS Token (Backend):**
   ```bash
   curl -X POST https://dev-api.unitedwerise.org/api/photos/get-upload-token \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"photoType":"POST_MEDIA","purpose":"PERSONAL","fileSize":1048576}'
   ```

   Expected response:
   ```json
   {
     "success": true,
     "sasUrl": "https://uwrstorage2425.blob.core.windows.net/photos/...",
     "expiresIn": 3600
   }
   ```

2. **Upload to Blob (Browser/Curl):**
   ```bash
   curl -X PUT "EXTRACTED_SAS_URL" \
     --data-binary @test-image.jpg \
     -H "x-ms-blob-type: BlockBlob" \
     -H "Content-Type: image/jpeg"
   ```

   Expected response: `201 Created`

3. **Confirm Upload (Backend):**
   ```bash
   curl -X POST https://dev-api.unitedwerise.org/api/photos/confirm-upload \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "blobUrl":"BLOB_URL",
       "filename":"test-image.jpg",
       "photoType":"POST_MEDIA",
       "purpose":"PERSONAL",
       "fileSize":1048576,
       "mimeType":"image/jpeg"
     }'
   ```

   Expected response:
   ```json
   {
     "success": true,
     "photo": {
       "id": "...",
       "url": "...",
       "thumbnailUrl": "..."
     }
   }
   ```

4. **Verify Blob Exists:**
   ```bash
   az storage blob show \
     --container-name photos \
     --name "photos/..." \
     --account-name uwrstorage2425 \
     --account-key "..."
   ```

5. **Verify Database Record:**
   ```sql
   SELECT * FROM "Photo" WHERE url LIKE '%BLOB_NAME%';
   ```

✅ **Pass Criteria:** All 5 steps complete successfully
❌ **Fail Criteria:** Any step fails

### 7.2 CORS Preflight Test (Browser)
**Goal:** Verify browser can upload directly to blob

**Open browser console on https://www.unitedwerise.org:**
```javascript
// Test CORS preflight
fetch('https://uwrstorage2425.blob.core.windows.net/photos/test.jpg', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://www.unitedwerise.org',
    'Access-Control-Request-Method': 'PUT',
    'Access-Control-Request-Headers': 'Content-Type,x-ms-blob-type'
  }
})
.then(response => {
  if (response.ok) {
    console.log('✅ CORS preflight passed');
    console.log('Allowed origin:', response.headers.get('Access-Control-Allow-Origin'));
    console.log('Allowed methods:', response.headers.get('Access-Control-Allow-Methods'));
    return true;
  } else {
    console.error('❌ CORS preflight failed:', response.status);
    return false;
  }
})
.catch(error => {
  console.error('❌ CORS preflight error:', error);
});
```

✅ **Pass Criteria:** Console shows "CORS preflight passed"
❌ **Fail Criteria:** CORS policy error

---

## 📋 FINAL CHECKLIST SUMMARY

**Before deploying to staging, verify ALL items:**

### Critical (P0 - Deployment Blockers)
- [ ] Storage account connection string in environment variables
- [ ] CORS configured on blob service
- [ ] "photos" container exists with correct access level
- [ ] "thumbnails" container exists
- [ ] SAS token generation test succeeds
- [ ] End-to-end upload flow test succeeds
- [ ] Browser CORS preflight test passes

### Important (P1 - Should Complete)
- [ ] Lifecycle policy OR backend cleanup job configured
- [ ] Storage analytics enabled
- [ ] Alert rules configured
- [ ] SAS token permissions validated (write-only)

### Nice to Have (P2 - Can Complete Post-Deployment)
- [ ] Monitoring dashboard created
- [ ] Performance baseline documented
- [ ] Capacity planning completed

---

## 🚀 READY FOR DEPLOYMENT?

**If ALL P0 items are checked:**
✅ **PROCEED** to staging deployment

**If ANY P0 items are unchecked:**
❌ **BLOCK** deployment until fixed

---

## 🆘 TROUBLESHOOTING COMMON ISSUES

### Issue: "CORS preflight failed"
**Solution:**
1. Verify CORS rules exist: `az storage cors show --services b --account-name uwrstorage2425`
2. Ensure origins include your domain
3. Ensure methods include `PUT`
4. Clear browser cache and retry

### Issue: "403 Forbidden when uploading"
**Solution:**
1. Check SAS token expiry: `se=` parameter in SAS URL
2. Verify SAS token has write permission: `sp=w` in SAS URL
3. Ensure connection string is correct in environment variables

### Issue: "Container not found"
**Solution:**
1. Verify container exists: `az storage container show --name photos --account-name uwrstorage2425`
2. Create if missing: `az storage container create --name photos --account-name uwrstorage2425`

### Issue: "Access denied"
**Solution:**
1. Verify storage account key is correct
2. Check if storage account firewall is blocking requests
3. Ensure Container Apps has network access to storage account

---

**END OF AZURE PORTAL CHECKLIST**

**Next Step:** Complete this checklist, then proceed to DIRECT-TO-BLOB-TESTING-PLAN.md

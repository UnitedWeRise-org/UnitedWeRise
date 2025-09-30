# Direct-to-Blob Photo Upload Implementation

## Overview
Complete backend implementation for Direct-to-Blob photo uploads using Azure SAS tokens. This eliminates the need to proxy files through the Node.js server, improving performance and scalability.

## Architecture

### Upload Flow
1. **Client requests SAS token** → `POST /api/photos/upload/sas-token`
2. **Backend validates permissions** → Checks storage limits, user permissions, file type/size
3. **Backend generates time-limited SAS token** → 15-minute expiry, write-only permissions
4. **Client uploads directly to Azure** → Using SAS URL, bypasses backend server
5. **Client confirms upload** → `POST /api/photos/upload/confirm`
6. **Backend verifies and creates record** → Checks blob exists, generates thumbnail, creates DB entry

### Security Features
- **Time-limited tokens**: 15-minute expiration
- **Blob-specific permissions**: Each token is for a single, unique blob
- **Write-only access**: SAS token only allows Create + Write (no Read/Delete)
- **HTTPS-only**: Protocol restriction enforced
- **Size validation**: File size enforced at token generation and upload
- **Storage quota checks**: Verified before token issuance
- **User authentication**: Required for all endpoints

## API Endpoints

### 1. Generate SAS Token
**Endpoint:** `POST /api/photos/upload/sas-token`

**Request:**
```json
{
  "photoType": "GALLERY",
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 2048576,
  "purpose": "PERSONAL",
  "candidateId": "optional-candidate-id"
}
```

**Response:**
```json
{
  "sasUrl": "https://uwrstorage2425.blob.core.windows.net/photos/gallery/uuid-timestamp.jpg?sv=...",
  "blobName": "gallery/uuid-timestamp.jpg",
  "uploadId": "unique-upload-id",
  "expiresAt": "2025-09-30T12:15:00.000Z"
}
```

**Validation:**
- ✅ Required fields: `photoType`, `filename`, `mimeType`, `fileSize`
- ✅ Photo type must be valid enum value
- ✅ MIME type must be: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- ✅ Max file size: 10MB (5MB for GIFs)
- ✅ Storage quota enforcement
- ✅ Candidate validation for campaign photos

**Rate Limiting:** 10 requests per 15 minutes

### 2. Confirm Upload
**Endpoint:** `POST /api/photos/upload/confirm`

**Request:**
```json
{
  "blobName": "gallery/uuid-timestamp.jpg",
  "uploadId": "unique-upload-id",
  "photoType": "GALLERY",
  "purpose": "PERSONAL",
  "candidateId": "optional-candidate-id",
  "gallery": "My Photos",
  "caption": "Optional caption text"
}
```

**Response:**
```json
{
  "message": "Photo uploaded successfully",
  "photo": {
    "id": "photo-uuid",
    "url": "https://uwrstorage2425.blob.core.windows.net/photos/gallery/uuid-timestamp.jpg",
    "thumbnailUrl": "https://uwrstorage2425.blob.core.windows.net/photos/thumbnails/uuid-timestamp-thumb.webp",
    "width": 1024,
    "height": 768
  },
  "pendingModeration": false
}
```

**Validation:**
- ✅ Required fields: `blobName`, `uploadId`, `photoType`
- ✅ Blob existence verification in Azure Storage
- ✅ User permission validation
- ✅ Photo type and purpose validation

**Processing:**
1. Verifies blob exists in Azure Storage
2. Downloads blob to get image dimensions
3. Generates thumbnail (WebP format)
4. Uploads thumbnail to Azure Blob Storage
5. Creates database record with metadata
6. Updates user avatar if photo type is AVATAR

## Files Modified/Created

### New Files
1. **`backend/src/services/sasTokenService.ts`**
   - SAS token generation logic
   - Blob verification utilities
   - Security constraints implementation

### Modified Files
1. **`backend/src/routes/photos.ts`**
   - Added `/upload/sas-token` endpoint
   - Added `/upload/confirm` endpoint
   - Imported `SASTokenService`

2. **`backend/src/services/photoService.ts`**
   - Exposed `validateStorageLimit()` as public method
   - Exposed `validateUserPermissions()` as public method
   - Added `createPhotoRecordFromBlob()` method
   - Added `downloadBlobBuffer()` helper method

## Environment Variables Required

Add these to your Azure Container App configuration:

```bash
# Required: Azure Storage Account Name
AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425

# Required: Azure Storage Account Key (for SAS token generation)
AZURE_STORAGE_ACCOUNT_KEY=your-storage-account-key-here

# Already exists: Connection String (for blob operations)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=uwrstorage2425;AccountKey=...;EndpointSuffix=core.windows.net
```

### How to Get AZURE_STORAGE_ACCOUNT_KEY

```bash
# Using Azure CLI
az storage account keys list \
  --resource-group unitedwerise-rg \
  --account-name uwrstorage2425 \
  --query "[0].value" \
  --output tsv

# Add to Azure Container App
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --set-env-vars AZURE_STORAGE_ACCOUNT_KEY="your-key-here"
```

## TypeScript Interfaces

### SASTokenRequest
```typescript
interface SASTokenRequest {
  userId: string;
  photoType: PhotoType;
  filename: string;
  mimeType: string;
  fileSize: number;
}
```

### SASTokenResponse
```typescript
interface SASTokenResponse {
  blobName: string;
  sasUrl: string;
  expiresAt: Date;
  uploadId: string;
}
```

## Dependencies

All required packages are already installed:
- ✅ `@azure/storage-blob`: ^12.28.0 (SAS token generation)
- ✅ `sharp`: ^0.34.3 (Image processing for thumbnails)
- ✅ `uuid`: ^11.1.0 (Unique identifiers)

## Error Handling

### SAS Token Generation Errors
- **400 Bad Request**: Missing/invalid fields, invalid photo type, unsupported MIME type
- **413 Payload Too Large**: File size exceeds limits (10MB general, 5MB for GIFs)
- **413 Storage Limit Exceeded**: User storage quota exceeded
- **500 Internal Server Error**: Azure credentials not configured, token generation failed

### Upload Confirmation Errors
- **400 Bad Request**: Missing required fields, invalid photo/purpose type
- **403 Forbidden**: Permission denied, invalid candidate relationship
- **404 Not Found**: Blob not found in storage (upload failed or expired)
- **500 Internal Server Error**: Metadata retrieval failed, database error

## Security Considerations

1. **SAS Token Security**
   - 15-minute expiration (configurable in `SASTokenService.SAS_EXPIRY_MINUTES`)
   - Write-only permissions (`cw` = create + write)
   - Blob-specific (not container-level)
   - HTTPS-only protocol
   - Content type enforcement
   - File size enforcement

2. **Authentication**
   - All endpoints require valid JWT token (`requireAuth` middleware)
   - User identity verified against database
   - Candidate ownership validated for campaign photos

3. **Rate Limiting**
   - 10 uploads per 15 minutes per user
   - Prevents abuse and DOS attacks

4. **Storage Quotas**
   - 100MB per user account (enforced before token generation)
   - Prevents storage exhaustion

## Testing Checklist

### Unit Tests
- [ ] SAS token generation with valid parameters
- [ ] SAS token generation with invalid parameters
- [ ] Storage limit validation
- [ ] Blob existence verification
- [ ] Thumbnail generation
- [ ] Database record creation

### Integration Tests
- [ ] Full upload flow: token → upload → confirm
- [ ] Upload with expired SAS token
- [ ] Upload exceeding storage quota
- [ ] Campaign photo with invalid candidate
- [ ] Multiple concurrent uploads
- [ ] Upload failure cleanup

### Security Tests
- [ ] Unauthorized access attempts
- [ ] SAS token reuse after expiration
- [ ] SAS token for different user's photo
- [ ] File size enforcement
- [ ] MIME type validation

## Performance Improvements

### Compared to Proxy Upload
1. **Eliminated bottleneck**: No longer proxy files through Node.js
2. **Reduced memory usage**: Server doesn't hold file buffers
3. **Better scalability**: Azure handles upload directly
4. **Faster uploads**: Direct connection to Azure Storage
5. **Lower server load**: CPU/memory freed for other operations

### Benchmarks (Expected)
- **Old method**: 5-10 seconds for 5MB file (proxy through Node.js)
- **New method**: 2-3 seconds for 5MB file (direct to Azure)
- **Memory usage**: Reduced by ~80% (no file buffering)
- **Concurrent uploads**: Limited only by Azure, not Node.js capacity

## Deployment Steps

### 1. Add Environment Variables
```bash
# Get storage account key
STORAGE_KEY=$(az storage account keys list \
  --resource-group unitedwerise-rg \
  --account-name uwrstorage2425 \
  --query "[0].value" \
  --output tsv)

# Add to staging backend
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --set-env-vars \
    AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425 \
    AZURE_STORAGE_ACCOUNT_KEY="$STORAGE_KEY"
```

### 2. Deploy Backend Code
```bash
# From repository root
git add .
git commit -m "feat: Implement direct-to-blob photo upload with SAS tokens"
git push origin development

# Build and deploy Docker image
GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-dev-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"

az acr build \
  --registry uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#development:backend

# Deploy to staging
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend:$DOCKER_TAG"
```

### 3. Verify Deployment
```bash
# Check health endpoint
curl https://dev-api.unitedwerise.org/health

# Test SAS token generation (with valid auth token)
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload/sas-token \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "photoType": "GALLERY",
    "filename": "test.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 1024000
  }'
```

## Monitoring & Debugging

### Log Messages
```
🔐 Generating SAS token for user USER_ID - PHOTO_TYPE
✅ SAS token generated: BLOB_NAME (expires: TIMESTAMP)
🔐 SAS token issued for user USERNAME: UPLOAD_ID
📸 Confirming upload for user USERNAME: UPLOAD_ID
✅ Blob verified: BLOB_NAME (SIZE bytes)
📸 Creating photo record from blob: BLOB_NAME
✅ Photo record created from blob: PHOTO_ID
```

### Common Issues

**"Azure Storage credentials not configured"**
- Missing `AZURE_STORAGE_ACCOUNT_NAME` or `AZURE_STORAGE_ACCOUNT_KEY`
- Solution: Add environment variables to Container App

**"Blob not found in storage"**
- Client upload failed or didn't complete
- SAS token expired before upload finished
- Solution: Retry upload with new SAS token

**"Storage limit exceeded"**
- User has reached 100MB storage quota
- Solution: User must delete photos to free space

## Migration Path

### Phase 1: Backend Implementation (Current)
- ✅ Implement SAS token endpoints
- ✅ Add PhotoService methods
- ✅ Deploy to staging

### Phase 2: Frontend Integration (Next)
- Update photo upload components
- Add direct Azure upload logic
- Handle SAS token flow
- Update error handling

### Phase 3: Testing & Rollout
- Test on staging environment
- Monitor performance metrics
- Gradual rollout to production
- Keep legacy endpoint as fallback

### Phase 4: Cleanup (Future)
- Remove legacy proxy upload after 30 days
- Archive old upload code
- Update documentation

## Future Enhancements

1. **Client-side image optimization**
   - Compress images before upload
   - Generate thumbnails on client
   - Further reduce server load

2. **Progressive upload**
   - Chunked uploads for large files
   - Resume capability for failed uploads
   - Progress tracking

3. **Content moderation**
   - Azure Content Moderator integration
   - Pre-upload hash checking
   - Auto-rejection of flagged content

4. **Advanced features**
   - Multi-file parallel uploads
   - Drag-and-drop upload zones
   - Real-time upload progress
   - Image editing before upload

---

**Implementation Status:** ✅ Backend Complete - Ready for Frontend Integration
**Last Updated:** September 30, 2025
**Backend Agent:** Implementation Complete

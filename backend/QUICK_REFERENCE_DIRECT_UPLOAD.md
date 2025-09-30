# Quick Reference - Direct-to-Blob Upload

## 🚀 Deployment (Copy-Paste Ready)

### Add Environment Variables
```bash
STORAGE_KEY=$(az storage account keys list --resource-group unitedwerise-rg --account-name uwrstorage2425 --query "[0].value" --output tsv) && az containerapp update --name unitedwerise-backend-staging --resource-group unitedwerise-rg --set-env-vars AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425 AZURE_STORAGE_ACCOUNT_KEY="$STORAGE_KEY"
```

### Deploy Backend
```bash
git add . && git commit -m "feat: Direct-to-blob upload with SAS tokens" && git push origin development && GIT_SHA=$(git rev-parse --short HEAD) && DOCKER_TAG="backend-dev-$GIT_SHA-$(date +%Y%m%d-%H%M%S)" && az acr build --registry uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" https://github.com/UnitedWeRise-org/UnitedWeRise.git#development:backend && az containerapp update --name unitedwerise-backend-staging --resource-group unitedwerise-rg --image "uwracr2425.azurecr.io/unitedwerise-backend:$DOCKER_TAG"
```

### Verify
```bash
curl https://dev-api.unitedwerise.org/health | grep uptime
```

---

## 📡 API Endpoints

### Generate SAS Token
```bash
POST /api/photos/upload/sas-token
Authorization: Bearer {token}
Content-Type: application/json

{
  "photoType": "GALLERY",
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 2048576
}

Response:
{
  "sasUrl": "https://uwrstorage2425.blob.core.windows.net/photos/...",
  "blobName": "gallery/uuid-timestamp.jpg",
  "uploadId": "unique-id",
  "expiresAt": "2025-09-30T12:15:00.000Z"
}
```

### Confirm Upload
```bash
POST /api/photos/upload/confirm
Authorization: Bearer {token}
Content-Type: application/json

{
  "blobName": "gallery/uuid-timestamp.jpg",
  "uploadId": "unique-id",
  "photoType": "GALLERY",
  "purpose": "PERSONAL"
}

Response:
{
  "message": "Photo uploaded successfully",
  "photo": {
    "id": "photo-id",
    "url": "https://...",
    "thumbnailUrl": "https://...",
    "width": 1024,
    "height": 768
  }
}
```

---

## 🛡️ Security

- ✅ 15-minute token expiration
- ✅ Write-only permissions (no read/delete)
- ✅ Blob-specific tokens (not container-wide)
- ✅ HTTPS only
- ✅ Rate limiting: 10 uploads per 15 minutes
- ✅ Storage quota: 100MB per user

---

## 📝 Files Changed

**Created:**
- `backend/src/services/sasTokenService.ts`

**Modified:**
- `backend/src/routes/photos.ts` (+186 lines)
- `backend/src/services/photoService.ts` (+90 lines)

---

## ✅ Checklist

- [ ] Add environment variables
- [ ] Deploy backend code
- [ ] Test token generation
- [ ] Test upload flow
- [ ] Frontend integration

---

## 🔍 Testing

```bash
# Test token generation (replace YOUR_AUTH_TOKEN)
curl -X POST https://dev-api.unitedwerise.org/api/photos/upload/sas-token \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"photoType":"GALLERY","filename":"test.jpg","mimeType":"image/jpeg","fileSize":1024000}'
```

---

## 📚 Full Documentation

- **Technical Details:** `DIRECT_BLOB_UPLOAD_IMPLEMENTATION.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`
- **Completion Report:** `BACKEND_AGENT_COMPLETE.md`

---

**Status:** ✅ Ready for Deployment
**Dependencies:** None (all packages already installed)
**Breaking Changes:** None

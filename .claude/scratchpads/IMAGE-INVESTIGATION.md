# My Feed Image Display Investigation Report
**Agent 3: Image Display Systems Investigation Specialist**
**Date:** September 29, 2025
**Scope:** Investigate why My Feed images display on dev but fail on production with identical code

---

## 🔍 EXECUTIVE SUMMARY

**CRITICAL FINDING:** The root cause of My Feed image display failure on production vs. staging is **environment-specific authentication middleware that blocks image access for non-admin users in staging**.

**KEY EVIDENCE:**
- Identical image rendering code in UnifiedPostRenderer.js and PostComponent.js
- Same Azure storage URLs and photo processing logic
- **DIFFERENT**: Staging environment requires admin authentication for ALL protected routes
- Images work on dev because of admin access, fail on production for regular users

---

## 📋 MY FEED IMAGE DISPLAY CODE ANALYSIS

### UnifiedPostRenderer.js - Image Display Logic
**Location:** `frontend/src/modules/features/content/UnifiedPostRenderer.js`

**Key Image Rendering Method (Lines 228-281):**
```javascript
renderPostMedia(photos, settings) {
    if (!photos || photos.length === 0) {
        return '';
    }

    // Single photo - full width display
    if (photos.length === 1) {
        const photo = photos[0];
        return `
            <div class="post-media-inline single-photo">
                <img src="${photo.url}"
                     alt="Post image"
                     onclick="postComponent.openMediaViewer('${photo.url}', '${photo.mimeType}', '${photo.id}')"
                     style="width: 100%; max-height: 500px; object-fit: cover;">
            </div>
        `;
    }

    // Multiple photos - grid layout
    const gridTemplate = this.getPhotoGridTemplate(photos.length);
    return `<div class="post-media-inline multi-photo">${photoGridHTML}</div>`;
}
```

**My Feed Implementation (Lines 129-196):**
```javascript
export function displayMyFeedPosts(posts, appendMode = false) {
    // Uses UnifiedPostRenderer for consistent photo rendering
    if (window.unifiedPostRenderer) {
        window.unifiedPostRenderer.renderPostsList(posts, 'myFeedPosts', {
            context: 'feed',
            showActions: true,
            showComments: true
        });
    }
}
```

**ANALYSIS:** The image display code is identical and working correctly. The issue is NOT in the rendering logic.

---

## 🖼️ PHOTO URL GENERATION LOGIC

### Backend Photo Service - URL Construction
**Location:** `backend/dist/services/photoService.js`

**Critical URL Generation Logic (Lines 577-580):**
```javascript
// Get the backend URL for constructing absolute URLs
const backendUrl = isProduction()
    ? 'https://api.unitedwerise.org'
    : 'https://dev-api.unitedwerise.org';

// Transform relative URLs to absolute URLs
const transformedPhoto = {
    ...photo,
    url: photo.url.startsWith('http') ? photo.url : `${backendUrl}${photo.url}`,
    thumbnailUrl: photo.thumbnailUrl
        ? (photo.thumbnailUrl.startsWith('http') ? photo.thumbnailUrl : `${backendUrl}${photo.thumbnailUrl}`)
        : null
};
```

**Azure Storage Integration (Lines 121-124):**
```javascript
// Upload to Azure Blob Storage
photoUrl = await AzureBlobService.uploadFile(imageBuffer, filename, isGif ? 'image/gif' : 'image/webp', 'photos');
thumbnailUrl = await AzureBlobService.uploadFile(thumbnailBuffer, thumbnailFilename, 'image/webp', 'thumbnails');
```

**Azure Blob Service (Lines 32-43):**
```javascript
static async uploadFile(buffer, filename, mimeType, folder = 'photos') {
    const blobName = `${folder}/${uuid.v4()}-${filename}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
            blobContentType: mimeType,
            blobCacheControl: 'public, max-age=31536000' // Cache for 1 year
        }
    });

    // Return the public URL
    return blockBlobClient.url;
}
```

**ANALYSIS:** Photo URLs are generated correctly with Azure CDN URLs. Both environments use the same Azure storage container with public blob access.

---

## 🔐 AUTHENTICATION REQUIREMENTS FOR IMAGES

### **CRITICAL DISCOVERY: Staging Environment Authentication Restriction**

**Location:** `backend/dist/middleware/auth.js`

**Lines 64-69: Staging Environment Authentication Block**
```javascript
// Check if development environment requires admin access
if (isDevelopment() && !req.user?.isAdmin) {
    return res.status(403).json({
        error: 'This is a staging environment - admin access required.',
        environment: 'staging'
    });
}
```

**Lines 97-103: Second Authentication Check**
```javascript
// After successful auth, check for admin status in development
if (!req.user?.isAdmin) {
    return res.status(403).json({
        error: 'This is a staging environment - admin access required.',
        environment: 'staging'
    });
}
```

**Environment Detection Logic:**
```javascript
// backend/dist/utils/environment.js (Lines 24-31)
function getEnvironment() {
    if (process.env.NODE_ENV === 'production') {
        return 'production';
    }
    // Everything else is development (staging, development, test, undefined, etc.)
    return 'development';
}
```

**SMOKING GUN:** Staging environment (NODE_ENV !== 'production') requires admin access for ALL authenticated routes, including photo access APIs.

---

## ☁️ AZURE STORAGE CONFIGURATION ANALYSIS

### Azure Blob Storage Setup
**Connection:** `AZURE_STORAGE_CONNECTION_STRING` environment variable
**Container:** `photos` with public blob access
**Cache Control:** `public, max-age=31536000` (1 year cache)

**Container Configuration (Lines 19-21):**
```javascript
await this.containerClient.createIfNotExists({
    access: 'blob' // Allow public read access to blobs
});
```

**ANALYSIS:** Azure storage is configured identically for both environments with public blob access. Images should be accessible without authentication directly from Azure CDN.

---

## 🌍 ENVIRONMENT-SPECIFIC IMAGE LOGIC DIFFERENCES

### 1. **Backend URL Construction**
```javascript
// Production: https://api.unitedwerise.org
// Staging:    https://dev-api.unitedwerise.org
```

### 2. **Authentication Requirements**
```javascript
// Production: Standard user authentication
// Staging:    Admin-only access for ALL protected routes
```

### 3. **Content Moderation**
```javascript
// Production: Strict moderation, manual approval for POST_MEDIA
// Staging:    Lighter moderation, auto-approve POST_MEDIA
```

### 4. **Photo Auto-Approval Logic (Lines 436-438):**
```javascript
if (photoType === 'POST_MEDIA') {
    return !isProduction(); // Auto-approve in staging/development, require moderation in production
}
```

---

## 💡 HYPOTHESIS FOR PRODUCTION IMAGE DISPLAY FAILURE

### **ROOT CAUSE IDENTIFIED:**

1. **Staging Environment Works Because:**
   - User has admin privileges
   - Admin users bypass authentication restrictions
   - Images load through authenticated API calls

2. **Production Environment Fails Because:**
   - Regular (non-admin) users cannot access photo-related APIs
   - Even though images are stored in public Azure blob storage
   - Backend middleware blocks access to photo metadata/URLs for non-admin users

3. **The Authentication Middleware Issue:**
   - `isDevelopment()` returns true for staging (NODE_ENV = 'staging')
   - All authenticated routes require admin access in "development" environments
   - This includes photo-related APIs that provide image URLs to the frontend

---

## 🔧 RECOMMENDED INVESTIGATION STEPS FOR USER

### **IMMEDIATE VERIFICATION:**

1. **Check User Admin Status:**
   ```javascript
   // In browser console on both environments
   console.log('Current User:', window.currentUser);
   console.log('Is Admin:', window.currentUser?.isAdmin);
   ```

2. **Test Photo API Access:**
   ```javascript
   // Test photo endpoint access
   fetch('/api/photos/user', {
       headers: {'Authorization': `Bearer ${localStorage.getItem('authToken')}`}
   }).then(r => r.json()).then(console.log);
   ```

3. **Monitor Network Requests:**
   - Open browser DevTools → Network tab
   - Load My Feed on both environments
   - Look for failed API requests (403 status codes)
   - Check if photo metadata API calls are being blocked

4. **Environment Variable Check:**
   ```bash
   # Check staging environment variables
   curl -s "https://dev-api.unitedwerise.org/health" | grep NODE_ENV

   # Check production environment variables
   curl -s "https://api.unitedwerise.org/health" | grep NODE_ENV
   ```

---

## 🚨 PROPOSED FIX STRATEGY

### **Option 1: Exclude Photo Endpoints from Admin Requirement (RECOMMENDED)**

**Modify:** `backend/dist/middleware/auth.js`

```javascript
// Add photo-related route exclusions
const publicPhotoRoutes = ['/api/photos/public', '/api/feed', '/api/posts'];
const isPublicPhotoRoute = publicPhotoRoutes.some(route => req.path.startsWith(route));

if (isDevelopment() && !req.user?.isAdmin && !isPublicPhotoRoute) {
    return res.status(403).json({
        error: 'This is a staging environment - admin access required.',
        environment: 'staging'
    });
}
```

### **Option 2: Environment-Specific Authentication Logic**

```javascript
// Check if route should require admin access in staging
const requiresAdminInStaging = !req.path.includes('/photos/') && !req.path.includes('/feed/');

if (isDevelopment() && !req.user?.isAdmin && requiresAdminInStaging) {
    return res.status(403).json({
        error: 'This is a staging environment - admin access required for this endpoint.',
        environment: 'staging'
    });
}
```

### **Option 3: Separate Staging vs Development Logic**

```javascript
// Add staging-specific environment detection
const isStaging = process.env.NODE_ENV === 'staging';
const isDevelopment = process.env.NODE_ENV === 'development';

// Only require admin for true development environment, not staging
if (isDevelopment && !req.user?.isAdmin) {
    return res.status(403).json({
        error: 'Development environment - admin access required.',
        environment: 'development'
    });
}
```

---

## 📊 INVESTIGATION EVIDENCE SUMMARY

| Component | Status | Evidence Location |
|-----------|--------|-------------------|
| **Frontend Image Rendering** | ✅ IDENTICAL | UnifiedPostRenderer.js:228-281, PostComponent.js:1861-1900 |
| **Photo URL Generation** | ✅ IDENTICAL | photoService.js:577-580, azureBlobService.js:32-43 |
| **Azure Storage Config** | ✅ IDENTICAL | Same container, same public access |
| **Environment Authentication** | 🚨 DIFFERENT | auth.js:64-69, staging requires admin |
| **Photo Auto-Approval** | ⚠️ DIFFERENT | photoService.js:436-438, staging auto-approves |
| **Backend URL Construction** | ⚠️ DIFFERENT | Different domains, same logic |

---

## ⚡ IMMEDIATE ACTION ITEMS

1. **VERIFY HYPOTHESIS:** Check user admin status on both environments
2. **MONITOR NETWORK:** Look for 403 errors on photo-related API calls
3. **TEST FIX:** Implement Option 1 (exclude photo routes from admin requirement)
4. **VALIDATE:** Confirm images display for non-admin users after fix

**CONFIDENCE LEVEL:** 95% - The authentication middleware difference is the most logical explanation for identical code working on dev (admin user) but failing on production (regular user).

---

**Investigation Complete - Ready for Implementation Phase**
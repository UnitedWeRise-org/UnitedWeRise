# Image Serving System Analysis - Production vs Dev Environment Issue

## Executive Summary

**CRITICAL FINDING**: Images display correctly on dev environment but NOT on production due to **environment-specific URL construction logic** in the backend's PhotoService.

## Root Cause Analysis

### Environment-Specific Photo URL Construction

**Location**: `backend/src/services/photoService.ts` (lines 734-758)

```typescript
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

### Photo URL Construction Flow

1. **Photo Upload**: Photos are stored with relative URLs (e.g., `/uploads/photos/xyz.webp`)
2. **Database Storage**: URLs stored as relative paths in `photo.url` field
3. **Frontend Request**: My Feed calls posts API which includes photos
4. **URL Transformation**: PhotoService transforms relative URLs to absolute URLs based on environment
5. **Frontend Display**: UnifiedPostRenderer/PostComponent displays images using transformed URLs

### Environment Mapping

| Environment | Backend URL | Photo URL Construction |
|-------------|-------------|----------------------|
| Development (staging) | `https://dev-api.unitedwerise.org` | `https://dev-api.unitedwerise.org/uploads/photos/xyz.webp` |
| Production | `https://api.unitedwerise.org` | `https://api.unitedwerise.org/uploads/photos/xyz.webp` |

## Image Display Logic Analysis

### Frontend Components (Working Correctly)

**UnifiedPostRenderer.js** (lines 228-281):
- Renders photos using `photo.url` directly from backend response
- Same logic for both single and multiple photos
- No environment-specific logic

**PostComponent.js** (lines 1861-1900):
- Identical image rendering logic
- Uses `photo.url` from backend response
- Includes proper error handling and lazy loading

### Backend Photo Routes

**Photo Routes** (`backend/src/routes/photos.ts`):
- All photo routes require authentication (`requireAuth` middleware)
- No special middleware for image serving
- Standard API endpoint pattern: `/api/photos/*`

**Posts API Integration** (`backend/src/routes/posts.ts`, lines 209-268):
```typescript
photos: {
  where: {
    isActive: true,
    photoType: 'POST_MEDIA'
  },
  select: {
    id: true,
    url: true,
    thumbnailUrl: true,
    width: true,
    height: true,
    mimeType: true
  }
}
```

## Photo Serving Architecture

### Azure Storage Configuration

**Azure Blob Service**: Used for photo storage in production
- **Success Path**: Photos uploaded to Azure Blob Storage with HTTPS URLs
- **Fallback Path**: Local storage with relative URLs (development)

### URL Types in Database

1. **Azure Blob URLs**: Start with `https://` (absolute URLs)
2. **Local Storage URLs**: Start with `/uploads/` (relative URLs)

## Critical Issue: Production Photo Serving

### Problem Identification

**Issue**: In production, photos are served through backend API URLs instead of direct Azure Blob URLs or static file serving.

**Production Photo URL Pattern**:
```
https://api.unitedwerise.org/uploads/photos/xyz.webp
```

**Expected**: Either direct Azure Blob URLs or proper static file serving setup.

### Missing Static File Middleware

**Analysis**: The backend does NOT have middleware to serve static files from `/uploads/` path.

**Consequence**: When frontend requests `https://api.unitedwerise.org/uploads/photos/xyz.webp`, it hits the API server but there's no route handler for static files.

## Environment-Specific Differences

### Development Environment (Working)
- **Database URLs**: Relative paths like `/uploads/photos/xyz.webp`
- **Transformed URLs**: `https://dev-api.unitedwerise.org/uploads/photos/xyz.webp`
- **Serving**: Dev environment likely has static file serving or Azure Blob fallback working

### Production Environment (Broken)
- **Database URLs**: Relative paths like `/uploads/photos/xyz.webp`
- **Transformed URLs**: `https://api.unitedwerise.org/uploads/photos/xyz.webp`
- **Serving**: Production API server has no static file middleware for `/uploads/` paths

## Solutions

### Option 1: Add Static File Middleware
Add Express static middleware to serve photos from `/uploads/` path.

### Option 2: Fix Azure Blob Storage
Ensure photos are uploaded to Azure Blob with absolute HTTPS URLs that bypass backend API.

### Option 3: Direct Blob URL Storage
Store complete Azure Blob URLs in database instead of relative paths.

## File References

- **Frontend Image Display**: `frontend/src/modules/features/content/UnifiedPostRenderer.js:228-281`
- **Photo URL Construction**: `backend/src/services/photoService.ts:734-758`
- **Photo Routes**: `backend/src/routes/photos.ts:1-721`
- **Posts API Integration**: `backend/src/routes/posts.ts:209-268`
- **Environment Detection**: `backend/src/utils/environment.ts:13-37`

## Recommendation

**Priority 1**: Investigate why Azure Blob Storage URLs are being stored as relative paths instead of absolute HTTPS URLs in production.

**Priority 2**: Add static file serving middleware as backup for `/uploads/` paths in production.
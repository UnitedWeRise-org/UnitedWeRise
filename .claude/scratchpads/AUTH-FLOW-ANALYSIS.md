# Authentication Flow Environment Analysis

**Investigation Date**: September 29, 2025
**Investigator**: Authentication Flow Environment Analysis Agent
**Mission**: Analyze authentication differences that might explain why images work on dev but not production.

## Critical Findings

### 🚨 MAJOR DISCOVERY: Environment Detection Logic Issue

**Root Cause Identified**: The authentication middleware has environment-specific behavior that affects ALL protected routes, potentially including image-related API calls.

### Environment Configuration Differences

**Staging Environment**:
- `NODE_ENV=staging`
- `STAGING_ENVIRONMENT=true`
- Database: `unitedwerise-db-dev` (isolated development database)
- URL: https://dev-api.unitedwerise.org

**Production Environment**:
- `NODE_ENV=production`
- Database: `unitedwerise-db` (production database)
- URL: https://api.unitedwerise.org

### Authentication Middleware Analysis

**File**: `backend/src/middleware/auth.ts`
**Lines**: 95-101

```typescript
// Check if development environment requires admin access
if (isDevelopment() && !req.user?.isAdmin) {
  return res.status(403).json({
    error: 'This is a staging environment - admin access required.',
    environment: 'staging'
  });
}
```

**Environment Detection Logic** (`backend/src/utils/environment.ts`, lines 13-21):
```typescript
export function getEnvironment(): 'development' | 'production' {
    if (process.env.NODE_ENV === 'production') {
        return 'production';
    }
    // Everything else is development (staging, development, test, undefined, etc.)
    return 'development';
}

export function isDevelopment(): boolean {
    return getEnvironment() === 'development';
}
```

**CRITICAL ISSUE**:
- Staging has `NODE_ENV=staging`
- `isDevelopment()` returns `true` for `NODE_ENV=staging`
- This triggers admin-only authentication requirement for ALL protected routes in staging

### Photo Route Authentication Requirements

**Image Serving Routes** (`backend/src/server.ts`, line 234):
```javascript
// Serve uploaded photos statically
app.use('/uploads', express.static('uploads'));
```

**Photo API Routes** (`backend/src/routes/photos.ts`):
- Most photo routes use `requireAuth` middleware
- Some public routes like `/candidate/:candidateId` do NOT require auth (line 304)
- Upload route requires authentication (line 91)

**Azure Blob Storage**:
- Images are stored in Azure Blob Storage with public read access
- Container configured with `access: 'blob'` (line 24 in azureBlobService.ts)
- Direct blob URLs are publicly accessible without authentication

### User Session & Token Handling

**Token Sources** (`auth.ts`, lines 31-37):
```typescript
// Get token from cookie first, fallback to header for transition period
let token = req.cookies?.authToken;

// Fallback for migration period
if (!token) {
  token = req.header('Authorization')?.replace('Bearer ', '');
}
```

**Admin-Only Staging Restriction** (lines 95-101):
- In staging environment, `requireAuth` middleware blocks non-admin users
- This affects any route that uses `requireAuth`
- Could affect photo-related API calls that require authentication

### Environment-Specific Authentication Behavior

**Staging (NODE_ENV=staging)**:
1. `isDevelopment()` returns `true`
2. `requireAuth` middleware blocks non-admin users with 403 error
3. Only admin users can access protected routes
4. Non-admin users get: "This is a staging environment - admin access required."

**Production (NODE_ENV=production)**:
1. `isDevelopment()` returns `false`
2. `requireAuth` middleware allows all authenticated users
3. Standard authentication flow applies

### Image Display Flow Analysis

**Frontend to Backend Image Requests**:
1. Frontend requests photo data via API calls (potentially requiring auth)
2. Backend returns photo URLs pointing to Azure Blob Storage
3. Frontend directly requests images from Azure Blob Storage (no auth required)

**Potential Authentication Issues**:
- If photo metadata API calls require authentication
- If user is not admin in staging, they get 403 on photo API calls
- This could prevent photo URLs from being retrieved
- Direct image URLs work, but getting them requires API access

### Key File References

**Authentication Middleware**: `backend/src/middleware/auth.ts`
- Line 29: `requireAuth` function definition
- Lines 95-101: Admin-only staging restriction
- Line 118: `requireStagingAuth` function

**Environment Detection**: `backend/src/utils/environment.ts`
- Lines 13-21: Environment detection logic
- Lines 27-29: `isDevelopment()` function

**Photo Routes**: `backend/src/routes/photos.ts`
- Line 91: Upload route with `requireAuth`
- Line 261: User photos route with `requireAuth`
- Line 304: Public candidate photos route (no auth)

**Server Configuration**: `backend/src/server.ts`
- Line 234: Static file serving for uploads
- Line 210: Photo routes registration

### Hypothesis for Image Display Issues

**Most Likely Cause**:
1. Frontend makes API calls to get photo metadata/URLs
2. These API calls go through `requireAuth` middleware
3. In staging, non-admin users get 403 errors
4. Frontend fails to get photo URLs
5. Images don't display because URLs are not retrieved

**Less Likely but Possible**:
- Cookie/session differences between environments
- Different CORS handling affecting image requests
- Frontend environment detection issues

### Recommended Next Steps

1. **Verify User Admin Status**: Check if test user has admin privileges in staging vs production
2. **Monitor API Calls**: Check browser network tab for 403 errors on photo-related API calls
3. **Test Direct URLs**: Verify if Azure Blob Storage URLs work directly in both environments
4. **Review Frontend Logic**: Check how frontend handles failed API calls for photo metadata

### Critical Questions to Answer

1. Is the test user an admin in staging environment?
2. Are photo metadata API calls failing with 403 in staging?
3. Does the frontend gracefully handle missing photo data?
4. Are there any photo routes that bypass the admin requirement in staging?

## Conclusion

The most likely cause of the image display issue is the staging environment's admin-only authentication requirement blocking API calls needed to retrieve photo metadata and URLs. This is an environment-specific authentication behavior that differentiates staging from production.
# Photo Upload Fix - Systematic Tracking Document
**Created:** 2025-09-30 15:52 EST
**Issue:** Photo uploads return 500 error, photos don't display in feed

## Evidence of Current State

### Frontend Console Logs (User-Provided)
```
POST https://api.unitedwerise.org/api/photos/upload 500 (Internal Server Error)
API Error Response: {error: 'Upload failed', message: 'Failed to upload photos. Please try again.'}
```

- ✅ Request DOES reach backend (gets 500 response)
- ✅ FormData correctly formatted with photo file
- ✅ 3 automatic retries all fail with same 500 error
- ❌ No diagnostic logging from backend appears in container logs

### Current Deployment State
```bash
# Health endpoint confirms:
releaseSha: "ff68d6c"
revision: "unitedwerise-backend--race-fix-153955"
deployedTag: "backend-race-fix-ff68d6c-1759260818"
uptime: 590 seconds (deployed ~10 minutes ago)
```

### Git Commit History
```
ff68d6c - fix: Await PhotoService initialization before starting server
8fb5751 - fix: Add comprehensive Multer error handling and Azure Blob Storage initialization logging
f32dee4 - debug: Add comprehensive error logging to photo upload
```

## Critical Discovery: Diagnostic Code Not Appearing

### What I Added to Code
1. **server.ts**: `🚀 Initializing services...` before PhotoService init
2. **photos.ts**: `🔥🔥🔥 PHOTOS UPLOAD ROUTE HIT` when route accessed
3. **azureBlobService.ts**: `🔧 Initializing Azure Blob Storage...` during init
4. **photos.ts**: `🚨🚨🚨 PHOTO UPLOAD ERROR CAUGHT` in error handler

### What Appears in Container Logs
- ✅ Startup logs show: `🚀 Initializing services...`
- ✅ Startup logs show: `🔧 Initializing Azure Blob Storage...`
- ✅ Startup logs show: `✅ Azure Blob Storage initialized successfully`
- ✅ Regular request logging (`📥📥📥`) works for other endpoints
- ❌ ZERO logs when `/api/photos/upload` is hit
- ❌ NO `🔥🔥🔥 PHOTOS UPLOAD ROUTE HIT` ever appears
- ❌ NO `🚨🚨🚨 PHOTO UPLOAD ERROR CAUGHT` ever appears

## Hypothesis: Why Diagnostic Code Doesn't Appear

### Possible Reasons
1. **Route Not Registered**: Photos route never gets added to Express app
2. **Middleware Crash Before Route**: Request dies in middleware before reaching route handler
3. **Different Container Serving Requests**: Load balancer routing to old revision?
4. **TypeScript Compilation Issue**: Diagnostic code in .ts but not in compiled .js
5. **Docker Build Cache**: New code not actually in Docker image despite "successful" build

## Attempts Made (Chronological)

### Attempt 1: Add Diagnostic Logging (Commit f32dee4)
- Added `🔥🔥🔥` logging to photos route
- Built Docker image
- Deployed to production
- **Result**: No diagnostic logs appeared, still 500 error

### Attempt 2: Add Multer Error Handler (Commit 8fb5751)
- Added Multer-specific error middleware
- Added Azure Blob initialization logging
- Rebuilt and deployed
- **Result**: Initialization logs appeared, but route logs did NOT

### Attempt 3: Fix Race Condition (Commit ff68d6c)
- Changed PhotoService initialization to awaited
- Wrapped server startup in async function
- Rebuilt and deployed
- **Result**: Initialization successful, but route logs STILL not appearing

## CRITICAL DISCOVERY: Diagnostic Code IS Deployed, But Not Executing

### Git History Analysis
- Latest commit: `ff68d6c` (changed only server.ts/server.js)
- Photos route diagnostic code from: `8fb5751` (2 commits ago)
- Diagnostic code **IS** in source: `backend/src/routes/photos.ts` lines 91-102
- Diagnostic code **WAS** compiled and committed in 8fb5751
- Docker image is built from commit 8fb5751's version of photos route

### The Real Problem
The diagnostic logging code **IS deployed** in the container, but it's NOT executing when `/api/photos/upload` is hit.

This means:
1. ✅ Route IS registered (500 error proves backend receives request)
2. ✅ Diagnostic code IS in deployed container (from commit 8fb5751)
3. ❌ Pre-route middleware never runs (no logs appear)
4. ❌ Something intercepts request BEFORE it reaches the route handler

### Hypothesis: Request Dies in Middleware Chain
The request is hitting `/api/photos/upload` but dying in some middleware BEFORE reaching the route's pre-handler middleware. Possible culprits:
- Rate limiting middleware (`uploadLimiter`)
- Authentication middleware (`requireAuth`)
- Body parsing middleware (though we skip for multipart)
- CORS middleware crashing on multipart requests

### CRITICAL FINDING: Request Logger Should Catch All Requests
Found in `backend/dist/server.js` lines 193-195:
```javascript
if (req.path === '/api/photos/upload') {
    console.log('🎯🎯🎯 PHOTOS UPLOAD ENDPOINT HIT!');
    console.log('🎯 Full headers:', JSON.stringify(req.headers, null, 2));
}
```

This middleware runs BEFORE all routes. If this doesn't log, then:
1. Request isn't reaching backend at all (but we get 500 so it IS)
2. `req.path` doesn't equal `/api/photos/upload` (path mismatch)
3. Request logger middleware is failing silently

**Action:** Need to check if `req.path` is actually `/api/photos/upload` or just `/photos/upload` due to app mounting.

## Next Action Plan

### Step 1: Verify Compiled Code Matches Source
```bash
grep -n "🔥🔥🔥 PHOTOS UPLOAD" backend/dist/routes/photos.js
grep -n "router.use.*photos" backend/dist/server.js
```

### Step 2: Verify Only One Active Container
```bash
az containerapp revision list --name unitedwerise-backend --resource-group unitedwerise-rg
```

### Step 3: Test Simpler Diagnostic Endpoint
Create `/api/photos/test` endpoint with ONLY logging, no business logic, to isolate issue.

### Step 4: Check Request Middleware Chain
Verify request logging middleware runs BEFORE photos route in server.js

## Critical Rule Going Forward
**NEVER declare deployment "successful" without verifying diagnostic code appears in logs when endpoint is triggered.**

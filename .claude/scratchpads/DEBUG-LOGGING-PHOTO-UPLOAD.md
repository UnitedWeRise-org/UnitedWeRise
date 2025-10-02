# Photo Upload Debug Logging - Investigation & Removal Guide

**Created:** 2025-10-02
**Purpose:** Track all debug logging added to diagnose photo upload 500 error
**Status:** INVESTIGATING - Logs not appearing in Container Apps

## ⚠️ CRITICAL FINDINGS

### The Mystery
- Photo uploads return 500 error with exact error message from photos.ts catch block
- Response includes our middleware headers (Helmet, CORS, rate limits) - proves request reaches backend
- **ZERO logs appear** - not console.log, console.error, OR process.stderr.write
- No "FAILSAFE" logs, no Layer 4-7 logs, no stderr emergency logs
- Other GET requests log normally

### What We've Tried (DO NOT REPEAT)

1. **✅ Layer 4-7 Debug Logging (Commit 56f78b8)**
   - Added console.log at every layer from route matching to photo processing
   - Result: NO LOGS appeared for photo upload requests
   - Conclusion: console.log is being suppressed or buffered

2. **✅ Emergency stderr Logging (Commit ee526a2)**
   - Added process.stderr.write() to bypass Node.js buffering
   - Added at: Multer wrapper, upload handler, catch block
   - Result: NO LOGS appeared - even stderr is suppressed
   - Conclusion: Something is preventing ALL logging for this specific request

3. **✅ Verified Deployment**
   - Confirmed correct revision active with 100% traffic
   - Confirmed correct Docker image deployed
   - Confirmed releaseSha matches local code
   - Confirmed only one replica running

4. **✅ Checked for Traffic Split**
   - Only one active revision with 100% traffic
   - No old revisions receiving requests

### Evidence Analysis

**From HTTP Response Headers:**
- Error: `{ error: 'Upload failed', message: 'Failed to upload photo. Please try again.' }`
- This EXACT format only comes from photos.ts:446-448 catch block
- NOT from global error handler (different format)
- Proves: Request reaches photos route and executes catch block

**From Container Logs:**
- GET requests log normally with FAILSAFE, INCOMING REQUEST, etc.
- POST /api/photos/upload: ZERO logs (not even FAILSAFE at line 80 of server.ts)
- Special photo logging at server.ts:220-222 never triggers
- System logs show no errors, container running normally

**Impossibility:**
- Request returns our exact error message → catch block executed
- Request has our headers → middleware executed
- ZERO logs appear → logging completely suppressed
- **This should be impossible unless:**
  1. Multer throws synchronous error BEFORE any logging
  2. Azure ingress rejects request and fabricates response
  3. Logs going to different stream/location we haven't checked

## 🔍 Next Investigation Steps (Recommended)

### Option 1: Add Logging BEFORE All Middleware (HIGHEST PRIORITY)
- Add standalone middleware at line 1 of router BEFORE uploadLimiter
- Log IMMEDIATELY when ANY request hits /api/photos/*
- This will prove if request reaches Express at all
- If this doesn't log → Azure ingress issue

### Option 2: Check Multer File Size Limit
- Current limit: 10MB (line 27 of photos.ts)
- User uploaded PNG was 23KB (well under limit)
- BUT: Multer might have default body parser conflict
- Check if body parser middleware interferes with Multer

### Option 3: Temporarily Bypass Multer
- Remove Multer middleware entirely
- Parse multipart manually or accept base64
- If this works → Multer configuration issue
- If this fails same way → deeper Express/Azure issue

### Option 4: Check Azure Container Apps Logs Configuration
- Verify log streaming is enabled for stdout AND stderr
- Check if there's log filtering/suppression in Azure
- Try Application Insights for more detailed logging
- Check if multipart/form-data requests have special log handling

### Option 5: Test with curl from External Source
- Test upload from outside Azure network
- Rules out network-level filtering
- Provides clean test without browser complications

### ❌ DO NOT DO AGAIN:
- Adding more console.log (proven not to work)
- Adding more process.stderr.write (proven not to work)
- Checking deployments/revisions (already verified)
- Checking traffic routing (already verified)

## Quick Removal Commands

```bash
# Remove all debug logs added for this investigation
grep -r "🔍 LAYER" backend/src/ | cut -d: -f1 | sort -u
# Then manually remove the console.log statements at those locations
```

## Modified Files and Locations

### 1. backend/src/routes/photos.ts

**Line ~11-38** - Added PRE-MIDDLEWARE CHECKPOINT (BEFORE everything):
```typescript
// 🚨 ABSOLUTE FIRST: Pre-middleware logging (BEFORE everything)
router.use((req, res, next) => {
  process.stderr.write(`\n🚨🚨🚨 PRE-MIDDLEWARE CHECKPOINT 🚨🚨🚨\n`);
  process.stderr.write(`🚨 Timestamp: ${timestamp}\n`);
  process.stderr.write(`🚨 Method: ${req.method}\n`);
  process.stderr.write(`🚨 Path: ${req.path}\n`);
  // ... full stderr output
  console.log('\n🚨🚨🚨 PRE-MIDDLEWARE CHECKPOINT 🚨🚨🚨');
  console.log('🚨 PRE-MIDDLEWARE:', { /* ... */ });
  next();
});
```

**Line ~40-48** - Added router-level debug middleware:
```typescript
router.use((req, res, next) => {
  console.log('🔍 LAYER 4 | Route Matching | Photo router matched:', { path: req.path, method: req.method });
  next();
});
```

**Line ~283** - Added multer debug wrapper (replaces direct middleware):
- Search for: `const multerDebugWrapper`
- Remove: Entire function (lines ~X-Y)
- Restore: `router.post('/upload', uploadLimiter, requireAuth, upload.single('file'), async (req: AuthRequest, res) => {`

**Line ~290** - Enhanced existing "PHOTO UPLOAD STARTED" log:
- Search for: `🔍 LAYER 6`
- Keep original log, remove enhanced version

**Line ~330** - Added PhotoService call debug:
- Search for: `🔍 LAYER 7 | Photo Service | Calling processAndUploadPhoto`
- Remove: Entire console.log block

### 2. backend/src/middleware/auth.ts

**Line ~30** - Added auth middleware entry debug:
- Search for: `🔍 LAYER 5 | Authentication | Starting auth check`
- Remove: console.log statement

**Line ~67** - Added auth success debug:
- Search for: `🔍 LAYER 5 | Authentication | User authenticated`
- Remove: console.log statement

### 3. backend/src/services/photoService.ts

**Line ~279** - Enhanced existing service entry log:
- Search for: `🔍 LAYER 7`
- Keep original `📸 Processing photo upload`, remove enhanced version

**Line ~282** - Added permissions validation debug:
- Search for: `🔍 LAYER 7 | Photo Service | Validating permissions`
- Remove: console.log block (before and after validateUserPermissions)

**Line ~285** - Added storage limit debug:
- Search for: `🔍 LAYER 7 | Photo Service | Checking storage limit`
- Remove: console.log block

**Line ~288** - Added file validation debug:
- Search for: `🔍 LAYER 7 | Photo Service | Validating image file`
- Remove: console.log block

**Line ~294** - Added AI moderation debug:
- Search for: `🔍 LAYER 7 | Photo Service | Starting AI content moderation`
- Remove: console.log statement

**Line ~310** - Added Sharp processing debug:
- Search for: `🔍 LAYER 7 | Photo Service | Processing with Sharp`
- Remove: console.log block

**Line ~361** - Added Azure upload debug:
- Search for: `🔍 LAYER 7 | Photo Service | Uploading to Azure Blob`
- Remove: console.log statement

**Line ~379** - Added database creation debug:
- Search for: `🔍 LAYER 7 | Photo Service | Creating database record`
- Remove: console.log statement

### 4. backend/src/services/imageContentModerationService.ts

**Line ~140** - Added Vision API call debug:
- Search for: `🔍 LAYER 7 | AI Moderation | Calling Azure OpenAI Vision`
- Remove: console.log block

**Line ~167** - Added Vision API response debug:
- Search for: `🔍 LAYER 7 | AI Moderation | Vision API response received`
- Remove: console.log block

## Expected Log Sequence (Successful Upload)

```
🔍 LAYER 4 | Route Matching | Photo router matched
🔍 LAYER 5 | Upload Rate Limiter | Rate limit check passed
🔍 LAYER 5 | Authentication | Starting auth check
🔍 LAYER 5 | Authentication | User authenticated: [userId]
🔍 LAYER 5 | Multer Middleware | Starting file processing
🔍 LAYER 5 | Multer Middleware | File parsed: [filename] ([size])
🔍 LAYER 6 | Upload Handler | Request validation passed
🔍 LAYER 7 | Photo Service | Calling processAndUploadPhoto
🔍 LAYER 7 | Photo Service | Validating permissions
🔍 LAYER 7 | Photo Service | Checking storage limit
🔍 LAYER 7 | Photo Service | Validating image file
🔍 LAYER 7 | Photo Service | Starting AI content moderation
🔍 LAYER 7 | AI Moderation | Calling Azure OpenAI Vision
🔍 LAYER 7 | AI Moderation | Vision API response received
🔍 LAYER 7 | Photo Service | Processing with Sharp
🔍 LAYER 7 | Photo Service | Uploading to Azure Blob
🔍 LAYER 7 | Photo Service | Creating database record
✅ LAYER 6 | Upload Handler | Success response sent
```

## Cleanup Checklist

- [ ] Remove Layer 4 debug (photos.ts router middleware)
- [ ] Remove Layer 5 debug (auth.ts)
- [ ] Remove Layer 5 debug (photos.ts multer wrapper)
- [ ] Remove Layer 6 debug (photos.ts handler)
- [ ] Remove Layer 7 debug (photoService.ts - 8 locations)
- [ ] Remove Layer 7 debug (imageContentModerationService.ts - 2 locations)
- [ ] Compile TypeScript: `cd backend && npm run build`
- [ ] Test upload still works
- [ ] Commit cleanup: `git commit -m "chore: Remove photo upload debug logging"`
- [ ] Delete this scratchpad file

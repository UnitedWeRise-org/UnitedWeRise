# Photo Upload Debug Logging - Removal Guide

**Created:** 2025-10-02
**Purpose:** Track all debug logging added to diagnose photo upload 500 error
**Status:** IN PROGRESS

## Quick Removal Commands

```bash
# Remove all debug logs added for this investigation
grep -r "🔍 LAYER" backend/src/ | cut -d: -f1 | sort -u
# Then manually remove the console.log statements at those locations
```

## Modified Files and Locations

### 1. backend/src/routes/photos.ts

**Line ~20** - Added router-level debug middleware:
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

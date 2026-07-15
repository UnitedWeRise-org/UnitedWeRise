# Plan: Video Encoding Optimization & Content Moderation

**Created:** 2026-02-02
**Status:** PLANNING
**Complexity:** 8/10

---

## Research Summary

### Azure Media Services
**Retired June 30, 2024.** Not viable — fully decommissioned. All accounts deleted.

### Azure Alternatives
- **Azure Video Indexer** — Analysis/indexing tool, not a full encoding replacement
- **Azure AI Content Safety** — Supports **image and text only**, NOT video natively
- **Mux** — Full video platform (encoding, streaming, moderation) but adds external dependency + recurring cost

### Recommendation
Keep FFmpeg encoding (already using `-preset fast`, already async). Optimize the pipeline for faster availability. For video moderation, use **frame sampling** with the existing Azure Content Safety image API — industry-standard approach.

---

## Three Changes

### 1. Early Availability — 720p-first sequential encoding
### 2. Video Content Moderation — Frame sampling with Azure Content Safety
### 3. Stop auto-approving moderation — Let moderation service decide

---

## Change 1: Sequential Encoding with Early READY

**File:** `backend/src/services/FFmpegEncoder.ts`

**Current flow:** Both tiers encode in parallel (`Promise.all`) → upload all → set READY
**New flow:** Encode 720p → upload 720p → manifest with 720p only → set READY → encode 360p → update manifest

### Implementation

**a) Extract `encodeSingleTier()` from the loop body in `generateHLS()` (lines 244-274)**

New private method with the same FFmpeg args as the current per-level body.

**b) Extract `uploadTierFiles()` from the loop in `uploadOutputs()` (lines 316-331)**

New private method that uploads all files for a single tier directory.

**c) Extract `uploadManifest()` from `uploadOutputs()` (lines 312-314)**

New private method: generates manifest for a given set of levels, uploads it, returns the URL.

**d) Refactor `encode()` (lines 133-228) into two phases:**

```
Phase 1 (blocking — determines READY):
  1. Set ENCODING
  2. Encode 720p only (encodeSingleTier)
  3. Upload 720p files (uploadTierFiles)
  4. Generate + upload manifest with 720p only (uploadManifest)
  5. Set READY + hlsManifestUrl
  6. Trigger moderation (fire-and-forget)

Phase 2 (enhancement — non-fatal):
  7. Encode 360p (encodeSingleTier)
  8. Upload 360p files (uploadTierFiles)
  9. Regenerate + re-upload manifest with both tiers (uploadManifest)
  10. Log completion
```

**e) Remove auto-approve from `encode()`**

Line 190-191 currently sets `moderationStatus: 'APPROVED'` and `audioStatus: 'PASS'`. Remove these — moderation runs as a separate step via `queueModeration()`.

### Key Design Decisions

- **No schema migration needed.** `encodingStatus: READY` is reused (no new `PARTIAL_READY` status). 360p is a transparent enhancement.
- **360p failure is non-fatal.** If 360p encoding fails, the video remains playable at 720p. Log a warning but don't change status.
- **HLS manifest overwrite is safe.** HLS.js fetches the master manifest once at playback start. Users who started before 360p completes get 720p only. Users who start after get adaptive bitrate. No mid-playback issues.
- **Moderation fires after 720p READY**, runs concurrently with 360p encoding. Frame extraction is fast (few seconds) and won't significantly contend with 360p encoding on the container's CPU.

---

## Change 2: Video Content Moderation via Frame Sampling

**File:** `backend/src/services/videoContentModerationService.ts`

### Implementation

**a) Replace `analyzeVideoContent()` stub (lines 171-196)**

New implementation:
1. Create temp directory
2. Extract frames using FFmpeg: 1 frame every 3 seconds, capped at 20 frames (`-vf fps=1/3 -frames:v 20`)
3. For each frame: base64-encode → submit to Azure Content Safety `/image:analyze` (same API as `moderateThumbnail`)
4. Track worst severity across all frames per category
5. **Early exit:** If any frame exceeds block threshold (severity ≥ 4), stop analyzing remaining frames
6. Return APPROVED or REJECTED based on worst-case severity
7. Clean up temp directory

**b) Add `extractFrames()` private method**

Uses FFmpeg to extract JPEG frames at interval. Args: `-i {videoUrl} -vf fps=1/{interval} -frames:v {max} -q:v 5 {outputPattern}`

**c) Add `runFFmpegForModeration()` private method**

Similar to `FFmpegEncoder.runFFmpeg()` but with 2-minute timeout (frame extraction is fast). Add necessary imports: `spawn` from `child_process`, `fs`, `path`, `os`, `uuid`.

**d) Update `queueModeration()` (lines 407-430)**

Currently passes `video.originalUrl` (a full public URL). The raw video is in a private container and may need a SAS URL. Update to also select `originalBlobName` and generate a SAS URL via `videoStorageService.generateRawBlobSasUrl()`.

```typescript
// Add to select: originalBlobName
// Replace videoUrl: video.originalUrl
// With: videoUrl: videoStorageService.generateRawBlobSasUrl(video.originalBlobName, 30)
```

Add import for `videoStorageService`.

---

## Change 3: Wire Moderation into Encoding Flow

**File:** `backend/src/services/FFmpegEncoder.ts`

After setting READY (end of Phase 1 in Change 1), add:

```typescript
// Queue moderation (fire-and-forget, runs alongside 360p encoding)
videoContentModerationService.queueModeration(videoId).catch(error => {
  logger.error({ videoId, error }, 'Failed to queue video moderation');
});
```

Add import for `videoContentModerationService`.

### Publish flow (no changes needed)

The existing publish endpoint in `videos/index.ts` already checks `moderationStatus !== 'APPROVED'` and blocks publishing. The feed query already requires `moderationStatus: 'APPROVED'`. So:
- After encoding: `moderationStatus` stays `PENDING` (no longer auto-approved)
- Moderation runs → sets `APPROVED` or `REJECTED`
- Only APPROVED videos can be published / appear in feeds

---

## Files Changed

| File | Change |
|------|--------|
| `backend/src/services/FFmpegEncoder.ts` | Refactor encode() for sequential 720p-first, remove auto-approve, trigger moderation |
| `backend/src/services/videoContentModerationService.ts` | Implement analyzeVideoContent() with frame extraction, update queueModeration() for SAS URLs |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| CPU contention (360p encode + frame extraction) | Medium | Frame extraction runs first (few seconds), then 360p starts |
| Content Safety API rate limits | Low | Max 2 concurrent jobs × 20 frames = 40 calls, well under 1000/10s limit |
| Manifest cache (CDN serves old 1-tier manifest) | Low | Acceptable — users get 720p until cache expires. Consider reducing manifest `max-age` if needed |
| Temp disk space (longer-lived workdir) | Low | Existing `finally` block cleans up. Moderation uses separate temp dir |
| Moderation service not configured (no API key) | Expected | Existing fallback: dev auto-approves, production sets PENDING for manual review |

---

## Verification

1. `git diff` — confirm all changes saved
2. `cd backend && npm run build` — must compile
3. Push to `development`, wait for GitHub Actions to succeed
4. **Test on staging:**
   - Upload a short video (10-15 seconds)
   - Verify video becomes READY faster (check `encodingCompletedAt` vs old timing)
   - Verify video is playable with 720p immediately
   - Wait for 360p to complete — verify manifest updates to include both tiers
   - Check `moderationStatus` transitions from PENDING → APPROVED (or REJECTED if test content triggers it)
   - Verify video cannot be published while `moderationStatus = PENDING`
   - Verify video can be published after `moderationStatus = APPROVED`
5. Test with Content Safety configured and unconfigured (fallback path)

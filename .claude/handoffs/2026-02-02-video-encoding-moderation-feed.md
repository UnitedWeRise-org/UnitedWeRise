# Handoff: Two-Phase Encoding, Content Moderation & Algorithmic Feed

**Date:** 2026-02-02
**Branch:** development
**Commit:** 21befa5
**Status:** Deployed to staging

---

## Summary

Implemented three major improvements to the video snippet system:
1. Two-phase encoding (720p early unlock)
2. Content moderation pipeline (caption, visual, audio)
3. Algorithmic feed + semantic search

---

## Completed Work

### Phase 1: Schema Migration
- Added 4 fields to Video model: `encodingTiersStatus`, `audioTranscription`, `engagementScore`, `captionEmbedding`
- Added 2 indexes: `encodingTiersStatus`, `engagementScore`
- Migration: `prisma/migrations/20260202000000_add_video_encoding_tiers_moderation_engagement/migration.sql`

### Phase 2: Two-Phase Encoding Pipeline
- **`src/services/FFmpegEncoder.ts`** - Split `encode()` into `encodePhase1()` (720p) and `encodePhase2()` (360p). Added `extractFrames()` and `extractAudio()`. Legacy `encode()` retained behind `VIDEO_ENCODING_TWO_PHASE=false` env flag.
- **`src/workers/videoEncodingWorker.ts`** - Two-phase flow: Phase 1 → moderation → Phase 2 (non-fatal). Detects Phase 2 retries by checking `encodingStatus=READY` + `encodingTiersStatus=PARTIAL/PARTIAL_FAILED`.
- **`src/routes/videos/index.ts`** - Added `POST /:id/retry-encoding` endpoint for user-triggered 360p retry.

### Phase 3: Content Moderation
- **Caption text moderation**: `src/services/VideoPipeline.ts` - Added Stage 5b between DB persist and encoding queue. Uses existing `moderationService.analyzeContent()` with new `'VIDEO'` content type.
- **Visual moderation**: `src/services/videoContentModerationService.ts` - Real frame-sampling implementation using `extractFrames()`. Sends frames to Azure Content Safety. Tiered thresholds: >0.9 reject, 0.5-0.9 pending for admin review, <0.5 approve.
- **Audio moderation**: `extractAudio()` implemented. Transcription integration is a TODO placeholder for Azure Speech-to-Text or Whisper.
- **`src/services/moderationService.ts`** - Extended `analyzeContent()` and `detectDuplicateContent()` to accept `'VIDEO'` content type.

### Phase 4: Engagement Scoring
- **`src/services/engagementScoringService.ts`** - Added `calculateVideoScore()` static method with time decay, quality bias, new content boost.
- **`src/routes/videos/index.ts`** - Added `updateVideoEngagementScore()` helper, wired into like/unlike/view/share endpoints.

### Phase 5: Algorithmic Feed
- **`src/services/videoFeedService.ts`** (NEW) - `VideoFeedService` with three feed modes:
  - `for-you`: Probability-cloud sampling (recency, engagement, social, trending, hashtag dimensions)
  - `following`: Social-recency with relationship multipliers (subscriptions 2x, friends 1.5x, follows 1x)
  - `trending`: Engagement-score ordered from last 24 hours
- **`src/routes/videos/index.ts`** - Feed endpoint now accepts `feedType` query param and uses `VideoFeedService`.

### Phase 6: Semantic Search
- **`src/routes/videos/index.ts`** - Generates caption embedding on publish (fire-and-forget via `EmbeddingService`).
- **`src/routes/search.ts`** - Unified search endpoint now includes `videos` type, searching by caption text and hashtags.

---

## Pending / Not Implemented

| Item | Priority | Notes |
|------|----------|-------|
| Frontend "Retry 360p" button | Medium | Backend endpoint exists (`POST /:id/retry-encoding`). Needs UI in snippet dashboard for videos where `encodingTiersStatus=PARTIAL_FAILED`. |
| Audio transcription integration | Low | `extractAudio()` works, but Azure Speech-to-Text / Whisper call is a TODO stub in `checkAudioPolicy()`. |
| Coconut.co encoding service | Future | Research complete. Feature flag `VIDEO_ENCODING_SERVICE=ffmpeg|coconut` planned but not implemented. |
| CHANGELOG update | Low | Should document these changes for user-facing changelog. |

---

## Key Files Modified

| File | Change |
|------|--------|
| `prisma/schema.prisma` | 4 new Video fields + 2 indexes |
| `prisma/migrations/20260202000000_.../migration.sql` | New migration |
| `src/services/FFmpegEncoder.ts` | Two-phase encoding, frame/audio extraction |
| `src/workers/videoEncodingWorker.ts` | Two-phase worker flow |
| `src/services/videoFeedService.ts` | NEW - algorithmic feed service |
| `src/services/videoContentModerationService.ts` | Real visual moderation |
| `src/services/VideoPipeline.ts` | Caption moderation stage |
| `src/services/engagementScoringService.ts` | Video scoring method |
| `src/services/moderationService.ts` | VIDEO content type support |
| `src/routes/videos/index.ts` | Engagement scoring, feed, retry endpoint, embedding |
| `src/routes/search.ts` | Video search in unified endpoint |

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VIDEO_ENCODING_TWO_PHASE` | `true` (unless set to `'false'`) | Enable/disable two-phase encoding |
| `AZURE_CONTENT_SAFETY_ENDPOINT` | Required for visual moderation | Azure Content Safety API |
| `AZURE_CONTENT_SAFETY_KEY` | Required for visual moderation | Azure Content Safety API key |

---

## Verification Plan

1. Upload a video snippet → should become READY after 720p encoding (not waiting for 360p)
2. Upload video with toxic caption → should be rejected before encoding starts
3. Check unified search with `?types=videos&q=searchterm` → should return matching snippets
4. Like/view a video → verify `engagementScore` updates in DB
5. Hit feed endpoint with `?feedType=for-you` → verify non-chronological results
6. If 360p fails → verify `encodingTiersStatus=PARTIAL_FAILED` and retry endpoint works

---

## Plan Reference

Full implementation plan: `.claude/plans/humming-munching-tower.md`

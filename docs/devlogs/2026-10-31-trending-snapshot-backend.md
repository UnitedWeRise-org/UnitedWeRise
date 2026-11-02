# Trending Snapshot Backend (Phase 2)
**Date:** 2026-10-31

## User Intent
Build the backend for Trending Now and Trending Digest: real topics clustered
from public discussion, dynamic categories, quality/feeling sentiment, top
posts, AI summaries/quotes, and a daily digest overview — without running heavy
work on every page load.

## What Changed
### TrendingService
- Pulls recent candidate posts with embeddings (max 500) for 24h/72h/168h.
- Clusters with cosine similarity (threshold 0.62) and min 3 posts/topic.
- Computes per-topic:
  - post/participant counts, engagement/quality/controversy scores
  - detailed quality/feeling aggregates and support/oppose/neutral percentages
  - top posts with active/top/relevance scores
  - representative quotes
- Dynamic categories from the AI summary, normalized; fallback keyword rules.
- AI summaries: top 10 topics, cached by top-5 post-ID signature for 12h.
- Daily overview: one AI call, cached for 12h.

### Cache / refresh
- Snapshot key: `trending:{window}:{scopeType}:{scopeId}` in `ApiCacheService`.
- Activity gate: max Post/Reaction/Comment activity since snapshot; unchanged
  data serves cache; new activity refreshes in the background after a 10-minute
  throttle (stale-while-revalidate).
- In-flight coalescing prevents duplicate snapshot builds.

### API
- `GET /api/trending/now` — top 3 topics/posts + categories.
- `GET /api/trending/digest` — all topics/posts + daily overview.
- `GET /api/trending/topics/:topicId/posts?sort=active|top|relevant`.
- `GET /api/trending/categories`.
- Legacy `/api/trending/topics` now returns real topics in the old shape.
- `/api/trending/map-topics` no longer fabricates coordinates; map bubbles use
  `/api/posts/map-data`.

### AI
- Extended `AzureOpenAIService.generateTopicSummary` with optional neutral
  summary, dynamic category, and keywords.

## Verification
- Backend build passes.
- Local Postgres seed test: 6 synthetic posts clustered into 2 topics
  (Politics/Sports), dynamic categories returned, top posts/quotes/overview
  present, State scope filtered correctly.

## Files Modified
- `backend/src/services/trendingService.ts`
- `backend/src/routes/trendingTopics.ts`
- `backend/src/services/azureOpenAIService.ts`

---

*This entry was generated per the [DevLog Protocol](../../CLAUDE.md#devlog-generation).*

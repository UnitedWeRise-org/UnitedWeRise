# Trending & Reaction Rework — Plan

**Status:** Phase 1 implemented — awaiting staging verification; Phases 2–3 pending
**Date:** 2026-10-31
**Risk:** High (schema + ranking + AI + multiple UI surfaces)
**Branch:** `development` (staging) → `main` (production only on explicit command)

---

## 1. Audit: why Trending has never worked

- The endpoint the Trending UI calls, `/api/trending/topics`, returns **hardcoded mock topics**, including fake support/oppose counts.
- A real semantic discovery engine already exists (`TopicDiscoveryService.discoverTrendingTopics`): embeddings → cosine clusters → Azure OpenAI summaries. It is mounted at `/api/topic-navigation/trending`, is not used by the UI, and runs uncached AI on every request.
- A third path (`/api/topics/trending` + `TopicService`) reads the `Topic` table, but no cron/caller runs `generateTopicClusters`/`saveTopicsToDB`, so that table is likely empty/stale.
- The frontend has overlapping implementations: `trending-handlers.js`, `trending-system-integration.js`, `TopicNavigation.js`, the compact panel, and map topic bubbles.
- Existing reusable building blocks: `Post.embedding`, `topicService` clustering helpers, `EngagementScoringService`, `ProbabilityFeedService`, `UserInterestService`, `azureOpenAIService`, `ApiCacheService`.

---

## 2. Agreed product decisions

### Reactions (renovate existing Reaction/Post/Comment structures)
- Two independent, optional selectors on **posts and comments**:
  - **Quality:** Love (+2), Like (+1), Meh (-0.5), Dislike (-1).
  - **Feeling:** Beaming (+), Smile (+), Neutral (0), Sad (-), Angry (-) — used for how the event/issue feels, not content quality.
- Both axes contribute to ranking, but:
  - Quality is the direct content-quality vote.
  - Feeling contributes **participation intensity + controversy**, not a simple happy=good/sad=bad penalty.
- Notifications: only **Love** and **Like** generate author notifications. Meh/Dislike and feeling changes stay silent.
- Clean-break API/UI is acceptable; old test reactions will be migrated. Keep legacy aggregate columns temporarily so feed/ranking code does not break.
- Build the reaction rework first, then build Trending on the new data.
- Recommended is already covered by Following; Discover is the personalized trending hybrid. No new Recommended page/tab.

### Trending
- **Trending Now** — side placement on large screens (where it sits below the collapsed map), central display on narrow/app screens.
- **Trending Digest** — dedicated full-page model in the main feed area; responsive standalone page on narrow/app.
- **Recommended** — already represented by the existing **Following** feed (personal interests/history/social + general signals). **Discover** is the personalized/trending hybrid. No new Recommended surface; the shared ranking profiles feed Following/Discover and Trending.
- Top 3 topics + top 3 posts, with All Topics / All Posts toggles.
- Category tabs: Overall + top 3 dynamic categories + More (Digest shows all).
- Geography: separate National / State / Local selector alongside categories.
- Topic drill-down default sort: Most Active; also Top Rated and Most Relevant.
- Snapshot: at most every 10 minutes, **only when new post/reaction/comment activity exists**. Stale-while-revalidate.
- AI: per-topic summaries + daily overview + representative quotes, cached 12h; reuse summaries for unchanged clusters.
- Fully dynamic categories; no AI call on every pull.
- Public endpoints (same visibility as current trending/topic APIs).

---

## 3. Phase 1 — Reaction rework (ship and verify first)

### 3.1 Data layer
Add to `Reaction`:
```prisma
enum ReactionQuality { LOVE LIKE MEH DISLIKE }
enum ReactionFeeling { VERY_POSITIVE POSITIVE NEUTRAL NEGATIVE VERY_NEGATIVE }

model Reaction {
  quality ReactionQuality?
  feeling ReactionFeeling?
  // old sentiment/stance removed after backfill
}
```

Add detailed counters to `Post` and `Comment`:
- Quality: `loveCount`, `likeCount`, `mehCount`, `dislikeCount`
- Feeling: `veryPositiveCount`, `positiveCount`, `neutralFeelingCount`, `negativeCount`, `veryNegativeCount`
- Keep legacy aggregate columns for compatibility:
  - `likesCount` = love + like
  - `dislikesCount` = dislike
  - `agreesCount` = veryPositive + positive
  - `disagreesCount` = negative + veryNegative

Migration:
1. Add new enums/columns.
2. Backfill existing reactions:
   - `sentiment LIKE → quality LIKE`
   - `sentiment DISLIKE → quality DISLIKE`
   - `stance AGREE → feeling POSITIVE`
   - `stance DISAGREE → feeling NEGATIVE`
3. Backfill detailed counters from existing aggregates (love/meh/very/neutral default 0).
4. Drop `sentiment`/`stance` after verification.

Risk: high; migration-first deploy; DB snapshot before apply; keep legacy aggregates.

### 3.2 Backend API
- Change post reaction endpoint to accept:
  ```json
  { "quality": "LOVE|LIKE|MEH|DISLIKE|null", "feeling": "VERY_POSITIVE|POSITIVE|NEUTRAL|NEGATIVE|VERY_NEGATIVE|null" }
  ```
  Each field independently sets or clears its axis.
- Same for comment reactions.
- Validate values; update reaction row + all detailed counters + legacy aggregates in one transaction.
- Return detailed counts and `userQuality`/`userFeeling`.
- Compatibility shim: continue accepting legacy `{ reactionType, reactionValue }` and map it, so an older mobile client does not hard-fail.
- Notifications: create a LIKE/REACTION notification only for Love/Like; no negative/feeling alerts (per decision).

### 3.3 Ranking & scoring
- Update `EngagementScoringService` metrics/interfaces:
  - Quality score = love×2 + like×1 + meh×(-0.5) + dislike×(-1).
  - Feeling engagement = non-neutral feeling intensity (strong = 1.0, mild = 0.5); neutral = 0.
  - Controversy boost when both positive and negative feelings exist.
  - Keep `likesCount`-based consumers working via aggregates; move new logic to detailed counters.
- Update `ProbabilityFeedService`/`UserInterestService`/feed sort call sites only where the distinction matters.
- Trending sentiment will use the feeling distribution; Top Rated will use quality score.

### 3.4 Frontend
- Replace the 2×2 reaction matrix in `PostComponent.js` and `UnifiedPostRenderer.js` with two compact expandable selectors:
  - Quality: Love / Like / Meh / Dislike
  - Feeling: 😁 Beaming / 🙂 Smile / 😐 Neutral / 😢 Sad / 😠 Angry
- Selected state shows icon + label; click expands a popover; click again clears.
- Show aggregated counts/percentages under each axis (compact, not a matrix).
- Optimistic updates + rollback on API failure.
- Update comments to the same selectors.
- Update CSS in `post-component.css`/`posts.css`; remove matrix styles.
- Update feed/trending renderers that display `likesCount` labels to show quality breakdown where appropriate.

### 3.5 Testing / rollout
- Migration backfill on a copy of staging DB; verify old counts.
- Toggle quality/feeling independently on posts/comments; clear each; refresh persistence.
- Notifications only for Love/Like.
- Feed ranking changes verified with a seeded set.
- Deploy Phase 1 to staging; stop for verification before Phase 2.

---

## 4. Phase 2 — Shared ranking + Trending snapshot backend

### 4.1 One ranking service
Create a shared `RankingService` (or extend `ProbabilityFeedService`) with profiles:
- `TRENDING`: recency, interaction velocity, quality score, controversy/intensity, participant diversity, no personalization.
- `RECOMMENDED`: existing probability-feed signals (recency, interest similarity, social, trending, reputation) + new quality/feeling signals.

Reuse existing services rather than new algorithms:
- `TopicDiscoveryService` clustering (embeddings + cosine threshold).
- `EngagementScoringService` for engagement/quality.
- `ProbabilityFeedService`/`UserInterestService` for the Recommended profile.
- `azureOpenAI` for summaries/stance fallback.
- `ApiCacheService` for snapshots/summaries.

### 4.2 Snapshot cache (no new DB table required)
Use `ApiCacheService`:
- Snapshot key: `trending:{windowHours}:{scopeType}:{scopeId}:{category}`.
- Payload: generatedAt, sourceActivityAt, topics (title, category, counts, feeling breakdown, quality score, summary, quotes, post IDs), top posts, category catalog, daily overview.
- Activity gate: query max activity (post createdAt, reaction updatedAt, comment createdAt) since `generatedAt`; if nothing new, serve cache. If activity exists but <10 min old, serve stale and refresh in background.
- In-flight coalescing to prevent duplicate generation; short DB/auth-cache lock for multi-replica safety.
- AI summary cache keyed by cluster signature (centroid/top post IDs), 12h; unchanged clusters reuse summaries. Daily overview cached 12h per (scope/category/window).
- First request with no cache: build synchronously (or return a warming response + retry); measure and optimize.

### 4.3 Clustering, categories, sentiment
- Candidate posts: last 24h/7d (window), embeddings non-empty, engagement/recent; cap 500.
- Cluster by cosine similarity; min 3–5 posts; max 15–20 topics.
- Category: use the AI summary's category; normalize labels; dynamic catalog ranked by aggregate topic score. Trending Now shows Overall + top 3 + More; Digest shows all.
- Feeling breakdown: aggregate reactions from cluster posts; if too sparse, AI-classify a small sample of top posts (cached until cluster changes). Show “insufficient sentiment” rather than fake numbers.
- Quality: aggregate quality score; use for Top Rated.
- Daily overview: one AI call per snapshot for the selected scope/category, grounded in top topics; cached.

### 4.4 Endpoints (replace mock/duplicate paths)
- `GET /api/trending/now?window=24h&scope=national|state|local&category=overall|<category>&geo=...` → top 3 topics + top 3 posts + category catalog + feeling summaries.
- `GET /api/trending/digest?...` → all topics/posts + AI summaries/quotes/daily overview.
- `GET /api/trending/topics/:topicId/posts?sort=active|top|relevant` → drill-down posts.
- `GET /api/trending/categories?...` → dynamic category catalog (or included in snapshots).
- Repoint/retire `/api/trending/topics` mock and `/api/topics/trending` duplicate paths; keep deprecated aliases only if needed.

---

## 5. Phase 3 — Trending Now / Digest / Recommended UI

### 5.1 Consolidate frontend
- One canonical module (plus small render modules) replaces `trending-handlers.js`, `trending-system-integration.js`, and duplicate topic-mode code.
- Remove mock fallback and hardcoded topics.
- Reuse `UnifiedPostRenderer` for compact post cards.

### 5.2 Trending Now
- Wide screens: existing side region below the collapsed map (or right rail); narrow/app: central content.
- Header: Trending Now, category tabs (Overall | top 3 | More…), geography selector (National/State/Local).
- Top 3 topics + top 3 posts; All Topics / All Posts toggle.
- Topic cards: title, category, post/participant counts, feeling bar, prevailing view/leading critique; click → drilldown.
- Post cards: compact, with sort control when expanded.
- Skeleton/loading, empty state, retry, stale indicator.

### 5.3 Trending Digest
- Dedicated page in main content; full page on narrow/app.
- Same filters/toggles as Trending Now, plus:
  - daily AI overview
  - all topics with neutral summary, prevailing view, leading critique, feeling breakdown, representative quotes with links
  - all posts with Most Active / Top Rated / Most Relevant sort
  - load more/pagination.

### 5.4 Recommended / Existing feeds
- No new Recommended surface. Use the shared ranking service to back:
  - **Following** — `RECOMMENDED` profile (interests, history, follows, subscriptions, quality/general signals).
  - **Discover** — hybrid profile (personalization down-weighted, trending/velocity/quality up-weighted).
  - **Trending Now / Digest** — pure `TRENDING` profile.
- Keep the existing feed surfaces and labels; only the service and signals change.

---

## 6. Cleanup, docs, rollout

- Delete/retire mock trending endpoint and dead duplicate handlers after verification.
- Update Swagger, frontend JSDoc, `MASTER_DOCUMENTATION.md`, `docs/DATABASE_SCHEMA.md`, CHANGELOG, devlog.
- Remove old reaction matrix CSS/JS and legacy `sentiment`/`stance` references after compatibility window.
- Monitor AI cost, snapshot latency, cache hit rate, ranking changes.

## 7. Testing plan

- Unit/basic: reaction migration mapping, quality/feeling weights, controversy math, category normalization.
- Integration: toggle each axis on post/comment; counts/aggregates; notifications; feed ranking; snapshot activity gate; AI cache reuse; drill-down sorts.
- Manual staging: Trending Now side/central, category/geography tabs, top 3/all toggles, Digest summaries/quotes, Recommended vs Trending differences, mobile/narrow.
- Performance: cached snapshot response <200ms; first build acceptable; no AI on normal pulls.
- Security: AI output escaped; prompt-injection resistance (summaries grounded with post IDs/quotes); public endpoint rate limits.

## 8. Rollback

- Phase 1: additive columns/enums first; keep legacy aggregates; revert code; restore reaction columns/counts from migration snapshot if needed.
- Phase 2: endpoints/cache additive; revert code; clear `trending:*` cache keys.
- Phase 3: UI feature flag/revert; no destructive schema changes.
- No production deploy without explicit command.

## 9. Approval gates

1. Approve this plan.
2. Phase 1 (reactions) implementation + staging verification.
3. Phase 2 (ranking/snapshot backend) staging verification.
4. Phase 3 (UI) staging verification.
5. Production deploy only on explicit command.

# Reaction Model Rework — Quality + Feeling
**Date:** 2026-10-31

## User Intent
Replace the confusing 2×2 Like/Dislike/Agree/Disagree matrix with two clean,
independent axes:
- **Quality** — Love / Like / Meh / Dislike (quality of the information)
- **Feeling** — Beaming / Smile / Neutral / Sad / Angry (how the event/issue feels)

Quality should rank content; feeling should describe community sentiment and
contribute intensity/controversy, not penalize sad/angry news as “bad content.”

## What Changed
### Data model
- `Reaction.quality` (`LOVE|LIKE|MEH|DISLIKE`) and `Reaction.feeling`
  (`VERY_POSITIVE|POSITIVE|NEUTRAL|NEGATIVE|VERY_NEGATIVE`).
- Removed `Reaction.sentiment`/`stance` after backfill:
  - LIKE → quality LIKE, DISLIKE → quality DISLIKE
  - AGREE → feeling POSITIVE, DISAGREE → feeling NEGATIVE
- Added detailed counters to Post/Comment (`loveCount`, `likeCount`,
  `mehCount`, `dislikeCount`, `veryPositiveCount`, `positiveCount`,
  `neutralFeelingCount`, `negativeCount`, `veryNegativeCount`).
- Kept legacy aggregates in sync for compatibility:
  - `likesCount` = love + like
  - `dislikesCount` = dislike
  - `agreesCount` = veryPositive + positive
  - `disagreesCount` = negative + veryNegative

### Backend
- New `ReactionService` handles both axes independently:
  - one or both can be set; explicit `null` clears an axis
  - counts + legacy aggregates updated transactionally
  - `Like` rows mirror LOVE/LIKE for feed/legacy compatibility
  - Love/Like notifications only; no Meh/Dislike/feeling alerts
  - like activity + 5-like reputation reward preserved
- Reaction endpoints accept `{ quality, feeling }`; legacy
  `{reactionType, reactionValue}` is mapped for compatibility.
- `/posts/:postId/like` now delegates to the same service.
- `EngagementScoringService` supports detailed metrics:
  - Quality weights: Love +2, Like +1, Meh -0.5, Dislike -1
  - Feeling: strong/mild intensity contributes engagement; controversy uses
    positive/negative feeling balance (no happy=good/sad=bad penalty)
- Feed/post/comment responses include `userQuality`, `userFeeling`, and detailed
  counts.

### Frontend
- New `reaction-selectors.js` renders two compact expandable selectors.
- `PostComponent` and `UnifiedPostRenderer` use the shared selectors for posts,
  comments, and RiseAI response comments.
- Dropdowns open downward, are mutually exclusive, and close on outside click.
- Reaction updates reconnect the UI from the API response (`quality`, `feeling`,
  `counts`) so counts stay correct across toggles.

## Verification
- Backend `npm run build` / `prisma validate` pass.
- Migration tested on a throwaway Postgres:
  - old Reaction LIKE/AGREE → quality LIKE + feeling POSITIVE
  - Post/Comment detailed counters backfilled
- Reaction service test on a throwaway DB:
  - LIKE → likeCount/likesCount + Like row
  - feeling NEGATIVE → negativeCount/disagreesCount
  - DISLIKE → dislikeCount/dislikesCount, Like row removed
  - clearing both removes the Reaction and zeroes counts
- Frontend selector render/update verified in headless Chrome.

## Files
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20261031050000_rework_reactions_quality_feeling/migration.sql`
- `backend/src/services/reactionService.ts`
- `backend/src/services/engagementScoringService.ts`
- `backend/src/services/probabilityFeedService.ts`
- `backend/src/services/riseAIEnrichmentService.ts`
- `backend/src/routes/posts.ts`
- `backend/src/routes/feed.ts`
- `frontend/src/components/reaction-selectors.js`
- `frontend/src/components/PostComponent.js`
- `frontend/src/modules/features/content/UnifiedPostRenderer.js`
- `frontend/src/styles/post-component.css`

---

*This entry was generated per the [DevLog Protocol](../../CLAUDE.md#devlog-generation).*

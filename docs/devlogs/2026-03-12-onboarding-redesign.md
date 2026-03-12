# Verification-Gated Onboarding with Feed Seeding
**Date:** 2026-03-12

## User Intent
Post-registration experience was broken: email verification failed due to CSRF bug, onboarding was dismissable and incomplete, interest selection was limited to civic topics only, and new users got empty/random feeds. Goal was a verification-gated, undismissable onboarding flow that seeds the feed algorithm with meaningful personalization data from day one.

## What Changed
- Fixed CSRF exemption for email verification (token IS the protection, double-submit cookie was redundant and impossible from standalone page)
- Onboarding modal is now undismissable until all steps complete, with email verification as prerequisite
- Expanded interests from 20 civic-only topics to 55+ across 5 general-purpose categories
- Interest selection generates semantic embedding via EmbeddingService, stored on user record
- Cold-start signal weights boost explicit interests (0.6 vs 0.1 default) for new users
- Probability feed algorithm detects cold-start users and shifts weights toward trending + similarity
- New suggested-follows endpoint finds content creators matching user's interest embedding

## Technical Decisions
- Verification enforcement piggybacked onto existing `requireAuth` DB query rather than adding separate middleware (zero additional queries per request)
- Dynamic weight system in both UserInterestService (vector aggregation) and ProbabilityFeedService (feed scoring) uses same cold-start threshold: < 7 days OR < 10 interactions
- Suggested follows aggregates by author across semantically similar posts rather than matching user-to-user embeddings directly, leveraging existing `findSimilarPosts` infrastructure
- Single content intelligence layer serves feed seeding, trending, and map systems through shared Topic + embedding infrastructure

## Files Modified
- `backend/src/middleware/csrf.ts` — CSRF exemption
- `backend/src/middleware/auth.ts` — verification enforcement
- `backend/src/services/onboardingService.ts` — categorized interests, interest embeddings
- `backend/src/services/userInterestService.ts` — cold-start signal weights
- `backend/src/services/probabilityFeedService.ts` — cold-start feed weights
- `backend/src/routes/onboarding.ts` — suggested-follows endpoint, enriched responses
- `frontend/src/components/OnboardingFlow.js` — complete rewrite (undismissable, verification gate, categorized interests)
- `frontend/verify-email.html` — environment-aware API URL

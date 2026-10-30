# Map Privacy v2 — ZIP Areas + Seeded Display Points
**Date:** 2026-10-30

## User Intent
Finish the new map features: the map should show real, area-scoped posts while
never storing a post's precise location. The agreed model was a ZIP-based area
with a random seed, plus a compact ⓘ attribution control (already shipped).

## What Changed
- **Schema/migration** (`20261030213000_add_map_privacy_areas`):
  - `User.geoOptIn` (default true).
  - `Post.areaType`/`areaId` (home ZIP), `privacyAreaType`/`privacyAreaId`
    (ZIP or county), `geoSeed`, `geoOptIn`.
  - New `GeoArea` table (Census ZCTA/county polygon cache + 64 sample points).
  - Backfills home/privacy area from author ZIP, generates seeds, and nulls all
    legacy precise post fields (`latitude`, `longitude`, `originalH3Index`,
    `h3Index`).
- **GeoAreaService**:
  - Census TIGERweb ZCTA/county lookup with DB caching.
  - Population floor (`MAP_AREA_MIN_POPULATION`, default 50): low-population
    ZIPs display within the enclosing county.
  - Ray-cast rejection sampling for in-polygon points; seeded point selection.
- **Post creation** now writes only coarse area + seed (no geocoding call; uses
  the author's stored ZIP).
- **`GET /api/posts/map-data`** accepts `lat/lng/zoom/sessionNonce`, resolves a
  discrete tier (national/regional/metro/city), returns ranked area posts with
  ephemeral coordinates. Legacy `scope` remains as a fallback.
- **Ranking**: `ProbabilityFeedService.rankAreaPosts` reuses feed signals with
  `recency = 0.05 + 0.95·exp(-ageHours/72)` and max 2 posts per author.
- **Frontend**:
  - Map fetches one batch for the current view (`fetchMapPosts`), caches it for
    3 minutes, and rotates real posts through the bubbles.
  - Debounced `moveend` clears the cache only when the tier/coarse center
    changes.
  - Removed the ±1° popup jitter that was placing bubbles in the ocean.
  - Attribution remains the compact bottom-right ⓘ control.
- **Profile → Settings** adds "Show my posts on the map"; toggling syncs
  `geoOptIn` to existing posts.
- **Ops script** `npm run backfill-map-areas` hydrates `GeoArea` for existing
  post ZIPs and applies county escalation.
- **Feed geo boost** falls back to ZIP proximity (`calculateAreaBoost`) now that
  posts no longer store H3.

## Technical Decisions
- ZIP was chosen over H3 res-6 for effort/privacy balance; a population floor
  turns "roughly density-adaptive" into a k-anonymity-style guarantee.
- Home ZIP (query/discovery) is stored separately from the privacy area
  (display), so county-escalated rural posts still appear in the right local
  view.
- Sample points are precomputed once per area (Census polygon) and selected at
  read time — O(1) per post/render, no per-request geometry.
- The client sends a per-session nonce, so display points are stable within a
  session but vary across sessions; nothing is persisted.

## Verification
- Backend `npm run build` passes; `prisma validate` passes.
- Migration SQL applied successfully to a throwaway Postgres built from the
  previous schema; backfill (ZIP `60601-1234` → `60601`) and precise-field
  nulling verified.
- `GeoAreaService` tested against live TIGERweb: `60601` → 15,814 population,
  64 samples; `81330` (pop 28) → Montezuma County (`08083`, pop 25,849).
- `getPostsForMapArea` tested at city and national zooms against the throwaway
  DB; returned privacy-safe coordinates.

## Files Modified
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20261030213000_add_map_privacy_areas/migration.sql`
- `backend/src/services/geoAreaService.ts`
- `backend/src/services/postGeographicService.ts`
- `backend/src/services/probabilityFeedService.ts`
- `backend/src/services/userInterestService.ts`
- `backend/src/services/slotRollService.ts`
- `backend/src/routes/posts.ts`
- `backend/src/routes/users.ts`
- `backend/src/scripts/backfillMapAreas.ts`
- `backend/package.json`
- `frontend/src/js/map-maplibre.js`
- `frontend/src/components/Profile.js`
- `.claude/plans/map-system-rework-plan.md`

---

*This entry was generated per the [DevLog Protocol](../../CLAUDE.md#devlog-generation).*

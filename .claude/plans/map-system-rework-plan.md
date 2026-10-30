# Map System Rework — Plan

**Status**: Phase 4 implemented on `development` (ZIP + population floor); awaiting staging deploy/verification
**Date**: 2026-10-29 (updated 2026-10-30)
**Risk**: High (schema/privacy change, external APIs, multiple layers)
**Branch**: `development` (staging) → `main` (production only on explicit command)

---

## 1. Current state (audit)

**Basemap**
- All five map instances used CARTO anonymous tiles → CARTO served the repeating "Need API Key" tile pattern once anonymous quota was exceeded.
- **FIXED on staging** (commit `34c4783`): Stadia Maps vector style via new single-source `frontend/src/config/map.js`, all five maps wired, CSP updated (`https://*.stadiamaps.com`), attribution enabled, unused `fonts.openmaptiles.org` glyphs dependency removed. **Not yet on production.**

**Existing geo foundation (already built)**
- `PostGeographicService`: user address → cached Geocodio coords (`addressDistrictMapping`) → H3 → privacy displacement → writes `Post.latitude/longitude`, `h3Index`, `originalH3Index`, `privacyDisplaced`.
- `GET /api/posts/map-data`: returns real posts by scope (national/state/local) for the logged-in user's H3 neighborhood.
- `RepresentativeService`: Geocodio + Google Civic + FEC, with `ApiCacheService` (stale-refetch cache).
- Prod Azure env already has `GEOCODIO_API_KEY`, `GOOGLE_CIVIC_API_KEY`, `FEC_API_KEY`. **Staging has none of them.**

**Defects vs. the vision**
1. `Post.originalH3Index` stores the **real** H3 of the author's location — contradicts "actual location isn't stored in our DB".
2. Coordinates are randomized **once at write** and stored — the vision is "store an initial randomization factor, randomize a **second** time at display".
3. Map population is **author-scoped**, not **viewport/area-scoped** (doesn't know what area the map is showing).
4. No address search wired to the map (legacy Nominatim browser geocoding in `map-handlers.js`; `#locationInput` UI not present).
5. Representatives/candidates not surfaced on the map.
6. Two overlapping map subsystems (`map-handlers.js` + `map-maplibre.js`) racing to define `window.*`; broken Leaflet fallback; dummy/random map content (`map-dummy-data.js`) makes it feel fake.
7. `attributionControl` was disabled (now fixed).

---

## 2. Vision (user = source of truth)

- Basemap reliable at all zooms.
- **Address lookup**: type any US address → map zooms there.
- **Posts on map with strong privacy**:
  - Posts are indexed to where they were posted.
  - The **real location is never stored**. Store only an initial randomization factor.
  - At display, randomize a **second** time → approximate coordinate in the right area (safe).
  - User can **opt in/out**.
- **Area-aware population**: the map knows the area it is displaying; show posts from that area (zoomed to my city → local posts).
- A ranking **algorithm** decides what is shown (pluggable/tunable).
- **Representatives + candidates** in the viewed area (Google Civic / FEC + cache).
- **Caching**: API calls populate a cache; stale data refetches and updates (matches `ApiCacheService`).
- **Corner minimize/maximize** behavior (collapsible corner map).

---

## 3. Design decisions (confirmed in discussion; implemented in Phase 4)

1. **Privacy schema** — store an *area*, not a point:
   - Store home ZIP (`areaType`/`areaId`), privacy area (`privacyAreaType`/`privacyAreaId`; ZIP or enclosing county when ZIP population < 50), `geoSeed` (random int per post), and `geoOptIn`. No precise lat/lng or real H3.
   - At display: pick a precomputed in-polygon sample using `(geoSeed + sessionNonce) % N` → a stable-in-session, approximate point inside the privacy area.
   - Migration adds the coarse fields; legacy precise fields are no longer written and were nulled.
2. **Opt-in default**: on by default, with disclosure in Profile → Settings.
3. **Ranking**: `ProbabilityFeedService.rankAreaPosts` (recency 72h curve, similarity, social, trending, reputation; weighted sampling; max 2 per author).
4. **Production**: Stadia basemap hotfix shipped separately (`34c4783`); Phase 2–4 await staging verification.

---

## 4. Phases

### Phase 0 — Basemap (DONE on staging)
Stadia vector style in all 5 maps, CSP, attribution, glyphs cleanup.

### Phase 1 — Production hotfix (optional now)
Merge `34c4783` to `main` so prod maps render again (no schema/API changes).

### Phase 2 — Consolidate the map subsystems
- Single init path: `UWRMapLibre` is the only map; `map-handlers.js` becomes thin controllers (no `window.*` duplication).
- Delete the broken Leaflet fallback (or gate it behind a feature flag with a working raster path).
- Keep/refine corner collapse/expand + mobile behavior.
- Remove dummy data from default rendering (or clearly label as fallback).

### Phase 3 — Address search → backend geocoding + cache
- New backend endpoint `GET /api/geo/search?q=` using **Geocodio** (prod key exists; copy to staging) with `addressDistrictMapping`-backed cache + stale-refetch.
- Frontend: add address input to the map UI; on submit → flyTo result; drop Nominatim browser calls.
- Optional: fallback to Census Geocoder (keyless) if Geocodio is unavailable.

### Phase 4 — Posts-on-map v2 (privacy redesign) — IMPLEMENTED 2026-10-30
**Data layer**
- `Post`: added `areaType`/`areaId` (home ZIP), `privacyAreaType`/`privacyAreaId`
  (ZIP, or county when ZIP population < `MAP_AREA_MIN_POPULATION`, default 50),
  `geoSeed`, `geoOptIn`. Precise `latitude`/`longitude`/`originalH3Index`/
  `h3Index` are no longer written and were nulled by the migration.
- `User.geoOptIn` (default true) with a Profile → Settings toggle; toggling syncs
  existing posts.
- New `GeoArea` table caches Census ZCTA/county polygons, population, centroid,
  and 64 precomputed in-polygon sample points.
- Migration `20261030213000_add_map_privacy_areas` (additive columns + table,
  backfill from author ZIP, privacy cleanup). Run
  `npm run backfill-map-areas` after deploy to hydrate old post ZIPs.

**Backend**
- `GeoAreaService`: TIGERweb ZCTA/county lookup (cached), population floor,
  ray-cast rejection sampling, seeded display-point derivation.
- `PostGeographicService`: writes area + seed only; `/api/posts/map-data` now
  accepts `lat/lng/zoom` and returns area-scoped, ranked posts with ephemeral
  coordinates. Legacy `scope` remains as a fallback.
- `ProbabilityFeedService.rankAreaPosts`: reuses feed signals with the map
  recency curve `0.05 + 0.95·exp(-ageHours/72)`, weighted sampling, max 2/author.

**Frontend**
- Map fetches posts for the live center/zoom (debounced `moveend`), caches a
  batch per area, and renders real bubbles. Large random coordinate jitter was
  removed (it caused ocean bubbles). Compact ⓘ attribution remains.

### Phase 5 — Representatives & candidates in the viewed area
- Endpoint using `RepresentativeService` (Geocodio + Google Civic + FEC + `ApiCacheService`), keyed off map center/district.
- Map panel/markers for reps + candidates; cache-first with staleness refetch.
- Add staging API keys (Geocodio, Google Civic, FEC) to Azure staging.

### Phase 6 — Docs, tests, cleanup
- Update `MASTER_DOCUMENTATION.md` map + geographic-privacy sections; devlog + CHANGELOG.
- Test on staging (admin): all 5 maps render; address search; posts-on-map for a city; rep lookup; collapse/expand; mobile.
- Remove dead code (`map-leaflet-backup.js`, dummy data references) after verification.

---

## 5. Risks & mitigations

| Risk | Level | Mitigation |
|---|---|---|
| Privacy regression (storing real location) | Critical | Migration removes precise fields; code review of write paths; no `originalH3Index`. |
| Data loss on schema change | High | Additive columns first; backfill then drop; DB snapshot before apply. |
| External API quotas (Geocodio/Civic/Stadia) | Medium | Cache-first + staleness refetch; monitor usage; Stadia free tier ~200k/mo. |
| Map perf (viewport queries) | Medium | Debounce, bbox/H3 indexes, cap results, DB indexes on `areaH3`. |
| Dual map code keeps racing | Medium | Phase 2 consolidation before adding features. |
| Staging lacks API keys | Medium | Copy prod keys to staging env during Phase 3/5. |

## 6. Testing
- Staging admin session: 5 maps render with Stadia; no CSP errors; attribution visible.
- Address search returns coords and flies there.
- Create posts in a city; map at that city shows them; zoom out → area changes; opt-out post never appears.
- Verify DB stores only `areaH3`+`geoSeed` (no precise lat/lng, no real H3).
- Rep lookup for a ZIP returns expected officials; cache rows created; stale refetch works.
- Corner collapse/expand + mobile.

## 7. Rollback
- Phase 1/2: git revert (frontend only, instant).
- Phase 3/5: endpoints additive; revert code, leave cache tables.
- Phase 4: additive columns + backfill are reversible; dropping columns only after verification and a DB snapshot.

---

## Approval
Requires explicit approval to: change schema, alter privacy storage, add endpoints, deploy staging, and (separately) production. No production deploy without an explicit command.

---

## 8. Design finalized in discussion (2026-10-29)

### Content classes (two-tier display)
1. **Individual markers** — high-activity/viral posts, tied to the author.
   - Gate: **top ~10% engagement within the viewed area** (adaptive), via `EngagementScoringService`'s score.
   - Ranked with the existing **`ProbabilityFeedService`** weights (recency + similarity + social + trending + reputation × visibility), then
     weighted-random sampled (`probabilitySample`) for variety.
   - Constraints: max 40 markers; **max 2 per author**; 1 per thread.
2. **Aggregated topic bubbles** — "People are talking about X" / "Lively debate about Y".
   - Grouped by **semantic similarity of `Post.embedding`** using the existing `topicService` cosine clustering
     (threshold 0.60–0.70), capturing for/against perspectives within the band.
   - Summarized with Azure OpenAI (**cached**, regenerate on staleness).
   - Aggregated engagement drives cluster score; cluster position = most-recent member's display point
     (or centroid of recent N; display points are ephemeral, so safe). Top 9 bubbles via the same
     probability scoring, including **user interest similarity** (`UserInterestService.buildProfile`).
   - **A bubble's representative post is NOT also shown as an individual marker** (avoids duplication).

### Reused services (no new algorithms)
- `ProbabilityFeedService` (weights, `scorePost`, `probabilitySample`) — extend with an area filter.
- `EngagementScoringService` — virality/engagement.
- `UserInterestService` — user interest vector (guests → neutral defaults).
- `topicService` — embedding cosine clustering.
- `semanticSearchService` / `azureOpenAIService` — embeddings + summaries.
- `ApiCacheService` — cache-first with staleness refetch (summaries + area responses).
- Summaries are the expensive part → dedicated cache keyed by cluster signature + time bucket.

### Data-fetch architecture (prevents resize/pan churn)
- Discrete zoom tiers, each with a fixed geographic query radius:
  T1 National (<5) = whole US · T2 Regional (5–8) = ~300 km · T3 Metro (8–11) = ~60 km · T4 City (≥11) = ~10 km.
- Query area is a function of **(map center, tier)** — **never** the pixel viewport. Resize ⇒ no refetch.
- Cache key = map tier + coarse center bucket; `GeoArea` centroids provide the query area.
  Client cache is per-jurisdiction with a 3-minute TTL; `moveend` clears it only when the
  tier or coarse center bucket changes.
- Layered caches: `GeoArea` (polygons/samples, long-lived) → client topic cache (3 min).
- Debounce `moveend` (~900 ms); one batch request per area (no per-topic calls).

### Recency curve (matches user's spec)
`recency = 0.05 + 0.95 · exp(-ageHours / 72)`, hard cutoff 30 days.
→ ~1.0 now · 0.54 @48h · 0.14 @7d · 0.05 asymptote @30d. (`TAU` tunable.)

### Privacy (implemented 2026-10-30)
- **Implemented: home ZIP + privacy area (ZIP, escalated to county when ZIP population < 50) + `geoSeed` + `geoOptIn`.**
- No precise post coordinates or real H3 are written; the migration nulled legacy values.
- Display coords are chosen at read time from 64 Census-polygon interior samples:
  `samples[(geoSeed + sessionNonce) % 64]` → constant-time, in-area, no stored point.
- Population floor is k-anonymity-style: rural ZIPs with < 50 residents display within the county.
- `geoOptIn` defaults on with disclosure; toggling off hides existing posts from the map.
- Follow-ups: user-selectable privacy level (Standard/High/Maximum), optional public/optional-auth
  map browsing, AI topic bubbles on top of the ranked post pool.

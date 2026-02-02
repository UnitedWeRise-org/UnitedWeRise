# Horizontal Reels Video Sizing — Tracking Document

**Created:** 2026-02-01
**Status:** In Progress

---

## Problem Description

Horizontal (16:9) videos in the reels player appear small with visible black bars instead of filling the available player area. Vertical videos display correctly because their CSS calculates width from height to match the video aspect ratio. Horizontal videos lack an equivalent calculation.

---

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/css/video.css` | Reels player CSS (desktop ~L1477, mobile ~L1585) |
| `frontend/src/modules/features/video/SnippetsDashboard.js` | Reels JS — creates VideoPlayer, applies inline styles |
| `frontend/src/modules/features/video/VideoPlayer.js` | VideoPlayer component — assigns aspect class |

---

## DOM Structure & CSS Cascade

```
.snippets-reels-overlay          (100vw × 94.5vh viewport overlay)
  .snippets-reels-container      (flex container, centers content)
    .snippets-reels-video        (flex child)
      .video-player              (sized by aspect class)
        .video-player--horizontal (the target)
          <video>                (object-fit: contain)
```

### CSS Sizing Chain (before fix)

1. `.snippets-reels-overlay` → `height: calc(100vh - 5.5vh)` = ~94.5vh
2. `.video-player` → `height: 100%; max-width: 100vw`
3. `.video-player--horizontal` → `width: 100%`
4. `<video>` → `object-fit: contain`

Result: Container is 100vw × 94.5vh (much taller than 16:9). Video shrinks inside via `contain`.

---

## Root Cause

The `.video-player` container for horizontal videos is sized **100vw × 94.5vh** — much taller than 16:9. The `<video>` uses `object-fit: contain`, so it renders a correctly-proportioned 16:9 rectangle *inside* the oversized container, leaving large black bars above and below.

Vertical videos don't have this problem because their CSS calculates `width: calc((100vh - 5.5vh) * 9 / 16)` to match the container shape to the video shape. Horizontal videos had no equivalent height calculation — they just used `width: 100%` with no height constraint.

---

## Failed Attempts

| # | Commit | Date | Approach | Why It Failed |
|---|--------|------|----------|---------------|
| 1 | `596d887` | 2026-01-31 | CSS `aspect-ratio: 16/9` + calculated width | Conflicted with inline height override; caused aspect-ratio flicker on navigation |
| 2 | `f5020bc` | 2026-01-31 | Simplified to `width: 100%` (TikTok letterbox) | Correct letterboxing but video appears small — not the desired behavior |
| 3 | `db23350` | 2026-01-31 | Added `width: 100%` to parent `.snippets-reels-video` | Parent was already 100% wide; no visible effect |
| 4 | `c5facbb` | 2026-02-01 | Inline JS `aspect-ratio: unset; height: 100%` + diagnostics | Container fills viewport but video still small inside due to `object-fit: contain` in oversized container |
| fix | `a007845` | 2026-02-01 | Fixed broken `adminDebugger.js` import path in SnippetsDashboard | Side-fix only; diagnostics now work correctly |

---

## Diagnostic Log Findings

From attempt #4 diagnostics (`[REELS-DIAG]` logs):
- Container `offsetHeight` ≈ viewport height (94.5vh)
- Container `offsetWidth` = viewport width
- The container is far taller than 16:9 proportions require
- `object-fit: contain` correctly sizes the video *within* the oversized container, but leaves dead space

---

## Attempt #5: Container-Matching Fix (Current)

**Approach:** Mirror the pattern that works for vertical videos — derive both dimensions so the container matches 16:9.

- For vertical (already works): height = 100%, width = height × 9/16
- For horizontal (the fix): width = min(100%, height × 16/9), height = min(100%, width × 9/16)

On wide screens: `100vw × 9/16` < available height → container becomes exactly 16:9 → video fills it.
On narrow/tall screens: height capped at 100% → width derived from height → still 16:9.

Also removed inline JS overrides (`aspectRatio: unset`, `height: 100%`) that were conflicting with CSS.

**Files changed:**
- `frontend/src/css/video.css` — desktop + mobile horizontal rules
- `frontend/src/modules/features/video/SnippetsDashboard.js` — removed inline style overrides

**Result:** Partially worked — container briefly shows correct 16:9 size then reverts to smaller size when HLS.js attaches media. Percentage-based `100%` resolves differently during flex layout recalculation.

---

## Attempt #5 Revision: Viewport Units Fix (Current)

**Root cause of revert:** `min(100%, ...)` depends on parent flex container height resolution. When HLS.js calls `attachMedia()` and manifest parses, browser recalculates layout, and percentage heights resolve differently in the flex chain.

**Fix:** Replace `100%` with absolute viewport units (`100vw`, `calc(100vh - 5.5vh)`) that resolve to fixed pixel values independent of parent layout. Added `max-width: none` to override base rule's `max-width: 100%`.

**Files changed:**
- `frontend/src/css/video.css` — desktop (L1477-1480) + mobile (L1586-1589) horizontal rules

**Result:** PENDING VERIFICATION

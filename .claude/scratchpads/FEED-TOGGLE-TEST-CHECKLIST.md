# Feed Toggle Enhancement - Testing Checklist

## Pre-Deployment Verification

### File Changes
- [x] `frontend/src/components/FeedToggle.js` - 619 lines (was ~354 lines)
- [x] `frontend/src/styles/feed-toggle.css` - Added ~200 lines of styles
- [x] `frontend/src/handlers/my-feed.js` - No changes (already integrated)
- [x] Backend TypeScript compiles without errors

### Code Review
- [x] All 6 parts implemented
- [x] Error handling on all async operations
- [x] adminDebugLog() used for logging
- [x] No inline console.log (except for errors)
- [x] ES6 module syntax maintained
- [x] No breaking changes to existing functionality

---

## Manual Testing Scenarios

### Scenario 1: New User Experience
**Setup:** Create new test account, don't follow anyone
1. Navigate to My Feed
2. **Expected:** Toggle shows "Discover" as active
3. **Expected:** Green welcome banner appears below toggle
4. **Expected:** Banner says "Welcome to UnitedWeRise!"
5. Try switching to Following
6. **Expected:** Shows empty state message

**Status:** [ ] PASS [ ] FAIL

---

### Scenario 2: Empty Following Feed
**Setup:** Test account that follows 3+ users but they have no recent posts
1. Navigate to My Feed
2. **Expected:** Toggle shows "Discover" as active
3. **Expected:** Orange banner appears saying "Following feed is quiet"
4. Switch to Following
5. **Expected:** Empty state message

**Status:** [ ] PASS [ ] FAIL

---

### Scenario 3: Unread Badge Display
**Setup:** Test account with active Following feed
1. Navigate to My Feed, view Following feed
2. **Expected:** No badge on Following button
3. Switch to Discover feed
4. Wait for badge to update (1-2 seconds)
5. **Expected:** Red badge appears on Following button with number
6. Switch back to Following
7. **Expected:** Badge disappears

**Test Badge Count:**
- [ ] Shows "1" when 1 new post
- [ ] Shows "15" when 15 new posts
- [ ] Shows "99+" when 100+ new posts

**Status:** [ ] PASS [ ] FAIL

---

### Scenario 4: Animated Transitions (Desktop)
**Setup:** Any account on My Feed
1. Start on Discover feed with posts visible
2. Click Following button
3. **Expected:** Old posts fade out (200ms)
4. **Expected:** Loading indicator appears
5. **Expected:** New posts fade in (200ms)
6. **Expected:** Smooth transition, no flashing

**Verify:**
- [ ] Fade out smooth
- [ ] Fade in smooth
- [ ] No layout shift
- [ ] Loading indicator visible

**Status:** [ ] PASS [ ] FAIL

---

### Scenario 5: Swipe Gestures (Mobile)
**Setup:** Use Chrome DevTools mobile emulation OR real mobile device
1. Navigate to My Feed on Discover
2. Swipe LEFT (like swiping to next page)
3. **Expected:** Switches to Following feed
4. Swipe RIGHT (like going back)
5. **Expected:** Switches to Discover feed

**Edge Cases:**
- [ ] Short swipe (<50px) - no feed change
- [ ] Swipe starting on toggle button - no feed change
- [ ] Swipe on same feed - no change
- [ ] Vertical swipe - scrolls normally, no feed change

**Status:** [ ] PASS [ ] FAIL

---

### Scenario 6: Swipe Education (Mobile)
**Setup:** Clear localStorage, use mobile view
1. Navigate to My Feed
2. Wait 2 seconds
3. **Expected:** Toggle wobbles left/right (5px each direction)
4. **Expected:** Animation plays 2 times
5. Wait 3 more seconds (5 seconds total)
6. **Expected:** Tooltip appears: "💡 Swipe to switch feeds"
7. Wait 3 seconds
8. **Expected:** Tooltip auto-dismisses

**Verify One-Time Behavior:**
- [ ] Reload page - wobble should NOT play again
- [ ] Clear `hasSeenSwipeAnimation` from localStorage
- [ ] Reload - wobble plays again (max 1 time)

**Verify Tooltip Max 2 Times:**
- [ ] Reload page again
- [ ] Tooltip shows 2nd time
- [ ] Reload page 3rd time
- [ ] Tooltip does NOT show (max 2)

**Status:** [ ] PASS [ ] FAIL

---

### Scenario 7: Desktop vs Mobile Detection
**Setup:** Test on both desktop and mobile
1. Desktop (>767px width):
   - [ ] No wobble animation
   - [ ] No swipe tooltip
   - [ ] Swipe gestures don't work
   - [ ] Click toggle works normally

2. Mobile (≤767px width):
   - [ ] Wobble animation shows (first time)
   - [ ] Swipe tooltip shows (first 2 times)
   - [ ] Swipe gestures work
   - [ ] Click toggle still works

**Status:** [ ] PASS [ ] FAIL

---

### Scenario 8: Reduced Motion Accessibility
**Setup:** Enable "Reduce Motion" in OS settings
1. Navigate to My Feed
2. Switch between feeds
3. **Expected:** No animations (instant feed switch)
4. **Expected:** Posts appear/disappear instantly
5. **Expected:** No wobble animation
6. **Expected:** Tooltip still shows (not animation)

**How to Enable:**
- **Windows:** Settings → Accessibility → Visual effects → Animation effects OFF
- **macOS:** System Preferences → Accessibility → Display → Reduce motion
- **Chrome DevTools:** Rendering panel → "prefers-reduced-motion: reduce"

**Status:** [ ] PASS [ ] FAIL

---

### Scenario 9: LocalStorage Persistence
**Setup:** Any account on My Feed
1. Switch to Following feed
2. Reload page
3. **Expected:** Following feed still active (persisted)
4. Switch to Discover
5. Reload page
6. **Expected:** Discover feed still active

**Verify localStorage keys:**
- [ ] `preferredFeed` = "following" or "discover"
- [ ] `followingLastView` = ISO timestamp
- [ ] `hasSeenSwipeAnimation` = "true" (after wobble)
- [ ] `swipeHintShownCount` = "0", "1", or "2"

**Status:** [ ] PASS [ ] FAIL

---

### Scenario 10: Error Handling
**Setup:** Simulate API failure
1. Open DevTools → Network tab
2. Block `/feed/following` endpoint
3. Switch to Following feed
4. **Expected:** Error message appears
5. **Expected:** Retry button shows
6. Unblock endpoint, click Retry
7. **Expected:** Feed loads successfully

**Verify Graceful Degradation:**
- [ ] Toggle still renders
- [ ] Error message user-friendly
- [ ] No console errors break page
- [ ] Retry functionality works

**Status:** [ ] PASS [ ] FAIL

---

## Performance Testing

### Load Time
- [ ] Initial page load < 3 seconds
- [ ] Feed switch < 1 second
- [ ] Badge update < 2 seconds
- [ ] No blocking during animations

### Memory Usage
- [ ] No memory leaks after 10+ feed switches
- [ ] Event listeners properly attached/removed
- [ ] Animation classes cleaned up

### Mobile Performance
- [ ] Swipe gestures feel responsive (< 100ms)
- [ ] No lag during swipe
- [ ] Animations smooth (60fps)

**Status:** [ ] PASS [ ] FAIL

---

## Browser Compatibility

### Desktop Browsers
- [ ] Chrome 90+ (Windows/Mac)
- [ ] Firefox 88+ (Windows/Mac)
- [ ] Safari 14+ (Mac)
- [ ] Edge 90+ (Windows)

### Mobile Browsers
- [ ] iOS Safari 14+
- [ ] Chrome Mobile (Android)
- [ ] Samsung Internet
- [ ] Firefox Mobile

**Status:** [ ] PASS [ ] FAIL

---

## Regression Testing

### Existing Features Still Work
- [ ] Feed toggle click switches feeds
- [ ] Posts render correctly
- [ ] Infinite scroll works
- [ ] Post composer works
- [ ] Like/comment actions work
- [ ] Post creation adds to feed
- [ ] Profile links work
- [ ] Photos display correctly

**Status:** [ ] PASS [ ] FAIL

---

## Accessibility Testing

### Screen Reader
- [ ] Toggle buttons announced correctly
- [ ] Badge count announced
- [ ] Banners readable
- [ ] Feed switch announced

### Keyboard Navigation
- [ ] Tab to toggle buttons
- [ ] Enter/Space activates toggle
- [ ] Focus visible (outline)
- [ ] No keyboard traps

### Color Contrast
- [ ] Badge text readable (red bg, white text)
- [ ] Banner text readable
- [ ] Toggle active state clear
- [ ] Tooltip text readable

**Status:** [ ] PASS [ ] FAIL

---

## Console Debug Logs

### Expected Logs (when admin user)
```
FeedToggle initialized with [discover/following] feed
Switching feed from [old] to [new]
Unread count: [number]
Swipe [left/right] detected: switching to [feed]
Reset unread count
```

### No Errors Expected
- [ ] No red errors in console
- [ ] No yellow warnings (except expected)
- [ ] No network failures

**Status:** [ ] PASS [ ] FAIL

---

## Issues Found

### Critical Issues
*List any blocking issues here*

### Minor Issues
*List any non-blocking issues here*

### Enhancement Ideas
*List any improvement suggestions here*

---

## Sign-Off

**Tested By:** ___________________
**Date:** ___________________
**Environment:** [ ] Staging [ ] Production
**Overall Status:** [ ] PASS [ ] FAIL

**Notes:**

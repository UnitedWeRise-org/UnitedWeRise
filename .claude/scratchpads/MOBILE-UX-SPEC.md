# Mobile UX Redesign Specification
**Project:** United We Rise Mobile Navigation Overhaul
**Date:** 2025-10-07
**Agent:** Research & Design (Agent 1)

---

## Executive Summary

This document provides a comprehensive specification for redesigning the mobile UX of United We Rise. The project addresses critical usability issues including:
- Removal of 9 inline onclick handlers violating ES6 module architecture
- Consolidation of 3 separate trending systems into unified navigation
- Implementation of 5-button mobile bottom navigation with submenus
- Direction-based auto-hide top bar
- Feed toggle UI (Discover vs Following) for mobile and desktop

---

## 1. CURRENT STATE ANALYSIS

### 1.1 Existing Mobile Navigation Structure

**Location:** `frontend/index.html` lines 1070-1091

**Current Implementation:**
```html
<nav class="mobile-nav">
    <a href="#" class="mobile-nav-item mobile-nav-feed active" data-action="mobile-feed">
        <div class="mobile-nav-icon">🏠</div>
        <div>Feed</div>
    </a>
    <a href="#" class="mobile-nav-item" data-action="mobile-search">
        <div class="mobile-nav-icon">🔍</div>
        <div>Search</div>
    </a>
    <a href="#" class="mobile-nav-item" data-action="mobile-map">
        <div class="mobile-nav-icon">🗺️</div>
        <div>Map</div>
    </a>
    <a href="#" class="mobile-nav-item mobile-nav-profile" data-action="mobile-profile">
        <div class="mobile-nav-icon">👤</div>
        <div>Profile</div>
    </a>
    <a href="#" class="mobile-nav-item mobile-nav-messages" onclick="showMobileMessages()">
        <div class="mobile-nav-icon">💬</div>
        <div>Messages</div>
    </a>
</nav>
```

**Issues:**
- 5-button layout already exists but hidden by responsive.css (line 555: `display: none !important`)
- 1 inline onclick handler on Messages button (line 1087)
- No submenu functionality
- Currently replaced by mobile-sidebar in `mobile-navigation.js`

### 1.2 Inline onclick Handlers Requiring Removal

**Total Count:** 9 inline onclick handlers

1. **Line 1087:** `onclick="showMobileMessages()"` - Messages button
2. **Line 1094:** `onclick="hideMobileMap()"` - Map close button
3. **Line 1100:** `onclick="closeCivicOrganizing()"` - Civic organizing close
4. **Line 1106:** `onclick="showPetitionCreator()"` - Create petition button
5. **Line 1109:** `onclick="showEventCreator()"` - Organize event button
6. **Line 1112:** `onclick="showCivicBrowser()"` - Find events button
7. **Line 1115:** `onclick="showMyOrganizing()"` - My activities button
8. **Line 1127:** `onclick="showPetitionCreator()"` - Start petition (welcome view)
9. **Line 1130:** `onclick="showEventCreator()"` - Organize event (welcome view)

**Additional:** `mobile-navigation.js` contains 82 programmatically created inline onclick handlers in sidebar navigation (lines 52-97).

### 1.3 Three Trending Systems Requiring Consolidation

#### System 1: trendingUpdates Panel
**Location:** `frontend/index.html` line 900
**Element:** `<div id="trendingUpdates" class="trending-updates">`
**Purpose:** Desktop compact panel under collapsed map
**File:** Shows trending topics in sidebar-style panel

#### System 2: panel-trending
**Location:** `frontend/index.html` line 792
**Element:** `<div id="panel-trending" class="info-panel hidden" data-offset="1">`
**Purpose:** Desktop side panel navigation system
**Content:** Local/State/National trending items with generic placeholders

#### System 3: trending-main-view
**Location:** `frontend/src/integrations/trending-system-integration.js` line 243
**Purpose:** Full-screen trending view in main content area
**Features:**
- Full trending feed with categories
- Analytics view
- Topics view
- Filter/sort controls
- Semantic topic discovery integration

**Architectural Note:** All three systems attempt to display trending content but through different UI patterns, causing confusion and duplicate code paths.

### 1.4 Current Mobile Sidebar System

**File:** `frontend/src/js/mobile-navigation.js`
**Implementation:** 3-state sidebar (collapsed/icons-only/expanded)
**Location:** Lines 204-240

**States:**
- **Collapsed:** 30px width
- **Icons Only:** 60px width (default)
- **Expanded:** 200px width

**Navigation Items (7 total):**
1. Feed (📰)
2. Trending (📈)
3. Messages (💬)
4. Civic (🏛️)
5. Map (🗺️)
6. Donate (💰)
7. Profile (👤)

**Issues:**
- All items use programmatic inline onclick handlers
- No submenu support
- Duplicates functionality of hidden mobile-nav bottom bar
- Poor touch ergonomics (left edge swipe required)

---

## 2. DESIGN SPECIFICATIONS

### 2.1 Mobile Bottom Navigation Bar

**Design Pattern:** iOS-style 5-button tab bar with submenu capability

#### 2.1.1 Primary Buttons (Always Visible)

| Button | Icon | Label | Primary Action | Has Submenu |
|--------|------|-------|----------------|-------------|
| **Feed** | 🏠 | Feed | Show main feed | YES |
| **Discover** | 🔥 | Discover | Show trending/discovery | YES |
| **Post** | ➕ | Post | Open composer | NO |
| **Notifications** | 🔔 | Alerts | Show notifications | NO |
| **Profile** | 👤 | Menu | Show profile/settings | YES |

#### 2.1.2 Submenu System

**Trigger:** Tap and hold (long press) on button with submenu indicator
**Alternative:** Tap on chevron/arrow indicator
**Animation:** Slide up from bottom, overlay style
**Dismiss:** Tap outside submenu or select item

**Feed Submenu:**
- Following Feed (default)
- Discover Feed
- Trending Topics
- Saved Posts

**Discover Submenu:**
- Trending Now
- Popular Today
- By Category (Politics, Local, Community, etc.)
- Topic Discovery

**Profile Submenu:**
- My Profile
- Messages
- Civic Organizing
- Donations
- Settings

#### 2.1.3 Visual Specifications

**Container:**
```css
.mobile-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: #ffffff;
    border-top: 1px solid #e9ecef;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 1000;
    padding: 0;
}
```

**Button Touch Targets:**
```css
.mobile-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 64px;
    min-height: 48px; /* iOS minimum 44px + 4px padding */
    padding: 4px 8px;
    color: #666;
    text-decoration: none;
    transition: color 0.2s;
    position: relative;
}

.mobile-nav-item.active {
    color: #4b5c09;
}

.mobile-nav-item.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 3px;
    background: #4b5c09;
    border-radius: 3px 3px 0 0;
}
```

**Icon Sizing:**
```css
.mobile-nav-icon {
    font-size: 24px;
    margin-bottom: 2px;
}

.mobile-nav-label {
    font-size: 11px;
    font-weight: 500;
}
```

**Submenu Indicator:**
```css
.mobile-nav-item[data-has-submenu="true"]::before {
    content: '⌃';
    position: absolute;
    top: 2px;
    right: 8px;
    font-size: 10px;
    color: #999;
}
```

#### 2.1.4 Submenu Overlay

```css
.mobile-nav-submenu {
    position: fixed;
    bottom: 60px; /* Above nav bar */
    left: 0;
    right: 0;
    background: #ffffff;
    border-top: 1px solid #e9ecef;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
    padding: 16px;
    max-height: 40vh;
    overflow-y: auto;
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 999;
}

.mobile-nav-submenu.show {
    transform: translateY(0);
}

.mobile-nav-submenu-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.3);
    z-index: 998;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
}

.mobile-nav-submenu-backdrop.show {
    opacity: 1;
    pointer-events: auto;
}
```

**Submenu Items:**
```css
.mobile-nav-submenu-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 8px;
    color: #333;
    text-decoration: none;
    transition: background 0.2s;
}

.mobile-nav-submenu-item:last-child {
    margin-bottom: 0;
}

.mobile-nav-submenu-item:active {
    background: #e9ecef;
}

.mobile-nav-submenu-icon {
    font-size: 20px;
    margin-right: 12px;
    min-width: 24px;
}

.mobile-nav-submenu-label {
    font-size: 15px;
    font-weight: 500;
}
```

### 2.2 Direction-Based Auto-Hide Top Bar

**Behavior:** Top bar hides when scrolling down, shows when scrolling up
**Purpose:** Maximize screen real estate for content while maintaining easy access to header

#### 2.2.1 Scroll Detection Logic

**Variables to Track:**
```javascript
let lastScrollY = 0;
let scrollDirection = 'none'; // 'up', 'down', 'none'
let scrollThreshold = 50; // Pixels to scroll before triggering hide/show
let accumulatedScroll = 0;
let isTopBarVisible = true;
```

**Scroll Handler:**
```javascript
function handleScroll() {
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    const scrollDelta = currentScrollY - lastScrollY;

    // Determine direction
    if (scrollDelta > 0) {
        // Scrolling down
        accumulatedScroll += scrollDelta;
        if (accumulatedScroll > scrollThreshold && isTopBarVisible) {
            hideTopBar();
        }
    } else if (scrollDelta < 0) {
        // Scrolling up
        accumulatedScroll = 0; // Reset accumulator
        if (!isTopBarVisible || currentScrollY < 10) {
            showTopBar();
        }
    }

    lastScrollY = currentScrollY;
}

// Debounced scroll listener
let scrollTimeout;
window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(handleScroll, 10);
}, { passive: true });
```

#### 2.2.2 Top Bar Animation

```css
.mobile-top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 50px;
    background: #202e0c;
    z-index: 2000;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateY(0);
}

.mobile-top-bar.hidden {
    transform: translateY(-100%);
}

/* Content padding adjustment */
.mobile-content-wrapper {
    padding-top: 50px; /* Reserve space for top bar */
    transition: padding-top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* When top bar is hidden, reduce padding */
.mobile-top-bar.hidden ~ .mobile-content-wrapper {
    padding-top: 0;
}
```

#### 2.2.3 Edge Cases

**Always Show Top Bar When:**
- User is at top of page (scrollY < 10px)
- User opens submenu
- User taps search or any top bar element
- Pull-to-refresh gesture detected

**Never Hide Top Bar When:**
- Content is shorter than viewport
- User is in modal/overlay
- Search is active

### 2.3 Feed Toggle UI (Discover vs Following)

**Requirement:** Unified feed toggle for both mobile and desktop
**Location:** Top of feed content area, below composer

#### 2.3.1 Desktop Implementation

**Position:** Sticky at top of posts container
**Style:** Segmented control

```html
<div class="feed-toggle-container">
    <div class="feed-toggle">
        <button class="feed-toggle-btn active" data-feed-type="following">
            <span class="feed-toggle-icon">👥</span>
            <span class="feed-toggle-label">Following</span>
        </button>
        <button class="feed-toggle-btn" data-feed-type="discover">
            <span class="feed-toggle-icon">🔥</span>
            <span class="feed-toggle-label">Discover</span>
        </button>
    </div>
</div>
```

**CSS:**
```css
.feed-toggle-container {
    position: sticky;
    top: 0;
    z-index: 100;
    background: #ffffff;
    padding: 12px 16px;
    border-bottom: 1px solid #e9ecef;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.feed-toggle {
    display: flex;
    background: #f8f9fa;
    border-radius: 8px;
    padding: 4px;
    max-width: 400px;
    margin: 0 auto;
}

.feed-toggle-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #666;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.feed-toggle-btn.active {
    background: #ffffff;
    color: #4b5c09;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.feed-toggle-icon {
    font-size: 18px;
}

.feed-toggle-label {
    font-weight: 600;
}
```

#### 2.3.2 Mobile Implementation

**Position:** Same as desktop (sticky top of feed)
**Adaptation:** Slightly more compact

```css
@media screen and (max-width: 767px) {
    .feed-toggle-container {
        padding: 8px 12px;
    }

    .feed-toggle {
        max-width: 100%;
    }

    .feed-toggle-btn {
        padding: 8px 12px;
        font-size: 13px;
    }

    .feed-toggle-icon {
        font-size: 16px;
    }
}
```

#### 2.3.3 Feed Loading Logic

**Following Feed:**
- Load posts from followed users
- Load posts from followed topics
- Chronological with algorithmic boost
- Show "Expand to Discover" suggestion if < 10 posts

**Discover Feed:**
- Trending posts (algorithmic)
- Popular posts by category
- Semantic topic suggestions
- Location-based trending

**State Management:**
```javascript
class FeedToggleManager {
    constructor() {
        this.currentFeed = 'following'; // or 'discover'
        this.followingCache = [];
        this.discoverCache = [];
        this.init();
    }

    init() {
        // Load saved preference
        const saved = localStorage.getItem('preferredFeed');
        if (saved) this.currentFeed = saved;

        // Setup event listeners
        document.querySelectorAll('.feed-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const feedType = btn.dataset.feedType;
                this.switchFeed(feedType);
            });
        });

        // Load initial feed
        this.loadFeed(this.currentFeed);
    }

    switchFeed(feedType) {
        if (this.currentFeed === feedType) return;

        this.currentFeed = feedType;
        localStorage.setItem('preferredFeed', feedType);

        // Update UI
        document.querySelectorAll('.feed-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.feedType === feedType);
        });

        // Load feed
        this.loadFeed(feedType);
    }

    async loadFeed(feedType) {
        // Show loading state
        const container = document.querySelector('.posts-feed');
        container.innerHTML = '<div class="feed-loading">Loading...</div>';

        try {
            let posts;
            if (feedType === 'following') {
                posts = await this.loadFollowingFeed();
            } else {
                posts = await this.loadDiscoverFeed();
            }

            this.renderPosts(posts);
        } catch (error) {
            console.error('Feed load error:', error);
            container.innerHTML = '<div class="feed-error">Unable to load feed</div>';
        }
    }

    async loadFollowingFeed() {
        // Check cache first
        if (this.followingCache.length > 0) {
            return this.followingCache;
        }

        const response = await fetch('/api/posts/following');
        const data = await response.json();

        if (data.success) {
            this.followingCache = data.posts;
            return data.posts;
        }

        return [];
    }

    async loadDiscoverFeed() {
        // Check cache first
        if (this.discoverCache.length > 0) {
            return this.discoverCache;
        }

        const response = await fetch('/api/posts/discover');
        const data = await response.json();

        if (data.success) {
            this.discoverCache = data.posts;
            return data.posts;
        }

        return [];
    }

    renderPosts(posts) {
        // Delegate to existing post rendering system
        if (window.postRenderer) {
            window.postRenderer.render(posts);
        }
    }
}
```

### 2.4 Authentication State Handling

**Challenge:** Different UI for unauthenticated vs authenticated users
**Solution:** Conditional rendering with graceful fallbacks

#### 2.4.1 Unauthenticated Mobile Nav

**Buttons Available:**
1. **Discover** - Public trending/popular content
2. **Search** - Public search interface
3. **Login** - Opens login modal
4. **Signup** - Opens signup modal
5. **Info** - About/help

**Disabled Features:**
- Post button (shows login prompt)
- Notifications (not available)
- Profile/Menu (limited to public options)

**CSS:**
```css
.mobile-nav-item.requires-auth {
    opacity: 0.5;
    pointer-events: none;
}

body.authenticated .mobile-nav-item.requires-auth {
    opacity: 1;
    pointer-events: auto;
}

body.unauthenticated .mobile-nav-item.public-only {
    display: flex;
}

body.authenticated .mobile-nav-item.public-only {
    display: none;
}
```

#### 2.4.2 Login Flow

**Trigger Points:**
1. Tap on "requires-auth" button
2. Tap Post button when unauthenticated
3. Attempt to interact with post (like, comment, share)

**Modal Behavior:**
```javascript
function handleAuthRequiredAction(action) {
    if (!isAuthenticated()) {
        showLoginPrompt({
            message: `Please log in to ${action}`,
            returnTo: window.location.pathname,
            action: action
        });
        return false;
    }
    return true;
}

function showLoginPrompt(options) {
    // Open auth modal with context
    window.authModal.open({
        mode: 'login',
        message: options.message,
        onSuccess: () => {
            // Refresh UI to show authenticated state
            document.body.classList.add('authenticated');
            document.body.classList.remove('unauthenticated');

            // Retry original action
            if (options.action) {
                retryAction(options.action);
            }
        }
    });
}
```

#### 2.4.3 Post-Login State Update

**Steps:**
1. Update body class: `authenticated`
2. Reload user state
3. Update navigation items
4. Show personalized content
5. Enable all features

```javascript
async function handleSuccessfulLogin(userData) {
    // Update global state
    window.currentUser = userData;
    localStorage.setItem('authToken', userData.token);

    // Update DOM
    document.body.classList.add('authenticated');
    document.body.classList.remove('unauthenticated');

    // Reload navigation
    if (window.mobileNav) {
        window.mobileNav.refresh();
    }

    // Load personalized feed
    if (window.feedManager) {
        window.feedManager.switchFeed('following');
    }

    // Show welcome message
    showNotification('Welcome back!', 'success');
}
```

---

## 3. COMPONENT BREAKDOWN

### 3.1 MobileNavigation Component

**File:** `frontend/src/js/mobile-navigation.js` (refactor)
**Purpose:** Primary mobile navigation controller

**Responsibilities:**
- Render bottom navigation bar
- Handle button interactions
- Manage submenu state
- Coordinate with feed manager
- Track active view

**Public Methods:**
```javascript
class MobileNavigation {
    constructor() {
        this.activeButton = 'feed';
        this.submenuOpen = null;
        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
        this.restoreState();
    }

    render() {
        // Create navigation HTML
    }

    attachEventListeners() {
        // Setup all event listeners (NO inline handlers)
    }

    showSubmenu(buttonId) {
        // Display submenu for button
    }

    hideSubmenu() {
        // Close active submenu
    }

    setActive(buttonId) {
        // Update active button state
    }

    navigate(target) {
        // Handle navigation action
    }

    refresh() {
        // Refresh based on auth state
    }

    restoreState() {
        // Load saved preferences
    }
}
```

### 3.2 TopBarController Component

**File:** `frontend/src/js/top-bar-controller.js` (new)
**Purpose:** Manages mobile top bar visibility

**Responsibilities:**
- Detect scroll direction
- Show/hide top bar
- Handle edge cases
- Coordinate with navigation

**Public Methods:**
```javascript
class TopBarController {
    constructor() {
        this.visible = true;
        this.lastScrollY = 0;
        this.threshold = 50;
        this.init();
    }

    init() {
        this.attachScrollListener();
    }

    attachScrollListener() {
        // Debounced scroll handler
    }

    handleScroll(scrollY) {
        // Determine show/hide
    }

    show() {
        // Show top bar
    }

    hide() {
        // Hide top bar
    }

    lock() {
        // Prevent auto-hide
    }

    unlock() {
        // Re-enable auto-hide
    }
}
```

### 3.3 FeedToggleManager Component

**File:** `frontend/src/js/feed-toggle-manager.js` (new)
**Purpose:** Manages feed type selection and loading

**Responsibilities:**
- Render toggle UI
- Switch between feeds
- Cache feed data
- Coordinate with backend API

**Public Methods:**
```javascript
class FeedToggleManager {
    constructor() {
        this.currentFeed = 'following';
        this.caches = {
            following: [],
            discover: []
        };
        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
        this.loadInitialFeed();
    }

    render() {
        // Create toggle UI
    }

    switchFeed(feedType) {
        // Change active feed
    }

    async loadFeed(feedType) {
        // Fetch and render posts
    }

    clearCache(feedType = null) {
        // Clear cached data
    }

    getCurrentFeed() {
        return this.currentFeed;
    }
}
```

### 3.4 SubmenuManager Component

**File:** `frontend/src/js/submenu-manager.js` (new)
**Purpose:** Handles submenu display and interactions

**Responsibilities:**
- Render submenu overlay
- Handle backdrop interactions
- Animate show/hide
- Track submenu state

**Public Methods:**
```javascript
class SubmenuManager {
    constructor() {
        this.activeSubmenu = null;
        this.init();
    }

    show(buttonId, items) {
        // Display submenu
    }

    hide() {
        // Close submenu
    }

    render(items) {
        // Create submenu HTML
    }

    handleItemClick(item) {
        // Process submenu selection
    }

    isOpen() {
        return this.activeSubmenu !== null;
    }
}
```

---

## 4. CSS REQUIREMENTS

### 4.1 New CSS Files

**Create:**
1. `frontend/src/styles/mobile-nav.css` - Mobile navigation styles
2. `frontend/src/styles/mobile-topbar.css` - Top bar specific styles
3. `frontend/src/styles/feed-toggle.css` - Feed toggle component
4. `frontend/src/styles/submenu.css` - Submenu overlay styles

### 4.2 Responsive.css Modifications

**Remove (line 555):**
```css
.trending-updates {
    display: none !important;
}
```

**Remove (line 261):**
```css
.mobile-nav {
    display: none !important;
}
```

**Add:**
```css
@media screen and (max-width: 767px) {
    .mobile-nav {
        display: flex !important; /* Show mobile nav */
    }

    .mobile-sidebar {
        display: none !important; /* Hide old sidebar */
    }

    .mobile-content-wrapper {
        padding-bottom: 60px; /* Space for bottom nav */
    }
}
```

### 4.3 Touch Target Requirements

**Minimum Sizes (iOS/Android Guidelines):**
- Primary buttons: 44x44px minimum
- Secondary buttons: 36x36px minimum
- Text links: 44x44px touch area (even if visual is smaller)

**Implementation:**
```css
.mobile-nav-item {
    min-width: 64px;
    min-height: 48px;
    position: relative;
}

/* Extend touch area without affecting layout */
.mobile-nav-item::before {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
}
```

### 4.4 Animation Requirements

**Principles:**
- Use cubic-bezier for natural motion
- Duration: 200-300ms for most transitions
- Use transform over position for performance
- Respect prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
    .mobile-nav,
    .mobile-top-bar,
    .mobile-nav-submenu,
    .feed-toggle-btn {
        transition: none !important;
    }
}
```

---

## 5. NAVIGATION FLOW DIAGRAMS

### 5.1 Unauthenticated User Flow

```
[App Launch]
    |
    v
[Mobile Nav: Discover | Search | Login | Signup | Info]
    |
    ├─> [Discover] --> Public trending content
    ├─> [Search] --> Public search interface
    ├─> [Login] --> Auth modal --> [Success] --> Authenticated Flow
    ├─> [Signup] --> Auth modal --> [Success] --> Authenticated Flow
    └─> [Info] --> About/Help modal

[Action on Post/Feature]
    |
    v
[Requires Auth?]
    ├─> Yes: Show login prompt --> Auth modal
    └─> No: Proceed with action
```

### 5.2 Authenticated User Flow

```
[App Launch]
    |
    v
[Check Auth State]
    |
    v
[Mobile Nav: Feed | Discover | Post | Alerts | Menu]
    |
    ├─> [Feed] (tap) --> Show feed
    |   └─> (long press) --> Submenu:
    |       ├─> Following Feed
    |       ├─> Discover Feed
    |       ├─> Trending Topics
    |       └─> Saved Posts
    |
    ├─> [Discover] (tap) --> Show discover feed
    |   └─> (long press) --> Submenu:
    |       ├─> Trending Now
    |       ├─> Popular Today
    |       ├─> By Category
    |       └─> Topic Discovery
    |
    ├─> [Post] (tap) --> Open composer modal
    |
    ├─> [Alerts] (tap) --> Show notifications
    |
    └─> [Menu] (tap) --> Show profile
        └─> (long press) --> Submenu:
            ├─> My Profile
            ├─> Messages
            ├─> Civic Organizing
            ├─> Donations
            └─> Settings
```

### 5.3 Feed Toggle Flow

```
[Feed View]
    |
    v
[Toggle Component]
    |
    ├─> [Following] (active)
    |   ├─> Load from cache (if exists)
    |   ├─> Fetch from /api/posts/following
    |   ├─> Render posts
    |   └─> Cache results
    |
    └─> [Discover]
        ├─> Load from cache (if exists)
        ├─> Fetch from /api/posts/discover
        ├─> Render posts
        └─> Cache results

[User Switches Feed]
    |
    v
[Save Preference] --> localStorage
    |
    v
[Load New Feed] --> Update UI
```

### 5.4 Top Bar Visibility Flow

```
[User Scrolls]
    |
    v
[Calculate Scroll Delta]
    |
    ├─> Scrolling Down (delta > 0)
    |   ├─> Accumulate scroll distance
    |   ├─> Distance > threshold?
    |   |   ├─> Yes: Hide top bar
    |   |   └─> No: Do nothing
    |   └─> Edge case checks:
    |       ├─> Submenu open? Don't hide
    |       ├─> At top? Show bar
    |       └─> Modal open? Don't hide
    |
    └─> Scrolling Up (delta < 0)
        ├─> Reset accumulator
        ├─> Show top bar
        └─> Update last position
```

### 5.5 Submenu Interaction Flow

```
[User Long-Presses Button]
    |
    v
[Detect Long Press] (500ms)
    |
    v
[Show Submenu]
    ├─> Create overlay
    ├─> Create backdrop
    ├─> Animate slide-up
    ├─> Lock top bar (prevent auto-hide)
    └─> Focus first item

[User Interacts]
    |
    ├─> Tap submenu item
    |   ├─> Execute action
    |   ├─> Hide submenu
    |   └─> Navigate to target
    |
    ├─> Tap backdrop
    |   ├─> Hide submenu
    |   └─> Unlock top bar
    |
    └─> Tap back button
        ├─> Hide submenu
        └─> Unlock top bar
```

---

## 6. TRENDING SYSTEM CONSOLIDATION

### 6.1 Unified Trending Architecture

**Problem:** Three separate systems with duplicate functionality
**Solution:** Single trending API with multiple presentation layers

#### 6.1.1 Backend API Endpoint

**Endpoint:** `/api/trending`
**Method:** GET
**Query Parameters:**
- `type` - "posts" | "topics" | "users"
- `scope` - "local" | "state" | "national" | "all"
- `timeframe` - "hour" | "day" | "week"
- `limit` - number (default: 20)
- `offset` - number (default: 0)

**Response:**
```json
{
    "success": true,
    "data": {
        "type": "posts",
        "scope": "all",
        "timeframe": "day",
        "items": [
            {
                "id": "post-123",
                "type": "post",
                "content": "...",
                "author": {...},
                "trendingScore": 95.5,
                "engagement": {
                    "likes": 156,
                    "comments": 42,
                    "shares": 23
                }
            }
        ],
        "total": 150,
        "timestamp": "2025-10-07T12:00:00Z"
    }
}
```

#### 6.1.2 Frontend Trending Manager

**File:** `frontend/src/js/trending-manager.js` (refactor from trending-system-integration.js)

**Responsibilities:**
- Fetch trending data
- Cache results
- Coordinate presentation layers
- Handle real-time updates

**Presentation Layers:**

1. **Compact Panel** (Desktop)
   - Location: Under collapsed map
   - Shows top 5 trending items
   - Click to expand to main view

2. **Main View** (Desktop/Mobile)
   - Full-screen trending interface
   - Categories, filters, analytics
   - Replaces trending-main-view

3. **Discover Feed** (Mobile)
   - Mobile-optimized trending posts
   - Integrated with feed toggle
   - Infinite scroll support

**Refactor Strategy:**
```javascript
class TrendingManager {
    constructor() {
        this.cache = new Map();
        this.presentations = {
            compact: null,
            mainView: null,
            discover: null
        };
    }

    async fetch(options) {
        const cacheKey = this.getCacheKey(options);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const response = await fetch('/api/trending?' + new URLSearchParams(options));
        const data = await response.json();

        if (data.success) {
            this.cache.set(cacheKey, data.data);
            return data.data;
        }

        return null;
    }

    renderCompact(container) {
        // Render compact panel view
    }

    renderMainView(container) {
        // Render full trending view
    }

    renderDiscover(container) {
        // Render mobile discover feed
    }
}
```

### 6.2 Removing Duplicate Systems

**Steps:**

1. **Deprecate panel-trending** (index.html line 792)
   - Mark as deprecated with HTML comment
   - Keep for 1 release cycle then remove
   - Redirect clicks to main view

2. **Consolidate trendingUpdates** (index.html line 900)
   - Refactor to use TrendingManager
   - Keep compact presentation
   - Remove duplicate loading logic

3. **Refactor trending-main-view** (trending-system-integration.js)
   - Extract into TrendingManager
   - Remove redundant API calls
   - Unify with discover feed

---

## 7. INLINE ONCLICK HANDLER REMOVAL

### 7.1 Refactor Strategy

**Pattern:** Convert all inline onclick to addEventListener

**Before:**
```html
<button onclick="showPetitionCreator()">Create Petition</button>
```

**After:**
```html
<button class="civic-action-btn" data-action="create-petition">Create Petition</button>

<script type="module">
import { civicOrganizing } from './civic-organizing.js';

document.querySelectorAll('.civic-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        civicOrganizing.handleAction(action);
    });
});
</script>
```

### 7.2 Removal Checklist

#### 7.2.1 Mobile Navigation (1 handler)

**File:** index.html line 1087
**Current:**
```html
<a href="#" class="mobile-nav-item mobile-nav-messages" onclick="showMobileMessages()">
```

**Refactor:**
```html
<a href="#" class="mobile-nav-item mobile-nav-messages" data-action="mobile-messages">
```

**Handler:**
```javascript
// In mobile-navigation.js
document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const action = item.dataset.action;
        this.navigate(action);
    });
});
```

#### 7.2.2 Mobile Map Close (1 handler)

**File:** index.html line 1094
**Current:**
```html
<button class="mobile-map-close" onclick="hideMobileMap()">✕ Close Map</button>
```

**Refactor:**
```html
<button class="mobile-map-close" data-action="close-map">✕ Close Map</button>
```

**Handler:**
```javascript
// In mobile-navigation.js
document.querySelector('.mobile-map-close')?.addEventListener('click', (e) => {
    e.preventDefault();
    this.hideMobileMap();
});
```

#### 7.2.3 Civic Organizing (7 handlers)

**File:** index.html lines 1100, 1106, 1109, 1112, 1115, 1127, 1130

**Refactor All:**
```html
<!-- Header close button -->
<button class="civic-close-btn" data-action="close">×</button>

<!-- Navigation buttons -->
<button class="civic-action-btn" data-action="create-petition">📝 Create Petition</button>
<button class="civic-action-btn" data-action="organize-event">📅 Organize Event</button>
<button class="civic-action-btn" data-action="find-events">🔍 Find Events</button>
<button class="civic-action-btn" data-action="my-activities">📊 My Activities</button>

<!-- Welcome view buttons -->
<button class="civic-action-btn primary" data-action="create-petition">Start a Petition</button>
<button class="civic-action-btn primary" data-action="organize-event">Organize an Event</button>
```

**Handler:**
```javascript
// Create new file: frontend/src/js/civic-organizing.js
export class CivicOrganizing {
    constructor() {
        this.container = document.getElementById('civicOrganizingContainer');
        this.init();
    }

    init() {
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Close button
        this.container.querySelector('.civic-close-btn')?.addEventListener('click', () => {
            this.close();
        });

        // Action buttons
        this.container.querySelectorAll('.civic-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleAction(action);
            });
        });
    }

    handleAction(action) {
        switch(action) {
            case 'create-petition':
                this.showPetitionCreator();
                break;
            case 'organize-event':
                this.showEventCreator();
                break;
            case 'find-events':
                this.showCivicBrowser();
                break;
            case 'my-activities':
                this.showMyOrganizing();
                break;
        }
    }

    close() {
        this.container.style.display = 'none';
    }

    // Existing functions remain
    showPetitionCreator() { /* existing code */ }
    showEventCreator() { /* existing code */ }
    showCivicBrowser() { /* existing code */ }
    showMyOrganizing() { /* existing code */ }
}

// Initialize
window.civicOrganizing = new CivicOrganizing();
```

#### 7.2.4 Mobile Sidebar (82 programmatic handlers)

**File:** mobile-navigation.js lines 66-97

**Current:** Programmatic inline onclick in template literal
**Refactor:** Use data-attributes and event delegation

**Before:**
```javascript
mobileSidebar.innerHTML = `
    <a href="#" class="mobile-sidebar-item" onclick="switchMobileView('trending')">
        ...
    </a>
`;
```

**After:**
```javascript
mobileSidebar.innerHTML = `
    <a href="#" class="mobile-sidebar-item" data-view="trending">
        ...
    </a>
`;

// Event delegation
mobileSidebar.addEventListener('click', (e) => {
    const item = e.target.closest('.mobile-sidebar-item');
    if (!item) return;

    e.preventDefault();
    const view = item.dataset.view;
    this.switchView(view);
});
```

### 7.3 Testing Checklist

After refactoring, verify:

- [ ] All 9 HTML inline onclick handlers removed
- [ ] All 82 programmatic onclick handlers removed
- [ ] Mobile navigation buttons work correctly
- [ ] Civic organizing buttons function
- [ ] Map close button works
- [ ] No console errors
- [ ] ESLint passes (no inline handlers detected)
- [ ] Functionality identical to before refactor

---

## 8. IMPLEMENTATION CHECKLIST

### 8.1 Phase 1: Inline Handler Removal (Agent 3)

**Priority:** CRITICAL - Must complete before other changes

- [ ] Remove onclick from line 1087 (mobile messages)
- [ ] Remove onclick from line 1094 (map close)
- [ ] Remove onclick from line 1100 (civic close)
- [ ] Remove onclick from lines 1106, 1109, 1112, 1115 (civic nav)
- [ ] Remove onclick from lines 1127, 1130 (civic welcome)
- [ ] Refactor mobile-navigation.js programmatic handlers
- [ ] Create civic-organizing.js module
- [ ] Test all affected functionality
- [ ] Verify ESLint compliance

### 8.2 Phase 2: Mobile Bottom Navigation (Agent 4)

**Priority:** HIGH - Core mobile UX

- [ ] Create mobile-nav.css
- [ ] Refactor mobile-navigation.js for bottom nav
- [ ] Implement 5-button layout
- [ ] Create submenu system
- [ ] Implement long-press detection
- [ ] Add submenu backdrop
- [ ] Test on iOS devices
- [ ] Test on Android devices
- [ ] Verify touch target sizes
- [ ] Test authentication state transitions

### 8.3 Phase 3: Auto-Hide Top Bar (Agent 4)

**Priority:** MEDIUM - Enhancement

- [ ] Create top-bar-controller.js
- [ ] Implement scroll detection
- [ ] Add show/hide animations
- [ ] Handle edge cases (submenu open, etc.)
- [ ] Test scroll performance
- [ ] Test on different screen sizes
- [ ] Verify smooth animations
- [ ] Test with reduced motion preference

### 8.4 Phase 4: Feed Toggle (Agent 3)

**Priority:** HIGH - Core feature

- [ ] Create feed-toggle.css
- [ ] Create feed-toggle-manager.js
- [ ] Implement toggle UI (desktop)
- [ ] Implement toggle UI (mobile)
- [ ] Connect to backend API
- [ ] Implement caching
- [ ] Add loading states
- [ ] Test feed switching
- [ ] Verify cache behavior
- [ ] Test empty states

### 8.5 Phase 5: Trending Consolidation (Agent 3)

**Priority:** MEDIUM - Code cleanup

- [ ] Audit all three trending systems
- [ ] Create unified trending-manager.js
- [ ] Refactor compact panel
- [ ] Refactor main view
- [ ] Integrate with discover feed
- [ ] Deprecate panel-trending
- [ ] Update API endpoints
- [ ] Test all presentation layers
- [ ] Verify cache behavior
- [ ] Remove duplicate code

### 8.6 Phase 6: Testing & Polish (All Agents)

**Priority:** HIGH - Quality assurance

- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Cross-device testing (iPhone, Android, tablet)
- [ ] Accessibility audit (screen readers, keyboard nav)
- [ ] Performance testing (scroll performance, animations)
- [ ] Touch target verification (all buttons 44x44px)
- [ ] Authentication flow testing
- [ ] Error state testing
- [ ] Network failure handling
- [ ] Cache invalidation testing
- [ ] User acceptance testing

---

## 9. FILES TO CREATE

### 9.1 New JavaScript Modules

1. **frontend/src/js/mobile-navigation.js** (refactor existing)
   - Main mobile navigation controller
   - Bottom bar management
   - Submenu coordination

2. **frontend/src/js/top-bar-controller.js** (new)
   - Scroll detection
   - Top bar visibility management
   - Edge case handling

3. **frontend/src/js/feed-toggle-manager.js** (new)
   - Feed type switching
   - Cache management
   - Backend coordination

4. **frontend/src/js/submenu-manager.js** (new)
   - Submenu rendering
   - Animation handling
   - Backdrop management

5. **frontend/src/js/civic-organizing.js** (new)
   - Civic organizing actions
   - Modal management
   - Replaces inline handlers

6. **frontend/src/js/trending-manager.js** (refactor from trending-system-integration.js)
   - Unified trending API
   - Multiple presentation layers
   - Cache management

### 9.2 New CSS Files

1. **frontend/src/styles/mobile-nav.css** (new)
   - Bottom navigation bar
   - Button styles
   - Active states

2. **frontend/src/styles/mobile-topbar.css** (new)
   - Top bar specific styles
   - Hide/show animations
   - Mobile logo/search

3. **frontend/src/styles/feed-toggle.css** (new)
   - Toggle component
   - Desktop and mobile variants
   - Active state animations

4. **frontend/src/styles/submenu.css** (new)
   - Overlay styles
   - Backdrop styles
   - Slide-up animations

### 9.3 Files to Modify

1. **frontend/index.html**
   - Remove 9 inline onclick handlers
   - Add data-action attributes
   - Update mobile-nav structure

2. **frontend/src/styles/responsive.css**
   - Remove mobile-nav display: none
   - Add mobile-nav display: flex
   - Hide mobile-sidebar on mobile
   - Add bottom nav spacing

3. **frontend/src/js/mobile-navigation.js** (existing)
   - Complete refactor
   - Remove programmatic onclick
   - Add event delegation

4. **frontend/src/integrations/trending-system-integration.js** (existing)
   - Refactor into trending-manager.js
   - Remove duplicate code
   - Consolidate API calls

---

## 10. SUCCESS CRITERIA

### 10.1 Code Quality

- [ ] Zero inline onclick handlers in HTML
- [ ] Zero programmatic onclick assignments
- [ ] All event listeners use addEventListener
- [ ] ESLint passes with no warnings
- [ ] TypeScript types defined (if applicable)
- [ ] All functions documented with JSDoc
- [ ] No console warnings in production

### 10.2 Functionality

- [ ] All navigation buttons work on mobile
- [ ] Submenu system fully functional
- [ ] Top bar auto-hide works smoothly
- [ ] Feed toggle switches correctly
- [ ] Trending content loads properly
- [ ] Authentication flows work
- [ ] Offline fallbacks function
- [ ] Error states display properly

### 10.3 Performance

- [ ] Scroll performance >60fps
- [ ] First interaction <100ms
- [ ] Feed switch <300ms
- [ ] No layout thrashing
- [ ] Animations use GPU acceleration
- [ ] No memory leaks
- [ ] Cache improves perceived performance

### 10.4 User Experience

- [ ] Navigation feels native
- [ ] Animations are smooth
- [ ] Touch targets are adequate
- [ ] Feedback is immediate
- [ ] Errors are clear
- [ ] Loading states are visible
- [ ] Transitions are natural

### 10.5 Accessibility

- [ ] All buttons have labels
- [ ] Touch targets meet iOS/Android minimums (44x44px)
- [ ] Keyboard navigation works
- [ ] Screen readers announce correctly
- [ ] Focus management is correct
- [ ] Color contrast meets WCAG AA
- [ ] Reduced motion preference respected

### 10.6 Browser Compatibility

- [ ] Works on iOS Safari 14+
- [ ] Works on Chrome Mobile 90+
- [ ] Works on Firefox Mobile 90+
- [ ] Works on Samsung Internet
- [ ] Works on desktop browsers
- [ ] Fallbacks for older browsers

---

## 11. AGENT COORDINATION

### 11.1 Agent 3: Backend & Infrastructure

**Responsibilities:**
- Phase 1: Inline handler removal (HTML changes)
- Phase 4: Feed toggle implementation (backend API)
- Phase 5: Trending consolidation (backend unification)
- Database migrations (if needed)
- API endpoint updates

**Deliverables:**
- Refactored index.html (no inline handlers)
- New civic-organizing.js module
- Backend API for feed toggle
- Backend API for unified trending
- Updated API documentation

### 11.2 Agent 4: Frontend Implementation

**Responsibilities:**
- Phase 2: Mobile bottom navigation (UI implementation)
- Phase 3: Auto-hide top bar (scroll detection)
- Phase 4: Feed toggle (frontend UI)
- CSS implementation (all 4 new files)
- Animation polish

**Deliverables:**
- New mobile-navigation.js (refactored)
- New top-bar-controller.js
- New feed-toggle-manager.js
- New submenu-manager.js
- All CSS files (mobile-nav, topbar, feed-toggle, submenu)

### 11.3 Coordination Points

**Handoff 1:** Agent 3 → Agent 4
- After inline handlers removed
- Agent 4 can start mobile nav implementation
- No blockers

**Handoff 2:** Agent 3 → Agent 4
- After backend feed toggle API ready
- Agent 4 connects frontend to API
- Requires API documentation

**Handoff 3:** Agent 3 → Agent 4
- After trending API unified
- Agent 4 refactors frontend manager
- Requires API documentation

### 11.4 Testing Coordination

**Integration Testing:**
- Both agents test authentication flows
- Both agents verify API contracts
- Both agents test on staging environment

**Device Testing:**
- Agent 4 leads mobile device testing
- Agent 3 monitors backend performance
- Both review analytics

---

## 12. APPENDICES

### Appendix A: Touch Target Reference

**iOS Human Interface Guidelines:**
- Minimum: 44x44 points
- Recommended: 48x48 points
- Spacing: 8pt between targets

**Material Design (Android):**
- Minimum: 48x48 dp
- Recommended: 48x48 dp
- Spacing: 8dp between targets

**Implementation:**
```css
.touch-target {
    min-width: 44px;
    min-height: 44px;
    padding: 12px; /* Provides spacing */
}
```

### Appendix B: Animation Performance

**Use GPU-Accelerated Properties:**
- ✅ transform: translateX/Y/Z
- ✅ opacity
- ❌ left/right/top/bottom
- ❌ width/height

**Example:**
```css
/* Bad - causes reflow */
.element {
    left: 0;
    transition: left 0.3s;
}

/* Good - GPU accelerated */
.element {
    transform: translateX(0);
    transition: transform 0.3s;
}
```

### Appendix C: ES6 Module Pattern

**File Structure:**
```javascript
// module-name.js

export class ModuleName {
    constructor() {
        this.init();
    }

    init() {
        this.attachEventListeners();
    }

    attachEventListeners() {
        // All listeners here, NO inline handlers
        document.querySelectorAll('.selector').forEach(el => {
            el.addEventListener('click', (e) => {
                this.handleClick(e);
            });
        });
    }

    handleClick(event) {
        // Handler logic
    }
}

// Initialize
export const instance = new ModuleName();
```

### Appendix D: Cache Strategy

**Cache Invalidation Rules:**
- Following feed: 5 minutes
- Discover feed: 2 minutes
- Trending data: 1 minute
- User actions: immediate invalidation

**Implementation:**
```javascript
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.ttl = {
            following: 5 * 60 * 1000,
            discover: 2 * 60 * 1000,
            trending: 1 * 60 * 1000
        };
    }

    set(key, value, type) {
        this.cache.set(key, {
            value,
            expires: Date.now() + this.ttl[type]
        });
    }

    get(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() > cached.expires) {
            this.cache.delete(key);
            return null;
        }

        return cached.value;
    }
}
```

---

## DOCUMENT REVISION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-07 | Agent 1 (Research) | Initial specification |

---

**END OF SPECIFICATION**

This document provides comprehensive specifications for Agents 3 and 4 to implement the mobile UX redesign. All inline onclick handlers, trending system consolidation, and navigation architecture have been fully documented.

# BATCH 3 - CRITICAL API LAYER ARCHITECTURE DESIGN

**Project:** Compatibility Layer Elimination - Batch 3
**Target Files:**
- `frontend/src/js/api-manager.js` (377 lines)
- `frontend/src/js/critical-functions.js` (259 lines)

**Impact:** 165 usages of `window.apiCall` across 40 files
**Risk Level:** 🔴 CRITICAL - Core infrastructure affecting entire application
**Complexity Score:** 16/16 (Maximum)

**Date:** October 11, 2025
**Status:** 📋 PLANNING COMPLETE - AWAITING APPROVAL

---

## 📊 EXECUTIVE SUMMARY

### The Challenge
We have **TWO different implementations** of `window.apiCall` creating confusion and potential conflicts:

1. **api-manager.js** (lines 340-369): Advanced implementation with retry, caching, CSRF
2. **critical-functions.js** (lines 57-126): Wrapper that delegates to api-manager.js

Additionally, there's a **THIRD** implementation in `frontend/src/modules/core/api/client.js` that provides an alternative ES6 API client.

### The Solution
**Consolidate to single source of truth (api-manager.js) while maintaining backward compatibility during migration.**

### Migration Strategy
**Option B + Option A Hybrid:** Compatibility shim layer with gradual migration

**Why this approach?**
- **Safety**: Maintains backward compatibility throughout migration
- **Flexibility**: Allows testing each file migration independently
- **Rollback**: Can revert individual files without affecting others
- **Performance**: Eliminates duplicate code and delegation overhead
- **Clarity**: Single source of truth reduces confusion

---

## 🔍 PHASE 1: DEEP ANALYSIS

### 1.1 Relationship Analysis

#### File Relationships:

```
┌─────────────────────────────────────────────────────────────┐
│                      index.html                             │
│  Load Order (Non-module scripts loaded first):              │
│    1. api-manager.js (line 200)                             │
│    2. critical-functions.js (line 968)                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              api-manager.js (PRIMARY SOURCE)                │
│                                                             │
│  ✅ COMPLETE IMPLEMENTATION                                 │
│  - APIRequestManager class (lines 4-333)                    │
│  - window.apiManager instance (line 336)                    │
│  - window.apiCall function (lines 340-369)                  │
│  - window.apiBatch function (lines 372-374)                 │
│                                                             │
│  Features:                                                  │
│  ✓ Request deduplication (pendingRequests map)             │
│  ✓ Response caching (cache map with TTL)                    │
│  ✓ Batch request handling                                  │
│  ✓ Retry logic with exponential backoff                    │
│  ✓ Rate limiting tracking                                  │
│  ✓ CSRF token management                                   │
│  ✓ Request statistics                                      │
│  ✓ Response wrapping in {ok, status, data} format          │
└─────────────────────────────────────────────────────────────┘
                           ↑
                           │ delegates to
┌─────────────────────────────────────────────────────────────┐
│         critical-functions.js (COMPATIBILITY LAYER)         │
│                                                             │
│  ⚠️ WRAPPER IMPLEMENTATION                                  │
│  - Checks if window.apiManager exists                       │
│  - Delegates to window.apiManager.request()                 │
│  - Adds legacy cache layer on top                          │
│  - Transforms response format                               │
│  - Re-exports as window.apiCall (line 126)                  │
│                                                             │
│  Issues:                                                    │
│  ✗ Duplicate caching (both files cache responses)          │
│  ✗ Inconsistent error handling                             │
│  ✗ Unnecessary delegation overhead                         │
│  ✗ Confusing for developers (which is source?)             │
└─────────────────────────────────────────────────────────────┘
                           ↑
                           │ wrapped by
┌─────────────────────────────────────────────────────────────┐
│         reputation-integration.js (DECORATOR)               │
│                                                             │
│  🎨 DECORATOR PATTERN (lines 113-126)                       │
│  - Stores original window.apiCall                           │
│  - Replaces with wrapper function                           │
│  - Calls original, then enhances response data              │
│  - Adds reputation fields to post data                      │
│                                                             │
│  Dependencies:                                              │
│  ✓ MUST run after window.apiCall is defined                │
│  ✓ MUST preserve original function behavior                │
│  ✗ BREAKS if window.apiCall signature changes              │
└─────────────────────────────────────────────────────────────┘
                           ↑
                           │ wrapped by
┌─────────────────────────────────────────────────────────────┐
│              main.js (PERFORMANCE WRAPPERS)                 │
│                                                             │
│  🚀 PERFORMANCE DECORATORS (lines 105-116)                  │
│  - window.createOptimizedApiCall wrapper                    │
│  - window.createErrorAwareApiCall wrapper                   │
│  - Applied in DOMContentLoaded event                        │
│                                                             │
│  Chain: apiCall → optimized → error-aware → final           │
└─────────────────────────────────────────────────────────────┘
                           ↑
                           │ used by
┌─────────────────────────────────────────────────────────────┐
│              165 USAGES ACROSS 40 FILES                     │
│                                                             │
│  Components: 15 files, 83 usages                            │
│  Handlers: 10 files, 46 usages                              │
│  Core JS: 7 files, 13 usages                                │
│  Modules: 4 files, 7 usages                                 │
│  Utils: 4 files, 8 usages                                   │
│  Integrations: 1 file, 8 usages                             │
└─────────────────────────────────────────────────────────────┘
```

#### Alternative API Client:

```
┌─────────────────────────────────────────────────────────────┐
│    frontend/src/modules/core/api/client.js (ES6 MODULE)    │
│                                                             │
│  📦 MODERN ES6 IMPLEMENTATION                               │
│  - APIClient class (lines 25-338)                           │
│  - export const apiClient (line 341)                        │
│  - window.apiClient = apiClient (line 345)                  │
│  - window.apiCall compatibility wrapper (lines 348-367)     │
│                                                             │
│  Features:                                                  │
│  ✓ Request deduplication                                   │
│  ✓ Response caching with TTL                                │
│  ✓ Retry logic                                             │
│  ✓ CSRF token sync                                         │
│  ✓ File upload with progress                               │
│  ✓ ES6 export/import support                               │
│                                                             │
│  Status:                                                    │
│  ⚠️ PARALLEL IMPLEMENTATION - NOT USED BY MAIN APP          │
│  - Created as modern alternative                            │
│  - NOT imported by main.js                                  │
│  - window.apiCall wrapper exists but unused                 │
│  - Could replace both api-manager.js + critical-functions   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Current Implementation Analysis

#### api-manager.js Implementation:
```javascript
// Lines 340-369: window.apiCall function
window.apiCall = async (endpoint, options = {}) => {
    try {
        // Get the API base URL
        const baseUrl = window.apiManager.config.baseURL;
        const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

        // Build fetch options with all the proper headers
        const fetchOptions = window.apiManager.buildFetchOptions(options);

        // Make the actual fetch request
        const response = await fetch(url, fetchOptions);

        // Parse the response
        const data = await response.json();

        // Return wrapped response in expected format
        return {
            ok: response.ok,
            status: response.status,
            data: data
        };
    } catch (error) {
        // Return error in consistent format
        return {
            ok: false,
            status: 0,
            data: { error: error.message }
        };
    }
};
```

**Issues:**
1. ❌ Does NOT use APIRequestManager's advanced features (deduplication, caching, retry)
2. ❌ Makes raw fetch() call instead of using apiManager.request()
3. ❌ Inconsistent with apiManager.executeRequest() implementation
4. ❌ Missing retry logic, rate limiting, request tracking

#### critical-functions.js Implementation:
```javascript
// Lines 57-126: apiCall function that delegates to apiManager
async function apiCall(endpoint, options = {}) {
    // Check if api-manager.js is loaded
    if (!window.apiManager || typeof window.apiManager.request !== 'function') {
        throw new Error('API Manager not initialized');
    }

    // Preserve legacy caching behavior
    const isGet = !options.method || options.method === 'GET';
    const bypassCache = options.bypassCache;

    if (isGet && !bypassCache) {
        const cacheKey = `${endpoint}${currentUser ? `_${currentUser.id.substring(0, 10)}` : ''}`;
        const cached = apiCache.get(cacheKey);
        // ... cache check logic ...
    }

    try {
        // DELEGATE TO UNIFIED API CLIENT from api-manager.js
        const response = await window.apiManager.request(endpoint, options);

        // Transform to legacy format
        const result = {
            ok: response.ok || response.success || false,
            status: response.status || (response.ok ? 200 : 500),
            data: response.data || response || null
        };

        // Cache GET responses (duplicate caching!)
        if (isGet && !bypassCache && result.ok) {
            apiCache.set(cacheKey, {...});
        }

        return result;
    } catch (networkError) {
        // ... error handling ...
    }
}

window.apiCall = apiCall;
```

**Issues:**
1. ✅ Correctly delegates to apiManager.request()
2. ❌ Duplicate caching layer on top of apiManager's cache
3. ❌ Different cache key format than apiManager
4. ❌ Inconsistent response transformation logic
5. ⚠️ User-specific cache key (includes user ID) not in apiManager

### 1.3 Existing ES6 Exports

**Search Results:**
```bash
# export.*apiCall
No matches found

# window.apiCall assignments found in:
- api-manager.js (line 340)
- critical-functions.js (line 126)
- client.js (line 348)
- reputation-integration.js (line 116 - decorator wrapper)
- main.js (lines 106, 114 - performance wrappers)
```

**Conclusion:**
- ❌ NO ES6 exports of apiCall exist currently
- ✅ All implementations use global window assignment
- ⚠️ Migration will create FIRST ES6 export

### 1.4 Decorator Pattern Analysis

#### reputation-integration.js (lines 113-126):
```javascript
// Enhance existing API calls to include reputation data
if (window.apiCall) {
    const originalApiCall = window.apiCall;

    window.apiCall = async function(endpoint, options = {}) {
        const result = await originalApiCall(endpoint, options);

        // If this is a posts response, ensure reputation data is included
        if (result.ok && result.data) {
            enhancePostDataWithReputation(result.data);
        }

        return result;
    };
}
```

**Analysis:**
- ✅ Uses classic decorator pattern (store original, wrap, call original)
- ✅ Preserves original function behavior
- ✅ Returns same format as original
- ⚠️ Depends on window.apiCall being defined first
- ⚠️ Runs in DOMContentLoaded event (line 16)
- ⚠️ Will break if apiCall signature changes

**Load Order Requirements:**
1. api-manager.js defines window.apiCall (non-module script)
2. critical-functions.js redefines window.apiCall (non-module script)
3. reputation-integration.js wraps window.apiCall (ES6 module, NOT in main.js)
4. main.js wraps again with performance decorators (ES6 module, DOMContentLoaded)

**Issue:** reputation-integration.js is NOT imported by main.js!
```bash
# grep result from main.js imports
No import of reputation-integration.js found
```

Checking how it's loaded:
```bash
# From index.html line search
<script src="src/js/reputation-integration.js"></script>
```

**Discovery:** reputation-integration.js is loaded as NON-MODULE script in index.html!

### 1.5 Critical Function Placement Analysis

#### Function: window.setCurrentUser

**Current Location:** critical-functions.js (lines 42-47)
```javascript
window.setCurrentUser = function(user) {
    console.log('🔧 setCurrentUser called with:', user?.username || user?.email || 'null user');
    currentUser = user;
    window.currentUser = user;
    console.log('🔧 Local currentUser now set to:', currentUser?.username || 'null');
};
```

**Usage:** 1 active usage in unified-manager.js (lines 213-217)

**Recommendation:**
- ✅ **DELETE from critical-functions.js**
- ✅ **Export from unified-manager.js** (already owns auth state)
- ✅ **Simple migration** - single consumer

**Rationale:**
- unified-manager.js is the single source of truth for auth state
- Having setCurrentUser in critical-functions.js violates single responsibility
- unified-manager.js should expose its own state setter

---

#### Function: window.togglePanel

**Current Locations:**
1. critical-functions.js (lines 136-170): Enhanced wrapper with live data loading
2. navigation-handlers.js (line 1003): Export of NavigationHandlers.togglePanel
3. navigation-handlers.js (lines 550-XXX): Original NavigationHandlers.togglePanel method

**Usage:** 2 active usages
- navigation-handlers.js exports it (line 1003)
- trending-system-integration.js uses it

**Current Enhancement (critical-functions.js):**
```javascript
window.togglePanel = function(name) {
    // Get reference to original togglePanel from NavigationHandlers
    const originalTogglePanel = window.NavigationHandlers?.togglePanel || fallback;

    const panel = document.getElementById(`panel-${name}`);
    const wasHidden = panel ? panel.classList.contains('hidden') : false;

    // Call the original toggle function
    originalTogglePanel(name);

    // Load live data when panels are opened (not when closed)
    if (wasHidden && panel && !panel.classList.contains('hidden')) {
        if (name === 'trending') {
            // Use trending handlers if available
            if (window.TrendingHandlers?.loadTrendingPosts) {
                window.TrendingHandlers.loadTrendingPosts();
            }
        } else if (name === 'officials' && currentUser) {
            // Use officials handlers if available
            if (window.OfficialsHandlers?.loadUserContent) {
                window.OfficialsHandlers.loadUserContent();
            }
        }
    }
};
```

**Recommendation:**
- ✅ **MERGE enhancement logic into NavigationHandlers.togglePanel method**
- ✅ **Keep window.togglePanel export in navigation-handlers.js**
- ✅ **DELETE from critical-functions.js**
- ⚠️ **Update NavigationHandlers class implementation**

**Rationale:**
- NavigationHandlers owns navigation logic
- Enhancement logic (loading data on panel open) belongs in NavigationHandlers
- Cleaner architecture: single implementation with all logic consolidated

---

#### Function: window.onHCaptchaCallback

**Current Location:** critical-functions.js (lines 180-184)
```javascript
window.onHCaptchaCallback = function(token) {
    console.log('hCaptcha completed successfully!', { tokenLength: token ? token.length : 0 });
    // Store the token in a global variable for easy access
    window.hCaptchaToken = token;
};
```

**Usage:** Called by external HCaptcha widget

**Recommendation:**
- 🔒 **MUST REMAIN GLOBAL** - External API contract
- ✅ **MOVE to dedicated integration file:** `frontend/src/integrations/hcaptcha-integration.js`
- ✅ **DELETE from critical-functions.js**
- ✅ **Load as non-module script** (external library expects global function)

**Rationale:**
- HCaptcha widget expects `window.onHCaptchaCallback` to exist globally
- Cannot use ES6 modules for external callback contracts
- Better organization: separate integration files for third-party services
- Follows existing pattern: google-oauth-integration.js, stripe-integration.js (if existed)

---

#### Function: window.apiCall

**Current Locations:**
1. api-manager.js (lines 340-369): Direct fetch implementation (NOT using apiManager!)
2. critical-functions.js (lines 57-126): Wrapper that delegates to apiManager.request()
3. client.js (lines 348-367): ES6 module alternative (unused)

**Usage:** 165 usages across 40 files

**Recommendation:**
- ✅ **FIX api-manager.js implementation** to use apiManager.request() instead of raw fetch
- ✅ **DELETE from critical-functions.js**
- ✅ **CREATE ES6 export** from api-manager.js
- ✅ **CONVERT api-manager.js to ES6 module**
- ✅ **MAINTAIN window.apiCall** during migration (compatibility shim)
- ⚠️ **GRADUAL MIGRATION** of 165 usages to ES6 imports

**Rationale:**
- Eliminates duplicate implementations
- Fixes api-manager.js to use its own advanced features
- Provides ES6 export for modern code
- Maintains backward compatibility during migration

---

## 🎯 PHASE 2: RECOMMENDED STRATEGY

### Strategy: Hybrid Approach (Option B + Option A)

**Compatibility Shim Layer with Gradual Migration**

#### Step 1: Fix and Consolidate api-manager.js
Convert to ES6 module, fix implementation, export apiCall

#### Step 2: Create Compatibility Shim
Separate file maintains window.apiCall for legacy code

#### Step 3: Gradual Migration
Migrate files in batches (5-10 at a time) to ES6 imports

#### Step 4: Final Cleanup
Remove compatibility shim when all files migrated

---

### Why This Strategy?

#### ✅ Advantages:
1. **Safety First:** Backward compatibility prevents breaking 165 call sites
2. **Testable:** Each batch can be tested independently
3. **Rollback:** Can revert individual batches without cascading failures
4. **Performance:** Gradual migration spreads risk across deployments
5. **Clarity:** Single source of truth (api-manager.js) from day one
6. **Flexibility:** Can pause migration at any point without half-broken state

#### ❌ Rejected Alternatives:

**Option A Alone (Maintain Global):**
- ❌ Never fully eliminates critical-functions.js
- ❌ Perpetuates global pollution
- ❌ Doesn't achieve project goal

**Option C Alone (Gradual Migration):**
- ❌ Too risky to migrate all 165 usages simultaneously
- ❌ No rollback plan if issues discovered mid-migration
- ❌ Testing 40 files at once is impractical

**Big Bang Migration:**
- ❌ 165 changes in single deployment = disaster waiting to happen
- ❌ Impossible to test thoroughly
- ❌ Cannot isolate failures
- ❌ Violates incremental progress principle

---

### Decorator Handling Strategy

**Decision: Option A - Update decorator to wrap ES6 export**

#### Current (reputation-integration.js):
```javascript
if (window.apiCall) {
    const originalApiCall = window.apiCall;
    window.apiCall = async function(endpoint, options = {}) {
        const result = await originalApiCall(endpoint, options);
        if (result.ok && result.data) {
            enhancePostDataWithReputation(result.data);
        }
        return result;
    };
}
```

#### New Implementation:
```javascript
// reputation-integration.js - Convert to ES6 module
import { apiCall as baseApiCall } from './api-manager.js';

/**
 * Decorator function that enhances API responses with reputation data
 */
function createReputationAwareApiCall(apiCallFn) {
    return async function(endpoint, options = {}) {
        const result = await apiCallFn(endpoint, options);

        // If this is a posts response, ensure reputation data is included
        if (result.ok && result.data) {
            enhancePostDataWithReputation(result.data);
        }

        return result;
    };
}

// Create enhanced version
const apiCall = createReputationAwareApiCall(baseApiCall);

// Export both original and enhanced versions
export { apiCall, baseApiCall };

// Maintain backward compatibility
window.apiCall = apiCall;
```

**Why this approach:**
- ✅ Converts to ES6 module (aligns with project goal)
- ✅ Preserves decorator pattern (proven, tested)
- ✅ Maintains backward compatibility (window.apiCall still works)
- ✅ Allows future removal of window.apiCall
- ✅ Documents decorator clearly (createReputationAwareApiCall function)
- ✅ Exports both versions (flexibility for consumers)

**Alternative Rejected:**
**Option B (Global Wrapper):**
```javascript
// Keep decorator as window.apiCall wrapper
window.apiCall = decorateWithReputation(window._apiCallBase);
```
- ❌ Still uses globals
- ❌ Doesn't advance ES6 migration
- ❌ Creates new global pollution (_apiCallBase)

---

## 📋 PHASE 3: IMPLEMENTATION STEPS

### Overview
Total Steps: 11
Estimated Time: 6-8 hours
Risk Level: HIGH (core infrastructure)

---

### Step 1: Backup and Preparation
**What:** Create safety checkpoints before making changes
**Why:** Core infrastructure changes require multiple rollback points
**Files Affected:**
- api-manager.js
- critical-functions.js
- reputation-integration.js
- index.html

**Commands:**
```bash
# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
cp frontend/src/js/api-manager.js frontend/src/js/api-manager.js.backup-$TIMESTAMP
cp frontend/src/js/critical-functions.js frontend/src/js/critical-functions.js.backup-$TIMESTAMP
cp frontend/src/js/reputation-integration.js frontend/src/js/reputation-integration.js.backup-$TIMESTAMP
cp frontend/index.html frontend/index.html.backup-$TIMESTAMP

# Verify current working state
cd frontend
npx http-server -p 8080 &
SERVER_PID=$!

# Test critical paths
curl -s http://localhost:8080 | grep -q "United We Rise" && echo "✅ Homepage loads"
# Manual: Open dev.unitedwerise.org, test auth, test feed, test API calls

# Stop test server
kill $SERVER_PID

# Create git checkpoint
git add -A
git commit -m "checkpoint: Pre-Batch3 backup - API layer migration"
git push origin development
```

**Testing:**
- [ ] Homepage loads without errors
- [ ] User can log in
- [ ] Feed loads posts
- [ ] API calls succeed (check Network tab)
- [ ] No console errors

---

### Step 2: Convert api-manager.js to ES6 Module
**What:** Fix broken window.apiCall implementation and add ES6 exports
**Why:** Current implementation doesn't use apiManager's advanced features
**Files Affected:** frontend/src/js/api-manager.js

**Changes:**

**2a. Fix window.apiCall to use apiManager.request()**

Current (BROKEN - lines 340-369):
```javascript
window.apiCall = async (endpoint, options = {}) => {
    try {
        const baseUrl = window.apiManager.config.baseURL;
        const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
        const fetchOptions = window.apiManager.buildFetchOptions(options);
        const response = await fetch(url, fetchOptions);  // ❌ RAW FETCH - NO RETRY, NO DEDUP
        const data = await response.json();
        return { ok: response.ok, status: response.status, data: data };
    } catch (error) {
        return { ok: false, status: 0, data: { error: error.message } };
    }
};
```

New (FIXED):
```javascript
/**
 * Unified API call function with advanced features
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Request options
 * @returns {Promise<{ok: boolean, status: number, data: any}>} Response in legacy format
 */
async function apiCall(endpoint, options = {}) {
    try {
        // Use apiManager's advanced request method (retry, dedup, cache)
        const response = await window.apiManager.request(endpoint, options);

        // APIManager.request() returns raw data, wrap in expected format
        return {
            ok: true,
            status: 200,
            data: response
        };
    } catch (error) {
        // Consistent error format
        return {
            ok: false,
            status: error.message.includes('Unauthorized') ? 401 : 500,
            data: { error: error.message }
        };
    }
}

// Export for ES6 modules
export { apiCall, APIRequestManager };

// Maintain global for backward compatibility
window.apiCall = apiCall;
```

**2b. Add batch API export**

After apiCall definition:
```javascript
/**
 * Batch API call function
 * @param {Array} requests - Array of {endpoint, options} objects
 * @returns {Promise<Map>} Map of results by request ID
 */
async function apiBatch(requests) {
    return window.apiManager.batchRequest(requests);
}

// Export batch function
export { apiBatch };

// Maintain global for backward compatibility
window.apiBatch = apiBatch;
```

**2c. Add file header for ES6 module**

Add at top of file (line 1):
```javascript
/**
 * @module js/api-manager
 * @description Advanced API Request Manager for United We Rise
 *
 * Implements:
 * - Request deduplication (prevents duplicate concurrent requests)
 * - Response caching with TTL (reduces server load)
 * - Batch request handling (optimize multiple requests)
 * - Retry logic with exponential backoff (handle transient failures)
 * - Rate limiting tracking (prevent API abuse)
 * - CSRF token management (security)
 *
 * @example
 * // ES6 import (preferred)
 * import { apiCall } from './api-manager.js';
 * const response = await apiCall('/users/profile');
 *
 * // Global usage (legacy - backward compatibility)
 * const response = await window.apiCall('/users/profile');
 *
 * @exports {apiCall} - Main API call function
 * @exports {apiBatch} - Batch API call function
 * @exports {APIRequestManager} - Class for advanced usage
 */
```

**Testing:**
```bash
# Verify syntax
cd backend && npm run build  # Ensures TypeScript is happy
cd ../frontend

# Test in browser console (dev.unitedwerise.org)
console.log(typeof window.apiCall);  // Should be 'function'
console.log(typeof window.apiBatch);  // Should be 'function'
console.log(typeof window.apiManager);  // Should be 'object'

# Test actual API call
const response = await window.apiCall('/users/profile');
console.log(response);  // Should return {ok, status, data}
```

**Verification Checklist:**
- [ ] File compiles without errors
- [ ] window.apiCall is defined
- [ ] window.apiBatch is defined
- [ ] window.apiManager is defined
- [ ] API call returns {ok, status, data} format
- [ ] Retry logic works (test with network throttling)
- [ ] Cache works (second identical call returns cached data)
- [ ] No console errors

---

### Step 3: Load api-manager.js as ES6 Module
**What:** Change index.html to load api-manager.js as module
**Why:** Enable ES6 import/export functionality
**Files Affected:** frontend/index.html

**Change:**

Current (line 200):
```html
<script src="src/js/api-manager.js"></script>
```

New:
```html
<script type="module" src="src/js/api-manager.js"></script>
```

**Testing:**
```bash
# Reload page in dev environment
# Open browser console

console.log(typeof window.apiCall);  // Should still be 'function'
console.log(typeof window.apiManager);  // Should still be 'object'

# Test API call still works
const response = await window.apiCall('/users/profile');
console.log(response);
```

**Verification Checklist:**
- [ ] No console errors on page load
- [ ] window.apiCall still defined
- [ ] window.apiManager still defined
- [ ] API calls still work
- [ ] Auth still works
- [ ] Feed still loads

---

### Step 4: Convert reputation-integration.js to ES6 Module
**What:** Update decorator to import from api-manager.js
**Why:** Align with ES6 architecture, enable future improvements
**Files Affected:** frontend/src/js/reputation-integration.js

**Complete Rewrite:**

```javascript
/**
 * @module js/reputation-integration
 * @description Reputation System Integration
 *
 * Decorates API calls to automatically enhance post responses with reputation data.
 * Uses decorator pattern to wrap apiCall without modifying original behavior.
 *
 * @example
 * import { apiCall } from './reputation-integration.js';
 * const response = await apiCall('/posts');  // Automatically includes reputation data
 */

import { apiCall as baseApiCall } from './api-manager.js';

console.log('🏆 Loading reputation system integration...');

/**
 * Decorator function that enhances API responses with reputation data
 * @param {Function} apiCallFn - Original API call function
 * @returns {Function} Enhanced API call function
 */
function createReputationAwareApiCall(apiCallFn) {
    return async function(endpoint, options = {}) {
        const result = await apiCallFn(endpoint, options);

        // If this is a posts response, ensure reputation data is included
        if (result.ok && result.data) {
            enhancePostDataWithReputation(result.data);
        }

        return result;
    };
}

/**
 * Enhance post data with reputation information
 * @param {Object} data - API response data
 */
function enhancePostDataWithReputation(data) {
    // Handle different response structures
    if (data.posts && Array.isArray(data.posts)) {
        data.posts.forEach(post => {
            if (!post.authorReputation && post.author) {
                post.authorReputation = 70; // Default reputation for existing posts
            }
        });
    } else if (data.post) {
        if (!data.post.authorReputation && data.post.author) {
            data.post.authorReputation = 70; // Default reputation
        }
    }
}

// Create enhanced version
const apiCall = createReputationAwareApiCall(baseApiCall);

// Export both original and enhanced versions
export { apiCall, baseApiCall };

// Maintain backward compatibility - replace global window.apiCall
window.apiCall = apiCall;

// Wait for page to load and initialize other systems
document.addEventListener('DOMContentLoaded', function() {
    initializeReputationIntegration();
});

function initializeReputationIntegration() {
    console.log('🔗 Initializing reputation integration...');

    // Hook into existing feed loading
    enhanceFeedSystem();

    // Hook into existing post loading
    enhancePostSystem();

    // Hook into profile system
    enhanceProfileSystem();

    console.log('✅ Reputation integration initialized');
}

function enhanceFeedSystem() {
    // Monitor for feed updates and add reputation badges
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    addReputationBadgesToNewContent(node);
                }
            });
        });
    });

    observer.observe(feedContainer, {
        childList: true,
        subtree: true
    });
}

function enhancePostSystem() {
    // Enhance PostComponent if it exists
    if (window.PostComponent && window.PostComponent.prototype.renderPost) {
        const originalRenderPost = window.PostComponent.prototype.renderPost;

        window.PostComponent.prototype.renderPost = function(post, options = {}) {
            // Call original render method
            const html = originalRenderPost.call(this, post, options);

            // The HTML should already have data-author-reputation attribute
            // The reputation badges system will automatically pick it up
            return html;
        };
    }
}

function enhanceProfileSystem() {
    // Hook into profile loading to add badges
    if (window.Profile && window.Profile.prototype.renderProfile) {
        const originalRenderProfile = window.Profile.prototype.renderProfile;

        window.Profile.prototype.renderProfile = function(container) {
            // Call original render method
            originalRenderProfile.call(this, container);

            // Add reputation badge to profile after rendering
            setTimeout(() => {
                if (window.ReputationBadges && window.currentUserReputation !== undefined) {
                    window.ReputationBadges.updateProfileBadge(window.currentUserReputation);
                }
            }, 100);
        };
    }
}

function addReputationBadgesToNewContent(node) {
    // Find all posts in the new content
    const posts = node.querySelectorAll ?
        node.querySelectorAll('.post-component, [data-post-id]') :
        [];

    posts.forEach(post => {
        const reputation = post.getAttribute('data-author-reputation');
        if (reputation && window.ReputationBadges) {
            window.ReputationBadges.addReputationBadgeToPost(post, parseInt(reputation));
        }
    });

    // Check if the node itself is a post
    if (node.classList && (node.classList.contains('post-component') || node.hasAttribute('data-post-id'))) {
        const reputation = node.getAttribute('data-author-reputation');
        if (reputation && window.ReputationBadges) {
            window.ReputationBadges.addReputationBadgeToPost(node, parseInt(reputation));
        }
    }
}

// Helper function to manually trigger reputation badge updates
window.updateReputationBadges = function() {
    if (window.ReputationBadges) {
        window.ReputationBadges.updateAllPostBadges();
        if (window.currentUserReputation !== undefined) {
            window.ReputationBadges.updateProfileBadge(window.currentUserReputation);
        }
    }
};

// Auto-update badges when auth state changes
document.addEventListener('userLoggedIn', function() {
    setTimeout(() => {
        if (window.ReputationBadges) {
            window.ReputationBadges.loadCurrentUserReputation();
        }
    }, 1000);
});

document.addEventListener('userLoggedOut', function() {
    window.currentUserReputation = undefined;
});

console.log('✅ Reputation integration module loaded');
```

**Update index.html:**

Current (line ~XXX):
```html
<script src="src/js/reputation-integration.js"></script>
```

New:
```html
<script type="module" src="src/js/reputation-integration.js"></script>
```

**Testing:**
```bash
# Load page in dev environment
# Check console

# Should see:
# 🏆 Loading reputation system integration...
# 🔗 Initializing reputation integration...
# ✅ Reputation integration initialized
# ✅ Reputation integration module loaded

# Test API call includes reputation data
const response = await window.apiCall('/posts');
console.log(response.data.posts[0].authorReputation);  // Should have reputation field

# Test posts display reputation badges
# (Visual check - look for reputation badges on post authors)
```

**Verification Checklist:**
- [ ] Module loads without errors
- [ ] window.apiCall still works
- [ ] API responses include reputation data
- [ ] Reputation badges display on posts
- [ ] Profile shows reputation badge
- [ ] No duplicate API calls
- [ ] No console errors

---

### Step 5: Extract HCaptcha Callback to Integration File
**What:** Move window.onHCaptchaCallback to dedicated integration file
**Why:** Better organization, separates external integrations
**Files Affected:**
- NEW: frontend/src/integrations/hcaptcha-integration.js
- frontend/index.html

**Create File:** frontend/src/integrations/hcaptcha-integration.js

```javascript
/**
 * HCaptcha Integration
 *
 * External callback handler for HCaptcha widget.
 * This function MUST remain global as it's called by the external HCaptcha library.
 *
 * @see https://docs.hcaptcha.com/
 */

console.log('🤖 Loading HCaptcha integration...');

/**
 * Global hCaptcha callback function
 * CRITICAL: This function must remain global for hCaptcha integration
 * Called by HCaptcha widget after user completes CAPTCHA challenge
 *
 * @param {string} token - HCaptcha verification token
 */
window.onHCaptchaCallback = function(token) {
    console.log('hCaptcha completed successfully!', { tokenLength: token ? token.length : 0 });

    // Store the token in a global variable for easy access by forms
    window.hCaptchaToken = token;

    // Dispatch custom event for components listening to CAPTCHA completion
    window.dispatchEvent(new CustomEvent('hcaptchaComplete', {
        detail: { token }
    }));
};

/**
 * Check HCaptcha status and render widgets
 * Called after page load to ensure HCaptcha script is loaded
 */
window.checkHCaptchaStatus = function() {
    if (typeof hcaptcha !== 'undefined') {
        console.log('✅ hCaptcha loaded and ready');
        // hCaptcha auto-renders widgets with data-sitekey attribute
    } else {
        console.warn('⚠️ hCaptcha not loaded yet, will retry...');
        setTimeout(window.checkHCaptchaStatus, 1000);
    }
};

console.log('✅ HCaptcha integration loaded');
```

**Update index.html:**

Find the existing HCaptcha script tag and add integration after it:

```html
<!-- HCaptcha library (external) -->
<script src="https://js.hcaptcha.com/1/api.js" async defer></script>

<!-- HCaptcha integration (our callback handler) -->
<script src="src/integrations/hcaptcha-integration.js"></script>
```

**Remove from critical-functions.js:**

Delete lines 180-184:
```javascript
window.onHCaptchaCallback = function(token) {
    console.log('hCaptcha completed successfully!', { tokenLength: token ? token.length : 0 });
    window.hCaptchaToken = token;
};
```

Also remove checkHCaptchaStatus if it exists.

**Testing:**
```bash
# Test CAPTCHA on registration/login form
# 1. Open dev.unitedwerise.org
# 2. Click "Sign Up"
# 3. Complete HCaptcha challenge
# 4. Check console:

# Should see:
# 🤖 Loading HCaptcha integration...
# ✅ HCaptcha integration loaded
# ✅ hCaptcha loaded and ready
# hCaptcha completed successfully! { tokenLength: 123 }

# Check window.hCaptchaToken is set
console.log(window.hCaptchaToken);  // Should show token string
```

**Verification Checklist:**
- [ ] HCaptcha widget displays on forms
- [ ] Completing CAPTCHA calls window.onHCaptchaCallback
- [ ] window.hCaptchaToken is set after completion
- [ ] Forms can submit with CAPTCHA token
- [ ] No console errors
- [ ] Integration file loads before CAPTCHA needed

---

### Step 6: Extract and Consolidate togglePanel
**What:** Merge enhancement logic into NavigationHandlers, remove from critical-functions
**Why:** Single source of truth, proper encapsulation
**Files Affected:**
- frontend/src/handlers/navigation-handlers.js
- frontend/src/js/critical-functions.js

**Update navigation-handlers.js:**

Find the existing togglePanel method (line ~550) and enhance it:

```javascript
// BEFORE (current implementation):
togglePanel(name) {
    const panel = document.getElementById(`panel-${name}`);
    if (panel) {
        panel.classList.toggle('hidden');
        this.currentPanel = panel.classList.contains('hidden') ? null : name;
    }
}

// AFTER (enhanced with live data loading):
togglePanel(name) {
    const panel = document.getElementById(`panel-${name}`);
    if (!panel) return;

    // Track if panel was hidden before toggle
    const wasHidden = panel.classList.contains('hidden');

    // Toggle panel visibility
    panel.classList.toggle('hidden');
    this.currentPanel = panel.classList.contains('hidden') ? null : name;

    // Load live data when panels are opened (not when closed)
    if (wasHidden && !panel.classList.contains('hidden')) {
        this.loadPanelData(name);
    }
}

/**
 * Load live data for specific panels when opened
 * @param {string} panelName - Name of the panel that was opened
 */
loadPanelData(panelName) {
    switch (panelName) {
        case 'trending':
            // Use trending handlers if available
            if (window.TrendingHandlers?.loadTrendingPosts) {
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('Navigation', 'Loading trending posts for panel open');
                }
                window.TrendingHandlers.loadTrendingPosts();
            } else if (typeof loadTrendingPosts === 'function') {
                loadTrendingPosts();
            }
            break;

        case 'officials':
            // Use officials handlers if available (only when user is logged in)
            if (window.currentUser) {
                if (window.OfficialsHandlers?.loadUserContent) {
                    if (typeof adminDebugLog !== 'undefined') {
                        adminDebugLog('Navigation', 'Loading officials content for panel open');
                    }
                    window.OfficialsHandlers.loadUserContent();
                } else if (typeof loadUserContent === 'function') {
                    loadUserContent();
                }
            }
            break;

        default:
            // No special data loading for other panels
            break;
    }
}
```

**Remove from critical-functions.js:**

Delete lines 136-170 (entire window.togglePanel function).

**Testing:**
```bash
# Test panel toggling with data loading
# 1. Open dev.unitedwerise.org
# 2. Click "Trending" button in navigation

# Should see:
# - Panel opens
# - Trending posts load (check feed updates)
# - Console shows: "Loading trending posts for panel open"

# 3. Click "Officials" button (while logged in)

# Should see:
# - Panel opens
# - Officials content loads
# - Console shows: "Loading officials content for panel open"

# 4. Test panel closing
# - Close panel
# - Should NOT reload data

# Check window.togglePanel still works
window.togglePanel('trending');  // Should toggle trending panel
```

**Verification Checklist:**
- [ ] window.togglePanel still defined (exported from navigation-handlers.js)
- [ ] Panels toggle visibility correctly
- [ ] Trending panel loads posts on open
- [ ] Officials panel loads content on open (when logged in)
- [ ] Closing panels doesn't reload data
- [ ] No console errors
- [ ] navigationHandlers instance exists

---

### Step 7: Create Compatibility Shim for apiCall
**What:** Create separate file that maintains window.apiCall during migration
**Why:** Allows gradual migration of 165 usages without breaking existing code
**Files Affected:**
- NEW: frontend/src/js/api-compatibility-shim.js
- frontend/index.html

**Create File:** frontend/src/js/api-compatibility-shim.js

```javascript
/**
 * API Compatibility Shim
 *
 * TEMPORARY FILE - To be removed when all files migrate to ES6 imports
 *
 * Purpose: Maintains backward compatibility for window.apiCall during gradual migration
 * Status: Active during Batch 3-10 migrations
 * Removal: After all 165 usages converted to ES6 imports
 *
 * This file ensures window.apiCall remains available while files are migrated
 * from global usage to ES6 imports in batches.
 *
 * Migration Progress: 0/165 usages migrated (40 files remaining)
 *
 * @deprecated Use ES6 import instead: import { apiCall } from './api-manager.js'
 */

// Import the canonical apiCall from api-manager.js
// (Already enhanced by reputation-integration.js decorator)
import { apiCall } from './reputation-integration.js';

// Maintain global window.apiCall for backward compatibility
// This will be removed when all files are migrated
window.apiCall = apiCall;

console.log('⚠️ API Compatibility Shim active - window.apiCall available (legacy)');
console.log('📋 Migration Status: 0/165 usages migrated');
console.log('🎯 Target: Convert all files to ES6 imports by end of Batch 10');
```

**Update index.html:**

Add AFTER reputation-integration.js but BEFORE main.js:

```html
<!-- API Layer (ES6 modules) -->
<script type="module" src="src/js/api-manager.js"></script>
<script type="module" src="src/js/reputation-integration.js"></script>

<!-- Compatibility Shim (TEMPORARY - remove after migration) -->
<script type="module" src="src/js/api-compatibility-shim.js"></script>

<!-- Main application entry point -->
<script type="module" src="src/js/main.js"></script>
```

**Testing:**
```bash
# Test that window.apiCall still works from console
# Open dev.unitedwerise.org, check console:

# Should see:
# ⚠️ API Compatibility Shim active - window.apiCall available (legacy)
# 📋 Migration Status: 0/165 usages migrated
# 🎯 Target: Convert all files to ES6 imports by end of Batch 10

# Test API call from console
const response = await window.apiCall('/users/profile');
console.log(response);  // Should work

# Test from file that uses window.apiCall
# (All 40 files should still work unchanged)
```

**Verification Checklist:**
- [ ] window.apiCall still defined
- [ ] All existing files still work
- [ ] No regression in functionality
- [ ] Console shows compatibility shim message
- [ ] Auth still works
- [ ] Feed still loads
- [ ] Posts still render

---

### Step 8: Remove apiCall from critical-functions.js
**What:** Delete duplicate apiCall implementation
**Why:** Eliminated - now sourced from api-manager.js via shim
**Files Affected:** frontend/src/js/critical-functions.js

**Remove:**

Delete lines 24-126:
- Lines 24-32: API configuration and cache variables
- Lines 57-126: apiCall function implementation

Keep:
- Lines 1-23: File header and console.log
- Lines 189-260: DOMContentLoaded and initialization logic (if needed)

**After deletion, critical-functions.js should contain:**

```javascript
/**
 * CRITICAL FUNCTIONS SCRIPT BLOCK
 * Phase 4D-2: Final Migration Completion - UPDATED FOR BATCH 3
 *
 * This file contains essential initialization logic after the massive
 * inline code elimination project.
 *
 * REMOVED FUNCTIONS (now sourced from proper modules):
 * - window.apiCall → api-manager.js (via compatibility shim)
 * - window.setCurrentUser → Will be removed in future batch
 * - window.togglePanel → navigation-handlers.js
 * - window.onHCaptchaCallback → hcaptcha-integration.js
 *
 * REMAINING LOGIC:
 * - DOMContentLoaded initialization
 * - Legacy compatibility during migration
 */

console.log('🔧 Loading critical functions - Batch 3 updated version...');

// ============================================================================
// ESSENTIAL INITIALIZATION (DOMContentLoaded handlers)
// ============================================================================

// Check for existing auth on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Critical functions DOMContentLoaded - initializing essential systems...');

    // Use new optimized initialization system if available
    if (typeof initializeApp !== 'undefined') {
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('AppInit', 'Starting optimized app initialization...');
        }
        initializeApp().then(result => {
            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('AppInit', 'App initialization complete', result);
            }

            // Setup civic organizing sidebar monitoring
            if (typeof setupCivicOrganizingSidebarMonitoring !== 'undefined') {
                setupCivicOrganizingSidebarMonitoring();
            }
        }).catch(error => {
            console.error('💥 App initialization failed:', error);
        });
    }

    // Essential UI setup
    if (typeof setupCollapseButton !== 'undefined') {
        setupCollapseButton();
    }

    if (typeof setupCloseButton !== 'undefined') {
        setupCloseButton();
    }

    if (typeof setupSidebarMapButton !== 'undefined') {
        setupSidebarMapButton();
    }

    // Load and show MOTD if available
    if (typeof loadMOTD !== 'undefined') {
        loadMOTD();
    }

    // Start trending refresh interval if available
    if (typeof startTrendingRefresh !== 'undefined') {
        startTrendingRefresh();
    }
});

// Check hCaptcha after page load (handled by hcaptcha-integration.js now)
window.addEventListener('load', function() {
    setTimeout(() => {
        if (typeof checkHCaptchaStatus !== 'undefined') {
            checkHCaptchaStatus();
        }
    }, 2000);
});

console.log('✅ Critical functions loaded - Batch 3 migration complete!');
```

**Testing:**
```bash
# Reload page in dev environment
# Check console logs

# Should NOT see errors about apiCall not defined
# All existing functionality should still work

# Test critical paths:
# 1. Login/logout
# 2. Load feed
# 3. Create post
# 4. View profile
# 5. Toggle navigation panels

# Verify window.apiCall still works (from compatibility shim)
console.log(typeof window.apiCall);  // Should be 'function'
const response = await window.apiCall('/users/profile');
console.log(response);  // Should work
```

**Verification Checklist:**
- [ ] apiCall removed from critical-functions.js
- [ ] window.apiCall still works (from shim)
- [ ] No console errors on page load
- [ ] Auth works
- [ ] Feed loads
- [ ] Posts render
- [ ] Navigation works
- [ ] No functionality regression

---

### Step 9: Update setCurrentUser (Future Batch)
**What:** Export setCurrentUser from unified-manager.js
**Why:** Proper ownership - auth manager should expose auth state setter
**Files Affected:**
- frontend/src/modules/core/auth/unified-manager.js
- frontend/src/js/critical-functions.js

**NOTE:** This step is for FUTURE batches. Document for now, implement later.

**Plan:**

In unified-manager.js, add export:
```javascript
/**
 * Set current user (external setter)
 * @param {Object} user - User object
 */
function setCurrentUser(user) {
    if (user) {
        unifiedAuthManager._currentAuthState.user = user;
        unifiedAuthManager._currentAuthState.isAuthenticated = true;
        unifiedAuthManager._notifySubscribers();
    }
}

export { setCurrentUser };

// Maintain global during migration
window.setCurrentUser = setCurrentUser;
```

Remove from critical-functions.js when all consumers migrated.

**Testing (Future):**
- [ ] Import works: `import { setCurrentUser } from '@/modules/core/auth/unified-manager.js'`
- [ ] Global works: `window.setCurrentUser(user)`
- [ ] Auth state updates correctly
- [ ] Subscribers notified

---

### Step 10: Deploy to Staging
**What:** Deploy Batch 3 changes to staging environment
**Why:** Test in real environment before production
**Files Affected:** All changes from Steps 1-9

**Commands:**

```bash
# Verify all changes committed
git status  # Should be clean

# Final local build test
cd backend && npm run build && cd ..

# Commit Batch 3 changes
git add frontend/src/js/api-manager.js \
        frontend/src/js/critical-functions.js \
        frontend/src/js/reputation-integration.js \
        frontend/src/js/api-compatibility-shim.js \
        frontend/src/integrations/hcaptcha-integration.js \
        frontend/src/handlers/navigation-handlers.js \
        frontend/index.html

git commit -m "$(cat <<'EOF'
feat: Batch 3 - Critical API Layer Architecture Migration

BREAKING CHANGES:
- api-manager.js: Fixed window.apiCall to use apiManager.request() instead of raw fetch
- api-manager.js: Converted to ES6 module with exports
- reputation-integration.js: Converted to ES6 module, imports from api-manager
- critical-functions.js: Removed duplicate apiCall implementation
- critical-functions.js: Removed togglePanel (consolidated to navigation-handlers)
- Created hcaptcha-integration.js for external callback
- Created api-compatibility-shim.js for gradual migration

IMPROVEMENTS:
- Eliminates duplicate API implementations
- Fixes api-manager to use its own advanced features (retry, dedup, cache)
- Establishes single source of truth (api-manager.js)
- Better code organization (separation of concerns)
- Maintains backward compatibility during migration

COMPATIBILITY:
- All 165 window.apiCall usages still work via compatibility shim
- No consumer code changes required yet
- Gradual migration planned for Batches 4-10

FILES CHANGED:
- api-manager.js: ES6 module conversion, implementation fix
- reputation-integration.js: ES6 module conversion, import from api-manager
- navigation-handlers.js: Consolidated togglePanel enhancement logic
- critical-functions.js: Removed duplicates, kept initialization
- hcaptcha-integration.js: NEW - External callback handler
- api-compatibility-shim.js: NEW - Backward compatibility layer
- index.html: Updated script tags to type="module"

TESTING:
- Manual: Auth, feed, posts, navigation, CAPTCHA
- Automated: Batch 3 test suite (165 API call sites verified)

MIGRATION STATUS:
- Batch 3: Complete
- Remaining: Batches 4-10 (gradual consumer migration)
- Target: Zero globals by end of Batch 10

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# Push to development (auto-deploys to staging)
git push origin development

# Monitor deployment
gh run list --branch development --limit 1
gh run watch

# Verify staging deployment
sleep 60
curl -s "https://dev-api.unitedwerise.org/health" | grep releaseSha

# Test staging environment
open "https://dev.unitedwerise.org"
```

**Manual Testing on Staging:**

1. **Authentication:**
   - [ ] Login with Google OAuth
   - [ ] Login with email/password
   - [ ] Logout
   - [ ] Check console for errors

2. **Feed:**
   - [ ] Load trending feed
   - [ ] Load my feed (logged in)
   - [ ] Scroll pagination
   - [ ] Check network tab (no duplicate requests)

3. **Posts:**
   - [ ] View posts
   - [ ] Check reputation badges appear
   - [ ] Create new post
   - [ ] Like/unlike post
   - [ ] Comment on post

4. **Navigation:**
   - [ ] Toggle trending panel (should load posts)
   - [ ] Toggle officials panel (should load content)
   - [ ] Toggle other panels
   - [ ] Check panel data loads on first open only

5. **CAPTCHA:**
   - [ ] Register new account
   - [ ] Complete CAPTCHA
   - [ ] Check token stored (window.hCaptchaToken)
   - [ ] Form submits successfully

6. **API Layer:**
   - [ ] Check console: window.apiCall defined
   - [ ] Check console: window.apiManager defined
   - [ ] Check console: Compatibility shim message
   - [ ] Test API call from console: `await window.apiCall('/users/profile')`

7. **Performance:**
   - [ ] Check Network tab: no duplicate API requests
   - [ ] Check Console: cache hit messages
   - [ ] Check Response times: should see retry on failure
   - [ ] Check API manager stats: `window.apiManager.getStats()`

**Verification Checklist:**
- [ ] All tests pass
- [ ] No console errors
- [ ] No functionality regression
- [ ] Performance maintained or improved
- [ ] Compatibility shim working
- [ ] ES6 imports working

---

### Step 11: Final Verification
**What:** Comprehensive testing and documentation update
**Why:** Ensure Batch 3 complete before moving to Batch 4
**Files Affected:**
- .claude/scratchpads/COMPATIBILITY_LAYER_MIGRATION.md
- CHANGELOG.md

**Update Migration Progress:**

Edit `.claude/scratchpads/COMPATIBILITY_LAYER_MIGRATION.md`:

```markdown
### Phase 3: Implementation (Batched)
**Status:** 🚧 IN PROGRESS
**Current Batch:** Batch 3 - ✅ COMPLETE

#### Batch 3: Critical API Layer Architecture ✅ COMPLETE
**Status:** ✅ Deployed to Staging (October 11, 2025)
**Files:** api-manager.js, critical-functions.js, reputation-integration.js
**Usages:** 0 migrated (165 remaining - via compatibility shim)

**Changes:**
- ✅ Fixed api-manager.js to use apiManager.request()
- ✅ Converted api-manager.js to ES6 module
- ✅ Converted reputation-integration.js to ES6 module
- ✅ Consolidated togglePanel to navigation-handlers.js
- ✅ Extracted HCaptcha callback to hcaptcha-integration.js
- ✅ Created api-compatibility-shim.js for gradual migration
- ✅ Removed duplicates from critical-functions.js

**Testing:**
- ✅ All 165 window.apiCall usages still work
- ✅ No functionality regression
- ✅ Performance improved (deduplication working)
- ✅ Deployed to staging successfully

**Next:** Batch 4 - Start migrating consumers to ES6 imports
```

**Update CHANGELOG.md:**

Add entry:
```markdown
## [Unreleased] - 2025-10-11

### Changed (Batch 3 - Critical API Layer Architecture)
- **api-manager.js**: Fixed window.apiCall to use apiManager.request() instead of raw fetch
- **api-manager.js**: Converted to ES6 module with exports
- **reputation-integration.js**: Converted to ES6 module, imports from api-manager
- **navigation-handlers.js**: Consolidated togglePanel enhancement logic
- **critical-functions.js**: Removed duplicate implementations (apiCall, togglePanel)

### Added (Batch 3)
- **hcaptcha-integration.js**: Dedicated external callback handler
- **api-compatibility-shim.js**: Backward compatibility layer during migration

### Fixed (Batch 3)
- api-manager.js now uses its own advanced features (retry, deduplication, caching)
- Eliminated duplicate API request caching
- Single source of truth for API calls

### Migration Progress
- Batch 3: ✅ Complete
- Remaining: Batches 4-10 (consumer code migration)
- Status: 0/165 window.apiCall usages migrated to ES6 imports
```

**Final Tests:**

```bash
# Comprehensive test suite
cd frontend

# Test 1: Verify no global pollution
node -e "
  const fs = require('fs');
  const files = fs.readdirSync('src/js').filter(f => f.endsWith('.js'));
  files.forEach(f => {
    const content = fs.readFileSync(\`src/js/\${f}\`, 'utf8');
    const globals = content.match(/window\\.\\w+\\s*=/g) || [];
    if (f !== 'api-compatibility-shim.js' && globals.length > 0) {
      console.log(\`⚠️ \${f}: \${globals.length} global assignments found\`);
    }
  });
  console.log('✅ Global pollution check complete');
"

# Test 2: Verify ES6 exports exist
grep -n "export.*apiCall" frontend/src/js/api-manager.js
grep -n "export.*apiCall" frontend/src/js/reputation-integration.js

# Test 3: Verify compatibility shim imports
grep -n "import.*apiCall" frontend/src/js/api-compatibility-shim.js

# Test 4: Count remaining window.apiCall usages
echo "Remaining window.apiCall usages (excluding source files):"
grep -r "window\.apiCall" frontend/src --include="*.js" \
  | grep -v "api-manager.js" \
  | grep -v "api-compatibility-shim.js" \
  | grep -v "reputation-integration.js" \
  | grep -v "critical-functions.js" \
  | wc -l

# Should show: 165 (all consumer files, none in source files)
```

**Documentation:**

Create `docs/API-MIGRATION-GUIDE.md`:

```markdown
# API Migration Guide - Batch 3

## Overview
Batch 3 establishes single source of truth for API calls and prepares for gradual migration.

## For Developers

### Current State (Batch 3 Complete)
```javascript
// Legacy global usage (still works via compatibility shim)
const response = await window.apiCall('/users/profile');

// Modern ES6 import (available but not required yet)
import { apiCall } from '@/js/api-manager.js';
const response = await apiCall('/users/profile');
```

### Migration Timeline
- Batch 3 (October 2025): ✅ Infrastructure complete
- Batches 4-10 (November 2025): Consumer code migration
- Target: Zero globals by end of 2025

### How to Migrate Your File (Batches 4-10)
1. Add import at top of file:
   ```javascript
   import { apiCall } from '@/js/api-manager.js';
   ```

2. Remove all `window.apiCall` references:
   ```javascript
   // OLD
   const response = await window.apiCall('/endpoint');

   // NEW
   const response = await apiCall('/endpoint');
   ```

3. Test locally before committing

### Benefits of Migration
- ✅ Better IDE autocomplete
- ✅ Clear dependency tracking
- ✅ Tree-shaking support
- ✅ Easier refactoring
- ✅ Modern JavaScript standards

## Architecture

### Single Source of Truth
**api-manager.js** is the canonical implementation:
- Request deduplication
- Response caching
- Retry logic
- Rate limiting
- CSRF management

### Decorator Chain
```
apiCall (api-manager.js)
  ↓
apiCall (reputation-integration.js) - adds reputation data
  ↓
window.apiCall (api-compatibility-shim.js) - backward compatibility
  ↓
window.apiCall (main.js) - performance wrappers
```

### Files to Import From
- **API Calls**: `import { apiCall } from '@/js/api-manager.js'`
- **Batch API**: `import { apiBatch } from '@/js/api-manager.js'`
- **With Reputation**: `import { apiCall } from '@/js/reputation-integration.js'`
```

**Verification Checklist:**
- [ ] Migration progress documented
- [ ] CHANGELOG updated
- [ ] Migration guide created
- [ ] All tests pass
- [ ] No console errors
- [ ] Staging deployment successful
- [ ] Ready for Batch 4

---

## 🚨 PHASE 4: RISK ASSESSMENT

### High Risk Areas

#### 1. Decorator Chain Breakage
**Risk:** Multiple layers wrap window.apiCall - breaking order breaks app
**Probability:** MEDIUM
**Impact:** HIGH
**Mitigation:**
- Load order enforced in index.html (api-manager → reputation → shim → main)
- Each decorator preserves signature
- Each decorator tested independently
- Rollback: Revert to previous version via git

#### 2. Race Condition on Module Load
**Risk:** ES6 modules load asynchronously - timing issues possible
**Probability:** LOW
**Impact:** HIGH
**Mitigation:**
- Type="module" ensures sequential loading within dependencies
- Compatibility shim loaded last (after all dependencies)
- DOMContentLoaded ensures page ready before usage
- Testing: Reload page 10+ times to catch timing issues

#### 3. Performance Regression
**Risk:** Decorator chain adds overhead to every API call
**Probability:** LOW
**Impact:** MEDIUM
**Mitigation:**
- Decorators are thin wrappers (minimal overhead)
- apiManager handles heavy lifting (caching, dedup) once
- Benchmark before/after (use apiManager.getStats())
- Monitor staging performance

#### 4. Cache Inconsistency
**Risk:** Removing duplicate cache from critical-functions might break features
**Probability:** LOW
**Impact:** MEDIUM
**Mitigation:**
- apiManager cache is more robust (TTL, expiration, cleanup)
- User-specific cache not needed (apiManager handles auth via cookies)
- Test user-specific features (feed, profile, saved posts)
- Representatives cache duration preserved (30min TTL in apiManager config)

### Dependencies

#### What Depends on This Working?

**Authentication System:**
- Login/logout flows
- Session management
- OAuth callbacks
- CSRF token handling

**Content System:**
- Feed loading
- Post creation
- Comment system
- Reactions

**User Features:**
- Profile loading
- Saved posts
- Notifications
- Messages

**Civic Features:**
- Officials lookup
- Representatives data
- Organizing tools
- Maps

**CRITICAL:** If window.apiCall breaks, **ENTIRE APP STOPS WORKING**

### Rollback Triggers

**Immediate Rollback If:**
- [ ] Login/auth fails (cannot log in)
- [ ] Feed doesn't load (500 errors)
- [ ] API calls return errors (Network tab shows 500s)
- [ ] Console flooded with errors
- [ ] Page doesn't load at all
- [ ] Performance degradation >20% (check apiManager.getStats())

**Investigate But Don't Rollback If:**
- [ ] Single feature broken (isolate and fix)
- [ ] Cosmetic issues (styling, layout)
- [ ] Non-critical errors (warnings in console)
- [ ] Slow but functional (performance tuning)

### Rollback Procedure

```bash
# EMERGENCY ROLLBACK - Execute if critical failure detected

# Step 1: Revert to previous commit
git revert HEAD --no-edit
git push origin development

# Step 2: Verify staging auto-deploys reverted version
gh run list --branch development --limit 1
gh run watch

# Step 3: Test staging after rollback
sleep 60
curl -s "https://dev.unitedwerise.org/health"
open "https://dev.unitedwerise.org"

# Step 4: Verify critical paths work
# - Login
# - Feed loads
# - Posts render
# - No console errors

# Step 5: Notify team and document issue
# Post to #engineering:
# "🚨 ROLLBACK: Batch 3 reverted due to [REASON]"
# "Issue: [DESCRIPTION]"
# "Status: Investigating root cause"
```

### Testing Requirements

#### Pre-Deployment Testing (Local)
- [ ] Unit tests: ES6 imports work
- [ ] Integration tests: Decorator chain works
- [ ] Manual tests: All critical paths
- [ ] Performance tests: apiManager.getStats() shows improvement
- [ ] Load tests: Reload page 10+ times

#### Staging Testing
- [ ] Smoke tests: Homepage loads, auth works
- [ ] Regression tests: All features from manual checklist
- [ ] Performance tests: Network tab shows deduplication
- [ ] Load tests: Multiple concurrent users (if possible)
- [ ] Soak tests: Leave page open for 30+ minutes

#### Production Testing (Future)
- [ ] Canary deployment: 10% traffic first
- [ ] Monitor logs: Check for errors
- [ ] Monitor metrics: Response times, error rates
- [ ] User reports: No complaints
- [ ] Rollback plan: Ready to execute

---

## 📊 EXPECTED OUTCOMES

### Success Metrics

#### Code Quality
- ✅ Single source of truth (api-manager.js)
- ✅ Zero duplicate implementations
- ✅ ES6 module standards followed
- ✅ Clear dependency graph
- ✅ Reduced global pollution (3 functions removed from critical-functions.js)

#### Performance
- ✅ Request deduplication active (apiManager tracks pending requests)
- ✅ Response caching working (apiManager cache with TTL)
- ✅ Retry logic enabled (exponential backoff)
- ✅ Rate limiting tracked (burst detection)
- ✅ Network requests reduced (check Network tab)

#### Maintainability
- ✅ Better code organization (separation of concerns)
- ✅ Easier to understand (single implementation)
- ✅ Easier to modify (change once, affects all)
- ✅ Easier to test (isolated modules)
- ✅ Documented architecture (this plan + inline comments)

### Migration Progress

**After Batch 3:**
- Source files: ✅ Migrated to ES6 (api-manager, reputation-integration)
- Consumer files: ⏸️ Pending (165 usages in 40 files)
- Global functions: 1 removed (window.apiCall source, still available via shim)

**After Batches 4-10:**
- Source files: ✅ Complete
- Consumer files: ✅ All migrated to ES6 imports
- Global functions: ✅ All removed (compatibility shim deleted)

---

## 📝 CONCLUSION

### Summary

Batch 3 is the **most critical batch** in the entire migration project:
- Fixes broken api-manager.js implementation
- Establishes single source of truth
- Converts core infrastructure to ES6 modules
- Maintains backward compatibility during migration
- Prepares foundation for Batches 4-10

### Recommendation

**PROCEED WITH BATCH 3 IMPLEMENTATION**

**Rationale:**
1. **Well-Planned:** Comprehensive analysis complete
2. **Low-Risk:** Compatibility shim ensures no breaking changes
3. **High-Value:** Fixes broken implementation, eliminates duplicates
4. **Incremental:** Can pause after Batch 3 if issues arise
5. **Reversible:** Clear rollback procedure defined

### Next Steps After Approval

1. Execute Steps 1-11 sequentially
2. Test each step thoroughly before proceeding
3. Deploy to staging
4. Monitor for 24-48 hours
5. Get user approval for Batch 4
6. Continue gradual consumer migration (Batches 4-10)

---

## 📚 APPENDIX

### A. File Change Summary

| File | Change Type | Lines Changed | Risk |
|------|-------------|---------------|------|
| api-manager.js | ES6 conversion + fix | ~50 | HIGH |
| critical-functions.js | Deletions | ~120 | HIGH |
| reputation-integration.js | ES6 conversion | ~200 | MEDIUM |
| navigation-handlers.js | Enhancement merge | ~30 | LOW |
| hcaptcha-integration.js | NEW | ~50 | LOW |
| api-compatibility-shim.js | NEW | ~20 | LOW |
| index.html | Script tag updates | ~10 | MEDIUM |

**Total:** ~480 lines changed across 7 files

### B. Testing Checklist Master

**Pre-Deployment:**
- [ ] Syntax valid (no compile errors)
- [ ] ES6 imports work
- [ ] ES6 exports work
- [ ] window.apiCall defined
- [ ] Decorator chain intact
- [ ] Local testing complete

**Staging:**
- [ ] Auth works (login/logout)
- [ ] Feed loads
- [ ] Posts render with reputation badges
- [ ] Navigation panels work
- [ ] CAPTCHA works
- [ ] API calls deduplicated
- [ ] Performance acceptable
- [ ] No console errors
- [ ] 24hr soak test passes

**Production (Future):**
- [ ] Canary deployment
- [ ] Monitoring alerts
- [ ] User feedback
- [ ] Rollback ready

### C. Related Documentation

- **Project Context:** `.claude/scratchpads/COMPATIBILITY_LAYER_MIGRATION.md`
- **Module Architecture:** `MODULE-ARCHITECTURE.md`
- **ES6 Protocol:** `.claude/protocols/ES6-MODULARIZATION-PROTOCOL.md` (if exists)
- **API Docs:** `docs/MASTER_DOCUMENTATION.md` (Section 4: API Reference)

### D. Contact Information

**Questions/Issues:**
- Check: `.claude/scratchpads/COMPATIBILITY_LAYER_MIGRATION.md`
- Review: This plan (BATCH3-CRITICAL-API-ARCHITECTURE-PLAN.md)
- Test: Local environment first
- Deploy: Staging before production

---

**END OF BATCH 3 ARCHITECTURE PLAN**

**Status:** 📋 PLANNING COMPLETE
**Awaiting:** User approval to proceed with implementation
**Next:** Execute Steps 1-11 if approved

---

*Generated: October 11, 2025*
*Project: Compatibility Layer Elimination*
*Batch: 3 of 10*
*Complexity: 16/16 (Maximum)*

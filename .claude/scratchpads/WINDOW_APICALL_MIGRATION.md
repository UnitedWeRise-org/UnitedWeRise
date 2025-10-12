# window.apiCall ES6 Import Migration

**Started:** October 12, 2025
**Status:** 🔍 PLANNING PHASE
**Objective:** Migrate 172 `window.apiCall` usages to ES6 imports from api-compatibility-shim.js

---

## 📊 SCOPE ANALYSIS

### Current State:
- **172 total usages** of `window.apiCall` across 41 files
- All files already ES6 modules (from Batches 1-10)
- api-compatibility-shim.js provides window.apiCall temporarily
- Source: `reputation-integration.js` (decorated apiCall)

### Target State:
- All files import: `import { apiCall } from '../js/api-compatibility-shim.js'`
- Remove window.apiCall from api-compatibility-shim.js (lines 20-26)
- Delete api-compatibility-shim.js entirely (merge into reputation-integration.js)
- Zero usages of `window.apiCall` (except in source module)

### Success Criteria:
- ✅ All 172 window.apiCall usages converted to ES6 imports
- ✅ api-compatibility-shim.js deleted
- ✅ All tests pass on staging
- ✅ All functionality preserved

---

## 📋 USAGE BREAKDOWN (Top 20 Files)

| Rank | File | Usages | Type |
|------|------|--------|------|
| 1 | components/Profile.js | 31 | Component |
| 2 | components/PostComponent.js | 15 | Component |
| 3 | components/FeedToggle.js | 11 | Component |
| 4 | handlers/relationship-handlers.js | 10 | Handler |
| 5 | js/main.js | 7 | Infrastructure |
| 6 | integrations/candidate-system-integration.js | 7 | Integration |
| 7 | handlers/trending-handlers.js | 7 | Handler |
| 8 | handlers/search-handlers.js | 6 | Handler |
| 9 | components/TopicNavigation.js | 6 | Component |
| 10 | components/PolicyPlatformManager.js | 6 | Component |
| 11 | handlers/messages-handlers.js | 5 | Handler |
| 12 | handlers/content-handlers.js | 5 | Handler |
| 13 | utils/performance.js | 4 | Utility |
| 14 | js/api-compatibility-shim.js | 4 | Source (skip) |
| 15 | handlers/notification-handlers.js | 4 | Handler |
| 16 | js/reputation-integration.js | 3 | Source (skip) |
| 17 | js/critical-functions.js | 3 | Legacy (skip) |
| 18 | handlers/civic-handlers.js | 3 | Handler |
| 19 | components/moderation/SensitiveContentViewer.js | 3 | Component |
| 20 | components/BadgeVault.js | 3 | Component |

**Total Top 20:** ~160 usages (93% of total)

---

## 🎯 MIGRATION STRATEGY

### Pattern to Apply:

**Before:**
```javascript
// No import statement

class MyComponent {
    async loadData() {
        const data = await window.apiCall('/api/endpoint', {
            method: 'GET'
        });
    }
}
```

**After:**
```javascript
// Add import at top of file
import { apiCall } from '../js/api-compatibility-shim.js';

class MyComponent {
    async loadData() {
        const data = await apiCall('/api/endpoint', {
            method: 'GET'
        });
    }
}
```

### Batch Strategy:
- **Small batches**: 3-5 files per batch
- **Low-risk first**: Start with components, then handlers, then complex files
- **Test each batch**: Deploy to staging after each batch
- **Rollback ready**: Each batch is independently revertible

---

## 📦 MIGRATION BATCHES

### Batch 1: Small Components (Low Risk)
**Status:** ⏸️ Pending
**Files:** 3
**Usages:** 17 total
**Risk:** Low

- [ ] components/BadgeVault.js (3 usages)
- [ ] components/moderation/SensitiveContentViewer.js (3 usages)
- [ ] components/SavedPostsView.js (2 usages, estimated)

### Batch 2: Medium Components
**Status:** ⏸️ Pending
**Files:** 3
**Usages:** 23 total
**Risk:** Medium

- [ ] components/FeedToggle.js (11 usages)
- [ ] components/TopicNavigation.js (6 usages)
- [ ] components/PolicyPlatformManager.js (6 usages)

### Batch 3: Large Components
**Status:** ⏸️ Pending
**Files:** 2
**Usages:** 46 total
**Risk:** High

- [ ] components/Profile.js (31 usages) ⚠️ LARGEST FILE
- [ ] components/PostComponent.js (15 usages)

### Batch 4: Small Handlers
**Status:** ⏸️ Pending
**Files:** 3
**Usages:** 12 total
**Risk:** Low

- [ ] handlers/civic-handlers.js (3 usages)
- [ ] handlers/notification-handlers.js (4 usages)
- [ ] handlers/content-handlers.js (5 usages)

### Batch 5: Medium Handlers
**Status:** ⏸️ Pending
**Files:** 3
**Usages:** 23 total
**Risk:** Medium

- [ ] handlers/search-handlers.js (6 usages)
- [ ] handlers/trending-handlers.js (7 usages)
- [ ] handlers/relationship-handlers.js (10 usages)

### Batch 6: Large Handlers & Integrations
**Status:** ⏸️ Pending
**Files:** 3
**Usages:** 19 total
**Risk:** High

- [ ] handlers/messages-handlers.js (5 usages)
- [ ] handlers/my-feed.js (estimated 7 usages)
- [ ] integrations/candidate-system-integration.js (7 usages)

### Batch 7: Utilities & Remaining
**Status:** ⏸️ Pending
**Files:** ~8
**Usages:** ~32 total
**Risk:** Varies

- [ ] utils/performance.js (4 usages)
- [ ] utils/activity-tracker.js (estimated)
- [ ] utils/username-router.js (estimated)
- [ ] modules/auth/UnifiedAuth.js (estimated)
- [ ] modules/core/api/client.js (estimated)
- [ ] modules/core/auth/unified-manager.js (estimated)
- [ ] components/UserCard.js (estimated)
- [ ] components/NewPostModal.js (estimated)
- [ ] Additional files with 1-2 usages each

---

## 🔄 MIGRATION STEPS (Per File)

1. **Read file** to understand current structure
2. **Count actual usages** (verify against estimate)
3. **Add import statement** at top: `import { apiCall } from '../path/to/api-compatibility-shim.js'`
4. **Replace all `window.apiCall` with `apiCall`** (use find/replace)
5. **Verify no window.apiCall remains** (grep check)
6. **Test locally** (no syntax errors)
7. **Commit with descriptive message**
8. **Push to staging**
9. **Validate on staging** (console check)
10. **Update tracking document**

---

## 📊 PROGRESS METRICS

### Overall Progress:
- **Files Migrated:** 0/41 (0%)
- **Usages Converted:** 0/172 (0%)
- **Batches Complete:** 0/7 (0%)

### Batch Progress:
- **Batch 1:** ⏸️ Pending
- **Batch 2:** ⏸️ Pending
- **Batch 3:** ⏸️ Pending
- **Batch 4:** ⏸️ Pending
- **Batch 5:** ⏸️ Pending
- **Batch 6:** ⏸️ Pending
- **Batch 7:** ⏸️ Pending

### Time Tracking:
- **Estimated Total:** 20-30 hours
- **Time Spent:** 0 hours
- **Remaining:** 20-30 hours

**Estimated based on:** ~2-4 hours per batch, 7 batches

---

## 🎓 LESSONS FROM ES6 MODULE MIGRATION

1. **Establish Pattern First**: Batch 1 will set the pattern
2. **Test Each Batch**: Don't batch commits together
3. **Backward Compatibility**: Not needed here (breaking change is OK)
4. **Time Estimates**: Likely too conservative (similar to module migration)
5. **Automation**: Consider find/replace patterns for faster migration

---

**Last Updated:** October 12, 2025
**Next Batch:** Batch 1 (Small Components) - Ready to start

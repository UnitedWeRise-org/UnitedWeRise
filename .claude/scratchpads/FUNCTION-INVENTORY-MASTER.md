# 📊 MASTER FUNCTION INVENTORY TRACKER
**Purpose**: Track all functions in index.html across modularization phases
**Last Updated**: September 26, 2025 - Phase 8 Planning

---

## 📈 OVERALL STATISTICS

### **Baseline (Before Phase 8):**
- **Total Functions**: 120 functions in index.html
- **Inline onclick Handlers**: 151 handlers
- **Inline style Attributes**: 591 styles
- **Estimated Remaining Lines**: ~7,000 lines in index.html

### **After Phase 7 (Previous):**
- **Extracted**: 84 functions across 7 phases
- **Modules Created**: 11 modules (core + handlers)
- **Lines Extracted**: ~8,500 lines

### **Phase 8 Target:**
- **Functions to Extract**: 16 functions (map + civic systems)
- **Expected Lines**: ~800-1000 lines
- **Onclick Handlers**: ~15-20 handlers
- **After Phase 8**: ~104 functions remaining

---

## 🗺️ PHASE 8 FUNCTION TRACKING

### **MAP SYSTEM FUNCTIONS** (8 functions)

#### ✅ Planned for Extraction:
- [ ] `initializeMap()` [Line 1418-1530] - 112 lines
  - Status: Pending extraction
  - Target Module: map-handlers.js
  - Complexity: HIGH (nested functions, library dependencies)

- [ ] `initializeMapLibreLocal()` [Line 1533+] - ~80 lines
  - Status: Pending extraction
  - Target Module: map-handlers.js
  - Complexity: MEDIUM (alternative implementation)

- [ ] `toggleMapLayer(layerName)` [Line 955-963] - 9 lines
  - Status: Pending extraction
  - Target Module: map-handlers.js
  - Complexity: LOW

- [ ] `toggleLayerDropdown()` [Line 966-977] - 12 lines
  - Status: Pending extraction
  - Target Module: map-handlers.js
  - Event Listener: Document click (lines 980-989)

- [ ] `toggleMapView(jurisdiction)` [Line 992-1104+] - ~112 lines
  - Status: Pending extraction
  - Target Module: map-handlers.js
  - Complexity: HIGH (boundary management, state updates)

- [ ] `createTopicPopup(topicData, map)` [Nested in initializeMap]
  - Status: Pending extraction
  - Target Module: map-handlers.js
  - Note: Currently nested, will become class method

- [ ] `updateLeafletMapTopics(newTopics)` [Nested in initializeMap]
  - Status: Pending extraction
  - Target Module: map-handlers.js
  - Global Export: window.updateMapTopics

- [ ] `showRandomPopups()` [Nested in initializeMap]
  - Status: Pending extraction
  - Target Module: map-handlers.js
  - Note: Uses closure variables

---

### **CIVIC SYSTEM FUNCTIONS** (8 functions)

#### ✅ Planned for Extraction:
- [ ] `loadElectedOfficials(zipCode, state)` [Line 1205-1286] - 82 lines
  - Status: Pending extraction
  - Target Module: civic-handlers.js
  - Complexity: HIGH (API call, data processing, boundary loading)

- [ ] `updateOfficialsPanel(representatives)` [Line 1288-1364] - 77 lines
  - Status: Pending extraction
  - Target Module: civic-handlers.js
  - Complexity: MEDIUM (DOM rendering, data iteration)

- [ ] `openDetail(title, offset)` [Line 1365-1371] - 7 lines
  - Status: Pending extraction
  - Target Module: civic-handlers.js
  - Complexity: LOW

- [ ] `closeDetail()` [Line 1373-1375] - 3 lines
  - Status: Pending extraction
  - Target Module: civic-handlers.js
  - Complexity: LOW

- [ ] `updateRadioButtonAvailability()` [Line 1104-1151] - 48 lines
  - Status: Pending extraction
  - Target Module: civic-handlers.js
  - Complexity: MEDIUM (state-based enabling/disabling)

- [ ] `updateRadioButtonState(level)` [Line 5672+] - ~20 lines
  - Status: Pending extraction
  - Target Module: civic-handlers.js
  - Complexity: LOW

- [ ] `loadUserContent()` [Line 1153-1203] - 51 lines
  - Status: Pending extraction
  - Target Module: civic-handlers.js
  - Complexity: MEDIUM (API call, data loading)

- [ ] `fixAuthStorageIssues()` [Line 923-953] - 31 lines
  - Status: Pending extraction
  - Target Module: civic-handlers.js
  - Complexity: LOW (storage management)

---

## 📋 REMAINING FUNCTIONS (Post-Phase 8)

### **Functions NOT Being Extracted in Phase 8:**

#### **Search & Filter System** (~20 functions)
- Advanced search functions
- Filter management
- Result display functions
- **Phase 9 Target**

#### **Settings & Configuration** (~15 functions)
- User preferences
- App configuration
- Admin settings panels
- **Phase 10 Target**

#### **Utility & Helper Functions** (~35 functions)
- Date/time formatting
- String manipulation
- Validation helpers
- Generic UI utilities
- **Phase 11-12 Target**

#### **Legacy/Uncategorized** (~26 functions)
- Functions requiring investigation
- Potential duplicates
- Deprecated code candidates
- **Final Cleanup Phase**

---

## 🎯 VERIFICATION METRICS

### **Function Count Verification:**
```bash
# Before Phase 8:
grep -n "function\s\+\w\+(" frontend/index.html | wc -l
# Expected: 120

# After Phase 8:
grep -n "function\s\+\w\+(" frontend/index.html | wc -l
# Expected: ~104 (reduction of 16)

# Verify specific functions removed:
grep -n "function initializeMap\|function loadElectedOfficials" frontend/index.html
# Expected: No matches
```

### **Inline Handler Verification:**
```bash
# Before Phase 8:
grep -o 'onclick="[^"]*"' frontend/index.html | wc -l
# Expected: 151

# After Phase 8:
grep -o 'onclick="[^"]*"' frontend/index.html | wc -l
# Expected: ~131-136 (reduction of 15-20)
```

### **Module Verification:**
```bash
# Verify new modules exist:
ls -la frontend/src/handlers/map-handlers.js
ls -la frontend/src/handlers/civic-handlers.js

# Verify modules load in main.js:
grep "map-handlers\|civic-handlers" frontend/src/js/main.js
```

---

## 📝 IMPLEMENTATION TRACKING

### **To Be Updated During Implementation:**

#### **Map Module Creation:**
- [ ] map-handlers.js created
- [ ] MapHandlers class structure implemented
- [ ] initializeMap() extracted
- [ ] initializeMapLibreLocal() extracted
- [ ] toggleMapLayer() extracted
- [ ] toggleLayerDropdown() extracted
- [ ] toggleMapView() extracted
- [ ] Nested functions converted to methods
- [ ] Event delegation implemented
- [ ] Global exports configured
- [ ] Integration with main.js
- [ ] Staging testing completed

#### **Civic Module Creation:**
- [ ] civic-handlers.js created
- [ ] CivicHandlers class structure implemented
- [ ] loadElectedOfficials() extracted
- [ ] updateOfficialsPanel() extracted
- [ ] openDetail() extracted
- [ ] closeDetail() extracted
- [ ] updateRadioButtonAvailability() extracted
- [ ] updateRadioButtonState() extracted
- [ ] loadUserContent() extracted
- [ ] fixAuthStorageIssues() extracted
- [ ] Event delegation implemented
- [ ] Global exports configured
- [ ] Integration with main.js
- [ ] Staging testing completed

#### **Legacy Code Cleanup:**
- [ ] Verified all functions extracted
- [ ] Removed map functions from index.html
- [ ] Removed civic functions from index.html
- [ ] Verified no broken references
- [ ] Checked for orphaned code
- [ ] Verified onclick handlers replaced

---

## 🔍 DISCOVERED FUNCTIONS LOG

### **Functions Found During Implementation:**
(To be updated if additional functions discovered during extraction)

**Example Format:**
- **Function**: `discoverFunctionName()`
- **Location**: Line XXXX
- **Reason Missed**: Not in initial search pattern
- **Action**: Add to current phase / defer to future phase

---

## 📊 PHASE COMPLETION METRICS

### **Phase 8 Success Criteria:**
- [ ] All 16 planned functions extracted
- [ ] Function count reduced by 16 (120 → 104)
- [ ] Onclick handlers reduced by 15-20 (151 → 131-136)
- [ ] Zero console errors on staging
- [ ] All features maintain functionality
- [ ] Documentation updated
- [ ] CSS tracked for future extraction

### **Overall Progress:**
- **Phases Completed**: 7 phases
- **Functions Extracted**: 84 functions (Pre-Phase 8)
- **Remaining Functions**: 104 functions (Post-Phase 8)
- **Total Progress**: ~50% of functions modularized
- **Estimated Remaining Phases**: 4-5 phases

---

**Document Status**: ✅ BASELINE ESTABLISHED - READY FOR TRACKING
**Next Update**: During Phase 8 implementation (real-time tracking)
**Final Update**: After Phase 8 completion (verification metrics)
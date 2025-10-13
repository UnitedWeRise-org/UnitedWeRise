# Z-Index Hierarchy Audit

**Generated**: 2025-10-13
**Purpose**: Comprehensive audit of all z-index values to prevent layering conflicts

## Z-Index Hierarchy (High to Low)

### Tier 1: Modals & Overlays (10000+)
- **10003** - TOTP Modal Overlay (`main.css:177`)
- **10002** - Map control tooltips (`map.css:347`)
- **10000** - Critical modals and overlays:
  - Badge vault modal (`badge-vault.css:5`)
  - Badge details modal (`badges.css:127`)
  - Badge tooltip (`badges.css:70`)
  - Media viewer overlay (`main.css:1544`)
  - Toast notification (`post-management.css:264`)
  - Map photo modal overlay (`map.css:838`, `map.css:1090`)
  - Quest tracker details modal (`quests.css:various`)

### Tier 2: Top Navigation (1000-999)
- **1001** - Logo circle (`main.css:870`) - extends beyond top bar
- **1000** - Top bar (`main.css:812`) - always visible
  - Also: Admin modals (`admin-dashboard.css:228`, `827`, `1735`, `3026`)
  - Elections modals (`elections-system.css:13`, `26`)
  - Candidate system modal (`candidate-system.css:363`)
  - Feed toggle tooltips (`feed-toggle.css:171`, `359`)
  - Map loading state (`map.css:460`)
  - Map location search (`map.css:496`)
- **999** - Sidebar (`main.css:1099`) - always visible

### Tier 3: Content Layer (100-10)
- **100** - Sticky table headers (`quests.css:various`)
- **10** - Admin table headers sticky (`admin-dashboard.css:1520`, `2143`)

### Tier 4: Interactive Elements (5-1)
- **5** - Map overlay (`map.css:175`)
- **4** - Below map overlay:
  - Feed controls wrapper (`feed-toggle.css:14`)
  - Map info panel (`map.css:1028`)
- **3** - Sticky composer (`main.css:1343`)
  - My profile panel (`main.css:1263`)
- **2** - [Various elements - needs investigation]
- **1** - Active tabs/buttons (`admin-dashboard.css:737`)

## Element Categories

### Always On Top (Never Hidden)
```
Logo:    1001
Top bar: 1000
Sidebar: 999
```

### Modals & Critical UI
```
TOTP modal:        10003
Tooltips/controls: 10002
Badge/media/toast: 10000
```

### Content & Navigation
```
Map overlay:       5
Feed controls:     4
Sticky composer:   3
```

## Known Conflicts

### ✅ RESOLVED
- Feed controls vs Map overlay: Feed controls (4) now below map (5)
- Feed controls vs Top bar: Feed controls (4) now properly slide under top bar (1000)
- Logo vs Main content: Logo (1001) now extends above top bar (1000)

### ⚠️ POTENTIAL ISSUES
1. **Multiple elements at z-index: 1000**
   - Top bar, various modals, tooltips
   - Should work if they don't overlap spatially
   - **Recommendation**: Consider separating into sub-tiers if conflicts arise

2. **Multiple elements at z-index: 10000**
   - Badge vault, media viewer, toast notifications
   - Should work if properly managed (shown one at a time)
   - **Recommendation**: Consider modal manager to ensure only one active

3. **Tooltips at z-index: 1000**
   - Feed toggle tooltips use 1000
   - Could conflict with top bar (also 1000)
   - **Recommendation**: Move tooltips to 1002 to ensure they appear above top bar

## Recommendations

### 1. Standardize Modal Z-Indexes
```
Modal content:  10001
Modal overlay:  10000
Modal controls: 10002
```

### 2. Clarify Tooltip Hierarchy
```
Critical tooltips (always visible): 1002
Standard tooltips: 6
```

### 3. Reserve Z-Index Ranges
```
10000+ : Modals & overlays (full screen)
1000s  : Navigation & persistent UI
100s   : Sticky elements
10s    : Interactive headers
1-9    : Content layer
```

### 4. Document Future Additions
Before adding new z-index values:
1. Check this audit
2. Choose appropriate tier
3. Update this document
4. Test with existing elements

## Testing Checklist

- [ ] Logo appears above all content
- [ ] Top bar never hidden by content
- [ ] Sidebar never hidden by content
- [ ] Feed controls slide under top bar
- [ ] Feed controls appear below map overlay
- [ ] Modals appear above everything except TOTP
- [ ] Tooltips visible above their parent elements
- [ ] Sticky elements stay above scrolling content

## Last Updated
- 2025-10-13: Initial audit
- Added feed controls fix (z-index: 4)
- Elevated top bar/sidebar to 1000s tier

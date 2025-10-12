# Archived JavaScript Files

## Purpose

This directory contains JavaScript files that have been **replaced by modern ES6 modules** but are preserved for historical reference and potential pattern reuse.

---

## Files in Archive

### mobile-navigation.js
**Archived:** October 11, 2025
**Reason:** Replaced by modern mobile UX components
**Replacement System:**
- `frontend/src/components/MobileBottomBar.js` (ES6 module)
- `frontend/src/components/MobileTopBar.js` (ES6 module)
- `frontend/src/components/TopBarController.js` (ES6 module)
- `frontend/src/components/FeedToggle.js` (ES6 module)

**Original Purpose:**
- Mobile sidebar management
- Mobile navigation view switching
- Swipe gesture handling
- Mobile-specific rendering (feed, trending, messages, etc.)

**Why Kept:**
- Contains useful mobile UX patterns for reference
- Historical record of mobile navigation evolution
- May inform future mobile feature development

**Status:** NOT LOADED - File is not imported or referenced in active code

**Migration Path (if reactivation needed):**
1. Extract specific function needed
2. Convert to ES6 module format
3. Import in relevant component
4. Test thoroughly before deployment

---

## Archive Policy

Files are moved here when:
- Functionality has been completely replaced by ES6 modules
- File is no longer imported or loaded anywhere
- Historical record is valuable for reference
- Code contains patterns that may be useful in future development

Files are NOT deleted because:
- Git history alone doesn't preserve context
- Code patterns may inform future features
- Documentation of "why we don't do it this way anymore" is valuable

---

## Accessing Archived Files

These files are preserved in git and can be viewed anytime:

```bash
# View archived file
cat frontend/src/js/archived/mobile-navigation.js

# Check git history
git log -- frontend/src/js/archived/mobile-navigation.js

# Search for patterns
grep -n "function.*Mobile" frontend/src/js/archived/mobile-navigation.js
```

---

## Related Documentation

- **ES6 Module Migration Plan:** `/docs/ES6-MIGRATION-PLAN.md` (📜 Historical)
- **Frontend Development Guide:** `/docs/FRONTEND-DEVELOPMENT-GUIDE.md`
- **Mobile Component Architecture:** See `MobileBottomBar.js` and `MobileTopBar.js`

---

**Last Updated:** October 11, 2025
**Archived Files:** 1 (mobile-navigation.js)
**Archive Reason:** ES6 modularization complete - replaced by modern components

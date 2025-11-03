# ES6 Modularization Protocol

**Protection Status**: 🔒 PROTECTED
**Created**: 2025-10-31
**Last Updated**: 2025-10-31

---

## 🎯 When to Use This Protocol

**USE THIS PROTOCOL when**:
- Migrating non-module JavaScript to ES6 modules
- Found `<script>` tags without `type="module"`
- Found inline `<script>` blocks with code
- Eliminating hardcoded environment URLs
- Converting window-global scripts to modules
- Refactoring legacy JavaScript to modern module system

**SKIP THIS PROTOCOL if**:
- All scripts already use `type="module"`
- Working with external libraries (CDN scripts)
- No JavaScript migration work needed

**UNCERTAIN?** Ask yourself:
- Are there any `<script>` tags in HTML without `type="module"`?
- Is there inline JavaScript code in HTML files?
- Are there `.js` files that don't use import/export?

---

## Overview

**CRITICAL**: This protocol prevents incomplete migrations that cause bugs from mixing module and non-module code.

ES6 modules provide:
- Proper encapsulation and scope isolation
- Explicit dependency management
- Environment-aware configuration
- Modern JavaScript tooling support
- Elimination of global namespace pollution

This 6-phase protocol ensures complete, safe migration without breaking existing functionality.

---

## Prerequisites

- Project has a module structure (e.g., `src/modules/` or `frontend/src/js/`)
- Environment detection system exists or will be created
- Ability to test in both local and staging environments
- Understanding of JavaScript module system basics

---

## Procedure

### Phase 1: Detection

**Goal**: Find all non-module scripts that need migration.

**Search for ALL non-module scripts:**

```bash
# Search in HTML files
grep -n '<script' *.html
grep -rn '<script' . --include="*.html"

# Look for both:
# - <script src="..."> without type="module"
# - <script>inline code</script> blocks
```

**Document findings**: Create a list with:
- File path
- Script purpose (what does it do?)
- Dependencies (what does it need? what needs it?)
- Location (inline vs external file)

**Example Documentation:**
```markdown
## Scripts Found

1. `index.html:45` - `<script src="js/auth.js"></script>`
   - Purpose: Handles user authentication
   - Dependencies: None
   - Depends on it: login form, user menu

2. `dashboard.html:12` - `<script>const API_URL = '...';</script>`
   - Purpose: Hardcoded API URL
   - Dependencies: None
   - Depends on it: All API calls on page
```

---

### Phase 2: Analysis

For each non-module script found in Phase 1:

**1. Identify functionality**
- What does this script do?
- Is it critical or optional?
- How is it currently used?

**2. Check for module replacement**
```bash
# Search for existing module
grep -r "export.*ClassName" src/
# Check if functionality already exists in modules
```

**3. Assess dependencies**
- What does this script depend on? (libraries, other scripts, global variables)
- What depends on it? (other scripts, HTML elements, event listeners)

**Determine outcome:**

| Finding | Action |
|---------|--------|
| **Module exists** (functionality already in module) | Script is redundant → Phase 5 (Cleanup) |
| **Module missing** (no module for this functionality) | Need to create → Phase 3 (Creation) |
| **Partial module** (module incomplete) | Need to complete → Phase 3 (Completion) |

---

### Phase 3: Creation/Completion

Create or complete the ES6 module.

**Step 1: Choose location**
- `src/modules/` for shared modules
- `src/services/` for service classes
- `src/utils/` for utility functions
- Project-appropriate directory structure

**Step 2: Create module file**
Use `.js` extension (not `.mjs`)

**Step 3: Write module structure**

```javascript
/**
 * @module ModuleName
 * @description Purpose of this module
 */

class ModuleName {
    constructor() {
        // Initialization
    }

    // Methods
    methodName() {
        // Implementation
    }
}

// Export singleton or class
export default new ModuleName();
// OR
export { ModuleName };
```

**Step 4: Port functionality**
- Copy code from old script
- Adapt to ES6 syntax (const/let, arrow functions, etc.)
- Remove global assignments (window.X = ...)
- Use proper encapsulation

**Step 5: Add imports**
```javascript
import { dependency1 } from './path/to/dependency1.js';
import dependency2 from './path/to/dependency2.js';
```

**Step 6: Handle environment**
```javascript
// WRONG (hardcoded)
const API_URL = 'https://api.production.com';

// CORRECT (module-based)
import { getApiBaseUrl } from '../utils/environment.js';
const API_URL = getApiBaseUrl();
```

---

### Phase 4: Testing

🔒 **CRITICAL**: NEVER delete old code until new module is verified working.

**Step 1: Comment out old script tag**

```html
<!-- MIGRATION: Replaced by src/modules/NewModule.js -->
<!-- <script src="js/oldScript.js"></script> -->
```

**Step 2: Add module import**

```html
<script type="module" src="src/modules/NewModule.js"></script>
```

**Step 3: Test ALL functionality**

Create a test checklist:
```markdown
## Test Checklist for [ModuleName]

- [ ] Page loads without errors
- [ ] No console errors
- [ ] Feature X works
- [ ] Feature Y works
- [ ] Integration with Z works
- [ ] Tested in local environment
- [ ] Tested in staging environment
- [ ] Tested in production (if applicable)
```

**Test systematically:**
1. Open browser console
2. Check for errors (should be zero)
3. Test every feature the module provides
4. Test integrations with other components
5. Test in multiple environments

**Step 4: Document test results**

Record what was tested and results. If ANY test fails, return to Phase 3 and fix the issue.

---

### Phase 5: Cleanup

**Only proceed after ALL tests pass in Phase 4.**

**Step 1: Delete commented script tag**

Remove the commented `<!-- ... -->` lines from HTML.

**Step 2: Delete old script file**

```bash
# Verify file is not used elsewhere first
grep -r "oldScript.js" .

# If only found in already-cleaned HTML, delete it
rm frontend/js/oldScript.js
```

**Step 3: Remove from git**

```bash
git rm frontend/js/oldScript.js
git commit -m "refactor: Complete migration to ES6 module system

- Migrated oldScript.js functionality to src/modules/NewModule.js
- Removed legacy non-module script
- All tests passing in local and staging

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6: Documentation

Update project documentation to reflect the migration.

**1. CHANGELOG.md**
```markdown
## [Unreleased] - YYYY-MM-DD

### Changed - ES6 Modularization
- **JavaScript Modules**
  - Migrated `oldScript.js` to ES6 module `src/modules/NewModule.js`
  - Removed legacy non-module script
  - Location: `frontend/index.html`, `src/modules/NewModule.js`

**Impact**: All JavaScript now uses modern module system. No breaking changes to functionality.
```

**2. Architecture docs**
Update module dependency graphs or architecture documentation.

**3. Code comments**
Add comments noting any breaking changes or migration notes for future developers.

**4. Migration log**
Keep a log of what was migrated and when:
```markdown
## ES6 Migration Log

### 2025-10-31
- Migrated: `auth.js` → `src/modules/AuthModule.js`
- Migrated: API URL configuration → `src/utils/environment.js`
- Status: Complete, all tests passing
```

---

## Red Flags - STOP and Reassess

If you encounter any of these, STOP and reassess before proceeding:

🚩 **Old script calls functions defined in module**
- **Issue**: Scope mismatch
- **Check**: Does module export them globally? If not, fix module exports.

🚩 **Module depends on old script**
- **Issue**: Incomplete migration
- **Solution**: Merge both into single module or complete migration of dependency.

🚩 **Tests fail with new module**
- **Issue**: Functionality mismatch
- **Solution**: DO NOT delete old code yet. Debug and fix parity issues first.

🚩 **Different behavior between old and new**
- **Issue**: Porting error
- **Solution**: Compare implementations line by line. Fix parity issues before cleanup.

🚩 **Module works locally but fails in staging**
- **Issue**: Environment detection or path issue
- **Solution**: Check environment.js configuration and module paths.

---

## Common Patterns

### Pattern 1: Utility Functions

**Old (non-module):**
```javascript
function apiCall(url) {
    return fetch(url).then(res => res.json());
}
```

**New (module):**
```javascript
export async function apiCall(url) {
    const response = await fetch(url);
    return response.json();
}
```

**Import:**
```javascript
import { apiCall } from './api.js';
```

---

### Pattern 2: Singleton Service

**Old (non-module):**
```javascript
window.AuthService = {
    login() { /* ... */ },
    logout() { /* ... */ }
};
```

**New (module):**
```javascript
class AuthService {
    login() { /* ... */ }
    logout() { /* ... */ }
}
export default new AuthService();
```

**Import:**
```javascript
import AuthService from './AuthService.js';
```

---

### Pattern 3: Environment Detection

**WRONG (hardcoded):**
```javascript
const API_URL = 'https://api.production.com';
```

**CORRECT (module-based):**
```javascript
import { getApiBaseUrl } from '../utils/environment.js';
const API_URL = getApiBaseUrl();
```

**Environment module example:**
```javascript
export function getApiBaseUrl() {
    const hostname = window.location.hostname;

    if (hostname === 'www.unitedwerise.org') {
        return 'https://api.unitedwerise.org';
    } else if (hostname === 'dev.unitedwerise.org') {
        return 'https://dev-api.unitedwerise.org';
    } else {
        return 'http://localhost:3000'; // Local development
    }
}
```

---

## Verification

### Final Verification Checklist

Before considering migration complete:

- [ ] All `<script>` tags have `type="module"` OR are external libraries
- [ ] No inline `<script>` blocks with code (except external libraries)
- [ ] All custom modules use `import`/`export` syntax
- [ ] No hardcoded environment URLs (staging vs production)
- [ ] All old non-module files deleted from codebase
- [ ] All old non-module files removed from git
- [ ] Documentation updated (CHANGELOG, architecture docs)
- [ ] Tests pass in local environment
- [ ] Tests pass in staging environment
- [ ] Tests pass in production environment (if applicable)
- [ ] No console errors in any environment
- [ ] All functionality works as before migration

---

## Troubleshooting

**Issue**: Module not found / 404 errors
**Solution**:
- Check file paths are correct (relative to HTML file)
- Check file extensions include `.js`
- Check file actually exists at that path
- Check module export syntax is correct

**Issue**: "Cannot use import statement outside a module"
**Solution**:
- Verify script tag has `type="module"`
- Check for any remaining non-module scripts that import modules

**Issue**: Functions/classes undefined
**Solution**:
- Check export syntax in module
- Check import syntax in consuming file
- Verify exported names match imported names

**Issue**: Works locally but fails in staging
**Solution**:
- Check environment detection logic
- Verify all module files deployed to staging
- Check browser console for specific errors
- Check file paths are environment-agnostic

---

## Examples

### Example 1: Migrating Simple Utility Script

**Before** (`utils.js`):
```javascript
function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

window.utils = { formatDate };
```

**After** (`src/utils/date-utils.js`):
```javascript
/**
 * @module DateUtils
 * @description Date formatting utilities
 */

export function formatDate(date) {
    return new Date(date).toLocaleDateString();
}
```

**Usage**:
```javascript
import { formatDate } from './utils/date-utils.js';

const formatted = formatDate(new Date());
```

---

### Example 2: Migrating Auth Service

**Before** (`auth.js`):
```javascript
window.AuthService = {
    currentUser: null,

    async login(email, password) {
        const response = await fetch('https://api.site.com/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.currentUser = await response.json();
        return this.currentUser;
    }
};
```

**After** (`src/services/AuthService.js`):
```javascript
/**
 * @module AuthService
 * @description Authentication service
 */

import { getApiBaseUrl } from '../utils/environment.js';

class AuthService {
    constructor() {
        this.currentUser = null;
        this.apiBaseUrl = getApiBaseUrl();
    }

    async login(email, password) {
        const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        this.currentUser = await response.json();
        return this.currentUser;
    }
}

export default new AuthService();
```

**Usage**:
```javascript
import AuthService from './services/AuthService.js';

const user = await AuthService.login('user@example.com', 'password');
```

---

## Related Resources

- Project architecture documentation
- `src/utils/environment.js` - Environment detection module
- `.claude/guides/common-patterns.md` - JavaScript patterns guide
- CHANGELOG.md - Record of migrations

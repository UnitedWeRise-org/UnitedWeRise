# ES6 Modularization Protocol

**Type**: Special (🔒 PROTECTED)
**Last Updated**: 2025-12-08

---

## When to Use

**USE THIS PROTOCOL when**:
- Migrating non-module JavaScript to ES6 modules
- Found `<script>` tags without `type="module"`
- Found inline `<script>` blocks with code
- Eliminating hardcoded environment URLs
- Converting window-global scripts to modules

**SKIP if**:
- All scripts already use `type="module"`
- Working with external libraries (CDN scripts)
- No JavaScript migration needed

---

## Overview

**CRITICAL**: This protocol prevents incomplete migrations that cause bugs from mixing module and non-module code.

This 6-phase protocol ensures complete, safe migration:
1. **Detection** - Find all non-module scripts
2. **Analysis** - Assess each script's functionality
3. **Creation/Completion** - Build ES6 module
4. **Testing** - Verify before cleanup
5. **Cleanup** - Remove old code
6. **Documentation** - Record changes

**NEVER delete old code until new module verified working in all environments.**

---

## Phase 1: Detection

Find all non-module scripts:

```bash
grep -n '<script' *.html
grep -rn '<script' . --include="*.html"
```

Document findings:
- File path
- Script purpose
- Dependencies
- Location (inline vs external)

---

## Phase 2: Analysis

For each script found:

1. **Identify functionality** - What does it do?
2. **Check for module replacement** - `grep -r "export.*ClassName" src/`
3. **Assess dependencies** - What needs it? What does it need?

**Determine outcome:**

| Finding | Action |
|---------|--------|
| Module exists | Redundant → Phase 5 |
| Module missing | Create → Phase 3 |
| Partial module | Complete → Phase 3 |

---

## Phase 3: Creation/Completion

**Step 1: Choose location**
- `src/modules/` for shared modules
- `src/services/` for service classes
- `src/utils/` for utility functions

**Step 2: Create module**

```javascript
/**
 * @module ModuleName
 * @description Purpose of this module
 */

class ModuleName {
    constructor() {
        // Initialization
    }

    methodName() {
        // Implementation
    }
}

export default new ModuleName();
```

**Step 3: Port functionality**
- Copy code from old script
- Adapt to ES6 syntax
- Remove global assignments (`window.X = ...`)
- Use proper encapsulation

**Step 4: Handle environment**

```javascript
// WRONG (hardcoded)
const API_URL = 'https://api.production.com';

// CORRECT (module-based)
import { getApiBaseUrl } from '../utils/environment.js';
const API_URL = getApiBaseUrl();
```

---

## Phase 4: Testing

🔒 **NEVER delete old code until verified working.**

**Step 1: Comment out old script**
```html
<!-- MIGRATION: Replaced by src/modules/NewModule.js -->
<!-- <script src="js/oldScript.js"></script> -->
```

**Step 2: Add module import**
```html
<script type="module" src="src/modules/NewModule.js"></script>
```

**Step 3: Test ALL functionality**
- [ ] Page loads without errors
- [ ] No console errors
- [ ] All features work
- [ ] Tested in local environment
- [ ] Tested in staging environment

---

## Phase 5: Cleanup

**Only after ALL tests pass:**

1. Delete commented script tag from HTML
2. Delete old script file:
   ```bash
   grep -r "oldScript.js" .  # Verify not used elsewhere
   rm frontend/js/oldScript.js
   ```
3. Commit:
   ```bash
   git rm frontend/js/oldScript.js
   git commit -m "refactor: Complete ES6 migration for [module]"
   ```

---

## Phase 6: Documentation

Update CHANGELOG.md:
```markdown
### Changed - ES6 Modularization
- Migrated `oldScript.js` to ES6 module `src/modules/NewModule.js`
- Removed legacy non-module script
```

---

## Red Flags - STOP and Reassess

🚩 **Old script calls functions defined in module** - Scope mismatch
🚩 **Module depends on old script** - Incomplete migration
🚩 **Tests fail with new module** - DO NOT delete old code
🚩 **Different behavior old vs new** - Porting error
🚩 **Works locally but fails in staging** - Environment/path issue

---

## Common Patterns

### Utility Functions

**Old:**
```javascript
function apiCall(url) {
    return fetch(url).then(res => res.json());
}
```

**New:**
```javascript
export async function apiCall(url) {
    const response = await fetch(url);
    return response.json();
}
```

### Singleton Service

**Old:**
```javascript
window.AuthService = {
    login() { /* ... */ },
    logout() { /* ... */ }
};
```

**New:**
```javascript
class AuthService {
    login() { /* ... */ }
    logout() { /* ... */ }
}
export default new AuthService();
```

### Environment Detection

```javascript
export function getApiBaseUrl() {
    const hostname = window.location.hostname;

    if (hostname === 'www.unitedwerise.org') {
        return 'https://api.unitedwerise.org';
    } else if (hostname === 'dev.unitedwerise.org') {
        return 'https://dev-api.unitedwerise.org';
    } else {
        return 'http://localhost:3000';
    }
}
```

---

## Verification

Before migration complete:
- [ ] All `<script>` tags have `type="module"` OR are external libraries
- [ ] No inline `<script>` blocks with code
- [ ] All modules use `import`/`export`
- [ ] No hardcoded environment URLs
- [ ] Old files deleted from git
- [ ] Documentation updated
- [ ] Tests pass in all environments
- [ ] No console errors

---

## Troubleshooting

**Module not found / 404:**
- Check file paths relative to HTML
- Include `.js` extension
- Verify file exists

**"Cannot use import outside module":**
- Script tag missing `type="module"`

**Functions/classes undefined:**
- Check export syntax
- Check import syntax
- Verify names match

**Works locally, fails in staging:**
- Check environment detection
- Verify all files deployed
- Check file paths

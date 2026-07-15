---
name: es6-migration
description: Use when converting non-module or inline JavaScript to ES6 modules — provides the 6-phase migration process (Detection → Analysis → Creation → Testing → Cleanup → Documentation), module template, RED FLAGS, and common patterns. Triggers on ES6, module, modularize, inline script, convert to module, refactor to modules, import/export, window-global script.
---

# ES6 Modularization (🔒 core principle: modularity by default)

## When to use / Skip if
- **Use when:** migrating non-module JS to ES6 modules; found `<script>` without `type="module"`; found inline `<script>` code; eliminating hardcoded environment URLs; converting `window`-global scripts to modules.
- **Skip if:** all scripts already use `type="module"`; working with external CDN libraries; no JS migration needed.

**CRITICAL:** This process prevents incomplete migrations that cause bugs from mixing module and non-module code. **NEVER delete old code until the new module is verified working in all environments.**

## Phase 1: Detection
Find all non-module scripts:
```bash
grep -n '<script' *.html
grep -rn '<script' . --include="*.html"
```
Document: file path · purpose · dependencies · inline vs external.

## Phase 2: Analysis
For each script: identify functionality, check for a module replacement (`grep -r "export.*ClassName" src/`), assess dependencies.

| Finding | Action |
|---------|--------|
| Module exists | Redundant → Phase 5 |
| Module missing | Create → Phase 3 |
| Partial module | Complete → Phase 3 |

## Phase 3: Creation/Completion
Location: `src/modules/` (shared), `src/services/` (service classes), `src/utils/` (utilities).
```javascript
/**
 * @module ModuleName
 * @description Purpose of this module
 */
class ModuleName {
    constructor() { /* Initialization */ }
    methodName() { /* Implementation */ }
}
export default new ModuleName();
```
Port functionality: copy old code, adapt to ES6, **remove global assignments (`window.X = ...`)**, use encapsulation. Handle environment:
```javascript
// WRONG (hardcoded)
const API_URL = 'https://api.production.com';
// CORRECT (module-based)
import { getApiBaseUrl } from '../utils/environment.js';
const API_URL = getApiBaseUrl();
```

## Phase 4: Testing
🔒 **NEVER delete old code until verified working.** Comment out the old script, add the module import (`<script type="module" src="...">`), then test: page loads · no console errors · all features work · tested local · tested staging.

## Phase 5: Cleanup (only after ALL tests pass)
```bash
grep -r "oldScript.js" .   # verify not used elsewhere
git rm js/oldScript.js
git commit -m "refactor: Complete ES6 migration for [module]"
```

## Phase 6: Documentation
Update CHANGELOG.md (Changed — ES6 Modularization: migrated X → module Y, removed legacy script).

## Red Flags — STOP and Reassess
- 🚩 Old script calls functions defined in module — scope mismatch
- 🚩 Module depends on old script — incomplete migration
- 🚩 Tests fail with new module — DO NOT delete old code
- 🚩 Different behavior old vs new — porting error
- 🚩 Works locally but fails in staging — environment/path issue

## Common Patterns
**Utility functions:** `function apiCall(url){...}` → `export async function apiCall(url){ const r = await fetch(url); return r.json(); }`
**Singleton service:** `window.AuthService = {...}` → `class AuthService {...}  export default new AuthService();`
**Environment detection:** an exported `getApiBaseUrl()` that switches on `window.location.hostname` (production/staging/local) — never hardcode URLs.

## Troubleshooting
- **Module not found / 404:** check paths relative to HTML; include `.js` extension; verify file exists.
- **"Cannot use import outside module":** script tag missing `type="module"`.
- **Functions/classes undefined:** check export/import syntax; verify names match.
- **Works locally, fails in staging:** check environment detection; verify all files deployed; check paths.

# Admin Subdomain Routing - Troubleshooting Guide

**Document Version**: 1.0
**Last Updated**: October 17, 2025
**Maintainer**: Development Team
**Related**: CHANGELOG.md (2025-10-17), MASTER_DOCUMENTATION.md (Admin Dashboard Isolation)

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Reference](#quick-reference)
3. [Diagnostic Steps](#diagnostic-steps)
4. [Common Issues](#common-issues)
5. [Testing Procedures](#testing-procedures)
6. [Emergency Procedures](#emergency-procedures)
7. [Technical Details](#technical-details)

---

## Overview

### What is Admin Subdomain Routing?

Admin subdomain routing is a client-side redirect system and infrastructure preparation for future **session isolation** between the main UnitedWeRise site and the admin dashboard.

**⚠️ IMPORTANT**: Session isolation is NOT currently working. Cookies are shared across all subdomains via backend configuration (`domain: .unitedwerise.org`). This infrastructure prepares for future migration to separate Static Web Apps.

**Key URLs:**

| Environment | Main Site | Admin Dashboard |
|------------|-----------|----------------|
| Production | https://www.unitedwerise.org | https://admin.unitedwerise.org |
| Staging | https://dev.unitedwerise.org | https://dev-admin.unitedwerise.org |

### Why Separate Subdomains?

**Problem To Be Solved** (Future Goal): Login conflicts between main site and admin dashboard

Login conflicts occur because both sites share the same browser storage (cookies, localStorage, sessionStorage).

**Current Implementation**: Convenience feature - admin subdomains redirect to admin dashboard
**Future Solution**: Separate Static Web Apps will use different cookie domains, achieving true session isolation via browser same-origin policy

### How It Works (Current Implementation)

1. **DNS Configuration**: CNAME records point admin subdomains to Azure Static Web Apps
2. **Azure Limitation**: Azure Static Web Apps serves identical content for all custom domains (no hostname-based routing)
3. **Client-Side Redirect**: JavaScript detects admin subdomain and redirects from `/` to `/admin-dashboard.html`
4. **Session Isolation**: ❌ NOT WORKING - Backend sets cookies with `domain: .unitedwerise.org`, which shares cookies across all subdomains
5. **Future Fix**: Separate Static Web Apps → separate backend auth endpoints → different cookie domains → true session isolation

---

## Quick Reference

### Symptoms and Solutions

| Symptom | Quick Check | Fix |
|---------|-------------|-----|
| Admin subdomain shows main site | Browser console for redirect logs | Check redirect script execution |
| Session not isolated | Test cookie storage | Verify hostname detection |
| Redirect loop | Browser console errors | Check isOnAdminDashboard() logic |
| Flash of wrong content | Network tab timing | Ensure redirect script loads first |
| 404 on redirect script | curl script URL | Redeploy frontend |

### Key Files

| File | Purpose | Location |
|------|---------|----------|
| admin-redirect.js | Forward redirect logic | frontend/src/utils/admin-redirect.js |
| index.html | Loads redirect script | frontend/index.html (lines 196-198) |
| admin-dashboard.html | Reverse redirect logic | frontend/admin-dashboard.html (lines 10-40) |
| environment.js | Environment detection | frontend/src/utils/environment.js |

### Commands Cheat Sheet

```bash
# Check DNS propagation
nslookup admin.unitedwerise.org

# Verify redirect script deployed
curl -s https://admin.unitedwerise.org/src/utils/admin-redirect.js | head -5

# Check redirect script loaded first
curl -s https://admin.unitedwerise.org/ | grep -A2 "admin-redirect.js"

# Test session isolation
# Open browser console on www.unitedwerise.org:
localStorage.setItem('test', 'main')
# Then on admin.unitedwerise.org:
localStorage.getItem('test')  // Should return null
```

---

## Diagnostic Steps

### Step 1: Verify DNS Configuration

**Check CNAME records point to Azure Static Web Apps**

```bash
nslookup admin.unitedwerise.org
nslookup dev-admin.unitedwerise.org
```

**Expected Output:**
```
admin.unitedwerise.org
  canonical name = *.azurestaticapps.net
```

**If DNS not propagated:**
- Wait 5-15 minutes for DNS propagation
- Check DNS provider configuration (Azure DNS or external provider)
- Verify CNAME records created correctly

**If wrong target:**
- Update CNAME record to point to correct Azure Static Web App
- Wait for propagation (5-15 minutes)

---

### Step 2: Verify Redirect Script Exists and Loads

**Check redirect script is deployed**

```bash
curl -s https://admin.unitedwerise.org/src/utils/admin-redirect.js | head -10
curl -s https://dev-admin.unitedwerise.org/src/utils/admin-redirect.js | head -10
```

**Expected Output:**
```javascript
/**
 * @module utils/admin-redirect
 * @description Admin subdomain redirect handler
 *
 * CRITICAL: This module MUST execute before any other modules to prevent
 * flash of wrong content on admin subdomains.
 */
```

**If 404 or empty:**
1. Check GitHub Actions deployment status
2. Verify file exists in repository: `frontend/src/utils/admin-redirect.js`
3. Redeploy frontend if needed
4. Wait 2-3 minutes for CDN propagation

---

### Step 3: Verify Redirect Script Execution Order

**Check index.html loads redirect script FIRST (before main.js)**

```bash
curl -s https://admin.unitedwerise.org/ | grep -B2 -A2 "admin-redirect.js"
```

**Expected Output:**
```html
<!-- CRITICAL: Admin subdomain redirect (MUST be first module loaded) -->
<!-- This prevents flash of wrong content when accessing admin.unitedwerise.org or dev-admin.unitedwerise.org -->
<script type="module" src="src/utils/admin-redirect.js"></script>

<!-- Core Application JavaScript - Modern ES6 Module System -->
<script type="module" src="src/js/main.js"></script>
```

**If not present or wrong order:**
1. Edit `frontend/index.html` lines 196-198
2. Ensure admin-redirect.js script tag appears BEFORE main.js
3. Commit and redeploy frontend

---

### Step 4: Verify Hostname Detection in Browser

**Open browser DevTools console on admin subdomain**

```javascript
// Run in browser console
window.location.hostname
```

**Expected Output:**
- On admin.unitedwerise.org: `"admin.unitedwerise.org"`
- On dev-admin.unitedwerise.org: `"dev-admin.unitedwerise.org"`

**If shows www.unitedwerise.org or dev.unitedwerise.org:**
- DNS issue - go back to Step 1
- May still be cached - clear browser cache and retry
- Check if using HTTP instead of HTTPS (should auto-redirect to HTTPS)

---

### Step 5: Check Browser Console for Redirect Logs

**Open browser DevTools console when loading admin subdomain**

**Expected Log:**
```
[Admin Redirect] Redirecting to admin dashboard: /admin-dashboard.html
```

**If log missing:**

**Scenario A: Redirect script not executing**
- Check Step 2 and Step 3
- Look for JavaScript errors in console
- Verify script has `type="module"` attribute

**Scenario B: isRootPath() check failing**
```javascript
// Debug in console:
window.location.pathname
// Expected: "/" or "/index.html"
```

**Scenario C: isOnAdminDashboard() returned true**
- Already on admin-dashboard.html (redirect already happened)
- This is normal behavior

**If redirect log shows error:**
```
[Admin Redirect] Redirect failed: <error message>
```
- Check browser console for full error stack trace
- Common causes:
  - JavaScript syntax error (check for recent code changes)
  - Module loading failure (check network tab)
  - Browser compatibility issue (test in different browser)

---

### Step 6: Verify Redirect Performance

**Open browser DevTools console on admin subdomain**

**Expected: NO performance warning**

**If warning appears:**
```
[Admin Redirect] Slow execution: 15.23ms (target: <10ms)
```

**Possible Causes:**
- Slow DNS resolution (check DNS provider)
- Network latency (check network tab for delays)
- Script conflicts (check for other scripts executing simultaneously)
- Browser performance issue (close other tabs, restart browser)

**Impact:**
- Execution time >10ms may cause visible flash of wrong content
- Performance warning is informational, not critical
- If consistently >50ms, investigate further

---

### Step 7: Check Reverse Redirect Prevention

**Visit main site admin dashboard path**

Navigate to:
- https://www.unitedwerise.org/admin-dashboard.html (production)
- https://dev.unitedwerise.org/admin-dashboard.html (staging)

**Expected Behavior:**
- Automatic redirect to admin subdomain
- URL changes to https://admin.unitedwerise.org/admin-dashboard.html

**Expected Console Log:**
```
[Admin Dashboard] Redirecting to admin subdomain: https://admin.unitedwerise.org/admin-dashboard.html
```

**If no redirect occurs:**
1. Check admin-dashboard.html lines 10-40 for reverse redirect script
2. Verify script is inline (not ES6 module) in `<head>` section
3. Check browser console for JavaScript errors
4. Redeploy admin-dashboard.html if script missing

---

### Step 8: Verify Session Isolation (KNOWN TO FAIL)

⚠️ **EXPECTED RESULT**: Session isolation does NOT work with current implementation.

**Test Cookie Isolation:**

1. Login on www.unitedwerise.org
2. Open admin.unitedwerise.org in NEW TAB (same browser)
3. Check if logged out

**Expected:** ❌ Still logged in (cookies shared across subdomains)

**Test localStorage Isolation:**

```javascript
// On www.unitedwerise.org (browser console):
localStorage.setItem('test', 'main')

// On admin.unitedwerise.org (browser console):
localStorage.getItem('test')  // Returns: null (localStorage DOES work correctly)
```

**Why Session Isolation Doesn't Work:**

Backend authentication cookies are set with `domain: .unitedwerise.org` (see `backend/src/routes/auth.ts` lines 252, 461, 504). This tells the browser to share the cookie with ALL `*.unitedwerise.org` subdomains.

**Fix:** Requires separate Static Web Apps pointing to separate backend auth endpoints that use different cookie domains.

---

## Common Issues

### Issue 1: Redirect Loop Detected

**Symptom**: Page keeps redirecting endlessly, browser shows "too many redirects" error

**Cause**: Both redirect scripts fighting each other (forward and reverse redirect)

**Debug Steps:**

1. Check browser console for redirect loop detection
   - admin-redirect.js has safety check at line 78-81
   - Should show: `"[Admin Redirect] Already on admin dashboard - no redirect needed"`

2. Test isOnAdminDashboard() logic:
```javascript
// In browser console:
window.location.pathname.includes('admin-dashboard.html')
// Should return: true when on admin-dashboard.html
```

3. Check for conflicting redirect logic:
   - Verify only ONE redirect script executing
   - Check for custom redirects in nginx/Apache config (should not exist for Azure Static Web Apps)

**Fix:**
- If isOnAdminDashboard() broken: Update logic in admin-redirect.js
- If conflicting redirects: Remove duplicate redirect logic
- Emergency: Temporarily disable reverse redirect in admin-dashboard.html

---

### Issue 2: Flash of Wrong Content Before Redirect

**Symptom**: Briefly see main site before admin dashboard appears

**Cause**: Redirect script loading too late (after page content starts rendering)

**Debug Steps:**

1. Check Network tab in DevTools:
   - admin-redirect.js should be FIRST module loaded
   - Should start loading within 50-100ms of page load

2. Verify execution order in index.html:
```bash
curl -s https://admin.unitedwerise.org/ | grep -n "script type=\"module\""
```
Expected: admin-redirect.js line number < main.js line number

**Fix:**
1. Ensure admin-redirect.js loaded BEFORE main.js in index.html
2. Verify script uses IIFE (Immediately Invoked Function Expression)
3. Check for async/defer attributes (should NOT be present)

**Implementation:**
```html
<!-- CORRECT: No async/defer, loads first -->
<script type="module" src="src/utils/admin-redirect.js"></script>

<!-- WRONG: async delays execution -->
<script type="module" async src="src/utils/admin-redirect.js"></script>
```

---

### Issue 3: Bookmark to admin.unitedwerise.org/profile Doesn't Work

**Symptom**: Bookmarked pages show 404 or redirect to dashboard root

**Cause**: By design - only root path (/) redirects to admin dashboard

**Expected Console Warning:**
```
[Admin Redirect] Non-root path on admin subdomain: /profile
[Admin Redirect] Expected behavior: Admin subdomain should only serve admin-dashboard.html
```

**Why This is Intentional:**
- Admin dashboard is a single-page application (SPA)
- All routes handled client-side by /admin-dashboard.html
- Redirecting deep links would break SPA routing
- Prevents accidental breaking of bookmarked deep links

**User Guidance:**
- Admin dashboard accessible only via root path: https://admin.unitedwerise.org
- Once loaded, SPA handles all internal navigation
- Bookmark the root URL, not deep links

**If This is a Problem:**
- Consider updating admin-redirect.js to handle deep links
- Preserve path in redirect: `/admin-dashboard.html#/profile`
- Test thoroughly to avoid breaking SPA routing

---

### Issue 4: Environment Detection Wrong on Admin Subdomain

**Symptom**: dev-admin.unitedwerise.org detected as production environment

**Cause**: environment.js not recognizing admin subdomains

**Debug Steps:**

1. Check environment detection:
```javascript
// In browser console on dev-admin.unitedwerise.org:
import { getEnvironment } from './src/utils/environment.js';
console.log(getEnvironment());  // Should show: 'development'
```

2. Verify hostname check in environment.js:
```bash
grep -n "dev-admin.unitedwerise.org" frontend/src/utils/environment.js
```

**Expected (lines 17-19):**
```javascript
if (hostname === 'dev.unitedwerise.org' ||
    hostname === 'dev-admin.unitedwerise.org' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1') {
    return 'development';
}
```

**Fix:**
1. Update frontend/src/utils/environment.js
2. Add admin subdomains to environment detection logic
3. Redeploy frontend
4. Clear browser cache and test

---

### Issue 5: Admin Dashboard Shows 403 Forbidden

**Symptom**: Can access www.unitedwerise.org but admin.unitedwerise.org shows 403 error

**Cause**: Azure Static Web Apps custom domain not configured correctly

**Debug Steps:**

1. Check Azure Static Web Apps custom domains:
```bash
az staticwebapp hostname list \
  --name <static-app-name> \
  --resource-group unitedwerise-rg
```

2. Verify admin subdomain in list:
```json
[
  {
    "name": "admin.unitedwerise.org",
    "status": "Ready"
  }
]
```

**Fix:**
1. Add custom domain to Azure Static Web Apps:
```bash
az staticwebapp hostname set \
  --name <static-app-name> \
  --resource-group unitedwerise-rg \
  --hostname admin.unitedwerise.org
```

2. Wait 5-15 minutes for Azure to provision SSL certificate
3. Verify status shows "Ready" before testing

---

## Testing Procedures

### Pre-Deployment Testing Checklist

Before deploying admin subdomain routing changes, verify all items:

**DNS Configuration:**
- [ ] CNAME records created for admin.unitedwerise.org → Azure Static Web Apps
- [ ] CNAME records created for dev-admin.unitedwerise.org → Azure Static Web Apps
- [ ] DNS propagation complete (nslookup shows CNAME)

**File Integrity:**
- [ ] admin-redirect.js exists in frontend/src/utils/
- [ ] admin-redirect.js is valid ES6 module (no syntax errors)
- [ ] index.html loads admin-redirect.js FIRST (line 198, before main.js)
- [ ] admin-dashboard.html contains reverse redirect script (lines 10-40)
- [ ] environment.js recognizes admin subdomains

**Code Quality:**
- [ ] No console.log() statements (except debug logs with [Admin Redirect] prefix)
- [ ] Error handling implemented (try/catch in redirect logic)
- [ ] Performance tracking implemented (<10ms target)
- [ ] Loop prevention implemented (isOnAdminDashboard check)

---

### Post-Deployment Testing Checklist

After deploying to staging or production, verify all items:

**Session Isolation:**
- [ ] ❌ **KNOWN FAIL**: Login on www → also logged in on admin subdomain (cookies shared)
- [x] localStorage.setItem on www → localStorage.getItem on admin returns null (works correctly)
- [ ] ❌ **KNOWN FAIL**: Cookies NOT isolated - shared via `domain: .unitedwerise.org` (check DevTools Application tab)

**Redirect Behavior:**
- [ ] admin.unitedwerise.org → redirects to /admin-dashboard.html
- [ ] dev-admin.unitedwerise.org → redirects to /admin-dashboard.html
- [ ] www.unitedwerise.org/admin-dashboard.html → redirects to admin.unitedwerise.org
- [ ] dev.unitedwerise.org/admin-dashboard.html → redirects to dev-admin.unitedwerise.org

**Safety Checks:**
- [ ] No redirect loop occurs
- [ ] Redirect execution time <10ms (check console)
- [ ] Query parameters preserved (?token=xyz)
- [ ] URL hash preserved (#section)
- [ ] No flash of wrong content

**Environment Detection:**
- [ ] dev-admin.unitedwerise.org detected as development
- [ ] admin.unitedwerise.org detected as production
- [ ] API endpoints correct for each environment (check network tab)

**User Experience:**
- [ ] Admin dashboard loads without errors
- [ ] Login works on admin subdomain
- [ ] Navigation works within admin dashboard
- [ ] No broken links or 404 errors

---

### Automated Testing Script

**Create test script**: `scripts/test-admin-subdomain.sh`

```bash
#!/bin/bash

echo "Testing Admin Subdomain Routing..."
echo ""

# Test 1: DNS Configuration
echo "Test 1: DNS Configuration"
nslookup admin.unitedwerise.org | grep -q "azurestaticapps.net" && echo "✅ Production DNS OK" || echo "❌ Production DNS FAIL"
nslookup dev-admin.unitedwerise.org | grep -q "azurestaticapps.net" && echo "✅ Staging DNS OK" || echo "❌ Staging DNS FAIL"
echo ""

# Test 2: Redirect Script Deployed
echo "Test 2: Redirect Script Deployed"
curl -s https://admin.unitedwerise.org/src/utils/admin-redirect.js | grep -q "admin-redirect" && echo "✅ Production script OK" || echo "❌ Production script FAIL"
curl -s https://dev-admin.unitedwerise.org/src/utils/admin-redirect.js | grep -q "admin-redirect" && echo "✅ Staging script OK" || echo "❌ Staging script FAIL"
echo ""

# Test 3: Script Load Order
echo "Test 3: Script Load Order"
ADMIN_LINE=$(curl -s https://admin.unitedwerise.org/ | grep -n "admin-redirect.js" | cut -d: -f1)
MAIN_LINE=$(curl -s https://admin.unitedwerise.org/ | grep -n "main.js" | cut -d: -f1)
if [ "$ADMIN_LINE" -lt "$MAIN_LINE" ]; then
  echo "✅ Production load order OK (admin-redirect before main.js)"
else
  echo "❌ Production load order FAIL"
fi
echo ""

# Test 4: HTTP Status Codes
echo "Test 4: HTTP Status Codes"
curl -s -o /dev/null -w "%{http_code}" https://admin.unitedwerise.org/ | grep -q "200" && echo "✅ Production HTTP OK" || echo "❌ Production HTTP FAIL"
curl -s -o /dev/null -w "%{http_code}" https://dev-admin.unitedwerise.org/ | grep -q "200" && echo "✅ Staging HTTP OK" || echo "❌ Staging HTTP FAIL"
echo ""

echo "Automated tests complete. Manual browser testing required for session isolation."
```

**Run tests:**
```bash
bash scripts/test-admin-subdomain.sh
```

---

## Emergency Procedures

### Emergency Rollback

**If admin subdomain routing completely broken:**

**Step 1: Identify breaking commit**
```bash
git log --oneline -n 10
# Look for commit with message: "feat: Add admin subdomain routing with session isolation"
```

**Step 2: Revert commit**
```bash
git revert <commit-hash>
git push origin <current-branch>
```

**Step 3: Wait for deployment**
- GitHub Actions will auto-deploy to staging (if on development branch)
- Wait 2-3 minutes for deployment to complete
- Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions

**Step 4: Verify fallback works**
```bash
# Admin dashboard should still be accessible via path
curl -I https://admin.unitedwerise.org/admin-dashboard.html
# Expected: HTTP 200 OK
```

**Step 5: Debug and reapply fix**
1. Fix issue locally
2. Test thoroughly (use testing checklist above)
3. Commit and redeploy
4. Verify all tests pass before marking as resolved

---

### Emergency Disable (Production Outage)

**If admin subdomain causing production outage:**

**Option A: Disable redirect script (fastest - 2 minutes)**
```bash
# Comment out redirect script in index.html
git checkout main
# Edit frontend/index.html line 198:
# <!-- <script type="module" src="src/utils/admin-redirect.js"></script> -->
git add frontend/index.html
git commit -m "hotfix: Temporarily disable admin subdomain redirect"
git push origin main
# Wait for GitHub Actions deployment (2-3 min)
```

**Option B: Full rollback (safer - 5 minutes)**
```bash
# Revert entire admin subdomain feature
git checkout main
git revert <commit-hash>
git push origin main
# Wait for GitHub Actions deployment (2-3 min)
```

**Option C: Use previous working revision (immediate - Azure only)**
```bash
# Azure Static Web Apps keeps previous revisions
# Manually activate previous revision in Azure Portal:
# 1. Go to Azure Portal → Static Web Apps → unitedwerise-frontend-new
# 2. Click "Revisions" in left menu
# 3. Find previous working revision (before admin subdomain changes)
# 4. Click "..." → "Activate"
# Takes effect immediately (no redeployment needed)
```

**After emergency disable:**
1. Announce to team: Admin dashboard temporarily accessible via path only
2. Create incident report: docs/incidents/YYYY-MM-DD-admin-subdomain-outage.md
3. Debug issue using troubleshooting steps above
4. Create fix and test thoroughly before redeploying
5. Schedule re-deployment during low-traffic window

---

## Technical Details

### Architecture Overview

```
User Browser
    ↓
    ├─ Access: www.unitedwerise.org
    │  ├─ DNS: CNAME → Azure Static Web App
    │  ├─ Azure: Serves index.html + assets
    │  ├─ Browser: Loads main.js (normal flow)
    │  └─ Session: Cookies/localStorage for www.unitedwerise.org origin
    │
    └─ Access: admin.unitedwerise.org
       ├─ DNS: CNAME → Same Azure Static Web App
       ├─ Azure: Serves same index.html + assets (limitation)
       ├─ Browser: Loads admin-redirect.js FIRST
       ├─ JavaScript: Detects admin subdomain → redirects to /admin-dashboard.html
       └─ Session: Separate cookies/localStorage for admin.unitedwerise.org origin
```

### File Structure

```
UnitedWeRise-Dev/
├── frontend/
│   ├── index.html (line 198: loads admin-redirect.js)
│   ├── admin-dashboard.html (lines 10-40: reverse redirect)
│   └── src/
│       └── utils/
│           ├── admin-redirect.js (forward redirect logic)
│           └── environment.js (recognizes admin subdomains)
└── docs/
    ├── ADMIN-SUBDOMAIN-TROUBLESHOOTING.md (this file)
    ├── ENVIRONMENT-URLS.md (URL reference)
    └── adr/
        └── ADR-002-ADMIN-SUBDOMAIN-ROUTING.md (decision record)
```

### Key Functions

**admin-redirect.js:**
- `isAdminSubdomain()` - Detects if on admin subdomain
- `isOnAdminDashboard()` - Prevents redirect loop
- `isRootPath()` - Only redirects from root path
- `buildRedirectUrl()` - Preserves query params and hash
- `executeRedirect()` - IIFE that runs immediately on load

**environment.js:**
- `getEnvironment()` - Returns 'development' or 'production' based on hostname
- `getApiBaseUrl()` - Returns correct API URL for environment
- `getAdminDashboardUrl()` - Returns admin subdomain URL

### Browser Compatibility

**Tested Browsers:**
- ✅ Chrome 90+ (Windows, macOS, Linux)
- ✅ Firefox 88+ (Windows, macOS, Linux)
- ✅ Safari 14+ (macOS, iOS)
- ✅ Edge 90+ (Windows, macOS)

**ES6 Module Support:**
- All modern browsers support ES6 modules
- type="module" attribute required
- No polyfill needed for target browsers

**Same-Origin Policy:**
- Standard in all browsers since ~2010
- Consistent behavior across all modern browsers
- No known edge cases or compatibility issues

---

## Additional Resources

**Related Documentation:**
- CHANGELOG.md (2025-10-17 entry)
- MASTER_DOCUMENTATION.md (Admin Dashboard Isolation section)
- CLAUDE.md (Admin subdomain routing troubleshooting collapsible)
- docs/ENVIRONMENT-URLS.md (URL reference guide)
- docs/adr/ADR-002-ADMIN-SUBDOMAIN-ROUTING.md (architecture decision record)

**External References:**
- [MDN: Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [ES6 Modules Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

**Support:**
- GitHub Issues: https://github.com/UnitedWeRise-org/UnitedWeRise/issues
- Development Team: Contact via internal Slack channel

---

**Document History:**
- 2025-10-17: Initial version created as part of admin subdomain routing implementation

# Staging Security Fixes - Test Plan

**Environment:** https://dev.unitedwerise.org
**Backend:** https://dev-api.unitedwerise.org
**Deployed SHA:** 179ba31 (security fixes)

---

## ✅ CRITICAL TESTS (Must Pass Before Production)

### 1. Authentication & Login (5 min)

**Why:** We changed JWT secret validation and reduced expiration to 24h

**Test Steps:**
- [ ] Go to https://dev.unitedwerise.org
- [ ] Click "Login" or "Sign Up"
- [ ] Log in with your admin account
- [ ] Verify you're logged in successfully
- [ ] Refresh the page - should stay logged in
- [ ] Open browser developer tools → Application → Cookies
- [ ] Check `authToken` cookie exists
- [ ] Close browser, reopen, go back to site - should still be logged in
- [ ] **Expected:** Login works normally, JWT expiration is now 24h instead of 7d

**✅ Pass Criteria:** Can log in and stay logged in for at least 10 minutes

---

### 2. Admin Access Control (3 min)

**Why:** We fixed admin route protection to work in ALL environments

**Test Steps:**
- [ ] Log in as **admin** user
- [ ] Try to access admin dashboard: https://dev.unitedwerise.org/admin-dashboard.html
- [ ] Should load successfully
- [ ] Log out
- [ ] Log in as **regular non-admin** user (or create new account)
- [ ] Try to access admin dashboard again
- [ ] **Expected:** Should be blocked (403 Forbidden or redirected)

**✅ Pass Criteria:**
- Admin users CAN access admin routes
- Non-admin users CANNOT access admin routes

---

### 3. Photo Upload (5 min)

**Why:** We documented Azure Blob Storage security but didn't change functionality

**Test Steps:**
- [ ] Log in to https://dev.unitedwerise.org
- [ ] Create a new post or click "New Post"
- [ ] Click to attach a photo
- [ ] Upload a test image (JPG, PNG, or GIF)
- [ ] Wait for upload to complete
- [ ] Verify photo appears in the post preview
- [ ] Submit the post
- [ ] Verify photo displays in your feed
- [ ] Open browser developer tools → Network tab
- [ ] Find the image URL (should be `*.blob.core.windows.net`)
- [ ] Copy the URL and open in private/incognito window
- [ ] **Expected:** Photo should display (public access still works)

**✅ Pass Criteria:** Photo upload and display work normally

---

### 4. Database Queries & Search (3 min)

**Why:** We fixed SQL injection vulnerabilities in similarity search and suggestions

**Test Steps:**
- [ ] Use the search feature (if available in UI)
- [ ] Search for users or posts
- [ ] Check friend/follow suggestions (if visible)
- [ ] Try viewing other user profiles
- [ ] **Expected:** All features work normally, no errors

**✅ Pass Criteria:** Search and suggestions work without errors

---

### 5. Password Reset (5 min)

**Why:** We upgraded password reset token generation from Math.random() to crypto.randomBytes()

**Test Steps:**
- [ ] Log out of staging site
- [ ] Click "Forgot Password" or go to reset page
- [ ] Enter your email address
- [ ] Submit the reset request
- [ ] Check backend logs (or wait for email if implemented):
  ```bash
  az containerapp logs show --name unitedwerise-backend-staging --resource-group unitedwerise-rg --tail 50
  ```
- [ ] Look for password reset token in logs
- [ ] **Expected:** Token should be 64-character hex string (cryptographically secure)

**✅ Pass Criteria:** Reset request processes without errors

---

### 6. WebSocket Connections (3 min)

**Why:** We added token blacklist check to WebSocket authentication

**Test Steps:**
- [ ] Log in to https://dev.unitedwerise.org
- [ ] Open browser developer tools → Console tab
- [ ] Look for WebSocket connection messages
- [ ] If you have real-time features (notifications, messaging):
  - Try sending a message or triggering a notification
  - Verify it updates in real-time
- [ ] **Expected:** WebSocket connects successfully, no authentication errors

**✅ Pass Criteria:** WebSocket connects without errors in console

---

### 7. CORS & API Calls (2 min)

**Why:** We removed the temporary CORS bypass code

**Test Steps:**
- [ ] Open https://dev.unitedwerise.org
- [ ] Open browser developer tools → Console tab
- [ ] Look for any CORS errors (red text mentioning "CORS" or "origin")
- [ ] Navigate around the site (feed, profile, posts)
- [ ] **Expected:** No CORS errors in console

**✅ Pass Criteria:** No CORS-related errors

---

### 8. Session Logout/Revocation (3 min)

**Why:** We improved session token blacklist with SHA-256 hashing

**Test Steps:**
- [ ] Log in to https://dev.unitedwerise.org
- [ ] Copy your auth token from cookies (browser dev tools → Application → Cookies → authToken)
- [ ] Click "Logout"
- [ ] Try to make an API request with the old token:
  ```bash
  curl -H "Authorization: Bearer YOUR_OLD_TOKEN" https://dev-api.unitedwerise.org/api/auth/me
  ```
- [ ] **Expected:** Should return 401 Unauthorized (token revoked)

**✅ Pass Criteria:** Logout properly revokes tokens

---

## 🔍 OPTIONAL TESTS (Nice to Have)

### 9. HTTPS Enforcement (1 min)

**Why:** We enabled HTTPS upgrade in CSP

**Test Steps:**
- [ ] Open browser developer tools → Network tab
- [ ] Visit https://dev.unitedwerise.org
- [ ] Look at request headers
- [ ] Check for `Upgrade-Insecure-Requests` header
- [ ] **Expected:** Header should be present

---

### 10. JWT Expiration (24 hours)

**Why:** We reduced JWT expiration from 7d to 24h

**Test Steps:**
- [ ] Log in to staging
- [ ] Note the current time
- [ ] Come back in 25+ hours
- [ ] Try to use the site
- [ ] **Expected:** Should be logged out and prompted to log in again

**Note:** This takes 24 hours to test - can skip for now

---

## 🚨 WHAT TO WATCH FOR (Red Flags)

### Immediate Blockers:
- ❌ **Can't log in** - Critical, revert immediately
- ❌ **Backend showing 500 errors** - Critical, check logs
- ❌ **Admin routes accessible to non-admins** - Security issue, investigate
- ❌ **Photos won't upload** - Major UX issue

### Non-Blocking Issues:
- ⚠️ **CORS errors** - May only affect specific origins
- ⚠️ **WebSocket not connecting** - Check if features work without it
- ⚠️ **Search slow** - Performance, not a blocker

---

## 📊 TESTING STATUS TRACKER

Copy this to track your progress:

```
✅ = Tested and passed
❌ = Tested and failed
⏭️ = Skipped
⏳ = Not tested yet

[ ] 1. Authentication & Login
[ ] 2. Admin Access Control
[ ] 3. Photo Upload
[ ] 4. Database Queries & Search
[ ] 5. Password Reset
[ ] 6. WebSocket Connections
[ ] 7. CORS & API Calls
[ ] 8. Session Logout/Revocation

Optional:
[ ] 9. HTTPS Enforcement
[ ] 10. JWT Expiration (24h test)
```

---

## 🔧 IF SOMETHING FAILS

### Quick Rollback Procedure:

```bash
# Revert to previous working version
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@sha256:53b48e78f539ac4e423ec5555abb15ca889c30542046d388ecde542ad8a70e33"

# This reverts to commit ad23140 (pre-security-fixes)
```

### Debug Steps:

1. **Check backend logs:**
   ```bash
   az containerapp logs show --name unitedwerise-backend-staging --resource-group unitedwerise-rg --tail 100
   ```

2. **Check health endpoint:**
   ```bash
   curl -s https://dev-api.unitedwerise.org/health
   ```

3. **Test specific API endpoint:**
   ```bash
   curl -s https://dev-api.unitedwerise.org/api/posts
   ```

---

## ✅ APPROVAL CHECKLIST

Before deploying to production, confirm:

- [ ] All critical tests passed (tests 1-8)
- [ ] No console errors in browser
- [ ] Backend logs show no errors
- [ ] At least 2 people tested the site
- [ ] Site has been running stable for 24+ hours (optional but recommended)
- [ ] No user complaints or issues reported

---

## 🚀 AFTER TESTING

If all tests pass, you're ready to deploy to production:

1. **Merge to main:**
   ```bash
   git checkout main
   git merge development
   git push origin main
   ```

2. **Deploy to production** (manually or via GitHub Actions once fixed)

3. **Monitor production** for the first hour after deployment

---

**Estimated Testing Time:** 30-45 minutes for critical tests

**Recommended Soak Time:** 24-48 hours on staging before production

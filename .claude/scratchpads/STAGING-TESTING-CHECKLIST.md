# Staging Testing Checklist - CRITICAL Security Fixes
**Deployment Date**: October 16, 2025
**Git SHA**: 881d39e
**Docker Image**: sha256:0d4337c39c3632fc83f9ed8aeb6ac1838da940cd2640f5e6d4212e440ff8d08f
**Environment**: https://dev.unitedwerise.org / https://dev-api.unitedwerise.org

---

## Pre-Testing Verification

- [x] Backend deployed successfully
- [x] Health endpoint responding (881d39e)
- [x] Database connected
- [ ] Frontend auto-deployed from GitHub Actions
- [ ] Check GitHub Actions status: https://github.com/UnitedWeRise-org/UnitedWeRise/actions

---

## CRITICAL Fix #1: Token Blacklist ID Generation Mismatch

**What Changed**: Fixed SHA-256 hash mismatch between auth.ts and middleware causing logout to fail.

### Test Cases

1. **Login and Logout Flow**
   - [ ] Navigate to https://dev.unitedwerise.org
   - [ ] Click "Login"
   - [ ] Login with test account
   - [ ] Verify successful login (redirected to feed/dashboard)
   - [ ] Click "Logout"
   - [ ] **EXPECTED**: Successfully logged out, token invalidated
   - [ ] Try to use old token (if captured) - should fail with 401
   - [ ] **PASS/FAIL**: _______

2. **Token Revocation**
   - [ ] Login with test account
   - [ ] Capture JWT token from browser DevTools (Application > Local Storage)
   - [ ] Logout
   - [ ] Try to make authenticated API call with old token:
     ```bash
     curl -H "Authorization: Bearer <old-token>" https://dev-api.unitedwerise.org/api/user/profile
     ```
   - [ ] **EXPECTED**: 401 Unauthorized error
   - [ ] **PASS/FAIL**: _______

3. **Multiple Sessions**
   - [ ] Login on Browser A
   - [ ] Login on Browser B (same account)
   - [ ] Logout on Browser A
   - [ ] Verify Browser B session still works (different token)
   - [ ] **EXPECTED**: Browser A token revoked, Browser B still valid
   - [ ] **PASS/FAIL**: _______

---

## CRITICAL Fix #2: CSRF Protection on State-Changing Routes

**What Changed**: Added CSRF token verification to all POST/PUT/DELETE/PATCH requests.

### Test Cases

1. **CSRF Token Generation**
   - [ ] Open https://dev.unitedwerise.org in browser
   - [ ] Open DevTools > Application > Cookies
   - [ ] Look for `csrf-token` cookie
   - [ ] **EXPECTED**: CSRF cookie present with random value
   - [ ] **PASS/FAIL**: _______

2. **POST Request Without CSRF Token**
   - [ ] Try to make POST request without CSRF token:
     ```bash
     curl -X POST https://dev-api.unitedwerise.org/api/posts \
       -H "Authorization: Bearer <valid-token>" \
       -H "Content-Type: application/json" \
       -d '{"content":"Test post"}'
     ```
   - [ ] **EXPECTED**: 403 Forbidden - "CSRF token mismatch"
   - [ ] **PASS/FAIL**: _______

3. **POST Request With Valid CSRF Token**
   - [ ] Make POST request through frontend (which includes CSRF token)
   - [ ] Create a new post, comment, or reaction
   - [ ] **EXPECTED**: Request succeeds
   - [ ] **PASS/FAIL**: _______

4. **GET Requests (Should NOT Require CSRF)**
   - [ ] Make GET request without CSRF token:
     ```bash
     curl https://dev-api.unitedwerise.org/api/posts
     ```
   - [ ] **EXPECTED**: Request succeeds (GET exempt from CSRF)
   - [ ] **PASS/FAIL**: _______

5. **Cross-Site Request Forgery Attack Simulation**
   - [ ] Login to staging site
   - [ ] From different domain (or Postman), attempt POST request with valid JWT but no CSRF
   - [ ] **EXPECTED**: Request blocked with 403
   - [ ] **PASS/FAIL**: _______

---

## CRITICAL Fix #3: Gallery Route Error Handling

**What Changed**: Added try-catch blocks to all 4 gallery endpoints to prevent server crashes.

### Test Cases

1. **List Galleries (GET /api/photos/galleries)**
   - [ ] Login to staging
   - [ ] Navigate to photo gallery page
   - [ ] **EXPECTED**: Galleries load successfully OR graceful 500 error
   - [ ] Check browser console for errors
   - [ ] **PASS/FAIL**: _______

2. **Move Photo to Gallery (PUT /api/photos/:photoId/gallery)**
   - [ ] Upload or select existing photo
   - [ ] Try to move photo to different gallery
   - [ ] **EXPECTED**: Success OR graceful 500 error (not server crash)
   - [ ] **PASS/FAIL**: _______

3. **Delete Photo (DELETE /api/photos/:photoId)**
   - [ ] Select a photo
   - [ ] Click delete
   - [ ] **EXPECTED**: Photo soft-deleted OR graceful 500 error
   - [ ] **PASS/FAIL**: _______

4. **Set Profile Photo (POST /api/photos/:photoId/set-profile)**
   - [ ] Select a photo
   - [ ] Set as profile avatar
   - [ ] **EXPECTED**: Avatar updated OR graceful 500 error
   - [ ] **PASS/FAIL**: _______

5. **Database Error Simulation**
   - [ ] (Admin only) Try to trigger database error by using invalid photoId
   - [ ] **EXPECTED**: 500 error with generic message, no stack trace exposed
   - [ ] **PASS/FAIL**: _______

---

## CRITICAL Fix #4: Metrics Endpoint Protection

**What Changed**: Protected /metrics, /api/metrics, /api/security-metrics with admin+TOTP authentication.

### Test Cases

1. **Metrics Endpoint Without Authentication**
   - [ ] Try to access metrics without auth:
     ```bash
     curl https://dev-api.unitedwerise.org/metrics
     curl https://dev-api.unitedwerise.org/api/metrics
     curl https://dev-api.unitedwerise.org/api/security-metrics
     ```
   - [ ] **EXPECTED**: 401 Unauthorized
   - [ ] **PASS/FAIL**: _______

2. **Metrics Endpoint With Regular User Token**
   - [ ] Login as non-admin user
   - [ ] Try to access metrics with regular user JWT
   - [ ] **EXPECTED**: 403 Forbidden (requires admin role)
   - [ ] **PASS/FAIL**: _______

3. **Metrics Endpoint With Admin Token**
   - [ ] Login as admin user
   - [ ] Access metrics endpoint
   - [ ] **EXPECTED**: 200 OK if TOTP verified, 401 if TOTP not verified
   - [ ] **PASS/FAIL**: _______

4. **Verify Metrics Data**
   - [ ] As admin, access metrics endpoint
   - [ ] Verify metrics include:
     - Request counts
     - Response times
     - Error rates
     - **NO sensitive user data**
   - [ ] **EXPECTED**: Only aggregate metrics, no PII
   - [ ] **PASS/FAIL**: _______

---

## Regression Testing

**Test existing functionality still works after security fixes**

1. **User Registration**
   - [ ] Navigate to signup page
   - [ ] Create new account
   - [ ] **EXPECTED**: Account created successfully
   - [ ] **PASS/FAIL**: _______

2. **User Login (OAuth)**
   - [ ] Click "Login with Google"
   - [ ] Complete OAuth flow
   - [ ] **EXPECTED**: Successfully authenticated
   - [ ] **PASS/FAIL**: _______

3. **Create Post**
   - [ ] Login
   - [ ] Create new post with text
   - [ ] **EXPECTED**: Post created successfully (with CSRF token)
   - [ ] **PASS/FAIL**: _______

4. **Add Comment**
   - [ ] Find existing post
   - [ ] Add comment
   - [ ] **EXPECTED**: Comment added successfully
   - [ ] **PASS/FAIL**: _______

5. **React to Post**
   - [ ] Find existing post
   - [ ] Click like/react
   - [ ] **EXPECTED**: Reaction recorded successfully
   - [ ] **PASS/FAIL**: _______

6. **Upload Photo**
   - [ ] Navigate to photo upload
   - [ ] Upload image file
   - [ ] **EXPECTED**: Upload succeeds with content moderation
   - [ ] **PASS/FAIL**: _______

7. **Admin Dashboard**
   - [ ] Login as admin
   - [ ] Navigate to https://dev.unitedwerise.org/admin-dashboard.html
   - [ ] **EXPECTED**: Dashboard loads, displays data
   - [ ] **PASS/FAIL**: _______

---

## Performance and Monitoring

1. **Backend Logs**
   - [ ] Check Azure Container App logs for errors:
     ```bash
     az containerapp logs show \
       --name unitedwerise-backend-staging \
       --resource-group unitedwerise-rg \
       --tail 50
     ```
   - [ ] **EXPECTED**: No unexpected errors
   - [ ] **PASS/FAIL**: _______

2. **Response Times**
   - [ ] Check health endpoint response time: `time curl https://dev-api.unitedwerise.org/health`
   - [ ] **EXPECTED**: < 500ms
   - [ ] **PASS/FAIL**: _______

3. **Database Connection**
   - [ ] Verify health endpoint shows `database: "connected"`
   - [ ] **EXPECTED**: Database connected
   - [ ] **PASS/FAIL**: _______

---

## Known Issues to Investigate

1. **Health Endpoint Branch Reporting**
   - [ ] Health endpoint shows `githubBranch: "main"` but should show "development"
   - [ ] Priority: LOW (cosmetic bug, doesn't affect functionality)
   - [ ] Investigate in Phase 3

---

## Summary

**Total Test Cases**: 34
**Passed**: _______
**Failed**: _______
**Blocked**: _______

**Blocker Issues**: _______________________________________

**Ready for Phase 3**: YES / NO

**Tester Name**: _______________________
**Test Date**: _______________________
**Sign-off**: _______________________

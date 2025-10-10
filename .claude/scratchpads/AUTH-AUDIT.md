# Authentication System Audit
**Date:** October 9, 2025
**Issue:** Login works in fresh private windows, fails after logout→login cycles

---

## 🎯 IDEAL AUTHENTICATION FLOW

### Fresh Page Load (Not Logged In)
```
1. Browser loads page
2. No authToken cookie exists
3. Frontend: Check cookies → none found
4. Frontend: Set UI to logged-out state
5. Frontend: API calls return 401 (expected)
6. Result: Login form shown, no errors
```

### Standard Login Flow (No TOTP)
```
1. User enters email + password
2. Frontend: POST /auth/login {email, password}
3. Backend: Validate credentials ✓
4. Backend: Generate JWT token
5. Backend: Set httpOnly cookie: authToken=<jwt>
6. Backend: Set cookie: csrf-token=<csrf>
7. Backend: Return {success: true, user: {...}, csrfToken: "..."}
8. Frontend: Receive response
9. ⏰ CRITICAL: Browser commits cookies to disk (async, needs time)
10. Frontend: Wait 1000ms for cookie commit
11. Frontend: window.location.reload()
12. Browser: New request includes authToken cookie
13. Backend: Validate token → 200 OK
14. Result: User logged in, all API calls succeed
```

### TOTP Login Flow
```
1. User enters email + password
2. Frontend: POST /auth/login {email, password}
3. Backend: Credentials valid, TOTP enabled
4. Backend: Return {requiresTOTP: true, tempSession: "..."}
5. Frontend: Show TOTP input modal
6. User enters 6-digit TOTP code
7. Frontend: POST /auth/login {email, password, totpToken: "123456"}
8. Backend: Validate TOTP code ✓
9. Backend: Set httpOnly cookies:
   - authToken=<jwt>
   - totpSessionToken=<24h-session>
   - totpVerified=true
10. Backend: Return {success: true, user: {...}, csrfToken: "..."}
11. ⏰ CRITICAL: Wait 1000ms for cookie commit
12. Frontend: window.location.reload()
13. Result: TOTP session active for 24 hours
```

### Logout Flow
```
1. User clicks logout button
2. Frontend: POST /auth/logout
3. Backend: Clear ALL cookies:
   - res.clearCookie('authToken')
   - res.clearCookie('csrf-token')
   - res.clearCookie('totpSessionToken')
   - res.clearCookie('totpVerified')
4. Backend: Return {success: true}
5. Frontend: Receive response
6. ⏰ CRITICAL: Browser commits cookie deletion (async, needs time)
7. Frontend: Wait 1000ms for cookie deletion
8. Frontend: Clear localStorage.currentUser
9. Frontend: Clear window.currentUser
10. Frontend: Clear window.csrfToken
11. Frontend: Redirect to '/'
12. Browser: New request has NO cookies
13. Result: User logged out, TOTP cleared
```

---

## 🐛 ACTUAL BEHAVIOR (User Reports)

### ✅ Fresh Private Window
- **Works perfectly on first try**
- **Why?** No prior state, no old cookies, clean slate
- **Proves:** Core login mechanism is correct

### ❌ After Logout → Login
- **First login attempt fails**
- **Second login attempt succeeds**
- **Why?** Unknown - needs investigation

### ❌ TOTP After Logout
- **TOTP not requested after logout**
- **Should ask for TOTP every time after logout**
- **Why?** totpSessionToken cookie not being cleared

---

## 🔍 AUDIT CHECKLIST

### Backend Investigation
- [ ] Verify logout endpoint clears ALL cookies
- [ ] Check cookie domain/path settings match between set and clear
- [ ] Confirm cookie expiration dates
- [ ] Check if backend validates expired cookies
- [ ] Look for session storage/database that persists after logout

### Frontend Investigation
- [ ] Verify localStorage cleanup on logout
- [ ] Check window.currentUser cleanup
- [ ] Look for cached state in sessionStorage
- [ ] Check if old auth headers being sent
- [ ] Verify unified-manager state reset

### Cookie Investigation
- [ ] Compare Set-Cookie headers between login/logout
- [ ] Check browser DevTools → Application → Cookies
- [ ] Verify cookie deletion actually happens
- [ ] Check for cookie name mismatches
- [ ] Look for multiple cookies with same name

### Timing Investigation
- [ ] Test if 1000ms is actually sufficient
- [ ] Try 2000ms to see if issue persists
- [ ] Check browser cookie commit timing
- [ ] Look for race conditions

### State Investigation
- [ ] Check for global variables persisting
- [ ] Look for event listeners not being removed
- [ ] Verify no cached API responses
- [ ] Check for WebSocket connections staying open

---

## 🧪 DIAGNOSTIC TESTS

### Test 1: Cookie Inspection After Logout
```javascript
// Run in browser console after logout
document.cookie.split(';').forEach(c => console.log(c.trim()));
// Expected: NO authToken, NO totpSessionToken, NO totpVerified
// Actual: ???
```

### Test 2: LocalStorage After Logout
```javascript
// Run after logout
console.log('currentUser:', localStorage.getItem('currentUser'));
console.log('window.currentUser:', window.currentUser);
console.log('window.csrfToken:', window.csrfToken);
// Expected: All null/undefined
// Actual: ???
```

### Test 3: API Request Headers
```javascript
// Run after logout, before next login
fetch('https://dev-api.unitedwerise.org/api/auth/me', {credentials: 'include'})
  .then(r => r.json())
  .then(d => console.log('Auth check:', d))
  .catch(e => console.log('Expected 401:', e));
// Expected: 401 Unauthorized
// Actual: ???
```

---

## 📋 FINDINGS

(To be filled in during audit)

### Backend Findings
-

### Frontend Findings
-

### Cookie Findings
-

### Root Cause
-

### Solution
-

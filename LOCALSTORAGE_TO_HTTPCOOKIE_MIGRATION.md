# 🔒 localStorage to httpOnly Cookie Migration Plan
**United We Rise Authentication Security Enhancement**
**Created**: December 12, 2024
**Status**: Planning Phase
**Risk Level**: HIGH - Affects all authenticated users
**Estimated Effort**: 3-4 days implementation + testing

---

## 📋 EXECUTIVE SUMMARY

### Current State
- **Storage**: JWT tokens stored in localStorage (XSS vulnerable)
- **Files Affected**: 25 frontend files + backend auth routes
- **Users Impacted**: All authenticated users (100%)
- **Security Risk**: Complete account takeover possible via XSS

### Target State
- **Storage**: JWT tokens in httpOnly cookies (XSS protected)
- **CSRF Protection**: Double-submit cookie pattern
- **Session Management**: Server-side session tracking
- **Backwards Compatibility**: Phased rollout with fallback

---

## 🔍 COMPREHENSIVE SYSTEM IMPACT ANALYSIS

### Affected Systems (Priority Order)

#### 1. **Core Authentication** (CRITICAL)
- `/api/auth/login` - Token issuance
- `/api/auth/register` - New user token issuance
- `/api/auth/logout` - Token cleanup
- `/api/auth/refresh` - Token refresh (needs implementation)
- `unifiedAuth.js` - Frontend auth orchestration

#### 2. **TOTP/2FA System** (HIGH)
- Admin dashboard TOTP flow
- 24-hour TOTP session tokens
- `adminApiCall()` wrapper function
- TOTP verification headers

#### 3. **OAuth Social Login** (HIGH)
- Google/Microsoft/Apple login flows
- OAuth token exchange
- Account linking logic
- Provider token storage

#### 4. **WebSocket Authentication** (HIGH)
- Socket.io connection auth
- Real-time messaging authentication
- Notification delivery auth
- Connection handshake changes

#### 5. **API Request Layer** (CRITICAL)
- `apiCall()` function (main site)
- `adminApiCall()` function (admin)
- API Manager class
- Request interceptors

#### 6. **Admin Dashboard** (HIGH)
- Admin-specific auth flows
- Dashboard session management
- Super admin features
- Analytics endpoints

#### 7. **Payment System** (CRITICAL)
- Stripe checkout sessions
- Payment authentication
- Donation flows
- Candidate registration payments

#### 8. **File Upload** (MEDIUM)
- Photo upload authentication
- Document verification uploads
- Avatar uploads
- Media authentication

---

## 🛠️ DETAILED MIGRATION PHASES

### **PHASE 1: Backend Infrastructure** (Day 1)

#### 1.1 Install Dependencies
```bash
npm install cookie-parser csrf
npm install --save-dev @types/cookie-parser @types/csrf
```

#### 1.2 Configure Express Middleware
```typescript
// backend/src/app.ts
import cookieParser from 'cookie-parser';
import csrf from 'csrf';

// Add after body parser
app.use(cookieParser());

// Configure CSRF
const csrfProtection = csrf({ cookie: true });
```

#### 1.3 Update Auth Routes
```typescript
// backend/src/routes/auth.ts

// LOGIN ENDPOINT CHANGES
router.post('/login', validateLogin, authLimiter, async (req, res) => {
    // ... existing authentication logic ...
    
    // OLD: Send token in response body
    // res.json({ success: true, token, user });
    
    // NEW: Set httpOnly cookie
    res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/'
    });
    
    // Generate CSRF token
    const csrfToken = generateCSRFToken();
    res.cookie('csrf-token', csrfToken, {
        httpOnly: false, // Needs to be readable by JS
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/'
    });
    
    // Send response without token
    res.json({ 
        success: true, 
        user,
        csrfToken // Include for immediate use
    });
});

// LOGOUT ENDPOINT CHANGES
router.post('/logout', requireAuth, async (req, res) => {
    // Clear cookies
    res.clearCookie('authToken');
    res.clearCookie('csrf-token');
    
    // ... existing logout logic ...
});

// NEW: Token refresh endpoint
router.post('/refresh', async (req, res) => {
    const token = req.cookies.authToken;
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = verifyToken(token);
        const newToken = generateToken(decoded.userId);
        
        res.cookie('authToken', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/'
        });
        
        res.json({ success: true });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});
```

#### 1.4 Update Auth Middleware
```typescript
// backend/src/middleware/auth.ts

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // OLD: Get token from header
        // const authHeader = req.headers.authorization;
        
        // NEW: Get token from cookie first, fallback to header for transition
        let token = req.cookies?.authToken;
        
        // Fallback for migration period
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        // ... rest of verification logic ...
    } catch (error) {
        // ... error handling ...
    }
};
```

#### 1.5 CSRF Protection Middleware
```typescript
// backend/src/middleware/csrf.ts

export const verifyCsrf = (req: Request, res: Response, next: NextFunction) => {
    // Skip for GET requests
    if (req.method === 'GET') {
        return next();
    }
    
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const cookie = req.cookies['csrf-token'];
    
    if (!token || token !== cookie) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    
    next();
};

// Apply to state-changing routes
router.post('/api/posts', requireAuth, verifyCsrf, createPost);
router.delete('/api/posts/:id', requireAuth, verifyCsrf, deletePost);
// ... etc
```

---

### **PHASE 2: Frontend Core Updates** (Day 2)

#### 2.1 Update API Call Functions
```javascript
// frontend/src/js/api-manager.js

buildFetchOptions(options) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    // OLD: Add Authorization header
    // if (window.authToken) {
    //     headers['Authorization'] = `Bearer ${window.authToken}`;
    // }
    
    // NEW: Add CSRF token for state-changing requests
    const csrfToken = this.getCSRFToken();
    if (csrfToken && options.method !== 'GET') {
        headers['X-CSRF-Token'] = csrfToken;
    }
    
    return {
        ...options,
        headers,
        credentials: 'include', // CRITICAL: Include cookies
        body: options.body ? JSON.stringify(options.body) : undefined
    };
}

getCSRFToken() {
    // Try memory first
    if (window.csrfToken) return window.csrfToken;
    
    // Try cookie (non-httpOnly)
    const match = document.cookie.match(/csrf-token=([^;]+)/);
    return match ? match[1] : null;
}
```

#### 2.2 Update Unified Auth
```javascript
// frontend/js/unifiedAuth.js

async function unifiedLogin(email, password, context = 'main-site', totpSessionToken = null) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // CRITICAL: Include cookies
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // OLD: Store token in localStorage
            // localStorage.setItem('authToken', result.token);
            // window.authToken = result.token;
            
            // NEW: Store CSRF token and user data only
            window.csrfToken = result.csrfToken;
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            
            // Token is now in httpOnly cookie
            return {
                success: true,
                user: result.user
            };
        }
    } catch (error) {
        // ... error handling ...
    }
}

function unifiedLogout(context = 'main-site') {
    // Call logout endpoint to clear cookies
    fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'X-CSRF-Token': window.csrfToken
        }
    });
    
    // Clear local data
    localStorage.removeItem('currentUser');
    window.csrfToken = null;
    
    // ... redirect logic ...
}
```

#### 2.3 Update Admin Dashboard
```javascript
// frontend/admin-dashboard.html

async function adminApiCall(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    // Add CSRF token
    if (window.csrfToken && options.method !== 'GET') {
        headers['X-CSRF-Token'] = window.csrfToken;
    }
    
    // Add TOTP headers if verified
    if (totpVerified && totpToken) {
        headers['X-TOTP-Verified'] = 'true';
        headers['X-TOTP-Token'] = totpToken;
    }
    
    try {
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include' // Include cookies
        });
        
        // ... rest of implementation ...
    } catch (error) {
        // ... error handling ...
    }
}
```

#### 2.4 Update WebSocket Client
```javascript
// frontend/src/js/websocket-client.js

connect() {
    // WebSocket auth needs special handling
    // Option 1: Pass token as query parameter (less secure)
    // Option 2: Authenticate after connection (recommended)
    
    this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        withCredentials: true, // Send cookies
        timeout: 20000,
        forceNew: true
    });
    
    // Authenticate after connection
    this.socket.on('connect', () => {
        this.socket.emit('authenticate', {
            // Send CSRF token for verification
            csrfToken: window.csrfToken
        });
    });
    
    this.socket.on('authenticated', () => {
        console.log('✅ WebSocket authenticated');
        this.isConnected = true;
    });
}
```

---

### **PHASE 3: Component Updates** (Day 2-3)

#### 3.1 Remove localStorage References
```javascript
// Search and replace patterns:

// OLD:
const token = localStorage.getItem('authToken');
localStorage.setItem('authToken', token);
localStorage.removeItem('authToken');
window.authToken = token;

// NEW:
// Token now in httpOnly cookie - no JS access needed
// Use credentials: 'include' in fetch calls
```

#### 3.2 Update All API Calls
```javascript
// Add to ALL fetch calls:
credentials: 'include'

// Add to state-changing requests:
headers: {
    'X-CSRF-Token': window.csrfToken
}
```

#### 3.3 File-by-File Updates
**Priority Order:**
1. `index.html` - Main site entry
2. `admin-dashboard.html` - Admin entry
3. `unifiedAuth.js` - Auth orchestration
4. `api-manager.js` - API layer
5. `websocket-client.js` - Real-time
6. `backend-integration.js` - Backend integration
7. Component files (batch update)

---

### **PHASE 4: Testing & Validation** (Day 3)

#### 4.1 Test Matrix
| Feature | Test Case | Expected Result |
|---------|-----------|-----------------|
| Login | Regular login | Cookie set, user authenticated |
| Login | Login with TOTP | Cookie + TOTP session works |
| OAuth | Google login | Cookie set via OAuth |
| Logout | Regular logout | Cookie cleared |
| API | GET requests | Works with cookie |
| API | POST requests | CSRF token required |
| WebSocket | Connection | Authenticates with cookie |
| Admin | Dashboard access | TOTP + cookie works |
| Payment | Stripe checkout | Authentication maintained |

#### 4.2 Security Validation
- [ ] Verify httpOnly flag on auth cookie
- [ ] Verify Secure flag in production
- [ ] Verify SameSite=Strict
- [ ] Test XSS protection (cookie not accessible)
- [ ] Test CSRF protection on POST/PUT/DELETE
- [ ] Verify token expiration handling

#### 4.3 Backwards Compatibility
```javascript
// Temporary dual support in auth middleware:
let token = req.cookies?.authToken;
if (!token) {
    // Fallback to header for migration period
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }
}
```

---

### **PHASE 5: Deployment** (Day 4)

#### 5.1 Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Security review complete
- [ ] Documentation updated
- [ ] Rollback plan ready
- [ ] Team notification sent

#### 5.2 Deployment Steps
1. **Deploy backend with dual support** (cookies + headers)
2. **Monitor for errors** (1-2 hours)
3. **Deploy frontend changes** (use cookies)
4. **Verify all features working**
5. **Remove header fallback** (after 48 hours)

#### 5.3 Rollback Plan
```bash
# If issues detected:
git revert <migration-commit>
npm run build
npm run deploy

# Notify users of temporary reversion
```

---

## 🔄 CORS & Domain Configuration

### Update CORS Settings
```typescript
// backend/src/app.ts
const corsOptions = {
    origin: [
        'https://www.unitedwerise.org',
        'http://localhost:3000',
        'http://localhost:8080'
    ],
    credentials: true, // CRITICAL: Allow credentials
    allowedHeaders: [
        'Content-Type',
        'X-CSRF-Token', // Add CSRF header
        'X-TOTP-Verified',
        'X-TOTP-Token'
    ]
};
```

### Cookie Domain Settings
```typescript
// Production
res.cookie('authToken', token, {
    domain: '.unitedwerise.org', // Allow subdomains
    // ... other options
});

// Development
res.cookie('authToken', token, {
    domain: 'localhost',
    // ... other options
});
```

---

## 📊 Success Metrics

### Security Metrics
- ✅ 0 tokens accessible via JavaScript
- ✅ 100% XSS protection for auth tokens
- ✅ CSRF protection on all state-changing operations
- ✅ Secure flag on all production cookies

### Functional Metrics
- ✅ All auth flows working
- ✅ WebSocket authentication functional
- ✅ Admin dashboard fully operational
- ✅ Payment flows unaffected
- ✅ No increase in auth errors

### Performance Metrics
- ✅ No increase in login time
- ✅ No increase in API response time
- ✅ Cookie size < 4KB

---

## 🚨 Risk Mitigation

### High Risks
1. **WebSocket Auth Break**
   - Mitigation: Implement auth-after-connect pattern
   - Fallback: Query parameter token (temporary)

2. **Admin Dashboard Break**
   - Mitigation: Extensive testing of TOTP flows
   - Fallback: Dual support period

3. **Payment Flow Break**
   - Mitigation: Test all Stripe scenarios
   - Fallback: Emergency header support

### Medium Risks
1. **CORS Issues**
   - Mitigation: Test all origins thoroughly
   - Fallback: Temporary permissive CORS

2. **Mobile App Issues** (if applicable)
   - Mitigation: Custom header support
   - Fallback: Token endpoint for mobile

---

## 📝 Documentation Updates Needed

### Files to Update
1. `MASTER_DOCUMENTATION.md` - Security section
2. `API_DOCUMENTATION.md` - Authentication endpoints
3. `DEPLOYMENT.md` - Cookie domain configuration
4. `README.md` - Security features section

### Key Changes to Document
- Authentication now uses httpOnly cookies
- CSRF tokens required for state-changing operations
- WebSocket authentication pattern
- Cookie configuration for deployment

---

## ✅ Final Checklist

### Before Starting
- [ ] Review this plan with team
- [ ] Backup current authentication system
- [ ] Set up testing environment
- [ ] Notify users of upcoming changes

### After Completion
- [ ] All tests passing
- [ ] Security audit complete
- [ ] Documentation updated
- [ ] Monitoring in place
- [ ] Team trained on new system

---

**END OF MIGRATION PLAN**

*This migration will significantly enhance the security posture of United We Rise by eliminating XSS token theft vulnerabilities while maintaining all current functionality.*
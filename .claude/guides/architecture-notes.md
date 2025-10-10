# Architecture Notes and Context

**Last Updated**: 2025-10-09
**Purpose**: Historical context and architectural decisions (Tier 4 - background information)

---

## Inline Code Elimination (September 2025)

**Historical Context:**

Complete removal of all inline JavaScript from 7,413-line index.html. Previous cleanup attempts resulted in thousands of hours of waste due to incomplete elimination creating hybrid inline/modular code that broke functionality.

**Why This Matters:**

The prohibition on inline code is ABSOLUTE, not a preference. Any inline JavaScript in HTML files will:
- Break the ES6 module dependency chain
- Cause variable scope conflicts
- Make debugging nearly impossible
- Require complete rollback and restart

**What "Inline Code" Means:**

❌ **FORBIDDEN:**
```html
<script>
  // Any JavaScript directly in HTML
  function foo() { ... }
</script>

<button onclick="handleClick()">Click</button>
<div onload="init()">Content</div>

<script>console.log('anything');</script>
```

✅ **REQUIRED:**
```html
<script type="module" src="js/main.js"></script>
<!-- All JavaScript in .js files, imported via modules -->

<button id="myButton">Click</button>
<!-- Event handlers attached via addEventListener in .js files -->
```

**Current Architecture:**

All web development uses ES6 modules with strict separation:
- No `<script>` blocks in HTML files (except single `<script type="module" src="main.js">`)
- No inline event handlers (onclick, onload, etc.)
- All modules in appropriate directories
- All event handlers use addEventListener
- Export/import through main.js dependency chain

**Load Order:**
```
main.js
  ├─ Core utilities (environment, storage)
  ├─ Configuration (API endpoints)
  ├─ Integration (analytics, auth)
  ├─ Components (UI modules)
  └─ App initialization
```

---

## Staging Architecture

**Design Principle:**

Same Docker image deployed to both staging and production environments with different environment variables. This ensures staging accurately represents production behavior.

**Why Staging Requires Admin Access:**

Staging environment is development/testing environment, not a public preview. Allowing non-admin users to access staging would:
- Contaminate test data with real user actions
- Create confusion about which environment users are using
- Allow users to see incomplete/broken features
- Require dual database maintenance (staging + production user data)

**Environment Detection:**

Backend uses `NODE_ENV` variable:
```typescript
const isStaging = process.env.NODE_ENV === 'staging';
const isProduction = process.env.NODE_ENV === 'production';
```

Frontend uses hostname:
```javascript
const isStaging = window.location.hostname === 'dev.unitedwerise.org';
const isProduction = window.location.hostname === 'www.unitedwerise.org';
```

**Deployment Flow:**

```
development branch → push → GitHub Actions → Azure Static Web Apps (frontend)
                                           → Azure Container Registry (backend)
                                           → Container App (staging)
                                           → Sets NODE_ENV=staging

main branch → push → GitHub Actions → Azure Static Web Apps (frontend)
                                    → Azure Container Registry (backend)
                                    → Container App (production)
                                    → Sets NODE_ENV=production
```

**Admin Check Example:**
```typescript
// backend/src/middleware/requireAdmin.ts
if (process.env.STAGING_ENVIRONMENT === 'true' && !user.isAdmin) {
  return res.status(403).json({
    success: false,
    error: 'Staging environment requires admin access'
  });
}
```

---

## API Response Structure

**Quirk to Remember:**

Backend returns: `{success: true, data: {...}}`
Frontend apiCall wrapper adds: `{ok: true, status: 200}`

**Result:**

When consuming API responses in frontend code:
```javascript
const response = await apiCall('/api/user/profile');

// WRONG - undefined
const username = response.data.username;

// CORRECT - accesses nested data
const username = response.data.data.username;

// Response structure:
{
  ok: true,           // Added by apiCall wrapper
  status: 200,        // Added by apiCall wrapper
  data: {             // Backend response
    success: true,    // Backend status
    data: {           // Actual payload
      username: "...",
      email: "..."
    }
  }
}
```

**Why This Structure:**

- Backend `success` indicates business logic success/failure
- Wrapper `ok` indicates HTTP-level success (status 2xx)
- Allows differentiation between network errors vs business errors

**Pattern for Error Handling:**
```javascript
try {
  const response = await apiCall('/api/endpoint');

  if (!response.ok) {
    // Network/HTTP error
    console.error('HTTP error:', response.status);
    return;
  }

  if (!response.data.success) {
    // Business logic error
    console.error('API error:', response.data.error);
    return;
  }

  // Success - access actual data
  const result = response.data.data;
} catch (error) {
  // Network failure (no response received)
  console.error('Network error:', error);
}
```

---

## Branch Control Rationale

**Design Decision:**

User maintains exclusive control over git branches. Claude never asks about or suggests branch changes.

**Why This Rule Exists:**

1. **Prevents Accidental Switches:**
   - Branch suggestions can get buried in task lists
   - User may not notice branch change until after committing
   - Wrong-branch commits require manual cleanup

2. **User Intent is Explicit:**
   - If user is on development branch, they want work on development
   - If user is on main branch, they want work on main
   - If user is on feature branch, they want work on that feature

3. **Avoids "Helpful" Mistakes:**
   - Claude suggesting "should we create a feature branch?" seems helpful
   - But user may have already planned branch strategy
   - Suggestion creates decision fatigue and interrupts flow

**Current Workflow:**

```bash
# User controls branches explicitly
git checkout development  # User's decision
# Claude works on development branch

git checkout main  # User's decision
# Claude works on main branch

git checkout -b feature/new-thing  # User's decision
# Claude works on feature/new-thing branch
```

**Claude's Responsibility:**

- Work on whatever branch is currently active
- Never suggest branch creation
- Never suggest branch switching
- Never ask "should we create a branch for this?"
- Execute branch operations ONLY when user explicitly directs

**Exception:**

If user explicitly asks "what branch should I use?" or "should I create a branch?", Claude can provide guidance. But Claude never proactively suggests branch operations.

---

## JWT Authentication Architecture

**Token Storage:**

Tokens stored in httpOnly cookies (not localStorage) for security:
```typescript
res.cookie('token', jwt.sign(payload, JWT_SECRET), {
  httpOnly: true,      // Prevents JavaScript access
  secure: true,        // HTTPS only
  sameSite: 'lax',     // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
});
```

**Why httpOnly Cookies:**

- Prevents XSS attacks from stealing tokens
- Browser automatically includes in requests to same domain
- No manual token management in frontend code

**Cross-Subdomain Challenge:**

```
www.unitedwerise.org     (frontend - production)
api.unitedwerise.org     (backend - production)
dev.unitedwerise.org     (frontend - staging)
dev-api.unitedwerise.org (backend - staging)
```

Cookies set by api.unitedwerise.org not accessible to www.unitedwerise.org (different subdomains).

**Solution:**

Cookie domain set to `.unitedwerise.org` (note leading dot):
```typescript
res.cookie('token', jwt.sign(payload, JWT_SECRET), {
  domain: '.unitedwerise.org',  // Accessible to all subdomains
  httpOnly: true,
  secure: true,
  sameSite: 'lax'
});
```

**Frontend Authentication Check:**
```javascript
// No need to read token - backend validates automatically
const response = await apiCall('/api/user/profile');
if (response.ok && response.data.success) {
  // User is authenticated
  const user = response.data.data.user;
} else {
  // User not authenticated or session expired
  redirectToLogin();
}
```

---

## Admin Debug Logging

**Context:**

Production environment should not log sensitive debug information. However, admins need debugging capabilities when testing on staging.

**Solution:**

Admin-specific debug functions that respect environment:
```javascript
// frontend/src/utils/adminDebug.js
export function adminDebugLog(...args) {
  if (window.isAdmin) {
    console.log('[ADMIN DEBUG]', ...args);
  }
}

export function adminDebugError(...args) {
  if (window.isAdmin) {
    console.error('[ADMIN ERROR]', ...args);
  }
}

export function adminDebugWarn(...args) {
  if (window.isAdmin) {
    console.warn('[ADMIN WARN]', ...args);
  }
}

export function adminDebugTable(data) {
  if (window.isAdmin) {
    console.table(data);
  }
}

export function adminDebugSensitive(label, data) {
  if (window.isAdmin) {
    console.log(`[ADMIN SENSITIVE] ${label}:`, data);
  }
}
```

**Usage:**
```javascript
import { adminDebugLog, adminDebugSensitive } from './utils/adminDebug.js';

async function fetchUserData(userId) {
  adminDebugLog('Fetching user data for:', userId);

  const response = await apiCall(`/api/user/${userId}`);

  adminDebugSensitive('User response', response.data);

  return response.data.data;
}
```

**Benefits:**

- No sensitive data logged for regular users
- Admins get full debugging information
- No need to remove debug statements before production
- Easy to audit what information is being logged

---

## Database Isolation Strategy

**Problem:**

Developers and AI need safe database for testing without risking production data corruption.

**Solution:**

Two completely separate PostgreSQL servers:
- `unitedwerise-db.postgres.database.azure.com` (production)
- `unitedwerise-db-dev.postgres.database.azure.com` (development)

**Safety Check Before Migrations:**
```bash
echo $DATABASE_URL | grep -o '@[^.]*'
# Must show: @unitedwerise-db-dev for safe development
# If shows: @unitedwerise-db then STOP - you're targeting production
```

**Why Complete Separation (Not Schemas):**

Alternative considered: Single PostgreSQL server with two schemas (public and development).

Rejected because:
- Schema switching errors easier to make than server switching errors
- No server-level protection from accidental production writes
- Harder to audit which environment is being modified
- Connection string changes more subtle (same host, different schema parameter)

**Benefits of Separate Servers:**

- Server hostname clearly indicates environment
- Connection string inspection immediately obvious
- Azure-level access controls can be different
- Backup/restore operations isolated
- Cost: Only ~$10/month extra for development server

---

## Frontend Build Process

**Static Site Generation:**

Frontend is completely static (HTML/CSS/JS) with no build step required:
```
frontend/
  ├─ index.html           (entry point)
  ├─ admin-dashboard.html (admin entry point)
  ├─ css/                 (stylesheets)
  └─ src/
      ├─ js/main.js       (module entry)
      └─ config/api.js    (environment-specific endpoints)
```

**Why No Build Step:**

- Faster development (no compile wait)
- Simpler deployment (just copy files)
- Easier debugging (source maps not needed)
- No transpilation needed (modern browsers support ES6 modules)

**Environment Configuration:**

Environment detection happens at runtime in browser:
```javascript
// frontend/src/utils/environment.js
export function getEnvironment() {
  const hostname = window.location.hostname;

  if (hostname === 'www.unitedwerise.org') {
    return 'production';
  } else if (hostname === 'dev.unitedwerise.org') {
    return 'development';
  } else {
    return 'local';
  }
}

// frontend/src/config/api.js
const API_ENDPOINTS = {
  production: 'https://api.unitedwerise.org',
  development: 'https://dev-api.unitedwerise.org',
  local: 'http://localhost:3000'
};

export const API_URL = API_ENDPOINTS[getEnvironment()];
```

**Deployment:**

GitHub Actions copies files to Azure Static Web Apps:
```yaml
# .github/workflows/azure-static-web-apps.yml
- name: Build And Deploy
  uses: Azure/static-web-apps-deploy@v1
  with:
    app_location: "/frontend"
    api_location: ""
    output_location: ""
```

No build command needed - files deployed as-is.

---

## Related Documentation

- **Project CLAUDE.md**: Current architecture overview
- **MASTER_DOCUMENTATION.md**: Detailed technical specifications
- **SYSTEM-ARCHITECTURE-DESIGN.md**: System design decisions

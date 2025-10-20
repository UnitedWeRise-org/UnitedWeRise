# Environment URLs Reference

**Document Version**: 1.0
**Last Updated**: October 17, 2025
**Maintainer**: Development Team
**Related**: CLAUDE.md (Environment Configuration), MASTER_DOCUMENTATION.md

---

## Quick Reference

| Service | Production | Staging | Local Development |
|---------|-----------|---------|------------------|
| **Main Site** | https://www.unitedwerise.org | https://dev.unitedwerise.org | http://localhost:8080 |
| **Admin Dashboard** | https://admin.unitedwerise.org | https://dev-admin.unitedwerise.org | http://localhost:8080/admin-dashboard.html |
| **Backend API** | https://api.unitedwerise.org | https://dev-api.unitedwerise.org | http://localhost:3001 |
| **WebSocket** | wss://api.unitedwerise.org | wss://dev-api.unitedwerise.org | ws://localhost:3001 |

---

## Table of Contents

1. [Production Environment](#production-environment)
2. [Staging Environment](#staging-environment)
3. [Local Development](#local-development)
4. [Azure Resources](#azure-resources)
5. [Third-Party Services](#third-party-services)
6. [Environment Detection](#environment-detection)
7. [URL Migration History](#url-migration-history)

---

## Production Environment

### Frontend URLs

**Main Site**
- URL: https://www.unitedwerise.org
- Purpose: Public-facing main website
- Session: Isolated for regular users
- Deployment: GitHub Actions → Azure Static Web Apps
- CDN: Azure CDN (automatic)

**Admin Dashboard**
- URL: https://admin.unitedwerise.org
- Purpose: Admin-only dashboard
- Session: Isolated from main site (separate origin)
- Deployment: Same Azure Static Web App as main site
- Routing: Client-side redirect from root to /admin-dashboard.html
- Access: Requires admin role + authentication

**Admin Dashboard (Legacy Path)**
- URL: https://www.unitedwerise.org/admin-dashboard.html
- Status: Deprecated (redirects to admin.unitedwerise.org)
- Purpose: Backward compatibility
- Note: Will redirect automatically to admin subdomain

### Backend URLs

**API Base**
- URL: https://api.unitedwerise.org
- Path Prefix: /api
- Full Example: https://api.unitedwerise.org/api/users/profile
- Deployment: Azure Container Apps
- Container: unitedwerise-backend
- Environment: NODE_ENV=production

**WebSocket**
- URL: wss://api.unitedwerise.org
- Purpose: Real-time notifications, live updates
- Protocol: WebSocket (WSS - secure)
- Fallback: Long polling (if WebSocket fails)

**Health Endpoint**
- URL: https://api.unitedwerise.org/health
- Purpose: Service health check, deployment verification
- Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "uptime": 123456,
  "version": "1.0.0",
  "releaseSha": "abc1234",
  "releaseDigest": "sha256:...",
  "environment": "production"
}
```

### DNS Configuration

**CNAME Records:**
```
www.unitedwerise.org        → unitedwerise-frontend-new.azurestaticapps.net
admin.unitedwerise.org      → unitedwerise-frontend-new.azurestaticapps.net
api.unitedwerise.org        → unitedwerise-backend.containerapp.io
```

**SSL Certificates:**
- Provider: Azure-managed
- Auto-renewal: Yes
- HTTPS Enforcement: Yes (HTTP → HTTPS redirect automatic)

---

## Staging Environment

### Frontend URLs

**Main Site (Staging)**
- URL: https://dev.unitedwerise.org
- Purpose: Test environment for main site
- Session: Isolated for staging users
- Deployment: GitHub Actions → Azure Static Web Apps (dev branch)
- CDN: Azure CDN (automatic)

**Admin Dashboard (Staging)**
- URL: https://dev-admin.unitedwerise.org
- Purpose: Test environment for admin dashboard
- Session: Isolated from staging main site
- Deployment: Same Azure Static Web App as staging main site
- Routing: Client-side redirect from root to /admin-dashboard.html
- Access: Requires admin role + authentication (staging database)

**Admin Dashboard (Legacy Path - Staging)**
- URL: https://dev.unitedwerise.org/admin-dashboard.html
- Status: Deprecated (redirects to dev-admin.unitedwerise.org)
- Purpose: Backward compatibility
- Note: Will redirect automatically to admin subdomain

### Backend URLs

**API Base (Staging)**
- URL: https://dev-api.unitedwerise.org
- Path Prefix: /api
- Full Example: https://dev-api.unitedwerise.org/api/users/profile
- Deployment: Azure Container Apps
- Container: unitedwerise-backend-staging
- Environment: NODE_ENV=staging, STAGING_ENVIRONMENT=true

**WebSocket (Staging)**
- URL: wss://dev-api.unitedwerise.org
- Purpose: Real-time notifications (staging)
- Protocol: WebSocket (WSS - secure)
- Fallback: Long polling (if WebSocket fails)

**Health Endpoint (Staging)**
- URL: https://dev-api.unitedwerise.org/health
- Purpose: Service health check, deployment verification
- Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "uptime": 12345,
  "version": "1.0.0",
  "releaseSha": "def5678",
  "releaseDigest": "sha256:...",
  "environment": "staging"
}
```

### DNS Configuration

**CNAME Records:**
```
dev.unitedwerise.org        → unitedwerise-staging.azurestaticapps.net
dev-admin.unitedwerise.org  → unitedwerise-staging.azurestaticapps.net
dev-api.unitedwerise.org    → unitedwerise-backend-staging.containerapp.io
```

**SSL Certificates:**
- Provider: Azure-managed
- Auto-renewal: Yes
- HTTPS Enforcement: Yes (HTTP → HTTPS redirect automatic)

---

## Local Development

### Frontend URLs

**Main Site (Local)**
- URL: http://localhost:8080 (or port assigned by development server)
- Purpose: Local development and testing
- Session: Browser localStorage/cookies (localhost origin)
- Server: Live Server, http-server, or similar
- Note: Some features may require HTTPS (use ngrok for testing)

**Admin Dashboard (Local)**
- URL: http://localhost:8080/admin-dashboard.html
- Purpose: Local admin dashboard development
- Session: Same origin as main site (localhost)
- Note: Session isolation NOT AVAILABLE on localhost (same origin)
- Testing: Use dev-admin.unitedwerise.org for session isolation testing

### Backend URLs

**API Base (Local)**
- URL: http://localhost:3001
- Path Prefix: /api
- Full Example: http://localhost:3001/api/users/profile
- Environment: NODE_ENV=development (default)
- Database: Local PostgreSQL or staging database (configured in .env)

**WebSocket (Local)**
- URL: ws://localhost:3001
- Purpose: Real-time notifications (local)
- Protocol: WebSocket (WS - non-secure OK for localhost)
- Note: Browser may warn about insecure WebSocket on localhost

**Health Endpoint (Local)**
- URL: http://localhost:3001/health
- Purpose: Service health check
- Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "uptime": 42,
  "version": "1.0.0-dev",
  "releaseSha": "local",
  "environment": "development"
}
```

### Development Tools

**PostgreSQL (Local)**
- Host: localhost
- Port: 5432 (default)
- Database: unitedwerise_dev (recommended)
- User: postgres (default)
- Password: (configured in backend/.env.local)

**Prisma Studio (Database GUI)**
- URL: http://localhost:5555
- Launch: `cd backend && npx prisma studio`
- Purpose: Visual database browser and editor

**Azure Storage Emulator (Optional)**
- URL: http://127.0.0.1:10000
- Purpose: Local blob storage testing
- Alternative: Use staging storage account (configured in .env)

---

## Azure Resources

### Azure Static Web Apps

**Production Frontend**
- Resource Name: unitedwerise-frontend-new
- Resource Group: unitedwerise-rg
- Custom Domains:
  - www.unitedwerise.org
  - admin.unitedwerise.org
- Deployment Source: GitHub Actions (main branch)

**Staging Frontend**
- Resource Name: unitedwerise-staging
- Resource Group: unitedwerise-rg
- Custom Domains:
  - dev.unitedwerise.org
  - dev-admin.unitedwerise.org
- Deployment Source: GitHub Actions (development branch)

### Azure Container Apps

**Production Backend**
- Resource Name: unitedwerise-backend
- Resource Group: unitedwerise-rg
- Container Registry: uwracr2425.azurecr.io
- Image: unitedwerise-backend:backend-prod-*
- URL: https://api.unitedwerise.org
- Environment Variables: NODE_ENV=production

**Staging Backend**
- Resource Name: unitedwerise-backend-staging
- Resource Group: unitedwerise-rg
- Container Registry: uwracr2425.azurecr.io
- Image: unitedwerise-backend:backend-dev-*
- URL: https://dev-api.unitedwerise.org
- Environment Variables: NODE_ENV=staging, STAGING_ENVIRONMENT=true

### Azure Container Registry

**Registry**
- Name: uwracr2425
- Resource Group: unitedwerise-rg
- Login Server: uwracr2425.azurecr.io
- Images:
  - unitedwerise-backend:backend-prod-* (production)
  - unitedwerise-backend:backend-dev-* (staging)

### Azure Database for PostgreSQL

**Production Database**
- Server: unitedwerise-db.postgres.database.azure.com
- Database: unitedwerise_prod
- SSL: Required
- Backup: Automated daily backups (7-day retention)

**Staging Database**
- Server: unitedwerise-db-dev.postgres.database.azure.com
- Database: unitedwerise_staging
- SSL: Required
- Backup: Automated daily backups (7-day retention)

### Azure Blob Storage

**Storage Account**
- Name: uwrstorage2425
- Resource Group: unitedwerise-rg
- Containers:
  - profile-photos (user profile images)
  - post-images (post attachments)
  - event-banners (event images)
  - verification-documents (identity verification)
- Access: Private (SAS tokens for authorized access)

### Azure OpenAI

**OpenAI Instance**
- Endpoint: https://unitedwerise-openai.openai.azure.com/
- Resource Group: unitedwerise-rg
- Models:
  - gpt-4 (text generation, moderation)
  - text-embedding-ada-002 (embeddings)
- Purpose: AI-powered moderation, content suggestions

---

## Third-Party Services

### Google OAuth

**OAuth Consent Screen**
- Application Name: United We Rise
- User Type: External
- Scopes: email, profile, openid

**OAuth Client**
- Client ID: 496604941751-663p6eiqo34iumaet9tme4g19msa1bf0.apps.googleusercontent.com
- Authorized Origins:
  - https://www.unitedwerise.org
  - https://admin.unitedwerise.org
  - https://dev.unitedwerise.org
  - https://dev-admin.unitedwerise.org
  - http://localhost:8080 (development)
- Authorized Redirect URIs:
  - https://www.unitedwerise.org/auth/callback
  - https://admin.unitedwerise.org/auth/callback
  - https://dev.unitedwerise.org/auth/callback
  - https://dev-admin.unitedwerise.org/auth/callback
  - http://localhost:8080/auth/callback

### hCaptcha (Bot Protection)

**Site Keys:**
- Production: (configured in environment variables)
- Staging: (configured in environment variables)
- Local: (same as staging for testing)

**Domains:**
- www.unitedwerise.org
- admin.unitedwerise.org
- dev.unitedwerise.org
- dev-admin.unitedwerise.org
- localhost (for testing)

### SendGrid (Email Service)

**Email Templates:**
- Welcome Email
- Email Verification
- Password Reset
- Admin Notifications

**Sender Domains:**
- Production: noreply@unitedwerise.org
- Staging: noreply-staging@unitedwerise.org

---

## Environment Detection

### Frontend Environment Detection

**Location**: `frontend/src/utils/environment.js`

**Detection Logic:**
```javascript
function getEnvironment() {
    const hostname = window.location.hostname;

    // Development environments
    if (hostname === 'dev.unitedwerise.org' ||
        hostname === 'dev-admin.unitedwerise.org' ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1') {
        return 'development';
    }

    // Production (default - secure fallback)
    return 'production';
}
```

**Environment-Specific URLs:**
```javascript
// API Base URL
development: https://dev-api.unitedwerise.org/api
production:  https://api.unitedwerise.org/api

// WebSocket URL
development: wss://dev-api.unitedwerise.org
production:  wss://api.unitedwerise.org

// Admin Dashboard URL
development: https://dev-admin.unitedwerise.org
production:  https://admin.unitedwerise.org
```

### Backend Environment Detection

**Location**: `backend/src/config/environment.ts`

**Detection Logic:**
```typescript
const environment = process.env.NODE_ENV || 'development';

// Environment-specific configuration
if (environment === 'production') {
  // Production config
} else if (environment === 'staging') {
  // Staging config
} else {
  // Development config (default)
}
```

**Environment Variables:**
```bash
# Production
NODE_ENV=production
DATABASE_URL=<production-database-url>
AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425

# Staging
NODE_ENV=staging
STAGING_ENVIRONMENT=true
DATABASE_URL=<staging-database-url>
AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425

# Local Development
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/unitedwerise_dev
AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425
```

---

## URL Migration History

### October 17, 2025: Admin Subdomain Routing

**Change**: Migrated admin dashboard from path-based to subdomain-based routing

**Before:**
- Production Admin: https://www.unitedwerise.org/admin-dashboard.html
- Staging Admin: https://dev.unitedwerise.org/admin-dashboard.html

**After:**
- Production Admin: https://admin.unitedwerise.org
- Staging Admin: https://dev-admin.unitedwerise.org

**Backward Compatibility:**
- Old URLs redirect to new subdomains
- No breaking changes for existing bookmarks
- Session isolation achieved via separate origins

**Implementation:**
- DNS CNAME records created for admin subdomains
- Client-side redirect script (frontend/src/utils/admin-redirect.js)
- Reverse redirect prevention in admin-dashboard.html

**Rationale:**
- Solve login conflict between main site and admin dashboard
- Browser same-origin policy provides session isolation
- Industry standard architecture (AWS, Google, Microsoft all use subdomain isolation)

### September 2025: Staging Environment URLs

**Change**: Introduced dedicated staging environment URLs

**Before:**
- Staging: dev.unitedwerise.org (main site only)

**After:**
- Staging Main: https://dev.unitedwerise.org
- Staging API: https://dev-api.unitedwerise.org
- Staging Admin: https://dev-admin.unitedwerise.org (added October 2025)

**Rationale:**
- Separate production and staging for safer testing
- Prevent accidental production deployments
- Enable full-stack testing before production release

---

## Testing URLs

### Verify Environment Detection

**Production Main Site:**
```javascript
// Open browser console on www.unitedwerise.org
import { getEnvironment } from './src/utils/environment.js';
console.log(getEnvironment()); // Expected: 'production'
```

**Production Admin Dashboard:**
```javascript
// Open browser console on admin.unitedwerise.org
import { getEnvironment } from './src/utils/environment.js';
console.log(getEnvironment()); // Expected: 'production'
```

**Staging Main Site:**
```javascript
// Open browser console on dev.unitedwerise.org
import { getEnvironment } from './src/utils/environment.js';
console.log(getEnvironment()); // Expected: 'development'
```

**Staging Admin Dashboard:**
```javascript
// Open browser console on dev-admin.unitedwerise.org
import { getEnvironment } from './src/utils/environment.js';
console.log(getEnvironment()); // Expected: 'development'
```

### Verify API Endpoints

**Production:**
```bash
curl -s https://api.unitedwerise.org/health | grep environment
# Expected: "environment": "production"
```

**Staging:**
```bash
curl -s https://dev-api.unitedwerise.org/health | grep environment
# Expected: "environment": "staging"
```

**Local:**
```bash
curl -s http://localhost:3001/health | grep environment
# Expected: "environment": "development"
```

---

## Troubleshooting

### Wrong Environment Detected

**Symptom**: Frontend shows wrong environment (e.g., staging detected as production)

**Debug:**
```javascript
// Browser console
console.log(window.location.hostname);
// Expected: Exact match to environment detection logic
```

**Fix**: Update `frontend/src/utils/environment.js` to include correct hostname

### API Endpoint Not Found (404)

**Symptom**: API calls return 404 errors

**Debug:**
```javascript
// Browser console
import { getApiBaseUrl } from './src/utils/environment.js';
console.log(getApiBaseUrl());
// Verify URL matches backend URL for current environment
```

**Fix**: Update `frontend/src/utils/environment.js` to correct API URL

### CORS Error on API Calls

**Symptom**: Browser console shows CORS policy errors

**Debug:**
```bash
# Check backend CORS configuration
curl -I -H "Origin: https://www.unitedwerise.org" https://api.unitedwerise.org/api/users/profile
# Expected: Access-Control-Allow-Origin header present
```

**Fix**: Update backend CORS configuration to allow frontend origin

---

## Additional Resources

**Related Documentation:**
- CLAUDE.md (Environment Configuration section)
- MASTER_DOCUMENTATION.md (Deployment section)
- docs/ADMIN-SUBDOMAIN-TROUBLESHOOTING.md (Admin subdomain troubleshooting)
- docs/adr/ADR-002-ADMIN-SUBDOMAIN-ROUTING.md (Architecture decision)

**Azure Documentation:**
- [Azure Static Web Apps](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure Container Apps](https://docs.microsoft.com/en-us/azure/container-apps/)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/en-us/azure/postgresql/)

---

**Document History:**
- 2025-10-17: Initial version created as part of admin subdomain routing implementation
- 2025-10-17: Added admin subdomain URLs to all environment sections

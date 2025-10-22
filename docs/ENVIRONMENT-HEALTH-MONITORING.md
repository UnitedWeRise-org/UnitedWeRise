# Environment Health Monitoring

**Last Updated**: October 22, 2025
**Purpose**: Documentation for environment validation and health monitoring system
**Audience**: Developers, DevOps, System Administrators

---

## Overview

The UnitedWeRise backend includes a comprehensive environment health monitoring system that:

1. **Validates environment consistency** on server startup (fail-fast on misconfiguration)
2. **Exposes health metrics** via enhanced `/health` endpoint
3. **Provides real-time monitoring** through Admin Dashboard
4. **Enables cross-environment validation** via deployment status tools

### Why This Matters

**Problem**: Prior to October 2025, environment misconfigurations could go undetected until production failures occurred. Examples:
- Production NODE_ENV pointing to development database
- Staging environment using production database credentials
- Health endpoint reporting incorrect branch/environment metadata

**Solution**: Startup validation catches misconfigurations before they cause issues. Server refuses to start if environment variables are inconsistent.

---

## Health Endpoint

### Endpoint Details

```
GET /health
```

**Authentication**: None (public endpoint)
**Response Type**: JSON
**Purpose**: System health check and environment metadata

### Response Fields

```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T14:30:45.123Z",
  "uptime": 3600.5,
  "database": "connected",
  "databaseHost": "unitedwerise-db-dev.postgres.database.azure.com",
  "environment": "development",
  "nodeEnv": "staging",
  "releaseSha": "a1b2c3d",
  "releaseDigest": "sha256:...",
  "githubBranch": "development"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Overall system health: `"healthy"` or `"unhealthy"` |
| `timestamp` | string | ISO 8601 timestamp of health check |
| `uptime` | number | Server uptime in seconds (resets on deployment) |
| `database` | string | Database connection status: `"connected"` or `"disconnected"` |
| `databaseHost` | string | Database server hostname (for environment validation) |
| `environment` | string | Derived environment: `"development"` or `"production"` |
| `nodeEnv` | string | Raw NODE_ENV value: `"staging"`, `"production"`, etc. |
| `releaseSha` | string | Git commit SHA of deployed code (short form) |
| `releaseDigest` | string | Docker image digest of deployed container |
| `githubBranch` | string | Git branch name derived from NODE_ENV |

### Important Changes (October 2025)

**Enhanced Fields:**
- `databaseHost`: NEW - Shows which database server is connected (enables environment validation)
- `environment`: ENHANCED - Now accurately derives from NODE_ENV using centralized utility
- `nodeEnv`: NEW - Raw NODE_ENV value for debugging
- `githubBranch`: FIXED - Previously always returned `"main"`, now derives from NODE_ENV

**Derivation Logic:**
```typescript
// environment field
NODE_ENV=staging → environment="development"
NODE_ENV=production → environment="production"

// githubBranch field
NODE_ENV=staging → githubBranch="development"
NODE_ENV=production → githubBranch="main"
```

### Usage Examples

**Basic health check:**
```bash
curl https://dev-api.unitedwerise.org/health
```

**Validate environment configuration:**
```bash
curl -s https://dev-api.unitedwerise.org/health | jq '{
  environment: .environment,
  nodeEnv: .nodeEnv,
  database: .databaseHost,
  branch: .githubBranch
}'
```

**Check deployment SHA:**
```bash
DEPLOYED_SHA=$(curl -s https://dev-api.unitedwerise.org/health | jq -r '.releaseSha')
LOCAL_SHA=$(git rev-parse --short HEAD)
echo "Local: $LOCAL_SHA | Deployed: $DEPLOYED_SHA"
```

---

## Startup Environment Validation

### Validation Rules

The backend validates environment consistency on startup. Server **fails to start** if rules are violated.

**Rule 1: Production Environment Database Check**
```
IF NODE_ENV=production AND DATABASE_URL contains "unitedwerise-db-dev"
THEN EXIT WITH ERROR: "Production environment pointing to development database"
```

**Rule 2: Staging Environment Database Check**
```
IF NODE_ENV=staging AND DATABASE_URL contains "unitedwerise-db.postgres"
THEN EXIT WITH ERROR: "Staging environment pointing to production database"
```

**Rule 3: DATABASE_URL Format Validation**
```
IF DATABASE_URL is missing or malformed
THEN EXIT WITH ERROR: "Invalid DATABASE_URL format"
```

### Expected Configurations

**Production:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@unitedwerise-db.postgres.database.azure.com/db
```

**Staging:**
```bash
NODE_ENV=staging
DATABASE_URL=postgresql://user:pass@unitedwerise-db-dev.postgres.database.azure.com/db
```

### Validation Output

**Success:**
```
[INFO] Environment validation passed
[INFO] Environment: production
[INFO] Database: unitedwerise-db.postgres.database.azure.com
[INFO] Server starting...
```

**Failure:**
```
[ERROR] Environment validation failed
[CRITICAL] Production environment pointing to development database
[CRITICAL] Server startup aborted
[EXIT] Process exited with code 1
```

### Troubleshooting Startup Failures

**Check container logs:**
```bash
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 50 | grep -E "CRITICAL|ERROR|validation"
```

**Fix environment variables:**
```bash
# Staging environment fix
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --set-env-vars \
    NODE_ENV=staging \
    DATABASE_URL="postgresql://..."

# Production environment fix
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --set-env-vars \
    NODE_ENV=production \
    DATABASE_URL="postgresql://..."
```

---

## Admin Dashboard Health Display

### Location

**Production**: https://admin.unitedwerise.org (Overview tab)
**Staging**: https://dev-admin.unitedwerise.org (Overview tab)

### Features

**Real-time Health Monitoring:**
- Environment health status with color coding
- Cross-environment validation (compares staging vs production)
- Auto-refresh every 30 seconds
- Manual refresh button
- Detailed health metrics display

**Visual Issue Detection:**
- 🟢 Green: All systems healthy
- 🟡 Yellow: Warning (minor issues)
- 🔴 Red: Error (critical issues)

### Displayed Information

**System Health Card:**
```
Environment Health
Status: Healthy | Last Check: 2 seconds ago

Environment: Development (staging)
Database: unitedwerise-db-dev.postgres.database.azure.com
Branch: development
Uptime: 45 minutes
SHA: a1b2c3d
```

**Validation Checks:**
- Environment matches expected value
- Database matches environment
- Branch matches environment
- Server recently restarted after deployment

### Console Output

The Admin Dashboard logs comprehensive health information to browser console:

```
=== ENVIRONMENT HEALTH REPORT ===
Timestamp: 2025-10-22T14:30:45.123Z

STAGING ENVIRONMENT:
  Status: healthy
  Environment: development (expected)
  Database: unitedwerise-db-dev.postgres.database.azure.com ✓
  Branch: development ✓
  Uptime: 2700s (45 minutes)
  SHA: a1b2c3d

PRODUCTION ENVIRONMENT:
  Status: healthy
  Environment: production (expected)
  Database: unitedwerise-db.postgres.database.azure.com ✓
  Branch: main ✓
  Uptime: 86400s (1 day)
  SHA: f1e2d3c

CROSS-ENVIRONMENT VALIDATION:
  ✓ Staging using development database
  ✓ Production using production database
  ✓ No environment mismatches detected

ISSUES DETECTED: None
```

---

## Deployment Status Console Tool

### Location

`frontend/src/utils/deployment-status.js`

### Purpose

Comprehensive health check tool used during deployments and debugging.

### Features

**Cross-Environment Validation:**
- Fetches health from both staging and production
- Validates environment configuration consistency
- Detects database mismatches
- Compares deployed SHAs

**Issue Severity Levels:**
- **CRITICAL**: Server unreachable, environment mismatch, wrong database
- **ERROR**: Deployment SHA mismatch, database disconnected
- **WARNING**: Stale deployment (old uptime), metadata inconsistencies

### Usage

**From browser console:**
```javascript
// Load the module
import('/src/utils/deployment-status.js');

// Auto-runs on load, displays comprehensive report
```

**Sample Output:**
```
=== DEPLOYMENT STATUS CHECK ===
Timestamp: 2025-10-22T14:30:45.123Z

STAGING (dev-api.unitedwerise.org):
  Status: Healthy ✓
  Environment: development (NODE_ENV: staging)
  Database: unitedwerise-db-dev.postgres.database.azure.com ✓
  Branch: development
  SHA: a1b2c3d
  Uptime: 45 minutes

PRODUCTION (api.unitedwerise.org):
  Status: Healthy ✓
  Environment: production (NODE_ENV: production)
  Database: unitedwerise-db.postgres.database.azure.com ✓
  Branch: main
  SHA: f1e2d3c
  Uptime: 1 day

VALIDATION RESULTS:
  ✓ Staging environment configuration correct
  ✓ Production environment configuration correct
  ✓ All database connections match expected environment

ISSUES: None detected
```

---

## Validation Rules Reference

### Environment-Database Mapping

| Environment | NODE_ENV | Expected Database | Branch |
|-------------|----------|-------------------|--------|
| Staging | `staging` | `unitedwerise-db-dev` | `development` |
| Production | `production` | `unitedwerise-db` | `main` |

### Critical Validation Checks

**1. Database Host Validation**
```javascript
// Staging MUST use dev database
if (nodeEnv === 'staging' && !databaseHost.includes('db-dev')) {
  ERROR: "Staging using production database"
}

// Production MUST use production database
if (nodeEnv === 'production' && databaseHost.includes('db-dev')) {
  ERROR: "Production using development database"
}
```

**2. Environment Consistency**
```javascript
// Environment should match NODE_ENV
if (nodeEnv === 'staging' && environment !== 'development') {
  WARNING: "Environment metadata mismatch"
}

if (nodeEnv === 'production' && environment !== 'production') {
  WARNING: "Environment metadata mismatch"
}
```

**3. Branch Consistency**
```javascript
// Branch should match environment
if (environment === 'development' && githubBranch !== 'development') {
  WARNING: "Branch metadata mismatch"
}

if (environment === 'production' && githubBranch !== 'main') {
  WARNING: "Branch metadata mismatch"
}
```

---

## Troubleshooting

### Common Issues

**Issue 1: Health endpoint returns 503 or unreachable**

**Symptoms:**
- `curl https://dev-api.unitedwerise.org/health` returns 503 or times out
- Admin Dashboard shows "Unable to fetch health"
- Container app logs show startup errors

**Diagnosis:**
```bash
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 100 | grep -E "CRITICAL|ERROR|validation|startup"
```

**Common Causes:**
- Environment validation failure (NODE_ENV/DATABASE_URL mismatch)
- Database connection failure
- Missing required environment variables
- Container image build failure

**Resolution:**
1. Check environment variables match expected configuration
2. Verify DATABASE_URL is correct for environment
3. Rebuild and redeploy if necessary

---

**Issue 2: Health shows wrong environment**

**Symptoms:**
- Staging health shows `environment: "production"`
- Production health shows `environment: "development"`
- Branch metadata doesn't match expected value

**Diagnosis:**
```bash
curl -s https://dev-api.unitedwerise.org/health | jq '{
  nodeEnv: .nodeEnv,
  environment: .environment,
  database: .databaseHost,
  branch: .githubBranch
}'
```

**Common Causes:**
- NODE_ENV set incorrectly during deployment
- Container app using wrong environment variable values
- Cached environment variables from previous deployment

**Resolution:**
```bash
# Update NODE_ENV for staging
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --set-env-vars NODE_ENV=staging

# Update NODE_ENV for production
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --set-env-vars NODE_ENV=production

# Force restart with new revision
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-suffix "fix-env-$(date +%H%M%S)"
```

---

**Issue 3: Database host shows wrong database**

**Symptoms:**
- Staging shows `databaseHost: "unitedwerise-db.postgres..."` (production database)
- Production shows `databaseHost: "unitedwerise-db-dev.postgres..."` (dev database)
- Server fails to start with CRITICAL error

**Diagnosis:**
```bash
# Check current DATABASE_URL (without exposing credentials)
az containerapp show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --query "properties.template.containers[0].env" \
  | jq '.[] | select(.name=="DATABASE_URL")'
```

**Common Causes:**
- DATABASE_URL copied from wrong environment
- Manual environment variable update with wrong value
- Infrastructure misconfiguration during deployment

**Resolution:**
```bash
# Fix staging DATABASE_URL
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --set-env-vars DATABASE_URL="postgresql://user:pass@unitedwerise-db-dev.postgres.database.azure.com/db"

# Fix production DATABASE_URL
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --set-env-vars DATABASE_URL="postgresql://user:pass@unitedwerise-db.postgres.database.azure.com/db"

# Verify fix
curl -s https://dev-api.unitedwerise.org/health | jq '.databaseHost'
```

---

**Issue 4: Uptime too high after deployment**

**Symptoms:**
- Just deployed new code, but `uptime` shows hours/days
- Deployed SHA doesn't match local SHA
- Changes not visible in application

**Diagnosis:**
```bash
# Check uptime
curl -s https://dev-api.unitedwerise.org/health | jq '.uptime'

# Check deployed SHA vs local
DEPLOYED=$(curl -s https://dev-api.unitedwerise.org/health | jq -r '.releaseSha')
LOCAL=$(git rev-parse --short HEAD)
echo "Local: $LOCAL | Deployed: $DEPLOYED"
```

**Common Causes:**
- Container didn't restart after deployment
- Deployment updated image but didn't create new revision
- Load balancer still routing to old revision

**Resolution:**
```bash
# Force new revision
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-suffix "force-restart-$(date +%H%M%S)" \
  --revision-mode Single

# Wait 30 seconds for restart
sleep 30

# Verify new uptime (should be <60 seconds)
curl -s https://dev-api.unitedwerise.org/health | jq '.uptime'
```

---

## Implementation Details

### Files Modified

**Backend:**
- `backend/src/routes/health.ts` - Enhanced health endpoint with new fields
- `backend/src/utils/environment.ts` - Centralized environment detection and validation
- `backend/src/index.ts` - Startup validation before server start

**Frontend:**
- `frontend/src/utils/deployment-status.js` - Cross-environment validation tool
- `admin/src/js/components/admin-overview.js` - Admin Dashboard health display

### Centralized Environment Detection

All environment detection now uses `backend/src/utils/environment.ts`:

```typescript
export function getEnvironment(): 'development' | 'production' {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

export function getExpectedBranch(): string {
  return isProduction() ? 'main' : 'development';
}
```

### Validation on Startup

Located in `backend/src/index.ts`:

```typescript
// Validate environment before starting server
const databaseUrl = process.env.DATABASE_URL || '';
const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production' && databaseUrl.includes('unitedwerise-db-dev')) {
  console.error('[CRITICAL] Production environment pointing to development database');
  process.exit(1);
}

if (nodeEnv === 'staging' && !databaseUrl.includes('db-dev')) {
  console.error('[CRITICAL] Staging environment pointing to production database');
  process.exit(1);
}
```

---

## Best Practices

### For Developers

1. **Always check health after deployment:**
   ```bash
   curl -s https://dev-api.unitedwerise.org/health | jq
   ```

2. **Verify environment consistency:**
   ```bash
   curl -s https://dev-api.unitedwerise.org/health | jq '{
     environment: .environment,
     database: .databaseHost,
     branch: .githubBranch
   }'
   ```

3. **Check uptime after deployment (should be <60 seconds):**
   ```bash
   curl -s https://dev-api.unitedwerise.org/health | jq '.uptime'
   ```

### For DevOps

1. **Monitor startup logs during deployment:**
   ```bash
   az containerapp logs show \
     --name unitedwerise-backend-staging \
     --resource-group unitedwerise-rg \
     --follow
   ```

2. **Validate environment variables before deployment:**
   ```bash
   # Staging must have:
   NODE_ENV=staging
   DATABASE_URL=<dev-database-url>

   # Production must have:
   NODE_ENV=production
   DATABASE_URL=<production-database-url>
   ```

3. **Use Admin Dashboard for quick health overview**

### For System Administrators

1. **Set up health endpoint monitoring:**
   - Configure uptime monitoring on `/health` endpoint
   - Alert on 503 status or missing response
   - Alert on `database: "disconnected"`

2. **Review environment health regularly:**
   - Check Admin Dashboard daily
   - Verify cross-environment validation passes
   - Monitor uptime trends

3. **Document environment changes:**
   - Log any NODE_ENV or DATABASE_URL changes
   - Update CLAUDE.md if configuration standards change
   - Notify team of infrastructure updates

---

## Related Documentation

- **Deployment Procedures**: `CLAUDE.md` (sections: Deployment Procedures, Deployment Failure Diagnosis)
- **Environment Configuration**: `CLAUDE.md` (section: Environment Configuration)
- **Architecture Notes**: `.claude/guides/architecture-notes.md`
- **Incident Response**: `docs/INCIDENT_RESPONSE.md`

---

## Changelog

**October 22, 2025**:
- Initial documentation created
- Documented enhanced health endpoint fields
- Documented startup validation system
- Added Admin Dashboard health monitoring documentation
- Added deployment-status.js console tool documentation
- Added comprehensive troubleshooting guide

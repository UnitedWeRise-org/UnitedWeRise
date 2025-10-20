# UnitedWeRise Development Reference

## Terminology

Main = main branch = production = www site/server
Dev = development branch = staging = dev site/server

---

## ⚠️ CRITICAL RULE: Environment-Branch Mapping (NEVER VIOLATE)

**THIS RULE IS ABSOLUTE AND INVIOLABLE:**

- **Development branch** === **Staging environment** (dev.unitedwerise.org / dev-api.unitedwerise.org)
  - Staging ONLY EVER runs development branch code
  - If staging is not running development code, it is WRONG and must be fixed immediately

- **Main branch** === **Production environment** (www.unitedwerise.org / api.unitedwerise.org)
  - Production ONLY EVER runs main branch code
  - If production is not running main code, it is WRONG and must be fixed immediately

**There are NO exceptions to this rule. ANY deviation means something is broken.**

If backend health endpoint or any monitoring shows a mismatch (e.g., staging showing "main" branch), this indicates:
1. A bug in the health endpoint reporting
2. An accidental deployment to wrong environment
3. An emergency that must be corrected immediately

**Always assume staging = development and production = main. Period.**

---

## Tier 1: Project-Specific Core Rules

**Modular architecture:**
All web development uses ES6 modules. No inline scripts in HTML files.
- No `<script>` blocks in index.html
- No inline event handlers (onclick, etc.)
- Create modules in appropriate directories
- Use addEventListener for events
- Export/import through main.js dependency chain

**Admin-only debugging:**
Use admin debug functions: `adminDebugLog()`, `adminDebugError()`, `adminDebugWarn()`, `adminDebugTable()`, `adminDebugSensitive()`

**Branch workflow:**
You work on whatever branch is currently active. Never ask about or suggest branch changes. User has exclusive control over branches.

Current workflow:
- development branch → staging environment (dev.unitedwerise.org)
- main branch → production environment (www.unitedwerise.org)

**CRITICAL: Database migration safety**
- NEVER use `prisma db push` for production or permanent changes
- ALWAYS use `prisma migrate dev` for schema changes
- ALWAYS verify database before migrations: `echo $DATABASE_URL | grep -o '@[^.]*'` (must show @unitedwerise-db-dev)
- Production: unitedwerise-db.postgres.database.azure.com
- Development: unitedwerise-db-dev.postgres.database.azure.com

**Inline documentation mandatory**
ALL code requires inline docs. Code without docs is INCOMPLETE.

**Required:**
- **Backend Routes:** Swagger on every endpoint (read actual res.json/status before documenting)
- **Backend Services:** JSDoc with @param, @returns, @throws, @example (verify throws match code)
- **Backend Middleware:** JSDoc with purpose, security implications, ordering
- **Prisma Schema:** `///` comments on all models, fields, enums (describe actual purpose)
- **Frontend:** JSDoc with @param/@returns on public functions, @module on files

**Process:**
1. READ implementation first (never guess)
2. FIND similar documented code (use backend/src/routes/auth.ts as template)
3. VERIFY docs match actual behavior (check res.json, res.status, throw statements)
4. CHECK pattern consistency (grep similar endpoints)

**Modifying existing undocumented code:**
- Document the entire modified function/endpoint before making changes
- If urgent fix: Add `// TODO-DOCS: [date]` comment, log in .claude/scratchpads/DOCUMENTATION-DEBT.md

**Verification (required before task complete):**
- [ ] Read implementation before documenting
- [ ] Response schemas match res.json() calls
- [ ] Error codes match res.status() calls
- [ ] Similar endpoints follow same pattern
- [ ] No invented/guessed documentation

**Templates:** .claude/guides/documentation-templates.md

---

## Environment Configuration

**Production:**
- Backend: https://api.unitedwerise.org
- Frontend: https://www.unitedwerise.org
- Admin: https://admin.unitedwerise.org

**Staging (admin-only):**
- Backend: https://dev-api.unitedwerise.org
- Frontend: https://dev.unitedwerise.org
- Admin: https://dev-admin.unitedwerise.org

**Azure Resources:**
- Registry: uwracr2425
- Resource Group: unitedwerise-rg
- Production Backend: unitedwerise-backend
- Staging Backend: unitedwerise-backend-staging

**Key Variables:**
```
AZURE_OPENAI_ENDPOINT=https://unitedwerise-openai.openai.azure.com/
AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425
GOOGLE_CLIENT_ID=496604941751-663p6eiqo34iumaet9tme4g19msa1bf0.apps.googleusercontent.com
```

---

## Tier 2: Deployment & Migration Procedures

<details>
<summary><b>Inline Documentation Templates</b></summary>

**Swagger (Backend Routes):**
```typescript
/**
 * @swagger
 * /api/resource:
 *   post:
 *     tags: [Category]
 *     summary: Brief action description
 *     description: Detailed explanation of what this endpoint does
 *     security:
 *       - cookieAuth: []  # Remove if public endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [field]
 *             properties:
 *               field:
 *                 type: string
 *                 description: Field purpose
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/resource', requireAuth, async (req: AuthRequest, res: Response) => {
  // Implementation
});
```

**JSDoc (Services/Functions):**
```typescript
/**
 * Brief function description
 *
 * @param paramName - Description and constraints
 * @param optionalParam - Optional parameter description
 * @returns Promise<Type> Return value description
 * @throws {ValidationError} When condition occurs
 * @throws {NotFoundError} When resource not found
 *
 * @example
 * const result = await func('value');
 * console.log(result); // { id: '123', ... }
 */
export async function func(paramName: string, optionalParam?: number): Promise<Type> {
  // Implementation
}
```

**Prisma Schema:**
```prisma
/// Brief model description explaining business purpose
/// @description Detailed explanation of model's role in system
model ResourceName {
  /// Unique identifier for the resource
  id          String    @id @default(cuid())
  /// User-facing display name
  name        String
  /// Optional description with constraints
  description String?   @db.Text
  /// Foreign key to User model
  userId      String
  /// Relationship with cascade delete
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])  /// Index for user-based queries
}

/// Status values for resource lifecycle
enum ResourceStatus {
  ACTIVE    /// Resource is currently active
  INACTIVE  /// Resource has been deactivated
  PENDING   /// Resource awaiting approval
}
```

**Frontend JSDoc:**
```javascript
/**
 * @module ModuleName
 * @description What this module does and when to use it
 */

/**
 * Brief function description
 *
 * @param {string} paramName - Parameter description
 * @param {Object} options - Configuration options
 * @param {boolean} options.flag - What this flag controls
 * @returns {Promise<Object>} Description of return value
 *
 * @example
 * const result = await functionName('value', { flag: true });
 */
export async function functionName(paramName, options = {}) {
  // Implementation
}
```

</details>

<details>
<summary><b>Pre-deployment validation</b></summary>

```bash
git status  # Must be clean
cd backend && npm run build  # Must compile
cd backend && npx prisma validate && npx prisma generate
git log origin/<current-branch>..HEAD  # Should be empty
```
</details>

<details>
<summary><b>Deploy to staging</b></summary>

```bash
git pull origin <current-branch>
git add . && git commit -m "feat: description"
git push origin <current-branch>

# If on development branch, auto-deploys to staging
# Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
```
</details>

<details>
<summary><b>Backend Docker deployment to staging</b></summary>

```bash
GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-dev-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"

az acr build --registry uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --no-wait \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#development:backend

sleep 180
az acr task list-runs --registry uwracr2425 --output table | head -3

DIGEST=$(az acr repository show --name uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --query "digest" -o tsv)

az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "stg-$GIT_SHA-$(date +%H%M%S)" \
  --set-env-vars NODE_ENV=staging STAGING_ENVIRONMENT=true RELEASE_SHA=$GIT_SHA RELEASE_DIGEST=$DIGEST

az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-mode Single

sleep 30
curl -s "https://dev-api.unitedwerise.org/health" | grep releaseSha
```
</details>

<details>
<summary><b>Production deployment procedure</b></summary>

**When user says "deploy/merge/push to production": Execute ALL 5 steps.**

1.Merge→main  2.Build image  3.Get digest  4.Deploy  5.Verify

**Step 1 alone ≠ deployed.**

---

### Pre-Deployment Validation

```bash
git status  # Must be clean
cd backend && npm run build  # Must compile
git log origin/development..HEAD  # Should be empty
curl -s "https://dev-api.unitedwerise.org/health"  # Verify staging works
```

### Deployment Steps

```bash
# Step 1: Merge to main (user must explicitly approve)
git checkout main && git pull origin main
git merge development && git push origin main

# Step 2: Build Docker image
GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-prod-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"

az acr build --registry uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --no-wait \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend

sleep 180
az acr task list-runs --registry uwracr2425 --output table | head -3

# Step 3: Get image digest
DIGEST=$(az acr repository show --name uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --query "digest" -o tsv)

# Step 4: Deploy to production
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "prod-$GIT_SHA-$(date +%H%M%S)" \
  --set-env-vars NODE_ENV=production RELEASE_SHA=$GIT_SHA RELEASE_DIGEST=$DIGEST

az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-mode Single

# Step 5: Verify deployment
sleep 30
curl -s "https://api.unitedwerise.org/health"  # Check status, database, releaseSha, uptime

DEPLOYED_SHA=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
echo "Local: $GIT_SHA | Deployed: $DEPLOYED_SHA"  # Must match

az containerapp logs show \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --tail 50
```

### Rollback Procedure (if deployment fails)

```bash
# List revisions
az containerapp revision list \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --output table

# Activate previous working revision
az containerapp revision activate \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision <previous-revision-name>

# Or revert git commit
git checkout main && git revert HEAD && git push origin main
# Then redeploy with Steps 2-5
```

### Emergency Hotfix

```bash
git checkout main && git pull origin main
git checkout -b hotfix/critical-issue
# Make minimal fix
cd backend && npm run build
git add . && git commit -m "hotfix: description"
git push origin hotfix/critical-issue
git checkout main && git merge hotfix/critical-issue && git push origin main
# Deploy with Steps 2-5
git checkout development && git merge hotfix/critical-issue && git push origin development
```

</details>

<details>
<summary><b>Database migration safety protocol</b></summary>

**FORBIDDEN COMMANDS:**
```bash
npx prisma db push           # Bypasses migration system
npx prisma db push --force   # Even worse - accepts data loss
CREATE TABLE ... / ALTER TABLE ...  # Manual SQL (unless emergency)
```

**Why:** Oct 3 2025 incident - Used `db push` instead of migrations → production 500 errors when backend expected tables that didn't exist.

### Required Workflow

**Step 1: Development**
```bash
cd backend
# Edit backend/prisma/schema.prisma

npx prisma migrate dev --name "descriptive_name"
# Examples: "add_quest_badge_tables", "add_user_profile_fields"

cat prisma/migrations/YYYYMMDD_*/migration.sql  # Review SQL
npx prisma generate
npm run build
```

**Step 2: Commit**
```bash
git add backend/prisma/migrations/ backend/prisma/schema.prisma
git commit -m "feat: Add migration for [description]"
git push origin development
```

**Step 3: Staging** (auto-applied during deployment)
```bash
# Verify after deployment
curl https://dev-api.unitedwerise.org/health  # Should show database:connected
```

**Step 4: Production** (manual)
```bash
# CRITICAL: Backup first
az postgres flexible-server backup create \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db \
  --backup-name "pre-migration-$(date +%Y%m%d-%H%M%S)"

# Merge to main first
git checkout main && git merge development && git push origin main

# Apply migrations
cd backend
DATABASE_URL="<production-url>" npx prisma migrate status
DATABASE_URL="<production-url>" npx prisma migrate deploy
DATABASE_URL="<production-url>" npx prisma migrate status  # Verify "up to date"

curl https://api.unitedwerise.org/health  # Verify database:connected
```

### Troubleshooting

**"Migration already applied" but tables don't exist:**
```bash
DATABASE_URL="<db-url>" npx prisma migrate resolve --applied <migration-name>
```

**"Column/Table already exists":**
```bash
DATABASE_URL="<db-url>" npx prisma migrate resolve --applied <migration-name>
# Or edit migration.sql to use CREATE TABLE IF NOT EXISTS
```

**Schemas differ between environments:**
```bash
cd backend
npx prisma migrate dev --name "sync_schemas"  # Review SQL carefully
DATABASE_URL="<production-url>" npx prisma migrate deploy  # Only after testing on staging
```

### Emergency Rollback

```bash
# Mark migration as rolled back
DATABASE_URL="<db-url>" npx prisma migrate resolve --rolled-back <migration-name>

# Or restore from backup
az postgres flexible-server restore \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db-restored \
  --source-server unitedwerise-db \
  --restore-time "YYYY-MM-DDTHH:MM:00Z"
```

### When `db push` IS Acceptable

**ONLY for:**
- Rapid prototyping in local development (throwaway work)
- Experimenting with schema designs before committing
- Personal test databases that won't be deployed

**Never:**
- Commit schema.prisma changes without a migration
- Use on staging or production databases
- Share schema changes made via db push with team

</details>

<details>
<summary><b>Deployment failure diagnosis</b></summary>

**Symptoms:** Deployment stuck, deployed code doesn't match local, health endpoint shows old SHA, changes not visible.

**Execute steps in order - each verifies one pipeline component:**

### Step 1: Verify commits pushed
```bash
git status  # Should be clean
git log origin/<current-branch>..HEAD  # Should be empty
```

### Step 2: Verify GitHub Actions
```bash
gh run list --branch <current-branch> --limit 5
# Look for: completed/in_progress/queued/failed, time >10 min = stuck

# If stuck/failed:
gh run view <run-id>
# Fix: Re-run from UI, fix error and push, or wait if queued >5 min
```

### Step 3: Verify frontend deployment
```bash
curl -I https://dev.unitedwerise.org/  # Check Date header
curl -I https://dev.unitedwerise.org/index.html  # Check Last-Modified header
# Fix: Wait 2-3 min for CDN, hard refresh browser (Ctrl+Shift+R)
```

### Step 4: Verify backend Docker build
```bash
az acr task list-runs --registry uwracr2425 --output table
# Look for: Status "Succeeded", recent StartTime, Duration ~2-3 min

# If failed:
az acr task logs --registry uwracr2425 --run-id <run-id>
# Common: TypeScript error, npm install failure, Dockerfile syntax error

# If queued >5 min:
az acr task cancel-run --registry uwracr2425 --run-id <run-id>
# Then rebuild
```

### Step 5: Verify Container App deployment
```bash
az containerapp revision list \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --output table
# Look for: Only ONE Active=True, TrafficWeight=100 for active revision

# If traffic split (multiple active):
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-mode Single
```

### Step 6: Verify container running new image
```bash
az containerapp show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --query "properties.template.containers[0].image" -o tsv
# Should match DIGEST from Step 4

# If wrong image:
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "force-$(date +%H%M%S)"
```

### Step 7: Verify deployed SHA matches local
```bash
DEPLOYED_SHA=$(curl -s "https://dev-api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
LOCAL_SHA=$(git rev-parse --short HEAD)
echo "Local: $LOCAL_SHA | Deployed: $DEPLOYED_SHA"  # Must match

# If mismatch:
GIT_SHA=$(git rev-parse --short HEAD)
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --set-env-vars RELEASE_SHA=$GIT_SHA
```

### Step 8: Verify container restarted
```bash
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime
# Should be <300 seconds

# If >300 seconds:
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-suffix "restart-$(date +%H%M%S)"
```

### Nuclear Option (if all steps fail)
```bash
# Rebuild and redeploy from scratch
GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-nuclear-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"

az acr build --registry uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#<branch>:backend

sleep 180
DIGEST=$(az acr repository show --name uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --query "digest" -o tsv)

az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "nuclear-$GIT_SHA-$(date +%H%M%S)" \
  --revision-mode Single \
  --set-env-vars \
    NODE_ENV=staging \
    STAGING_ENVIRONMENT=true \
    RELEASE_SHA=$GIT_SHA \
    RELEASE_DIGEST=$DIGEST \
    DEPLOYMENT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

sleep 30
curl -s "https://dev-api.unitedwerise.org/health"
```

</details>

<details>
<summary><b>Admin subdomain routing troubleshooting</b></summary>

**Symptoms:** Admin subdomain shows main site, redirect not working, session isolation broken, "wrong content" displayed.

**Background:** Admin subdomains (admin.unitedwerise.org, dev-admin.unitedwerise.org) use client-side redirect to achieve session isolation. Azure Static Web Apps serves identical content for all custom domains, so JavaScript handles routing.

**Execute steps in order - each verifies one component:**

### Step 1: Verify DNS configuration
```bash
# Check CNAME records point to Azure Static Web Apps
nslookup admin.unitedwerise.org
nslookup dev-admin.unitedwerise.org

# Expected output should show CNAME pointing to:
# - admin.unitedwerise.org → *.azurestaticapps.net
# - dev-admin.unitedwerise.org → *.azurestaticapps.net

# If DNS not propagated (shows old IP or no record):
# Wait 5-15 minutes for DNS propagation, then retry
```

### Step 2: Verify redirect script exists and loads
```bash
# Check redirect script is deployed
curl -s https://admin.unitedwerise.org/src/utils/admin-redirect.js | head -5
curl -s https://dev-admin.unitedwerise.org/src/utils/admin-redirect.js | head -5

# Expected: JavaScript module with "admin-redirect" comment
# If 404 or empty: Deployment issue - check GitHub Actions
```

### Step 3: Verify redirect script execution order
```bash
# Check index.html loads redirect script FIRST
curl -s https://admin.unitedwerise.org/ | grep -A2 "admin-redirect.js"

# Expected output:
# <script type="module" src="src/utils/admin-redirect.js"></script>
# (should appear BEFORE main.js)

# If not present or wrong order:
# Edit frontend/index.html lines 196-198
# Redeploy frontend
```

### Step 4: Verify hostname detection in browser
```bash
# Open browser console on admin.unitedwerise.org or dev-admin.unitedwerise.org
# Run: window.location.hostname

# Expected:
# - admin.unitedwerise.org → "admin.unitedwerise.org"
# - dev-admin.unitedwerise.org → "dev-admin.unitedwerise.org"

# If shows www.unitedwerise.org or dev.unitedwerise.org:
# DNS issue - check Step 1
```

### Step 5: Check browser console for redirect logs
```bash
# Open browser console on admin subdomain
# Look for: "[Admin Redirect] Redirecting to admin dashboard: /admin-dashboard.html"

# If log missing:
# 1. Redirect script not executing → Check Step 2 and Step 3
# 2. isRootPath() check failing → Check current pathname
# 3. isOnAdminDashboard() returned true → Already redirected

# If redirect log shows error:
# Check console for "[Admin Redirect] Redirect failed:" message
# Debug error in browser DevTools
```

### Step 6: Verify redirect performance
```bash
# Open browser console on admin subdomain
# Look for execution time warning

# Expected: <10ms execution time
# If >[10ms warning appears]:
# Performance issue - check for slow DNS, network, or script conflicts
```

### Step 7: Check reverse redirect prevention
```bash
# Visit www.unitedwerise.org/admin-dashboard.html or dev.unitedwerise.org/admin-dashboard.html
# Should redirect to admin.unitedwerise.org or dev-admin.unitedwerise.org

# Check browser console for:
# "[Admin Dashboard] Redirecting to admin subdomain: https://admin.unitedwerise.org/admin-dashboard.html"

# If no redirect occurs:
# Check admin-dashboard.html lines 10-40 for reverse redirect script
```

### Step 8: Verify session isolation
```bash
# Test cookie isolation:
# 1. Login on www.unitedwerise.org
# 2. Open admin.unitedwerise.org in NEW TAB (same browser)
# 3. Check if logged out (should be - different origin)

# Test localStorage isolation:
# 1. Set: localStorage.setItem('test', 'main') on www.unitedwerise.org
# 2. Check: localStorage.getItem('test') on admin.unitedwerise.org
# 3. Expected: null (separate storage)

# If session NOT isolated:
# 1. Browser using same origin → DNS issue (check Step 1)
# 2. Cookies set to domain=.unitedwerise.org → Backend cookie issue
```

### Common Issues and Fixes

**Issue: "Redirect loop detected"**
```bash
# Symptom: Page keeps redirecting endlessly
# Cause: Both redirect scripts fighting each other

# Fix: Check browser console for loop detection
# admin-redirect.js has safety check at line 78-81
# If loop occurs, isOnAdminDashboard() may be broken

# Debug:
# console.log(window.location.pathname.includes('admin-dashboard.html'))
# Should return true when on admin-dashboard.html
```

**Issue: "Flash of wrong content before redirect"**
```bash
# Symptom: Briefly see main site before admin dashboard
# Cause: Redirect script loading too late

# Fix: Ensure admin-redirect.js loaded BEFORE main.js
# Check index.html line 198 - admin-redirect.js must be first module
# Execution is synchronous and immediate (IIFE)
```

**Issue: "Bookmark to admin.unitedwerise.org/profile doesn't work"**
```bash
# Symptom: Bookmarked pages show 404 or redirect to dashboard
# Cause: By design - only root path (/) redirects

# Check console for warning:
# "[Admin Redirect] Non-root path on admin subdomain: /profile"

# This is intentional behavior to avoid breaking deep links
# Admin dashboard is single-page app - all routes handled by /admin-dashboard.html
```

**Issue: "Environment detection wrong on admin subdomain"**
```bash
# Symptom: dev-admin.unitedwerise.org detected as production

# Fix: Update frontend/src/utils/environment.js
# Ensure admin subdomains included in environment detection:
# hostname === 'dev-admin.unitedwerise.org' → development
# hostname === 'admin.unitedwerise.org' → production (default)

# Verify:
# import { getEnvironment } from './src/utils/environment.js';
# console.log(getEnvironment()); // Should show 'development' or 'production'
```

### Emergency Rollback

```bash
# If admin subdomain routing completely broken:

# Step 1: Remove redirect scripts temporarily
git revert <commit-hash>  # Revert admin subdomain changes
git push origin <current-branch>

# Step 2: Wait for deployment (2-3 minutes)

# Step 3: Verify fallback works
curl -I https://admin.unitedwerise.org/admin-dashboard.html
# Admin dashboard still accessible via path

# Step 4: Debug and reapply fix
# Fix issue locally, test thoroughly, then redeploy
```

### Testing Checklist

Before marking as fixed, verify ALL of these:
- [ ] admin.unitedwerise.org redirects to /admin-dashboard.html
- [ ] dev-admin.unitedwerise.org redirects to /admin-dashboard.html
- [ ] www.unitedwerise.org/admin-dashboard.html redirects to admin.unitedwerise.org
- [ ] dev.unitedwerise.org/admin-dashboard.html redirects to dev-admin.unitedwerise.org
- [ ] No redirect loop occurs
- [ ] Redirect execution time <10ms
- [ ] Session isolation works (separate cookies/localStorage)
- [ ] Environment detection correct on admin subdomains
- [ ] No flash of wrong content before redirect
- [ ] Browser console shows no errors

</details>

---

## AI Documentation Reference Protocol

**CRITICAL FOR CLAUDE CODE:** Before implementing features, Claude MUST read relevant documentation files. This section defines when to automatically reference which documentation.

### Feature Implementation Triggers

When user mentions these keywords, Claude must read the specified documentation BEFORE implementing:

**Quest, Badge, Streak, Gamification, Civic Engagement:**
→ REQUIRED READING:
1. `docs/CIVIC_ENGAGEMENT.md` (sections 1-3: philosophy & design rationale)
2. `docs/API_QUESTS_BADGES.md` (complete API endpoint documentation)
3. `backend/src/routes/quests.ts` (current quest implementation)
4. `backend/src/routes/badges.ts` (current badge implementation)
5. `backend/prisma/schema.prisma` (lines 2504-2598: Quest/Badge models)

**Photo, Gallery, Image Upload, Content Moderation:**
→ REQUIRED READING:
1. `docs/API_SAVED_POSTS_GALLERY.md` (sections 2-3: photo system)
2. `backend/src/routes/galleries.ts` (gallery endpoints)
3. `backend/src/routes/photos.ts` (photo upload & moderation)
4. `backend/prisma/schema.prisma` (Photo, PhotoGallery models)

**Saved Posts, Bookmarks, Save for Later:**
→ REQUIRED READING:
1. `docs/API_SAVED_POSTS_GALLERY.md` (section 1: saved posts)
2. `backend/src/routes/posts.ts` (lines 1958-2164: saved post endpoints)
3. `backend/prisma/schema.prisma` (SavedPost model)

**Database Schema, Models, Relations, Migration:**
→ REQUIRED READING:
1. `docs/DATABASE_SCHEMA.md` (find relevant model group)
2. `backend/prisma/schema.prisma` (actual schema definition)
3. Database migration safety protocol (this file, collapsible section above)

**Feed, Posts, Comments, Reactions:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (sections 11-13: Feed System)
2. `backend/src/routes/posts.ts` (post endpoints)
3. `backend/src/routes/comments.ts` (comment endpoints)
4. `backend/prisma/schema.prisma` (Post, Comment, Reaction models)

**API Endpoints, REST API, Backend Routes:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (section 4: API Reference)
2. Relevant route file in `backend/src/routes/`
3. `backend/src/middleware/` (authentication, validation)

**Authentication, Login, JWT, OAuth, Google Sign-In:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (section 7: Authentication)
2. `backend/src/routes/auth.ts` (auth endpoints)
3. `backend/src/middleware/authMiddleware.ts` (auth logic)
4. `frontend/src/js/auth.js` (frontend auth)

**Frontend Components, UI, JavaScript Modules:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (section 8: Frontend Architecture)
2. `frontend/src/js/main.js` (module load order)
3. Relevant component file in `frontend/src/js/components/`

### Implementation Workflow

1. **User mentions feature** → Identify trigger keywords above
2. **Read documentation** → Follow REQUIRED READING list for that feature
3. **Find existing patterns** → Search codebase for similar implementations
4. **Implement feature** → Follow established patterns and architecture
5. **Update documentation** → If adding new endpoints or changing behavior

### Why This Matters

Without this protocol, Claude tends to:
- Grep codebase for patterns (misses design rationale)
- Implement based on code inference (misses system philosophy)
- Create inconsistent solutions (doesn't follow established patterns)

With this protocol, Claude will:
- Understand WHY systems work the way they do
- Follow established architectural patterns
- Create consistent, maintainable implementations
- Reduce technical debt and rework

---

## Tier 3: Reference Material

### Project Architecture

**Frontend:**
- Entry point: `frontend/src/js/main.js`
- ES6 modules with import/export
- Environment detection: `frontend/src/utils/environment.js`
- API config: `frontend/src/config/api.js`
- Load order: Core → Config → Integration → Components → App

**Backend:**
- TypeScript with Prisma ORM
- Express API server
- JWT + OAuth (Google) authentication
- Azure Blob Storage for files
- Azure OpenAI for AI features

**Environment detection:**
- Frontend: Based on `window.location.hostname`
  - `dev.unitedwerise.org` → development
  - `www.unitedwerise.org` → production
- Backend: Based on `NODE_ENV`
  - `NODE_ENV=staging` → staging behavior
  - `NODE_ENV=production` → production behavior

### Multi-Agent Coordination

See `.claude/guides/multi-agent-patterns.md` for detailed workflows.

**Coordination files:**
```
.claude/scratchpads/DEVELOPMENT-LOG.md
.claude/scratchpads/API-CHANGES.md
.claude/scratchpads/FRONTEND-PROGRESS.md
.claude/scratchpads/TESTING-STATUS.md
.claude/scratchpads/REVIEW-LOG.md
```

**Use multi-agent for:**
- Features spanning frontend + backend + database
- Emergency response with parallel debugging
- Performance optimization with benchmarking
- Security-sensitive authentication changes

### Protected Documentation

Never archive or mark obsolete:
- MASTER_DOCUMENTATION.md
- CHANGELOG.md
- README.md
- SYSTEM-ARCHITECTURE-DESIGN.md
- INCIDENT_RESPONSE.md
- PERFORMANCE_BASELINE.md
- PRODUCTION-ENV-TEMPLATE.md

### Common Commands

**Daily workflow:**
```bash
git pull origin <current-branch>
git add . && git commit -m "feat: changes"
git push origin development
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime
cd backend && npm run build
bash scripts/check-database-safety.sh
```

**Emergency procedures:**
```bash
# Backend restart
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-suffix emergency-$(date +%m%d-%H%M)

# Rollback
git revert HEAD && git push origin <current-branch>

# Database restore
az postgres flexible-server restore \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db-restored \
  --source-server unitedwerise-db \
  --restore-time "2025-MM-DDTHH:MM:00Z"
```

---

## Tier 4: Architecture Context

See `.claude/guides/architecture-notes.md` for:
- Inline code elimination history (September 2025)
- Staging architecture rationale
- API response structure quirks
- Branch control rationale
- JWT authentication architecture
- Admin debug logging system
- Database isolation strategy
- Frontend build process

---

## External Guides

- **Common Code Patterns**: `.claude/guides/common-patterns.md`
- **Multi-Agent Workflows**: `.claude/guides/multi-agent-patterns.md`
- **Architecture Notes**: `.claude/guides/architecture-notes.md`

# UnitedWeRise Development Reference
**Version 2.0 - Audited & Consolidated**

> **Protection System**: Sections marked with 🔒 are PROTECTED and must not be modified without explicit user approval. See Global CLAUDE.md for priority hierarchy.

---

## Terminology

**Main** = main branch = production = www site/server
**Dev** = development branch = staging = dev site/server

---

## 🔒 Environment-Branch Mapping (NEVER VIOLATE)

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

## Project-Specific Core Rules

### Admin Debugging
Use admin debug functions only: `adminDebugLog()`, `adminDebugError()`, `adminDebugWarn()`, `adminDebugTable()`, `adminDebugSensitive()`

### 🔒 Database Migration Safety (ZERO TOLERANCE)

**CRITICAL:** See `docs/DEPLOYMENT-MIGRATION-POLICY.md` for complete policy.

**Core Rule:** Database migrations MUST be applied BEFORE code deployment. No exceptions.

**Why This Matters:**
- Oct 22, 2025: Visitor analytics broken (4 pending migrations)
- Oct 3, 2025: Quest/badge system broken (missing tables)
- Multiple other production incidents

**Automated in GitHub Actions:**
- Staging workflow: Runs `prisma migrate deploy` before deploying container
- Production workflow: Runs `prisma migrate deploy` before deploying container
- Deployment ABORTS if migrations fail

**Manual Deployments (Emergency Only):**
```bash
# ALWAYS run migrations FIRST
cd backend
DATABASE_URL="<db-url>" npx prisma migrate deploy
DATABASE_URL="<db-url>" npx prisma migrate status  # Verify

# THEN deploy code
```

**NEVER:**
- Use `prisma db push` for production or permanent changes
- Skip migrations "because it's just a frontend change"
- Deploy code before running migrations
- Assume "no schema changes" without verifying

**Database URLs:**
- Production: unitedwerise-db.postgres.database.azure.com
- Development/Staging: unitedwerise-db-dev.postgres.database.azure.com

### Inline Documentation Requirements

**PROJECT POLICY**: ALL code requires inline documentation. Code without docs is INCOMPLETE.

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

---

## Environment Configuration

### Production
- Backend: https://api.unitedwerise.org
- Frontend: https://www.unitedwerise.org
- Admin: https://admin.unitedwerise.org

### Staging (Admin-Only)
- Backend: https://dev-api.unitedwerise.org
- Frontend: https://dev.unitedwerise.org
- Admin: https://dev-admin.unitedwerise.org

### Azure Resources
- Registry: uwracr2425
- Resource Group: unitedwerise-rg
- Production Backend: unitedwerise-backend
- Staging Backend: unitedwerise-backend-staging

### Key Variables
```
AZURE_OPENAI_ENDPOINT=https://unitedwerise-openai.openai.azure.com/
AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425
GOOGLE_CLIENT_ID=496604941751-663p6eiqo34iumaet9tme4g19msa1bf0.apps.googleusercontent.com
```

---

## 🔒 Deployment Procedures

<details>
<summary><b>Documentation Templates</b></summary>

### Swagger (Backend Routes)
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

### JSDoc (Services/Functions)
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

### Prisma Schema
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

### Frontend JSDoc
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
<summary><b>Pre-Deployment Validation</b></summary>

```bash
git status  # Must be clean
cd backend && npm run build  # Must compile
cd backend && npx prisma validate && npx prisma generate
git log origin/<current-branch>..HEAD  # Should be empty
```

</details>

<details>
<summary><b>Deploy to Staging</b></summary>

```bash
git pull origin <current-branch>
git add . && git commit -m "feat: description"
git push origin <current-branch>

# If on development branch, auto-deploys to staging
# Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
```

</details>

<details>
<summary><b>Backend Docker Deployment to Staging</b></summary>

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
<summary>🔒 <b>Production Deployment Procedure</b></summary>

**When user says "deploy/merge/push to production": Use PRIMARY METHOD (automated).**

**PRIMARY METHOD: Automated Deployment (Default)**

Use for ALL normal deployments. GitHub Actions handles everything automatically.

---

### Pre-Deployment Validation

```bash
git status  # Must be clean
cd backend && npm run build  # Must compile
git log origin/development..HEAD  # Should be empty
curl -s "https://dev-api.unitedwerise.org/health"  # Verify staging works
```

### Step 1: Merge to Main and Push

```bash
git checkout main && git pull origin main
git merge development && git push origin main
```

**GitHub Actions will automatically execute:**
- Build Docker image in Azure Container Registry
- Run database migrations (`prisma migrate deploy`)
- Deploy container to production
- Verify deployment health

See: `docs/DEPLOYMENT-MIGRATION-POLICY.md` for full workflow details.

### Step 2: Monitor GitHub Actions Workflow

```bash
# Watch workflow at: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
# Workflow: "Backend Auto-Deploy to Production"
# Should complete in ~5 minutes
```

### Step 3: Verify Production Deployment

```bash
sleep 300  # Wait for workflow to complete

GIT_SHA=$(git rev-parse --short HEAD)
curl -s "https://api.unitedwerise.org/health"  # Check status, database, releaseSha

DEPLOYED_SHA=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
echo "Local: $GIT_SHA | Deployed: $DEPLOYED_SHA"  # Must match
```

**Deployment complete when:**
- Workflow shows green checkmark
- Health endpoint returns correct releaseSha
- Uptime < 5 minutes (fresh restart)

---

## FALLBACK METHOD: Manual Deployment

**Use ONLY when:**
- GitHub Actions workflow unavailable or failing
- Emergency requiring immediate deployment bypass
- Testing deployment pipeline changes

### Manual Step 1: Merge to Main (if not already done)

```bash
git checkout main && git pull origin main
git merge development && git push origin main
```

### Manual Step 2: Build Docker Image

```bash
GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-prod-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"

az acr build --registry uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --no-wait \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend

sleep 180
az acr task list-runs --registry uwracr2425 --output table | head -3
```

### Manual Step 3: Get Image Digest

```bash
DIGEST=$(az acr repository show --name uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --query "digest" -o tsv)
```

### Manual Step 4: Deploy to Production

```bash
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
```

### Manual Step 5: Verify Deployment

```bash
sleep 30
curl -s "https://api.unitedwerise.org/health"  # Check status, database, releaseSha, uptime

DEPLOYED_SHA=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
echo "Local: $GIT_SHA | Deployed: $DEPLOYED_SHA"  # Must match

az containerapp logs show \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --tail 50
```

---

## Rollback and Emergency Procedures

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

# Or revert git commit and let automated workflow redeploy
git checkout main && git revert HEAD && git push origin main
# Monitor GitHub Actions workflow OR use manual deployment if urgent
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
# Automated workflow will deploy automatically (PRIMARY METHOD)
# OR use Manual Steps 2-5 above if emergency requires immediate deployment
git checkout development && git merge hotfix/critical-issue && git push origin development
```

</details>

<details>
<summary>🔒 <b>Database Migration Safety Protocol</b></summary>

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
<summary><b>Deployment Failure Diagnosis</b></summary>

**Symptoms:** Deployment stuck, deployed code doesn't match local, health endpoint shows old SHA, changes not visible.

**Execute steps in order - each verifies one pipeline component:**

### Step 0: Check Backend Environment Validation
If backend fails to start or health endpoint unreachable, check startup logs for environment validation errors:

```bash
# Check container startup logs
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 50 | grep -E "CRITICAL|ERROR|Environment"
```

**Common validation errors:**
- `"CRITICAL: Production environment pointing to development database"` - NODE_ENV=production with unitedwerise-db-dev
- `"CRITICAL: Staging environment pointing to production database"` - NODE_ENV=staging with unitedwerise-db
- `"ERROR: Invalid DATABASE_URL format"` - Malformed connection string

**Fix environment mismatch:**
```bash
# For staging (must use dev database):
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --set-env-vars NODE_ENV=staging DATABASE_URL="<dev-database-url>"

# For production (must use production database):
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --set-env-vars NODE_ENV=production DATABASE_URL="<production-database-url>"
```

**Verify fix:**
```bash
curl -s "https://dev-api.unitedwerise.org/health" | jq '.databaseHost, .environment, .nodeEnv'
# Should show: unitedwerise-db-dev, development, staging
```

### Step 1: Verify Commits Pushed
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

### Step 3: Verify Frontend Deployment
```bash
curl -I https://dev.unitedwerise.org/  # Check Date header
curl -I https://dev.unitedwerise.org/index.html  # Check Last-Modified header
# Fix: Wait 2-3 min for CDN, hard refresh browser (Ctrl+Shift+R)
```

### Step 4: Verify Backend Docker Build
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

### Step 5: Verify Container App Deployment
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

### Step 6: Verify Container Running New Image
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

### Step 7: Verify Deployed SHA Matches Local
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

### Step 8: Verify Container Restarted
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

---

## AI Documentation Reference Protocol

**CRITICAL**: Before implementing features, Claude MUST read relevant documentation files.

### Feature Implementation Triggers

When user mentions these keywords, read specified documentation BEFORE implementing:

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
3. `backend/src/routes/photos/index.ts` (photo upload & moderation)
4. `backend/prisma/schema.prisma` (Photo model)

**Saved Posts, Bookmarks, Save for Later:**
→ REQUIRED READING:
1. `docs/API_SAVED_POSTS_GALLERY.md` (section 1: saved posts)
2. `backend/src/routes/posts.ts` (lines 1958-2164: saved post endpoints)
3. `backend/prisma/schema.prisma` (SavedPost model)

**Database Schema, Models, Relations, Migration:**
→ REQUIRED READING:
1. `docs/DATABASE_SCHEMA.md` (find relevant model group)
2. `backend/prisma/schema.prisma` (actual schema definition)
3. Database migration safety protocol (this file, above)

**Feed, Posts, Comments, Reactions:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (sections 11-13: Feed System)
2. `backend/src/routes/posts.ts` (post endpoints - includes comment endpoints)
3. `backend/prisma/schema.prisma` (Post, Comment, Reaction models)

**API Endpoints, REST API, Backend Routes:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (section 4: API Reference)
2. Relevant route file in `backend/src/routes/`
3. `backend/src/middleware/` (authentication, validation)

**Authentication, Login, JWT, OAuth, Google Sign-In:**
→ REQUIRED READING:
1. `docs/MASTER_DOCUMENTATION.md` (section 7: Authentication)
2. `backend/src/routes/auth.ts` (auth endpoints)
3. `backend/src/middleware/auth.ts` (auth logic)
4. `frontend/src/handlers/auth-handlers.js` (frontend auth)

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

---

## Project Architecture

### Frontend
- Entry point: `frontend/src/js/main.js`
- ES6 modules with import/export
- Environment detection: `frontend/src/utils/environment.js`
- API config: `frontend/src/config/api.js`
- Load order: Core → Config → Integration → Components → App

### Backend
- TypeScript with Prisma ORM
- Express API server
- JWT + OAuth (Google) authentication
- Azure Blob Storage for files
- Azure OpenAI for AI features

### Environment Detection
- Frontend: Based on `window.location.hostname`
  - `dev.unitedwerise.org` → development
  - `www.unitedwerise.org` → production
- Backend: Based on `NODE_ENV`
  - `NODE_ENV=staging` → staging behavior
  - `NODE_ENV=production` → production behavior

---

## Multi-Agent Coordination

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

---

## Protected Documentation

Never archive or mark obsolete:
- MASTER_DOCUMENTATION.md
- CHANGELOG.md
- README.md
- SYSTEM-ARCHITECTURE-DESIGN.md
- INCIDENT_RESPONSE.md
- PERFORMANCE_BASELINE.md
- PRODUCTION-ENV-TEMPLATE.md

---

## Common Commands

### Daily Workflow
```bash
git pull origin <current-branch>
git add . && git commit -m "feat: changes"
git push origin development
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime
cd backend && npm run build
bash scripts/check-database-safety.sh
```

### Emergency Procedures
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

## Architecture Context

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

# UnitedWeRise Development Reference

## Terminology

Main = main branch = production = www site/server

Dev = development branch = staging = dev site/server

## Project-Specific Rules

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

**CRITICAL: Database isolation**
Always verify which database before migrations:
```bash
echo $DATABASE_URL | grep -o '@[^.]*'
# Must show @unitedwerise-db-dev for safe development
```
- Production: unitedwerise-db.postgres.database.azure.com
- Development: unitedwerise-db-dev.postgres.database.azure.com

## Environment Configuration

**Production:**
- Backend: https://api.unitedwerise.org
- Frontend: https://www.unitedwerise.org
- Admin: https://www.unitedwerise.org/admin-dashboard.html

**Staging (admin-only):**
- Backend: https://dev-api.unitedwerise.org
- Frontend: https://dev.unitedwerise.org
- Admin: https://dev.unitedwerise.org/admin-dashboard.html

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

## Deployment Procedures

**Pre-deployment validation:**
```bash
git status
cd backend && npm run build
cd backend && npx prisma validate && npx prisma generate
git log origin/<current-branch>..HEAD
```

**Deploy to staging:**
```bash
# From whatever branch is currently active
git pull origin <current-branch>
git add . && git commit -m "feat: description"
git push origin <current-branch>

# If on development branch, changes auto-deploy to staging
# Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
```

**Backend Docker deployment to staging:**
```bash
# Requires being on development branch
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
  --set-env-vars \
    NODE_ENV=staging \
    STAGING_ENVIRONMENT=true \
    RELEASE_SHA=$GIT_SHA \
    RELEASE_DIGEST=$DIGEST

az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-mode Single

sleep 30
curl -s "https://dev-api.unitedwerise.org/health" | grep releaseSha
```

**Production deployment:**
Only execute when user explicitly approves production deployment.

```bash
# User must explicitly direct branch change to main
git checkout main
git pull origin main
git merge development
git push origin main

GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-prod-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"

az acr build --registry uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --no-wait \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend

sleep 180

az acr task list-runs --registry uwracr2425 --output table | head -3

DIGEST=$(az acr repository show --name uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --query "digest" -o tsv)

az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "prod-$GIT_SHA-$(date +%H%M%S)" \
  --set-env-vars \
    NODE_ENV=production \
    RELEASE_SHA=$GIT_SHA \
    RELEASE_DIGEST=$DIGEST

az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-mode Single

sleep 30
curl -s "https://api.unitedwerise.org/health" | grep releaseSha
```

**Database schema changes:**
```bash
cd backend

# CRITICAL: Verify development database
echo $DATABASE_URL | grep -o '@[^.]*'

npx prisma migrate dev --name "description"
npx prisma generate
npm run build

git add . && git commit -m "schema: description"
git push origin <current-branch>
```

## Deployment Failure Diagnosis

**When deployments get stuck or deployed code doesn't match local code:**

Execute this workflow in order. Each step verifies one part of the pipeline.

### Step 1: Verify Local Changes Committed and Pushed
```bash
# Check for uncommitted changes
git status
# Should show: "nothing to commit, working tree clean"

# Check if all commits are pushed
git log origin/<current-branch>..HEAD
# Should show: no output (no unpushed commits)

# If commits not pushed:
git push origin <current-branch>
```

### Step 2: Verify GitHub Actions Deployment Status
```bash
# Check GitHub Actions workflow status
# Visit: https://github.com/UnitedWeRise-org/UnitedWeRise/actions

# Or via CLI:
gh run list --branch <current-branch> --limit 5

# Look for:
# - Workflow status (completed/in_progress/queued/failed)
# - Time since started (if >10 minutes, may be stuck)
# - Specific job that failed
```

**If GitHub Actions stuck/failed:**
```bash
# Check specific workflow run
gh run view <run-id>

# Common fixes:
# - Cancelled workflow: Re-run from GitHub Actions UI
# - Failed build: Check logs for error, fix locally, push again
# - Queued >5 minutes: GitHub may have queue issues, wait or cancel and retry
```

### Step 3: Verify Frontend Deployment (Static Web Apps)
```bash
# Check if frontend deployed
curl -I https://dev.unitedwerise.org/
# Look for: Date header (should be recent)

# Check specific file modified recently
curl -I https://dev.unitedwerise.org/index.html
# Look for: Last-Modified header

# Force browser cache clear and reload
# Ctrl+Shift+R (Chrome/Firefox) or Cmd+Shift+R (Mac)
```

**If frontend deployment stuck:**
- GitHub Actions shows success but site not updated: Azure Static Web Apps cache issue
- Wait 2-3 minutes for CDN propagation
- Hard refresh browser (Ctrl+Shift+R)
- Check Azure portal for Static Web Apps deployment status

### Step 4: Verify Backend Docker Build Status
```bash
# Check ACR build queue and recent runs
az acr task list-runs --registry uwracr2425 --output table

# Look for:
# - Status: "Succeeded" (not "Running", "Queued", "Failed")
# - StartTime: Should be recent (within last 5 minutes)
# - Duration: Typically 2-3 minutes

# If status is "Queued" for >5 minutes:
az acr task list-runs --registry uwracr2425 --run-id <run-id> --output json
# Check for: queuedTime and startTime difference

# If status is "Failed":
az acr task logs --registry uwracr2425 --run-id <run-id>
# Read error message, typically:
# - TypeScript compilation error
# - npm install failure
# - Dockerfile syntax error
```

**If Docker build stuck in queue:**
```bash
# Cancel stuck build
az acr task cancel-run --registry uwracr2425 --run-id <run-id>

# Retry build
az acr build --registry uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#<branch>:backend
```

### Step 5: Verify Container App Deployment Status
```bash
# Check active revisions
az containerapp revision list \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --output table

# Look for:
# - Active column: Should show "True" for only ONE revision
# - TrafficWeight: Should be 100 for active revision, 0 for others
# - CreatedTime: Should be recent

# If multiple revisions active (traffic split):
# This causes old code to still serve requests
```

**If traffic split to old revision:**
```bash
# Force single revision mode (critical fix)
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-mode Single

# This automatically deactivates old revisions
```

### Step 6: Verify Container is Running New Image
```bash
# Check current image digest
az containerapp show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --query "properties.template.containers[0].image" \
  --output tsv

# Compare to expected digest from Step 4
# Should match the DIGEST from latest successful ACR build

# Check container logs for startup
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 50

# Look for: Recent startup logs, no error loops
```

**If container not pulling new image:**
```bash
# Force new revision with explicit image
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "force-$(date +%H%M%S)"
```

### Step 7: Verify Deployed Code Matches Local Code
```bash
# Get deployed Git SHA
DEPLOYED_SHA=$(curl -s "https://dev-api.unitedwerise.org/health" | \
  grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)

# Get local Git SHA
LOCAL_SHA=$(git rev-parse --short HEAD)

# Compare
echo "Local: $LOCAL_SHA"
echo "Deployed: $DEPLOYED_SHA"

# They should match exactly
```

**If SHAs don't match:**
```bash
# Check if releaseSha env var was set during deployment
az containerapp show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --query "properties.template.containers[0].env" \
  --output json | grep RELEASE_SHA

# If missing, redeploy with explicit SHA:
GIT_SHA=$(git rev-parse --short HEAD)
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --set-env-vars RELEASE_SHA=$GIT_SHA
```

### Step 8: Verify Container Has Restarted Recently
```bash
# Check uptime (should be < 300 seconds for recent deployment)
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime

# If uptime > 300 seconds, container hasn't restarted
# Indicates deployment didn't trigger container restart
```

**If container hasn't restarted:**
```bash
# Force container restart by creating new revision
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-suffix "restart-$(date +%H%M%S)"

# Verify restart
sleep 30
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime
# Should now show < 60 seconds
```

### Nuclear Option: Complete Deployment Reset
```bash
# Use when all else fails - forces complete redeployment

# 1. Get latest commit
GIT_SHA=$(git rev-parse --short HEAD)

# 2. Build fresh image with unique tag
DOCKER_TAG="backend-nuclear-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"
az acr build --registry uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#<branch>:backend

# 3. Wait for build
sleep 180

# 4. Verify build succeeded
az acr task list-runs --registry uwracr2425 --output table | head -3

# 5. Get digest
DIGEST=$(az acr repository show --name uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --query "digest" -o tsv)

# 6. Force complete redeployment
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

# 7. Verify deployment
sleep 30
curl -s "https://dev-api.unitedwerise.org/health"
```

### Common Failure Patterns and Solutions

**Pattern 1: "GitHub Actions succeeded but nothing changed"**
- Cause: Frontend deployed but browser cached old version
- Solution: Hard refresh (Ctrl+Shift+R), check Last-Modified header

**Pattern 2: "Docker build succeeded but old code still running"**
- Cause: Container App didn't pull new image or traffic split
- Solution: Check Step 5 and Step 6, force single revision mode

**Pattern 3: "Everything looks successful but /health shows old SHA"**
- Cause: RELEASE_SHA env var not set or wrong revision active
- Solution: Check Step 7, redeploy with explicit SHA

**Pattern 4: "Deployment seems stuck, nothing progressing"**
- Cause: ACR build queued, GitHub Actions queued, or Azure service issue
- Solution: Wait 5 minutes, check Step 2 and Step 4, cancel and retry if needed

**Pattern 5: "Uptime shows days/hours but we just deployed"**
- Cause: Deployment updated env vars but didn't restart container
- Solution: Check Step 8, force new revision to trigger restart

---

## 🗄️ DATABASE MIGRATION SAFETY PROTOCOL

### ⚠️ CRITICAL RULE: NEVER USE `prisma db push` FOR PRODUCTION OR PERMANENT CHANGES

**INCIDENT BACKGROUND (October 3, 2025):**
Quest and Badge tables were created in development using `npx prisma db push`, which bypassed the migration system. When code was deployed to production, the backend expected tables that didn't exist, causing 500 errors across all quest/badge endpoints. The migration tracking table (`_prisma_migrations`) was out of sync with the actual database schema.

**ROOT CAUSE:**
Using `db push` creates tables without generating migration files. Production database had no way to know these tables should exist.

**RESOLUTION:**
Tables already existed in production (from manual creation), but migration tracking didn't know about them. Fixed by marking migrations as "applied" in the tracking table.

### FORBIDDEN COMMANDS

❌ **NEVER** use these in production or for permanent schema changes:
```bash
npx prisma db push           # Bypasses migration system, breaks tracking
npx prisma db push --force   # Even worse - accepts data loss
```

❌ **NEVER** run manual SQL directly in production (unless emergency):
```sql
CREATE TABLE ...  -- Creates untracked schema changes
ALTER TABLE ...   -- Modifies schema without migration record
```

❌ **NEVER** edit schema.prisma without creating a migration:
```prisma
model NewTable { ... }  // Must run `prisma migrate dev` after this
```

### REQUIRED WORKFLOW

#### 1️⃣ Development: Create Schema Changes

```bash
# Step 1: Edit backend/prisma/schema.prisma
# Add/modify models as needed

# Step 2: Create migration (REQUIRED)
cd backend
npx prisma migrate dev --name "descriptive_name"

# Example migration names:
# - "add_quest_badge_tables"
# - "add_user_profile_fields"
# - "fix_post_photo_relation"

# Step 3: Review generated SQL
ls -la prisma/migrations/
cat prisma/migrations/YYYYMMDD_descriptive_name/migration.sql

# Step 4: Test migration on development database
# Migration was auto-applied by migrate dev
# Verify tables created correctly

# Step 5: Generate Prisma Client with new types
npx prisma generate

# Step 6: Verify TypeScript compiles with new schema
npm run build
```

#### 2️⃣ Commit: Save Migration to Git

```bash
# Migration files MUST be committed
git add backend/prisma/migrations/
git add backend/prisma/schema.prisma
git commit -m "feat: Add migration for quest and badge tables"
git push origin development
```

#### 3️⃣ Staging: Auto-Apply via Deployment

```bash
# Staging deployment auto-applies pending migrations
# Monitor deployment: https://github.com/UnitedWeRise-org/UnitedWeRise/actions

# Verify migration applied
curl https://dev-api.unitedwerise.org/health
# Should show database:connected

# Test new endpoints
curl https://dev-api.unitedwerise.org/api/quests/daily
# Should return data or auth error (not 500)
```

#### 4️⃣ Production: Manual Migration Application

```bash
# IMPORTANT: Merge to main FIRST
git checkout main
git merge development
git push origin main

# THEN apply migrations to production database
cd backend

# Safety check: Verify current state
DATABASE_URL="<production-url>" npx prisma migrate status

# Apply pending migrations
DATABASE_URL="<production-url>" npx prisma migrate deploy

# Verify application succeeded
DATABASE_URL="<production-url>" npx prisma migrate status
# Should show: "Database schema is up to date!"

# Verify production backend
curl https://api.unitedwerise.org/health
# Should show: database:connected
```

### SAFETY CHECKS (Run Before Migrating Production)

```bash
# 1. Backup production database FIRST
az postgres flexible-server backup create \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db \
  --backup-name "pre-migration-$(date +%Y%m%d-%H%M%S)"

# 2. Check migration status
DATABASE_URL="<production-url>" npx prisma migrate status

# 3. Validate schema syntax
cd backend && npx prisma validate

# 4. Verify Prisma Client generated
npx prisma generate

# 5. Test migrations on development database first
# (should already be done via migrate dev)
```

### TROUBLESHOOTING MIGRATION ISSUES

#### Issue: "Migration already applied" error
**Symptom**: Prisma says migration was applied but tables don't exist
**Cause**: Migration tracking out of sync with actual database
**Solution**:
```bash
# Check what tables actually exist
DATABASE_URL="<db-url>" node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT tablename FROM pg_tables WHERE schemaname = 'public'\`
  .then(tables => console.log(tables.map(t => t.tablename)))
  .finally(() => prisma.\$disconnect());
"

# If tables exist: Mark migration as applied
DATABASE_URL="<db-url>" npx prisma migrate resolve --applied <migration-name>

# If tables missing: Run migration manually
DATABASE_URL="<db-url>" npx prisma migrate deploy
```

#### Issue: "Column/Table already exists" error
**Symptom**: Migration fails because schema change already exists
**Cause**: Schema change made outside migration system (db push or manual SQL)
**Solution**:
```bash
# Option A: Mark migration as applied (if change is correct)
DATABASE_URL="<db-url>" npx prisma migrate resolve --applied <migration-name>

# Option B: Fix migration SQL (if change is incomplete)
# Edit migration.sql to use CREATE TABLE IF NOT EXISTS
# Then deploy again
```

#### Issue: Development and production schemas differ
**Symptom**: Production has tables that dev doesn't (or vice versa)
**Cause**: Someone used db push on one environment
**Solution**:
```bash
# Generate migration from current schema
cd backend
npx prisma migrate dev --name "sync_schemas"

# This creates migration with differences
# Review SQL carefully before applying to production

# Apply to production ONLY after testing on staging
DATABASE_URL="<production-url>" npx prisma migrate deploy
```

### EMERGENCY ROLLBACK PROCEDURES

#### Rollback Last Migration
```bash
# Mark migration as rolled back (doesn't undo SQL)
DATABASE_URL="<db-url>" npx prisma migrate resolve --rolled-back <migration-name>

# Manually undo changes if needed
# Write reverse SQL and apply carefully
```

#### Restore from Backup
```bash
# List available backups
az postgres flexible-server backup list \
  --resource-group unitedwerise-rg \
  --server-name unitedwerise-db

# Restore to new server (safer than in-place)
az postgres flexible-server restore \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db-restored \
  --source-server unitedwerise-db \
  --restore-time "YYYY-MM-DDTHH:MM:00Z"

# Update DATABASE_URL to point to restored server
# Test thoroughly before switching production traffic
```

### DAILY DEVELOPMENT WORKFLOW

```bash
# ✅ CORRECT: Use migrations for all schema changes
cd backend
# 1. Edit schema.prisma
# 2. Run migrate dev
npx prisma migrate dev --name "add_user_settings"
# 3. Commit migration files
git add prisma/migrations/ prisma/schema.prisma
git commit -m "feat: Add user settings migration"
git push origin development

# ❌ WRONG: Don't use db push for permanent changes
npx prisma db push  # NO! Only for rapid prototyping, never commit result
```

### WHEN `db push` IS ACCEPTABLE

**ONLY use `db push` for:**
- Rapid prototyping in local development (throwaway work)
- Experimenting with schema designs before committing
- Personal test databases that won't be deployed

**Rules when using `db push`:**
1. Never commit schema.prisma changes without a migration
2. Always create proper migration before pushing to git
3. Never use on staging or production databases
4. Never share schema changes made via db push with team

### MIGRATION BEST PRACTICES

1. **Descriptive Migration Names**: Use clear, specific names
   - ✅ `add_quest_progress_tracking`
   - ✅ `fix_photo_post_foreign_key`
   - ❌ `update` (too vague)
   - ❌ `changes` (not descriptive)

2. **Review Migration SQL**: Always check generated SQL before committing
   ```bash
   cat prisma/migrations/<migration-name>/migration.sql
   ```

3. **Test Migrations**: Verify migration works on development database first
   ```bash
   npx prisma migrate dev  # Auto-applies to dev DB
   ```

4. **Atomic Migrations**: Keep each migration focused on one logical change
   - ✅ One migration per feature
   - ❌ Don't bundle unrelated schema changes

5. **Backup Before Production**: Always backup production DB before migrating
   ```bash
   az postgres flexible-server backup create ...
   ```

### DATABASE ENVIRONMENT URLS

```bash
# Development Database (safe for testing)
postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db-dev.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require

# Production Database (CRITICAL - backup first!)
postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require
```

---

## Project Architecture

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

## Multi-Agent Coordination

**Coordination files:**
```
.claude/scratchpads/DEVELOPMENT-LOG.md
.claude/scratchpads/API-CHANGES.md
.claude/scratchpads/FRONTEND-PROGRESS.md
.claude/scratchpads/TESTING-STATUS.md
.claude/scratchpads/REVIEW-LOG.md
```

Use multi-agent for:
- Features spanning frontend + backend + database
- Emergency response with parallel debugging
- Performance optimization with benchmarking
- Security-sensitive authentication changes

**4-Agent Feature Development:**

Terminal 1 - Research Agent:
- Analyze MASTER_DOCUMENTATION.md for existing patterns
- Document architecture approach in `.claude/scratchpads/FEATURE-ARCHITECTURE.md`
- Identify affected systems and dependencies
- Signal ready: "Architecture plan complete"

Terminal 2 - Backend Agent:
- Wait for architecture plan
- Implement API endpoints and database changes
- Document endpoints in `.claude/scratchpads/API-CHANGES.md`
- Log progress in `.claude/scratchpads/DEVELOPMENT-LOG.md`
- Signal ready: "Backend implementation complete"

Terminal 3 - Frontend Agent:
- Wait for API documentation
- Implement UI components
- Log progress in `.claude/scratchpads/FRONTEND-PROGRESS.md`
- Signal ready: "Frontend implementation complete"

Terminal 4 - Testing Agent:
- Wait for backend + frontend complete
- Verify on staging environment
- Test all scenarios including errors
- Document results in `.claude/scratchpads/TESTING-STATUS.md`
- Signal ready: "Testing complete, ready for production"

**2-Agent Emergency Response:**

Terminal 1 - Analysis Agent:
- Root cause analysis
- Impact assessment
- Document in `.claude/scratchpads/EMERGENCY-STATUS.md`
- Identify minimum viable fix
- Signal ready: "Root cause identified"

Terminal 2 - Hotfix Agent:
- Wait for root cause
- Implement fix
- Deploy to staging
- Verify and deploy to production if critical
- Document in `.claude/scratchpads/DEVELOPMENT-LOG.md`

**3-Agent Performance Optimization:**

Terminal 1 - Analysis Agent:
- Profile application
- Identify bottlenecks
- Document findings in `.claude/scratchpads/PERFORMANCE-OPTIMIZATION.md`
- Signal ready: "Bottlenecks identified"

Terminal 2 - Implementation Agent:
- Wait for analysis
- Implement optimizations
- Log changes in `.claude/scratchpads/DEVELOPMENT-LOG.md`
- Signal ready: "Optimizations implemented"

Terminal 3 - Benchmarking Agent:
- Wait for implementation
- Run before/after benchmarks
- Document metrics in `.claude/scratchpads/PERFORMANCE-OPTIMIZATION.md`
- Verify improvements meet targets

## Protected Documentation

Never archive or mark obsolete:
- MASTER_DOCUMENTATION.md
- CHANGELOG.md
- README.md
- SYSTEM-ARCHITECTURE-DESIGN.md
- INCIDENT_RESPONSE.md
- PERFORMANCE_BASELINE.md
- PRODUCTION-ENV-TEMPLATE.md

## Common Commands

**Daily workflow:**
```bash
# Update current branch
git pull origin <current-branch>

# Deploy to staging (from development branch)
git add . && git commit -m "feat: changes"
git push origin development

# Check deployment
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime

# TypeScript check
cd backend && npm run build

# Database safety check
bash scripts/check-database-safety.sh
cd backend && node test-db-isolation.js
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

## Appendix: Architecture Notes

**Inline code elimination (September 2025):**
Complete removal of all inline JavaScript from 7,413-line index.html. Previous cleanup attempts resulted in thousands of hours of waste. Inline code prohibition is absolute.

**Staging architecture:**
Same Docker image deployed to both environments with different variables. Staging requires admin access via `NODE_ENV=staging` check. Prevents non-admin users from affecting development testing.

**API response structure:**
Backend returns `{success: true, data: {...}}`. The apiCall wrapper adds `{ok: true, status: 200}`. Access data via `response.data.data.user` not `response.data.user`.

**Branch control rationale:**
User maintains exclusive control over branches to prevent accidental changes buried in task lists. Current branch is always the intended branch.

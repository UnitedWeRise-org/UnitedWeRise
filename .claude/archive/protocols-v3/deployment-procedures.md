# Deployment Procedures

**Protection Status**: 🔒 PROTECTED
**Created**: 2025-10-31
**Last Updated**: 2025-10-31

---

## 🎯 When to Use This Protocol

**USE THIS PROTOCOL when**:
- Deploying code changes to staging environment
- Deploying code changes to production environment
- Performing emergency hotfix deployments
- Rolling back failed deployments
- Manually deploying when automated systems fail

**SKIP THIS PROTOCOL if**:
- Only reading code or investigating issues
- Making local development changes without deployment
- Running tests locally

**UNCERTAIN?** Ask yourself:
- Am I pushing code to staging or production environments?
- Did the user request deployment/merge/push?
- Do changes need to be live on dev. or www. sites?

---

## Overview

This protocol provides complete deployment procedures for the UnitedWeRise project, including automated and manual deployment methods, rollback procedures, and emergency hotfix workflows. The protocol ensures database migrations are applied before code deployment and verifies successful deployment.

**Primary Method**: Automated deployment via GitHub Actions (preferred for all normal deployments)
**Fallback Method**: Manual deployment via Azure CLI (emergencies only)

---

## Prerequisites

- Clean git status (no uncommitted changes)
- Code compiles successfully (`npm run build`)
- Prisma schema valid (`npx prisma validate`)
- All commits pushed to remote
- Admin access to Azure resources (for manual deployments)
- GitHub Actions permissions (for automated deployments)

---

> **Documentation Requirements**: Before deploying, ensure code is properly documented. See `.claude/protocols/documentation-requirements.md` for comprehensive documentation guidance, templates, and MASTER_DOCUMENTATION.md section mapping.

---

## Procedure

### Phase 1: Pre-Deployment Validation

**Always run these checks before any deployment:**

```bash
git status  # Must be clean
cd backend && npm run build  # Must compile without errors
cd backend && npx prisma validate && npx prisma generate
git log origin/<current-branch>..HEAD  # Should be empty (all commits pushed)
```

**If any check fails**: Fix the issue before proceeding with deployment.

---

### Phase 2: Deploy to Staging

**Staging Environment**:
- Branch: `development`
- Backend: https://dev-api.unitedwerise.org
- Frontend: https://dev.unitedwerise.org
- Database: unitedwerise-db-dev

**Automated Deployment** (preferred):

```bash
git pull origin <current-branch>
git add . && git commit -m "feat: description"
git push origin <current-branch>

# If on development branch, auto-deploys to staging
# Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
```

**Manual Backend Docker Deployment** (if automated fails):

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

---

### Phase 3: Production Deployment

🔒 **CRITICAL**: When user says "deploy/merge/push to main/production" → Use PRIMARY METHOD (automated).

**Production Environment**:
- Branch: `main`
- Backend: https://api.unitedwerise.org
- Frontend: https://www.unitedwerise.org
- Database: unitedwerise-db

#### PRIMARY METHOD: Automated Deployment (Default)

Use for ALL normal deployments. GitHub Actions handles everything automatically.

**Step 1: Pre-Deployment Validation**

```bash
git status  # Must be clean
cd backend && npm run build  # Must compile
git log origin/development..HEAD  # Should be empty
curl -s "https://dev-api.unitedwerise.org/health"  # Verify staging works
```

**Step 2: Merge to Main and Push**

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

**Step 3: Monitor GitHub Actions Workflow**

```bash
# Watch workflow at: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
# Workflow: "Backend Auto-Deploy to Production"
# Should complete in ~5 minutes
```

**Step 4: Verify Production Deployment**

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

#### FALLBACK METHOD: Manual Deployment

**Use ONLY when:**
- GitHub Actions workflow unavailable or failing
- Emergency requiring immediate deployment bypass
- Testing deployment pipeline changes

**Manual Step 1: Merge to Main** (if not already done)

```bash
git checkout main && git pull origin main
git merge development && git push origin main
```

**Manual Step 2: Build Docker Image**

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

**Manual Step 3: Get Image Digest**

```bash
DIGEST=$(az acr repository show --name uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --query "digest" -o tsv)
```

**Manual Step 4: Deploy to Production**

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

**Manual Step 5: Verify Deployment**

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

### Phase 4: Rollback and Emergency Procedures

#### Rollback Procedure (if deployment fails)

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

#### Emergency Hotfix

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

---

### Phase 5: Database Migration Safety

🔒 **CRITICAL**: Database migrations MUST be applied BEFORE code deployment. No exceptions.

**FORBIDDEN COMMANDS:**
```bash
npx prisma db push           # Bypasses migration system
npx prisma db push --force   # Even worse - accepts data loss
CREATE TABLE ... / ALTER TABLE ...  # Manual SQL (unless emergency)
```

**Why:** Oct 3 2025 incident - Used `db push` instead of migrations → production 500 errors when backend expected tables that didn't exist.

#### Required Workflow

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

**Step 4: Production** (automated via GitHub Actions)
```bash
# GitHub Actions runs: prisma migrate deploy
# Manual verification:
curl https://api.unitedwerise.org/health  # Verify database:connected
```

#### Database Migration Troubleshooting

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

#### Emergency Database Rollback

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

#### When `db push` IS Acceptable

**ONLY for:**
- Rapid prototyping in local development (throwaway work)
- Experimenting with schema designs before committing
- Personal test databases that won't be deployed

**Never:**
- Commit schema.prisma changes without a migration
- Use on staging or production databases
- Share schema changes made via db push with team

---

## Verification

### Post-Deployment Checklist

**After staging deployment**:
- [ ] Health endpoint returns correct releaseSha
- [ ] Health endpoint shows `database: "connected"`
- [ ] Health endpoint shows correct databaseHost (unitedwerise-db-dev)
- [ ] Uptime < 300 seconds (fresh restart)
- [ ] No errors in last 50 log lines
- [ ] Frontend serves new content (check Last-Modified header)
- [ ] Manual smoke test of changed functionality

**After production deployment**:
- [ ] GitHub Actions workflow shows green checkmark
- [ ] Health endpoint returns correct releaseSha
- [ ] Health endpoint shows `database: "connected"`
- [ ] Health endpoint shows correct databaseHost (unitedwerise-db)
- [ ] Uptime < 300 seconds (fresh restart)
- [ ] No errors in last 50 log lines
- [ ] Frontend serves new content (check Last-Modified header)
- [ ] Manual smoke test of changed functionality
- [ ] Monitor for 5-10 minutes for unexpected errors

---

## Troubleshooting

**Issue**: GitHub Actions workflow fails during migration step
**Solution**:
1. Check workflow logs for specific migration error
2. Verify migration SQL is valid
3. Check database connection from Actions runner
4. See `docs/DEPLOYMENT-MIGRATION-POLICY.md` for migration-specific troubleshooting

**Issue**: Deployment succeeds but wrong SHA deployed
**Solution**: See `.claude/protocols/deployment-troubleshooting.md` for complete diagnostic protocol

**Issue**: Health endpoint returns 500 error after deployment
**Solution**: Check container logs for startup errors, verify environment variables, check database connection

**Issue**: Frontend not updated after deployment
**Solution**: Wait 2-3 minutes for CDN propagation, hard refresh browser (Ctrl+Shift+R)

---

## Examples

### Example 1: Normal Staging Deployment
```bash
# Make changes, test locally
git add . && git commit -m "feat: Add user profile feature"
git push origin development

# Wait for GitHub Actions to complete
# Verify: curl https://dev-api.unitedwerise.org/health
```

### Example 2: Production Deployment
```bash
# Verify staging is working
curl https://dev-api.unitedwerise.org/health

# Merge to main
git checkout main && git pull origin main
git merge development && git push origin main

# Monitor GitHub Actions
# Verify: curl https://api.unitedwerise.org/health
```

### Example 3: Emergency Hotfix
```bash
# Create hotfix branch from main
git checkout main && git pull origin main
git checkout -b hotfix/fix-critical-bug

# Make minimal fix
# ... make changes ...
cd backend && npm run build

# Commit and merge
git add . && git commit -m "hotfix: Fix critical authentication bug"
git push origin hotfix/fix-critical-bug
git checkout main && git merge hotfix/fix-critical-bug && git push origin main

# GitHub Actions deploys automatically
# Merge back to development
git checkout development && git merge hotfix/fix-critical-bug && git push origin development
```

---

## Related Resources

- `docs/DEPLOYMENT-MIGRATION-POLICY.md` - Automated deployment workflow details
- `.claude/protocols/deployment-troubleshooting.md` - Deployment failure diagnosis
- `.claude/protocols/verification-checklists.md` - Detailed verification steps
- `CLAUDE.md` - Core deployment principles and branch control rules

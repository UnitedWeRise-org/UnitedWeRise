# Deployment Protocol

**Type**: Special (🔒 PROTECTED)
**Last Updated**: 2025-12-08

---

## When to Use

**USE THIS PROTOCOL when**:
- Deploying code changes to staging environment
- Deploying code changes to production environment
- Performing emergency hotfix deployments
- Rolling back failed deployments
- Manually deploying when automated systems fail

**SKIP if**:
- Only reading code or investigating issues
- Making local development changes without deployment
- Running tests locally

---

## Overview

This protocol provides complete deployment procedures for the UnitedWeRise project.

**Primary Method**: Automated deployment via GitHub Actions (preferred)
**Fallback Method**: Manual deployment via Azure CLI (emergencies only)

---

## Prerequisites

- Clean git status (no uncommitted changes)
- Code compiles successfully (`npm run build`)
- Prisma schema valid (`npx prisma validate`)
- All commits pushed to remote

---

## Pre-Deployment Validation

**Always run before any deployment:**

```bash
git status  # Must be clean
cd backend && npm run build  # Must compile without errors
cd backend && npx prisma validate && npx prisma generate
git log origin/<current-branch>..HEAD  # Should be empty (all commits pushed)
```

---

## Staging Deployment

**Environment**:
- Branch: `development`
- Backend: https://dev-api.unitedwerise.org
- Frontend: https://dev.unitedwerise.org
- Database: unitedwerise-db-dev

**Automated (preferred):**

```bash
git pull origin <current-branch>
git add . && git commit -m "feat: description"
git push origin <current-branch>

# Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
```

**Manual (if automated fails):**

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

## Production Deployment

🔒 **CRITICAL**: When user says "deploy/merge/push to main/production" → Use PRIMARY METHOD (automated).

**Environment**:
- Branch: `main`
- Backend: https://api.unitedwerise.org
- Frontend: https://www.unitedwerise.org
- Database: unitedwerise-db

### PRIMARY METHOD: Automated Deployment

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

**GitHub Actions will automatically:**
- Build Docker image in Azure Container Registry
- Run database migrations (`prisma migrate deploy`)
- Deploy container to production
- Verify deployment health

**Step 3: Monitor and Verify**

```bash
# Watch workflow at: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
sleep 300  # Wait for workflow to complete

GIT_SHA=$(git rev-parse --short HEAD)
curl -s "https://api.unitedwerise.org/health"

DEPLOYED_SHA=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
echo "Local: $GIT_SHA | Deployed: $DEPLOYED_SHA"  # Must match
```

### FALLBACK METHOD: Manual Deployment

**Use ONLY when automated workflow unavailable/failing.**

```bash
git checkout main && git pull origin main
git merge development && git push origin main

GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-prod-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"

az acr build --registry uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --no-wait \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend

sleep 180

DIGEST=$(az acr repository show --name uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --query "digest" -o tsv)

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

sleep 30
curl -s "https://api.unitedwerise.org/health"
```

---

## Rollback Procedures

**List revisions:**
```bash
az containerapp revision list \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --output table
```

**Activate previous revision:**
```bash
az containerapp revision activate \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision <previous-revision-name>
```

**Or revert git commit:**
```bash
git checkout main && git revert HEAD && git push origin main
# Automated workflow will redeploy
```

---

## Emergency Hotfix

```bash
git checkout main && git pull origin main
git checkout -b hotfix/critical-issue
# Make minimal fix
cd backend && npm run build
git add . && git commit -m "hotfix: description"
git push origin hotfix/critical-issue
git checkout main && git merge hotfix/critical-issue && git push origin main
# Automated workflow deploys
git checkout development && git merge hotfix/critical-issue && git push origin development
```

---

## 🔒 Database Migration Safety

**CRITICAL**: Migrations MUST be applied BEFORE code deployment. No exceptions.

**FORBIDDEN:**
```bash
npx prisma db push           # Bypasses migration system
npx prisma db push --force   # Accepts data loss
```

**Required Workflow:**

```bash
# Development
cd backend
npx prisma migrate dev --name "descriptive_name"
cat prisma/migrations/YYYYMMDD_*/migration.sql  # Review SQL
npx prisma generate
npm run build

# Commit
git add backend/prisma/migrations/ backend/prisma/schema.prisma
git commit -m "feat: Add migration for [description]"
git push origin development

# Staging/Production: Applied automatically during deployment
```

**Migration Troubleshooting:**

```bash
# "Migration already applied" but tables don't exist:
DATABASE_URL="<db-url>" npx prisma migrate resolve --applied <migration-name>

# "Column/Table already exists":
DATABASE_URL="<db-url>" npx prisma migrate resolve --applied <migration-name>

# Emergency rollback:
DATABASE_URL="<db-url>" npx prisma migrate resolve --rolled-back <migration-name>
```

---

## Post-Deployment Checklist

- [ ] Health endpoint returns correct releaseSha
- [ ] Health endpoint shows `database: "connected"`
- [ ] Correct databaseHost for environment
- [ ] Uptime < 300 seconds (fresh restart)
- [ ] No errors in last 50 log lines
- [ ] Frontend serves new content
- [ ] Manual smoke test passes

---

## Troubleshooting

**GitHub Actions workflow fails:**
- Check workflow logs for specific error
- Verify migration SQL is valid
- See deployment_troubleshooting_protocol.md

**Wrong SHA deployed:**
- See deployment_troubleshooting_protocol.md

**Health endpoint returns 500:**
- Check container logs for startup errors
- Verify environment variables
- Check database connection

**Frontend not updated:**
- Wait 2-3 minutes for CDN
- Hard refresh browser (Ctrl+Shift+R)

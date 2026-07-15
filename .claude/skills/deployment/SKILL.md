---
name: deployment
description: Deploy UnitedWeRise code to staging or production (and troubleshoot failed deploys) — triggers on deploy, staging, production, merge to main, merge to development, push to production, release, container app, Azure.
---

## When to use / Skip if

**Use for any staging or production deployment**, including:
- Deploying code changes to the staging environment (development branch)
- Deploying code changes to the production environment (main branch)
- Emergency hotfix deployments
- Rolling back a failed deployment
- Manually deploying when automated (GitHub Actions) systems fail
- Troubleshooting a deployment (wrong SHA, changes not visible, stuck/frozen deploy, backend won't start)

**Skip if:**
- Only reading code or investigating issues (no deployment)
- Making local-only development changes without deployment
- Running tests locally
- A deployment is still in progress (< 5 minutes) or a GitHub Actions workflow is currently running

---

## 🔒 Non-Negotiables (NEVER VIOLATE)

1. **NEVER deploy without an explicit user command.** Once commanded, execute all steps automatically. Rollbacks additionally require explicit user approval unless the user directly commanded the rollback.
2. **Migrations BEFORE code — no exceptions.** Database migrations MUST be applied before the code that depends on them is deployed. GitHub Actions runs `prisma migrate deploy` before deploying the container; deployment ABORTS if migrations fail.
3. **Environment-branch mapping is absolute:**
   - `development` branch === **staging** (dev.unitedwerise.org / dev-api.unitedwerise.org / db: unitedwerise-db-dev)
   - `main` branch === **production** (www.unitedwerise.org / api.unitedwerise.org / db: unitedwerise-db)
   - Staging ONLY ever runs development code; production ONLY ever runs main code. Any deviation means something is broken and must be corrected immediately.

**Primary method**: Automated deployment via GitHub Actions (preferred).
**Fallback method**: Manual deployment via Azure CLI (emergencies / automation failure only).

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

**Environment:**
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

**Environment:**
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

🔒 Rollback requires explicit user approval (unless the user directly commanded it).

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

Systematic diagnostic procedure for deployment issues (wrong SHA deployed, health endpoint shows old releaseSha, changes not visible, deployment stuck/frozen, backend fails to start, frontend not serving new content). Execute steps in order — each builds on verification from the previous step.

**Do NOT troubleshoot if** the deployment is still in progress (< 5 minutes), a GitHub Actions workflow is currently running, or no deployment has been attempted yet.

Quick-reference for the fastest common fixes:
- **GitHub Actions workflow fails:** check workflow logs for the specific error; verify migration SQL is valid.
- **Health endpoint returns 500:** check container logs for startup errors; verify environment variables; check database connection (see Step 0).
- **Frontend not updated:** wait 2-3 minutes for CDN; hard refresh browser (Ctrl+Shift+R).

### Step 0: Check Backend Environment Validation

If backend fails to start, check startup logs:

```bash
# For staging
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 50 | grep -E "CRITICAL|ERROR|Environment"

# For production
az containerapp logs show \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --tail 50 | grep -E "CRITICAL|ERROR|Environment"
```

**Common errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Production pointing to dev database` | Wrong DATABASE_URL | Update to production database |
| `Staging pointing to production database` | Wrong DATABASE_URL | Update to dev database |
| `Invalid DATABASE_URL format` | Malformed connection | Fix DATABASE_URL |

**Fix environment mismatch:**
```bash
az containerapp update \
  --name <container-name> \
  --resource-group unitedwerise-rg \
  --set-env-vars NODE_ENV=<environment> DATABASE_URL="<correct-url>"
```

### Step 1: Verify Commits Pushed

```bash
git status  # Should be clean
git log origin/<branch>..HEAD  # Should be empty
```

**If not empty:** Push commits and wait for deployment.

### Step 2: Verify GitHub Actions

```bash
gh run list --branch <branch> --limit 5
```

**If stuck (>10 min):** `gh run view <run-id>` to check step
**If failed:** Check error, fix code, push again
**If queued >5 min:** Wait or re-run from GitHub UI

### Step 3: Verify Frontend Deployment

```bash
curl -I https://dev.unitedwerise.org/index.html  # Check Last-Modified
```

**If old date:** Wait 2-3 minutes, hard refresh browser.

### Step 4: Verify Backend Docker Build

```bash
az acr task list-runs --registry uwracr2425 --output table
```

**If failed:** `az acr task logs --registry uwracr2425 --run-id <id>`
**Common causes:** TypeScript error, npm install failure, Dockerfile error

### Step 5: Verify Container App Revision

```bash
az containerapp revision list \
  --name <container-name> \
  --resource-group unitedwerise-rg \
  --output table
```

**Look for:** ONE revision with `Active=True` and `TrafficWeight=100`

**If traffic split:**
```bash
az containerapp update \
  --name <container-name> \
  --resource-group unitedwerise-rg \
  --revision-mode Single
```

### Step 6: Verify Container Image

```bash
az containerapp show \
  --name <container-name> \
  --resource-group unitedwerise-rg \
  --query "properties.template.containers[0].image" -o tsv
```

**If wrong image:**
```bash
az containerapp update \
  --name <container-name> \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "force-$(date +%H%M%S)"
```

### Step 7: Verify Deployed SHA

```bash
DEPLOYED_SHA=$(curl -s "https://dev-api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
LOCAL_SHA=$(git rev-parse --short HEAD)
echo "Local: $LOCAL_SHA | Deployed: $DEPLOYED_SHA"
```

**If mismatch:**
```bash
az containerapp update \
  --name <container-name> \
  --resource-group unitedwerise-rg \
  --set-env-vars RELEASE_SHA=$GIT_SHA
```

### Step 8: Verify Container Restart

```bash
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime
```

**Should be < 300 seconds.** If higher, force restart:

```bash
az containerapp update \
  --name <container-name> \
  --resource-group unitedwerise-rg \
  --revision-suffix "restart-$(date +%H%M%S)"
```

### Step 9: Nuclear Option

**Last resort if all steps fail:**

```bash
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
  --name <container-name> \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "nuclear-$GIT_SHA-$(date +%H%M%S)" \
  --revision-mode Single \
  --set-env-vars \
    NODE_ENV=<environment> \
    RELEASE_SHA=$GIT_SHA \
    RELEASE_DIGEST=$DIGEST

sleep 30
curl -s "https://<api-url>/health"
```

### Post-Troubleshooting Verification

- [ ] Health endpoint responds (not 500)
- [ ] Correct releaseSha
- [ ] Correct databaseHost
- [ ] Uptime < 300 seconds
- [ ] No errors in logs
- [ ] Changes visible on live site

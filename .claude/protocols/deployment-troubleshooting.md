# Deployment Troubleshooting

**Protection Status**: Standard
**Created**: 2025-10-31
**Last Updated**: 2025-10-31

---

## 🎯 When to Use This Protocol

**USE THIS PROTOCOL when**:
- Deployment completed but wrong SHA is deployed
- Health endpoint shows old releaseSha
- Changes not visible after deployment
- Deployment appears stuck or frozen
- Backend fails to start after deployment
- Frontend not serving new content

**SKIP THIS PROTOCOL if**:
- Deployment is still in progress (< 5 minutes)
- GitHub Actions workflow is currently running
- No deployment has been attempted yet

**UNCERTAIN?** Ask yourself:
- Has enough time passed for deployment to complete (5+ minutes)?
- Did I verify that deployment process finished?
- Is there a mismatch between what I expect and what's deployed?

---

## Overview

This protocol provides a systematic 9-step diagnostic procedure for troubleshooting deployment issues. Each step verifies one component of the deployment pipeline, allowing you to identify exactly where the process failed.

**Symptoms addressed:**
- Deployment stuck or incomplete
- Deployed code doesn't match local code
- Health endpoint shows old SHA
- Changes not visible on live site
- Backend won't start after deployment

Execute steps in order - each step builds on verification from previous steps.

---

## Prerequisites

- Deployment process has completed (or appears to have completed)
- Access to Azure CLI tools
- Access to GitHub (for Actions verification)
- Local git repository up to date

---

## Procedure

### Step 0: Check Backend Environment Validation

If backend fails to start or health endpoint is unreachable, check startup logs for environment validation errors.

**Check container startup logs:**

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

**Common validation errors:**

| Error Message | Cause | Fix |
|--------------|-------|-----|
| `"CRITICAL: Production environment pointing to development database"` | NODE_ENV=production with unitedwerise-db-dev | Update DATABASE_URL to production database |
| `"CRITICAL: Staging environment pointing to production database"` | NODE_ENV=staging with unitedwerise-db | Update DATABASE_URL to dev database |
| `"ERROR: Invalid DATABASE_URL format"` | Malformed connection string | Fix DATABASE_URL format |

**Fix environment mismatch:**

```bash
# For staging (must use dev database)
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --set-env-vars NODE_ENV=staging DATABASE_URL="<dev-database-url>"

# For production (must use production database)
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --set-env-vars NODE_ENV=production DATABASE_URL="<production-database-url>"
```

**Verify fix:**

```bash
curl -s "https://dev-api.unitedwerise.org/health" | jq '.databaseHost, .environment, .nodeEnv'
# Staging should show: unitedwerise-db-dev, development, staging

curl -s "https://api.unitedwerise.org/health" | jq '.databaseHost, .environment, .nodeEnv'
# Production should show: unitedwerise-db, production, production
```

---

### Step 1: Verify Commits Pushed

Ensure all local commits have been pushed to remote repository.

```bash
git status  # Should be clean (no uncommitted changes)
git log origin/<current-branch>..HEAD  # Should be empty (all commits pushed)
```

**If not empty:**
- Unpushed commits exist locally
- Push them: `git push origin <current-branch>`
- Wait for deployment to trigger

---

### Step 2: Verify GitHub Actions

Check if GitHub Actions workflow completed successfully.

```bash
gh run list --branch <current-branch> --limit 5
# Look for: completed/in_progress/queued/failed, time >10 min = stuck
```

**If stuck (>10 minutes in progress):**
```bash
gh run view <run-id>  # Check what step is stuck
```

**If failed:**
```bash
gh run view <run-id>  # Check error message
# Fix error in code and push again
```

**If queued >5 minutes:**
- Wait (GitHub Actions queue may be busy)
- Or re-run workflow from GitHub UI

---

### Step 3: Verify Frontend Deployment

Check if frontend files have been updated.

```bash
curl -I https://dev.unitedwerise.org/  # Check Date header
curl -I https://dev.unitedwerise.org/index.html  # Check Last-Modified header
```

**If headers show old date:**
- Wait 2-3 minutes for CDN propagation
- Hard refresh browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clear browser cache if still showing old content

---

### Step 4: Verify Backend Docker Build

Check if Docker image was built successfully in Azure Container Registry.

```bash
az acr task list-runs --registry uwracr2425 --output table
# Look for: Status "Succeeded", recent StartTime, Duration ~2-3 min
```

**If failed:**
```bash
az acr task logs --registry uwracr2425 --run-id <run-id>
# Common causes:
# - TypeScript compilation error
# - npm install failure
# - Dockerfile syntax error
```

**If queued >5 minutes:**
```bash
az acr task cancel-run --registry uwracr2425 --run-id <run-id>
# Then trigger rebuild
```

---

### Step 5: Verify Container App Deployment

Check if Azure Container App is running the correct revision.

```bash
# For staging
az containerapp revision list \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --output table

# For production
az containerapp revision list \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --output table
```

**Look for:**
- Only ONE revision with `Active=True`
- That revision has `TrafficWeight=100`

**If traffic split (multiple active revisions):**

```bash
# For staging
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-mode Single

# For production
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-mode Single
```

---

### Step 6: Verify Container Running New Image

Check if container is using the newly built Docker image.

```bash
# For staging
az containerapp show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --query "properties.template.containers[0].image" -o tsv

# For production
az containerapp show \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --query "properties.template.containers[0].image" -o tsv
```

**Should show**: Image digest matching the one from Step 4

**If wrong image:**

```bash
# Get correct digest from Step 4
DIGEST="<digest-from-step-4>"
GIT_SHA=$(git rev-parse --short HEAD)

# For staging
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "force-$(date +%H%M%S)"

# For production
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "force-$(date +%H%M%S)"
```

---

### Step 7: Verify Deployed SHA Matches Local

Check if the deployed code matches your local commit.

```bash
# For staging
DEPLOYED_SHA=$(curl -s "https://dev-api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)

# For production
DEPLOYED_SHA=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)

LOCAL_SHA=$(git rev-parse --short HEAD)
echo "Local: $LOCAL_SHA | Deployed: $DEPLOYED_SHA"  # Must match
```

**If mismatch:**

```bash
GIT_SHA=$(git rev-parse --short HEAD)

# For staging
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --set-env-vars RELEASE_SHA=$GIT_SHA

# For production
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --set-env-vars RELEASE_SHA=$GIT_SHA
```

---

### Step 8: Verify Container Restarted

Check if container has restarted recently (fresh deployment).

```bash
# For staging
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime

# For production
curl -s "https://api.unitedwerise.org/health" | grep uptime
```

**Should be**: < 300 seconds (< 5 minutes)

**If > 300 seconds:**

Container hasn't restarted. Force restart:

```bash
# For staging
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-suffix "restart-$(date +%H%M%S)"

# For production
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-suffix "restart-$(date +%H%M%S)"
```

---

### Step 9: Nuclear Option (If All Steps Fail)

If all previous steps fail, rebuild and redeploy from scratch.

**⚠️ WARNING**: This is a last resort. Only use if all other steps have failed.

```bash
GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-nuclear-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"

# Build fresh image
az acr build --registry uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#<branch>:backend

sleep 180

# Get digest
DIGEST=$(az acr repository show --name uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --query "digest" -o tsv)

# Deploy for staging
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

# Or deploy for production
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "nuclear-$GIT_SHA-$(date +%H%M%S)" \
  --revision-mode Single \
  --set-env-vars \
    NODE_ENV=production \
    RELEASE_SHA=$GIT_SHA \
    RELEASE_DIGEST=$DIGEST \
    DEPLOYMENT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

sleep 30

# Verify
curl -s "https://dev-api.unitedwerise.org/health"  # staging
curl -s "https://api.unitedwerise.org/health"  # production
```

---

## Verification

After completing troubleshooting steps:

- [ ] Health endpoint responds (not 500 error)
- [ ] Health endpoint shows correct releaseSha
- [ ] Health endpoint shows correct databaseHost
- [ ] Uptime < 300 seconds (fresh restart)
- [ ] No errors in last 50 log lines
- [ ] Changes visible on live site
- [ ] Manual smoke test passes

---

## Troubleshooting the Troubleshooting

**Issue**: Health endpoint returns 500 even after nuclear option
**Solution**:
1. Check container logs for startup errors
2. Verify all environment variables are set correctly
3. Verify database connection string is correct
4. Check if database migrations were applied
5. See `docs/DEPLOYMENT-MIGRATION-POLICY.md`

**Issue**: GitHub CLI commands don't work
**Solution**:
1. Install GitHub CLI: `winget install GitHub.cli`
2. Authenticate: `gh auth login`
3. Or check GitHub Actions via web UI

**Issue**: Azure CLI commands fail with authentication error
**Solution**:
1. Login: `az login`
2. Set subscription: `az account set --subscription <subscription-id>`
3. Verify access: `az account show`

---

## Examples

### Example 1: SHA Mismatch
```bash
# Step 7 reveals SHA mismatch
LOCAL_SHA=$(git rev-parse --short HEAD)
echo "Local: a1b2c3d"

DEPLOYED_SHA=$(curl -s "https://dev-api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
echo "Deployed: x9y8z7w"

# Diagnosis: Environment variable not updated
# Solution: Update RELEASE_SHA environment variable (Step 7 fix)
```

### Example 2: Container Not Restarted
```bash
# Step 8 reveals old uptime
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime
# Output: "uptime": 3600 (1 hour)

# Diagnosis: New revision created but old one still active
# Solution: Force restart (Step 8 fix)
```

### Example 3: Traffic Split
```bash
# Step 5 reveals multiple active revisions
az containerapp revision list --name unitedwerise-backend-staging --resource-group unitedwerise-rg --output table
# Shows: 2 revisions with Active=True, each with TrafficWeight=50

# Diagnosis: Container App in multiple revision mode
# Solution: Set revision mode to Single (Step 5 fix)
```

---

## Related Resources

- `.claude/protocols/deployment-procedures.md` - Standard deployment procedures
- `docs/DEPLOYMENT-MIGRATION-POLICY.md` - Migration and automated deployment
- `.claude/protocols/verification-checklists.md` - Post-deployment verification
- `CLAUDE.md` - Environment-branch mapping rules

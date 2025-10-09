# Deployment Failure Diagnosis

**Last Updated**: 2025-10-09
**Purpose**: 8-step workflow for diagnosing stuck or failed deployments

---

## When to Use This Guide

**Symptoms:**
- Deployment appears stuck/frozen
- Deployed code doesn't match local code
- Health endpoint shows old release SHA
- Changes pushed but not visible on staging/production

**Execute this workflow in order. Each step verifies one part of the pipeline.**

---

## Step 1: Verify Local Changes Committed and Pushed

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

---

## Step 2: Verify GitHub Actions Deployment Status

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

---

## Step 3: Verify Frontend Deployment (Static Web Apps)

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

---

## Step 4: Verify Backend Docker Build Status

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

---

## Step 5: Verify Container App Deployment Status

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

---

## Step 6: Verify Container is Running New Image

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

---

## Step 7: Verify Deployed Code Matches Local Code

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

---

## Step 8: Verify Container Has Restarted Recently

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

---

## Nuclear Option: Complete Deployment Reset

**Use when all else fails - forces complete redeployment**

```bash
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

---

## Common Failure Patterns and Solutions

### Pattern 1: "GitHub Actions succeeded but nothing changed"
- **Cause**: Frontend deployed but browser cached old version
- **Solution**: Hard refresh (Ctrl+Shift+R), check Last-Modified header

### Pattern 2: "Docker build succeeded but old code still running"
- **Cause**: Container App didn't pull new image or traffic split
- **Solution**: Check Step 5 and Step 6, force single revision mode

### Pattern 3: "Everything looks successful but /health shows old SHA"
- **Cause**: RELEASE_SHA env var not set or wrong revision active
- **Solution**: Check Step 7, redeploy with explicit SHA

### Pattern 4: "Deployment seems stuck, nothing progressing"
- **Cause**: ACR build queued, GitHub Actions queued, or Azure service issue
- **Solution**: Wait 5 minutes, check Step 2 and Step 4, cancel and retry if needed

### Pattern 5: "Uptime shows days/hours but we just deployed"
- **Cause**: Deployment updated env vars but didn't restart container
- **Solution**: Check Step 8, force new revision to trigger restart

---

## Related Documentation

- **Production Deployment**: `.claude/guides/production-deployment.md`
- **Project CLAUDE.md**: Quick deploy commands

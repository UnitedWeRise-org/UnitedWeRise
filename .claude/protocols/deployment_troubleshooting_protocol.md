# Deployment Troubleshooting Protocol

**Type**: Special
**Last Updated**: 2025-12-08

---

## When to Use

**USE THIS PROTOCOL when**:
- Deployment completed but wrong SHA deployed
- Health endpoint shows old releaseSha
- Changes not visible after deployment
- Deployment appears stuck or frozen
- Backend fails to start after deployment
- Frontend not serving new content

**SKIP if**:
- Deployment still in progress (< 5 minutes)
- GitHub Actions workflow currently running
- No deployment attempted yet

---

## Overview

Systematic 9-step diagnostic procedure for troubleshooting deployment issues. Execute steps in order - each builds on verification from previous steps.

---

## Step 0: Check Backend Environment Validation

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

---

## Step 1: Verify Commits Pushed

```bash
git status  # Should be clean
git log origin/<branch>..HEAD  # Should be empty
```

**If not empty:** Push commits and wait for deployment.

---

## Step 2: Verify GitHub Actions

```bash
gh run list --branch <branch> --limit 5
```

**If stuck (>10 min):** `gh run view <run-id>` to check step
**If failed:** Check error, fix code, push again
**If queued >5 min:** Wait or re-run from GitHub UI

---

## Step 3: Verify Frontend Deployment

```bash
curl -I https://dev.unitedwerise.org/index.html  # Check Last-Modified
```

**If old date:** Wait 2-3 minutes, hard refresh browser.

---

## Step 4: Verify Backend Docker Build

```bash
az acr task list-runs --registry uwracr2425 --output table
```

**If failed:** `az acr task logs --registry uwracr2425 --run-id <id>`
**Common causes:** TypeScript error, npm install failure, Dockerfile error

---

## Step 5: Verify Container App Revision

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

---

## Step 6: Verify Container Image

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

---

## Step 7: Verify Deployed SHA

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

---

## Step 8: Verify Container Restart

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

---

## Step 9: Nuclear Option

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

---

## Verification

After troubleshooting:
- [ ] Health endpoint responds (not 500)
- [ ] Correct releaseSha
- [ ] Correct databaseHost
- [ ] Uptime < 300 seconds
- [ ] No errors in logs
- [ ] Changes visible on live site

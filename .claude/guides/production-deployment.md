# Production Deployment Guide

**Last Updated**: 2025-10-09
**Purpose**: Step-by-step production deployment procedure with safety checks

---

## ⚠️ CRITICAL RULES

**ONLY deploy to production when:**
- User explicitly says "deploy to production" or equivalent
- All staging verification complete
- User has reviewed and approved changes
- No ambiguity about production intent

**ASK before deploying to production if:**
- User mentions "production" but without clear directive
- Staging verification incomplete
- Changes are high-risk (payment, auth, data)
- Any uncertainty about whether user wants production deployment

---

## Pre-Deployment Validation

Run ALL these checks before deploying to production:

```bash
# 1. Verify working tree is clean
git status
# Must show: "nothing to commit, working tree clean"

# 2. Verify TypeScript compiles
cd backend && npm run build

# 3. Validate database schema
cd backend && npx prisma validate && npx prisma generate

# 4. Check for unpushed commits
git log origin/development..HEAD
# Should show: no output (all commits pushed)

# 5. Verify staging is working
curl -s "https://dev-api.unitedwerise.org/health"
# Should show: database:connected, recent uptime

# 6. Check recent commits for issues
git log -5 --oneline
```

---

## Production Deployment Procedure

**IMPORTANT**: User must explicitly direct branch change to main.

### Step 1: Merge to Main Branch

```bash
# Only execute when user explicitly approves
git checkout main
git pull origin main
git merge development
git push origin main
```

### Step 2: Build Docker Image

```bash
# Capture current commit SHA
GIT_SHA=$(git rev-parse --short HEAD)

# Create unique production tag
DOCKER_TAG="backend-prod-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"

# Build image from main branch
az acr build --registry uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --no-wait \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend

# Wait for build to complete (typically 2-3 minutes)
sleep 180

# Verify build succeeded
az acr task list-runs --registry uwracr2425 --output table | head -3
# Look for: Status "Succeeded", recent StartTime
```

**If build fails:**
```bash
# Get run ID from table output above
RUN_ID="<run-id-from-table>"

# Check build logs
az acr task logs --registry uwracr2425 --run-id $RUN_ID

# Common issues:
# - TypeScript compilation error: Fix in code, commit, push, retry
# - npm install failure: Check package.json dependencies
# - Dockerfile syntax error: Review Dockerfile changes
```

### Step 3: Get Image Digest

```bash
# Get digest for exact image identification
DIGEST=$(az acr repository show --name uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --query "digest" -o tsv)

# Verify digest retrieved
echo "Image digest: $DIGEST"
# Should show: sha256:... (64 character hash)
```

### Step 4: Deploy to Production Container App

```bash
# Update production backend with new image
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "prod-$GIT_SHA-$(date +%H%M%S)" \
  --set-env-vars \
    NODE_ENV=production \
    RELEASE_SHA=$GIT_SHA \
    RELEASE_DIGEST=$DIGEST

# Force single revision mode (prevent traffic split)
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-mode Single

# Wait for container to start
sleep 30
```

### Step 5: Verify Production Deployment

```bash
# Check health endpoint
curl -s "https://api.unitedwerise.org/health"
# Should show:
# - status: "ok"
# - database: "connected"
# - releaseSha: matching $GIT_SHA
# - uptime: < 60 seconds

# Verify specific SHA matches
DEPLOYED_SHA=$(curl -s "https://api.unitedwerise.org/health" | \
  grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)

echo "Local SHA: $GIT_SHA"
echo "Deployed SHA: $DEPLOYED_SHA"
# Must match exactly

# Check error logs for issues
az containerapp logs show \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --tail 50
# Look for: Clean startup, no errors
```

---

## Post-Deployment Verification

After deployment completes, verify all critical functionality:

### Backend API Verification
```bash
# Test health endpoint
curl -s "https://api.unitedwerise.org/health"

# Test authentication (requires valid token)
curl -s "https://api.unitedwerise.org/api/user/profile" \
  -H "Authorization: Bearer <token>"

# Monitor error logs for 5 minutes
az containerapp logs show \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --follow
# Press Ctrl+C after 5 minutes if no errors
```

### Frontend Verification
```bash
# Check frontend updated (if frontend changes included)
curl -I https://www.unitedwerise.org/
# Look for: Recent Date header

# Force browser cache clear
# Visit: https://www.unitedwerise.org/
# Press: Ctrl+Shift+R (Chrome/Firefox) or Cmd+Shift+R (Mac)
```

### Database Verification
```bash
# If database migrations were included
cd backend
DATABASE_URL="<production-url>" npx prisma migrate status
# Should show: "Database schema is up to date!"

# Verify database connectivity
curl -s "https://api.unitedwerise.org/health" | grep database
# Should show: "database":"connected"
```

---

## Rollback Procedure

If deployment fails or causes issues:

### Immediate Rollback

```bash
# List recent revisions
az containerapp revision list \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --output table

# Identify previous working revision
PREVIOUS_REVISION="<revision-name-from-table>"

# Activate previous revision
az containerapp revision activate \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision $PREVIOUS_REVISION

# Deactivate failed revision
FAILED_REVISION="<current-revision-name>"
az containerapp revision deactivate \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision $FAILED_REVISION

# Verify rollback
sleep 30
curl -s "https://api.unitedwerise.org/health"
```

### Git Rollback

```bash
# Revert commit on main branch
git checkout main
git revert HEAD
git push origin main

# Redeploy with reverted code
# Follow Steps 2-5 above
```

### Database Rollback

```bash
# Only if database migration caused issues
# See database-migration-protocol.md for full procedure

# Quick rollback: Mark migration as rolled back
DATABASE_URL="<production-url>" npx prisma migrate resolve \
  --rolled-back <migration-name>

# Manual SQL rollback may be required
# Review migration.sql and write reverse operations
```

---

## Emergency Hotfix Procedure

For critical production issues requiring immediate fix:

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue

# 2. Implement minimum viable fix
# Make only essential changes

# 3. Test locally
cd backend && npm run build

# 4. Commit and push
git add .
git commit -m "hotfix: Description of critical fix"
git push origin hotfix/critical-issue

# 5. Merge to main
git checkout main
git merge hotfix/critical-issue
git push origin main

# 6. Deploy following Steps 2-5 above

# 7. Merge hotfix to development
git checkout development
git merge hotfix/critical-issue
git push origin development
```

---

## Production Deployment Checklist

Before deploying, verify:

- [ ] Staging environment tested and working
- [ ] User explicitly approved production deployment
- [ ] All tests passing locally
- [ ] TypeScript compiles without errors
- [ ] Database migrations tested on staging
- [ ] No console errors in browser (if frontend changes)
- [ ] API endpoints return expected responses
- [ ] Authentication working on staging
- [ ] No hardcoded staging URLs in code
- [ ] Environment variables configured correctly
- [ ] Rollback plan prepared

After deploying, verify:

- [ ] Health endpoint shows correct SHA
- [ ] Container uptime < 60 seconds
- [ ] Database connected
- [ ] No errors in container logs
- [ ] Frontend accessible (if frontend changes)
- [ ] API endpoints working
- [ ] Authentication working
- [ ] Monitor for 5-10 minutes for errors

---

## Common Deployment Issues

### Issue: Container not pulling new image
**Symptom**: Health endpoint shows old SHA after deployment
**Solution**:
```bash
# Force new revision with explicit image
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "force-$(date +%H%M%S)"
```

### Issue: Traffic split to old revision
**Symptom**: Intermittent old behavior, some requests show old code
**Solution**:
```bash
# Force single revision mode
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-mode Single
```

### Issue: Container failing to start
**Symptom**: Deployment succeeds but health endpoint returns 503
**Solution**:
```bash
# Check container logs for startup errors
az containerapp logs show \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --tail 100

# Common causes:
# - Database connection failure (check DATABASE_URL)
# - Missing environment variables
# - Port binding error
# - Prisma client not generated
```

### Issue: Database migration fails
**Symptom**: Container starts but database queries fail
**Solution**:
```bash
# Check migration status
DATABASE_URL="<production-url>" npx prisma migrate status

# Apply pending migrations
DATABASE_URL="<production-url>" npx prisma migrate deploy

# If migration already applied but tables missing:
# See database-migration-protocol.md
```

---

## Related Documentation

- **Deployment Failure Diagnosis**: `.claude/guides/deployment-failure-diagnosis.md`
- **Database Migration Protocol**: `.claude/guides/database-migration-protocol.md`
- **Project CLAUDE.md**: Environment configuration and Azure resources

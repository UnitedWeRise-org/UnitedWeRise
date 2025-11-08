# Docker Deployment SOP - UnitedWeRise Backend

## 🎉 **UPDATE: AUTOMATED DEPLOYMENT (October 2025)**

**Backend deployment is now FULLY AUTOMATED via GitHub Actions!**

**What this means:**
- Push to `development` → Staging auto-deploys in 5-7 minutes
- Push to `main` → Production auto-deploys in 5-7 minutes
- Database migrations automatically applied BEFORE code deployment
- Manual deployment only needed for emergencies

**Primary Documentation:**
- `docs/DEPLOYMENT-MIGRATION-POLICY.md` - Complete automated deployment policy
- `.claude/protocols/deployment-procedures.md` - Deployment procedures with automated workflow
- MASTER_DOCUMENTATION.md § 15 - Deployment & Infrastructure

**Manual deployment methods below are for EMERGENCY USE ONLY when GitHub Actions unavailable.**

---

## 🚨 **CRITICAL: Docker Build Failures (September 2025)**

### **Root Cause:**
- Azure packages now require Node.js ≥20.0.0
- ~~Current Dockerfile uses Node 18-alpine~~ **FIXED**: Now uses Node 20-alpine
- Results in engine compatibility errors during TypeScript compilation (historical issue)

### **CURRENT STATUS:**
✅ **FIXED** - Dockerfile updated to Node 20-alpine

---

## **DEPLOYMENT METHODS**

### **Method 1: Automated via GitHub Actions (PRIMARY - October 2025)**
```bash
# Developer workflow - GitHub Actions handles everything automatically:

# 1. Make changes and create migration if needed
cd backend
npx prisma migrate dev --name "description"  # If schema changed

# 2. Commit migration + schema together
git add prisma/migrations/ prisma/schema.prisma
git commit -m "feat: Add migration for [description]"

# 3. Push to GitHub - automation handles the rest!
git push origin development  # Staging auto-deploys
# OR
git push origin main          # Production auto-deploys

# GitHub Actions automatically:
# - Builds Docker image
# - Validates schema
# - Applies migrations
# - Deploys container
# - Verifies health

# Monitor at: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
# Time: 5-7 minutes
```

**Workflows:**
- `.github/workflows/backend-staging-autodeploy.yml` - Staging (development branch)
- `.github/workflows/backend-production-autodeploy.yml` - Production (main branch)

---

### **Method 2: Manual Docker Build (EMERGENCY FALLBACK)**

**⚠️ USE ONLY WHEN:**
- GitHub Actions unavailable or failing
- Emergency requiring immediate manual intervention
- Testing deployment pipeline changes

```bash
# ⚠️ CRITICAL: Apply migrations FIRST (migration-first principle)
cd backend
DATABASE_URL="<production-url>" npx prisma migrate deploy
DATABASE_URL="<production-url>" npx prisma migrate status  # Verify

# Step 1: ALWAYS commit first
git add . && git commit -m "Description" && git push origin main

# Step 2: Build new image from GitHub
GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-prod-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"
az acr build --registry uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" \
  https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend

# Step 3: Deploy the new image
az containerapp update --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend:$DOCKER_TAG" \
  --set-env-vars NODE_ENV=production RELEASE_SHA=$GIT_SHA

# Step 4: Verify deployment
sleep 30
curl "https://api.unitedwerise.org/health" | grep uptime
```

---

### **Method 3: Emergency Rollback (LAST RESORT)**
When recent deployment breaks production:
```bash
# List recent revisions
az containerapp revision list \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --output table

# Activate previous working revision
az containerapp revision activate \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision <previous-revision-name>
```

---

## **BUILD STATUS VERIFICATION**

### **Check Recent Build Status:**
```bash
az acr task list-runs --registry uwracr2425 --top 3
```

### **Success Indicators:**
- `"status": "Succeeded"`
- `"runErrorMessage": null`
- `"outputImages"` contains new image data

### **Failure Indicators:**
- `"status": "Failed"`  
- `"runErrorMessage": "failed during run, err: exit status 1"`
- `"outputImages": null`

### **Deployment Verification:**
```bash
curl "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" | grep uptime
```
- **Fresh deployment**: uptime < 60 seconds
- **Stale deployment**: uptime in minutes/hours

---

## **TROUBLESHOOTING GUIDE**

### **Issue**: Docker build fails with "exit status 1"
**Cause**: Node.js version incompatibility  
**Fix**: Update Dockerfile to use Node 20-alpine

### **Issue**: Unicode encoding errors in Azure CLI
**Cause**: Windows console character encoding  
**Impact**: Display only - does not affect build success/failure  
**Action**: Ignore encoding errors, check actual build status

### **Issue**: Environment variable deployments don't update code
**Cause**: Environment restarts use existing Docker image  
**Fix**: Always build new Docker image for code changes

### **Issue**: Frontend changes not appearing
**Cause**: GitHub Actions deployment pending  
**Check**: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
**Time**: Usually 2-5 minutes after git push

---

## **DECISION MATRIX**

| Change Type | Method | Database Migration | Deployment Time |
|-------------|--------|-------------------|----------------|
| Frontend only | GitHub Actions auto-deploy | No | 3-5 minutes |
| Backend code only | GitHub Actions auto-deploy (Method 1) | No | 5-7 minutes |
| Database schema + Backend | GitHub Actions auto-deploy (Method 1) | Yes (automatic) | 5-7 minutes |
| Emergency manual deploy | Manual Docker build (Method 2) | Yes (manual) | 10-15 minutes |
| Emergency rollback | Container revision rollback (Method 3) | No | 2-3 minutes |
| Full stack | GitHub Actions auto-deploy | If schema changed | 5-7 minutes |

**Migration Handling:**
- **Automated (Method 1)**: GitHub Actions runs `prisma migrate deploy` automatically before deploying code
- **Manual (Method 2)**: Must run `DATABASE_URL="..." npx prisma migrate deploy` before deploying container
- **Rollback (Method 3)**: Does NOT rollback database - only reverts code

---

## **RELIABILITY IMPROVEMENTS**

1. **Always use working Docker image as fallback**
2. **Test database migrations separately before backend deployment**
3. **Monitor GitHub Actions for frontend deployments**
4. **Keep successful Docker tags for rollbacks**
5. **Update Dockerfile Node version when engine conflicts arise**

---

**Last Updated**: November 7, 2025 - Updated for automated GitHub Actions deployment (October 2025)
**Previous Update**: September 5, 2025 - Node 20 migration
**Next Review**: When Azure package dependencies change or deployment automation changes
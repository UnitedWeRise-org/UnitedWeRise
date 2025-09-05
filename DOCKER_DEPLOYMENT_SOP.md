# Docker Deployment SOP - UnitedWeRise Backend

## 🚨 **CRITICAL: Docker Build Failures (September 2025)**

### **Root Cause:**
- Azure packages now require Node.js ≥20.0.0
- Current Dockerfile uses Node 18-alpine
- Results in engine compatibility errors during TypeScript compilation

### **IMMEDIATE FIX:**
Update `backend/Dockerfile` line 1:
```dockerfile
# OLD (causes failures):
FROM node:18-alpine AS builder

# NEW (works):
FROM node:20-alpine AS builder
```

---

## **PROVEN DEPLOYMENT METHODS**

### **Method 1: Full Docker Build (PREFERRED)**
```bash
# Step 1: ALWAYS commit first
git add . && git commit -m "Description" && git push origin main

# Step 2: Build new image from GitHub
az acr build --registry uwracr2425 --image unitedwerise-backend:$(date +%Y%m%d-%H%M) https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend

# Step 3: Deploy the new image
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --image uwracr2425.azurecr.io/unitedwerise-backend:$(date +%Y%m%d-%H%M)
```

### **Method 2: Emergency Deployment (FALLBACK)**
When Docker builds fail, use environment variable restart with existing working image:
```bash
# Use last known working image with forced restart
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --image uwracr2425.azurecr.io/unitedwerise-backend:totp-working-20250904-1333 --set-env-vars FORCE_RESTART=$(date +%s)
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

| Change Type | Method | Database Migration | Docker Build Required |
|-------------|--------|-------------------|---------------------|
| Frontend only | GitHub Actions auto-deploy | No | No |
| Backend code only | Method 1 (Docker build) | No | Yes |
| Database schema + Backend | Method 1 + Migration first | Yes | Yes |
| Emergency fix | Method 2 (Fallback) | No | No |
| Full stack | Method 1 + GitHub Actions | If schema changed | Yes |

---

## **RELIABILITY IMPROVEMENTS**

1. **Always use working Docker image as fallback**
2. **Test database migrations separately before backend deployment**
3. **Monitor GitHub Actions for frontend deployments**
4. **Keep successful Docker tags for rollbacks**
5. **Update Dockerfile Node version when engine conflicts arise**

---

**Last Updated**: September 5, 2025  
**Next Review**: When Azure package dependencies change
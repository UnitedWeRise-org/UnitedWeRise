# Azure Container Apps Deployment Troubleshooting Protocol

## 🚨 When Changes Don't Appear After Deployment

Use this step-by-step protocol whenever you've deployed updates but they're not reflected in the live application.

---

## 📋 **STEP 1: Diagnostic Assessment**

### Check Current State
```bash
# 1. Check what image is actually running
az containerapp show -n <app-name> -g <resource-group> \
  --query "properties.template.containers[0].image"

# 2. List all revisions (shows active/inactive status)
az containerapp revision list -n <app-name> -g <resource-group> -o table

# 3. Check traffic routing (where requests are going)
az containerapp ingress traffic show -n <app-name> -g <resource-group>

# 4. Get current configuration
az containerapp show -n <app-name> -g <resource-group> \
  --query "properties.configuration.activeRevisionsMode"
```

### Interpret Results
- **Multiple revisions**: Look for which one is marked `active` and getting traffic
- **Traffic split**: Check if traffic is split between old/new revisions  
- **Revision mode**: `Single` vs `Multiple` affects behavior

---

## 🎯 **STEP 2: Common Fix - Traffic Routing**

**Problem**: New revision exists but traffic still goes to old revision

### Solution
```bash
# Force 100% traffic to latest revision
az containerapp ingress traffic set -n <app-name> -g <resource-group> \
  --revision-weight latest=100

# Alternative: Route to specific revision
az containerapp ingress traffic set -n <app-name> -g <resource-group> \
  --revision-weight <revision-name>=100
```

### Verification
```bash
# Confirm traffic routing changed
az containerapp ingress traffic show -n <app-name> -g <resource-group>
```

---

## 🔄 **STEP 3: Force Revision Restart**

**Problem**: Same revision running but needs to pick up new code/config

### Find Active Revision
```bash
# Get the name of the currently active revision
ACTIVE_REVISION=$(az containerapp revision list -n <app-name> -g <resource-group> \
  --query "[?active].name" -o tsv)

echo "Active revision: $ACTIVE_REVISION"
```

### Restart Specific Revision
```bash
# Restart the active revision
az containerapp revision restart -n <app-name> -g <resource-group> \
  --revision $ACTIVE_REVISION
```

---

## 🚀 **STEP 4: Force New Revision Creation**

**Problem**: No new revision created or need to guarantee fresh deployment

### Using Unique Tags (Recommended)
```bash
# Create new revision with unique tag and suffix
az containerapp update -n <app-name> -g <resource-group> \
  --image <registry>.azurecr.io/<image>:<unique-tag> \
  --revision-suffix $(date +%Y%m%d-%H%M%S)

# Example for UnitedWeRise:
az containerapp update -n unitedwerise-backend -g unitedwerise-rg \
  --image uwrregistry.azurecr.io/uwr-backend:$(git rev-parse --short HEAD) \
  --revision-suffix deploy-$(date +%Y%m%d-%H%M%S)
```

### Force Update with Environment Variable
```bash
# Add timestamp to force new revision
az containerapp update -n <app-name> -g <resource-group> \
  --set-env-vars "DEPLOY_TIMESTAMP=$(date +%s)"
```

### Force Update with Resource Changes
```bash
# Slightly modify resources to trigger new revision
az containerapp update -n <app-name> -g <resource-group> \
  --cpu 0.25 --memory 0.5Gi
```

---

## 📊 **STEP 5: Monitor and Verify**

### Watch Deployment Process
```bash
# Stream logs to see deployment/restart happening
az containerapp logs show -n <app-name> -g <resource-group> --follow

# Check revision status
watch "az containerapp revision list -n <app-name> -g <resource-group> -o table"
```

### Application-Level Verification
```bash
# Check health endpoint
curl https://<app-url>/health

# For UnitedWeRise specifically:
curl https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health
```

### Browser Verification
1. **Hard refresh** (Ctrl+F5 / Cmd+Shift+R)
2. **Check console logs** for new debug messages
3. **Verify backend uptime** has reset to low number
4. **Test new functionality**

---

## 🔧 **STEP 6: Advanced Troubleshooting**

### Check Container Registry
```bash
# Verify image exists in registry
az acr repository show-tags -n <registry-name> --repository <image-name>

# Check if latest tag was updated
az acr repository show-manifests -n <registry-name> --repository <image-name> \
  --query "[?tags[?contains(@, 'latest')]]"
```

### Manual Revision Management
```bash
# Deactivate old revisions
az containerapp revision deactivate -n <app-name> -g <resource-group> \
  --revision <old-revision-name>

# List and clean up old revisions
az containerapp revision list -n <app-name> -g <resource-group> \
  --query "[?!active].name" -o tsv | head -5
```

### CDN/Cache Busting (if applicable)
```bash
# If using Azure Front Door
az afd endpoint purge -g <resource-group> --profile-name <profile> \
  --endpoint-name <endpoint> --content-paths '/*'

# If using Azure CDN
az cdn endpoint purge -g <resource-group> --profile-name <profile> \
  -n <endpoint> --content-paths '/*'
```

---

## 📝 **UnitedWeRise Specific Commands**

### Quick Deployment Fix
```bash
# Standard troubleshooting for UnitedWeRise
APP_NAME="unitedwerise-backend"
RESOURCE_GROUP="unitedwerise-rg"

# 1. Check status
az containerapp revision list -n $APP_NAME -g $RESOURCE_GROUP -o table
az containerapp ingress traffic show -n $APP_NAME -g $RESOURCE_GROUP

# 2. Force traffic to latest
az containerapp ingress traffic set -n $APP_NAME -g $RESOURCE_GROUP --revision-weight latest=100

# 3. If needed, restart active revision
ACTIVE_REV=$(az containerapp revision list -n $APP_NAME -g $RESOURCE_GROUP --query "[?active].name" -o tsv)
az containerapp revision restart -n $APP_NAME -g $RESOURCE_GROUP --revision $ACTIVE_REV

# 4. Monitor
az containerapp logs show -n $APP_NAME -g $RESOURCE_GROUP --follow
```

### Force New Deployment
```bash
# Create guaranteed new revision with timestamp
az containerapp update -n unitedwerise-backend -g unitedwerise-rg \
  --set-env-vars "DEPLOY_TIMESTAMP=$(date +%s)" \
  --revision-suffix "deploy-$(date +%Y%m%d-%H%M%S)"
```

---

## ✅ **Success Indicators**

### Backend Indicators
- **Uptime drops** to minutes instead of hours
- **New revision appears** in revision list as active
- **Health endpoint** returns recent timestamp
- **Logs show** startup messages

### Frontend Indicators  
- **Build timestamp** updates in deployment status
- **Console logs** show new debug messages
- **New functionality** works as expected
- **Browser cache** cleared behavior

---

## 🚨 **Emergency Rollback**

If new deployment breaks something:

```bash
# Find previous working revision
az containerapp revision list -n <app-name> -g <resource-group> -o table

# Route traffic back to previous revision
az containerapp ingress traffic set -n <app-name> -g <resource-group> \
  --revision-weight <previous-revision-name>=100

# Deactivate problematic revision
az containerapp revision deactivate -n <app-name> -g <resource-group> \
  --revision <problematic-revision-name>
```

---

## 📚 **References**

- [Azure Container Apps Revisions](https://docs.microsoft.com/en-us/azure/container-apps/revisions)
- [Traffic Splitting](https://docs.microsoft.com/en-us/azure/container-apps/traffic-splitting)  
- [Container Apps CLI Reference](https://docs.microsoft.com/en-us/cli/azure/containerapp)

---

**💡 Pro Tip**: Always use unique image tags (git SHA, build number) instead of `:latest` to avoid ambiguity and ensure predictable deployments.
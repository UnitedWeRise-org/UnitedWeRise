#!/bin/bash

# Production Deployment Script - Deploy latest development to production
# This script handles the complete deployment pipeline

set -e  # Exit on any error

echo "🚀 Starting Production Deployment Pipeline"
echo "=========================================="

# Step 1: Handle local changes and switch to main
echo "📝 Handling local changes and preparing branches..."
git stash push -m "Auto-stash before production deployment $(date)"
git checkout main
git pull origin main

# Step 2: Merge development to main
echo "🔀 Merging development to main..."
git merge development
git push origin main

# Step 3: Get current commit for deployment tracking
GIT_SHA=$(git rev-parse --short HEAD)
echo "📋 Deploying commit: $GIT_SHA"

# Step 4: Build Docker image for production
echo "🏗️ Building production Docker image..."
DOCKER_TAG="backend-prod-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"
echo "🏷️ Docker tag: $DOCKER_TAG"

az acr build --registry uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --no-wait https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend

echo "⏳ Waiting for Docker build to complete (typically 2-3 minutes)..."
sleep 180

# Step 5: Verify build succeeded
echo "🔍 Checking build status..."
BUILD_STATUS=$(az acr task list-runs --registry uwracr2425 --output table | head -3 | tail -1 | awk '{print $4}')
echo "Build status: $BUILD_STATUS"

if [ "$BUILD_STATUS" != "Succeeded" ]; then
    echo "❌ Docker build failed! Check Azure Container Registry for details."
    exit 1
fi

# Step 6: Get image digest for immutable deployment
echo "🎯 Getting image digest for deployment..."
DIGEST=$(az acr repository show --name uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --query "digest" -o tsv)
echo "Image digest: $DIGEST"

# Step 7: Deploy to production with release metadata
echo "🚀 Deploying to production backend..."
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "prod-$GIT_SHA-$(date +%H%M%S)" \
  --set-env-vars \
    NODE_ENV=production \
    RELEASE_SHA=$GIT_SHA \
    RELEASE_DIGEST=$DIGEST \
    DOCKER_TAG=$DOCKER_TAG \
    DEPLOYMENT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Step 8: Force single-revision mode for production
echo "⚙️ Setting single-revision mode..."
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-mode Single

# Step 9: Wait for deployment and verify
echo "⏳ Waiting for deployment to complete..."
sleep 45

echo "🔍 Verifying production deployment..."
DEPLOYED_SHA=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
UPTIME=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"uptime":[^,]*' | cut -d':' -f2)

echo "✅ Deployment Verification:"
echo "   Expected SHA: $GIT_SHA"
echo "   Deployed SHA: $DEPLOYED_SHA"
echo "   Container uptime: $UPTIME seconds"

if [ "$DEPLOYED_SHA" = "$GIT_SHA" ]; then
    echo "🎉 PRODUCTION DEPLOYMENT SUCCESSFUL!"
    echo "✅ Release SHA matches: $GIT_SHA"
    echo "✅ Fresh container deployed (uptime: $UPTIME seconds)"

    echo ""
    echo "🔐 Admin credentials for testing:"
    echo "   Email: admin@unitedwerise.org"
    echo "   Password: admin123!"
    echo ""
    echo "🌐 Production URLs:"
    echo "   Frontend: https://www.unitedwerise.org"
    echo "   Backend:  https://api.unitedwerise.org"
    echo "   Health:   https://api.unitedwerise.org/health"
else
    echo "❌ DEPLOYMENT VERIFICATION FAILED!"
    echo "   Expected: $GIT_SHA"
    echo "   Deployed: $DEPLOYED_SHA"
    echo "   Check Azure Container Apps for issues"
    exit 1
fi

# Step 10: Restore development branch
echo "🔄 Returning to development branch..."
git checkout development
git stash pop || echo "⚠️ No stash to restore"

echo "🎉 Production deployment pipeline complete!"
#!/bin/bash

# Streamlined Production Deployment Script
# Handles all git operations in batch to avoid prompts

set -e  # Exit on any error

echo "🚀 Starting streamlined production deployment..."

# Step 1: Batch all git operations together
echo "📋 Step 1: Handling all git operations..."

# Ensure we're on development and up to date
git checkout development
git pull origin development

# Get current SHA for tracking
GIT_SHA=$(git rev-parse --short HEAD)
echo "Current development SHA: $GIT_SHA"

# Switch to main and handle merge
git checkout main
git pull origin main

# Attempt merge - if conflicts, handle them
echo "Attempting to merge development to main..."
if git merge development --no-edit; then
    echo "✅ Merge successful"
else
    echo "❌ Merge conflicts detected. Resolving automatically..."

    # For deployment, we want development changes to take precedence
    # Accept development version for conflicted files
    git checkout --theirs .
    git add .
    git commit -m "deploy: Resolve merge conflicts - accept development changes for production deployment

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    echo "✅ Merge conflicts resolved"
fi

# Push to main
git push origin main
echo "✅ All git operations complete"

# Step 2: Build and deploy Docker image
echo "📋 Step 2: Building Docker image for production..."

DOCKER_TAG="backend-prod-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"

az acr build --registry uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --no-wait https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend
echo "Production build queued with tag: $DOCKER_TAG for commit: $GIT_SHA"

# Step 3: Wait for build completion
echo "📋 Step 3: Waiting for Docker build to complete..."
sleep 180

# Verify build succeeded
echo "Checking build status..."
BUILD_STATUS=$(az acr task list-runs --registry uwracr2425 --output table | head -3 | tail -1 | awk '{print $5}')
if [ "$BUILD_STATUS" = "Succeeded" ]; then
    echo "✅ Docker build succeeded"
else
    echo "❌ Docker build failed. Status: $BUILD_STATUS"
    exit 1
fi

# Step 4: Get image digest and deploy
echo "📋 Step 4: Deploying to production..."

DIGEST=$(az acr repository show --name uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --query "digest" -o tsv)
echo "Image digest: $DIGEST"

# Deploy to production
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

# Force single-revision mode
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-mode Single

echo "📋 Step 5: Verifying deployment..."
sleep 30

# Verify deployment
DEPLOYED_SHA=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
if [ "$DEPLOYED_SHA" = "$GIT_SHA" ]; then
    echo "✅ Production deployment verified: Release SHA matches ($GIT_SHA)"
else
    echo "❌ Deployment verification failed: Expected $GIT_SHA, got $DEPLOYED_SHA"
    exit 1
fi

# Check uptime
UPTIME=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"uptime":[^,]*' | cut -d':' -f2)
echo "Production container uptime: $UPTIME seconds"

echo "🎉 Production deployment complete!"
echo "Backend: https://api.unitedwerise.org"
echo "Frontend: https://www.unitedwerise.org"
echo "Release SHA: $GIT_SHA"
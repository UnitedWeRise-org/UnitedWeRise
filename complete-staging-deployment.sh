#!/bin/bash

# Complete the staging deployment of security fixes
# Run this after the Docker build finishes

DOCKER_TAG="backend-manual-179ba31-20251007-120550"
GIT_SHA="179ba31"

echo "🔍 Checking if Docker build is complete..."
BUILD_STATUS=$(az acr task list-runs --registry uwracr2425 --top 1 --output json | grep -o '"status": "[^"]*"' | cut -d'"' -f4)

echo "Build status: $BUILD_STATUS"
echo ""

if [ "$BUILD_STATUS" != "Succeeded" ]; then
    echo "⏳ Build not yet complete. Current status: $BUILD_STATUS"
    echo ""
    echo "Wait a few more minutes and run this script again:"
    echo "bash complete-staging-deployment.sh"
    exit 1
fi

echo "✅ Build completed successfully!"
echo ""

# Get image digest
echo "🔍 Getting image digest..."
DIGEST=$(az acr repository show --name uwracr2425 \
  --image "unitedwerise-backend:$DOCKER_TAG" \
  --query "digest" -o tsv)

echo "Image digest: $DIGEST"
echo ""

# Deploy to Container App
echo "🚀 Deploying to staging..."
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "sec-${GIT_SHA}-$(date +%H%M%S)" \
  --set-env-vars \
    NODE_ENV=staging \
    STAGING_ENVIRONMENT=true \
    RELEASE_SHA=$GIT_SHA \
    RELEASE_DIGEST=$DIGEST

echo ""
echo "🔧 Setting single revision mode..."
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-mode Single

echo ""
echo "⏳ Waiting 30 seconds for container to start..."
sleep 30

# Verify deployment
echo ""
echo "✅ Verifying deployment..."
HEALTH_RESPONSE=$(curl -s "https://dev-api.unitedwerise.org/health")
echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"

echo ""
echo "🔍 Checking deployed SHA..."
DEPLOYED_SHA=$(echo "$HEALTH_RESPONSE" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)

if [ "$DEPLOYED_SHA" = "$GIT_SHA" ]; then
    echo ""
    echo "============================================"
    echo "🎉 SUCCESS! Security fixes deployed!"
    echo "============================================"
    echo ""
    echo "✅ Staging backend is now running the security-patched code"
    echo "✅ Commit: $GIT_SHA"
    echo "✅ Backend: https://dev-api.unitedwerise.org"
    echo "✅ Frontend: https://dev.unitedwerise.org"
    echo ""
    echo "Security fixes applied:"
    echo "  - JWT secret validation"
    echo "  - SQL injection prevention"
    echo "  - Admin route protection"
    echo "  - Password reset token security"
    echo "  - CORS bypass removed"
    echo "  - Session blacklist improved"
    echo "  - HTTPS enforcement enabled"
    echo ""
else
    echo "⚠️  Warning: Deployed SHA ($DEPLOYED_SHA) doesn't match expected ($GIT_SHA)"
    echo "Container may still be starting up. Check again in 1 minute:"
    echo "curl -s https://dev-api.unitedwerise.org/health | grep releaseSha"
fi

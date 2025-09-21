#!/bin/bash
# Quick Staging Deployment Script
# Usage: ./scripts/quick-deploy-staging.sh "commit message"

COMMIT_MSG=${1:-"feat: Quick staging deployment $(date +%Y%m%d-%H%M%S)"}

echo "🚀 Quick staging deployment starting..."
echo "📝 Commit message: $COMMIT_MSG"
echo ""

# Pre-flight checks
echo "1️⃣ Running pre-commit validation..."
if ! ./scripts/validate-before-commit.sh; then
    echo "❌ Validation failed - aborting deployment"
    exit 1
fi

echo ""
echo "2️⃣ Committing and pushing changes..."
git add .
git commit -m "$COMMIT_MSG"
git push origin development

echo ""
echo "3️⃣ Waiting for auto-deployment (frontend)..."
echo "   Frontend deploys automatically from development branch"
echo "   Expected deployment time: 2-5 minutes"

echo ""
echo "4️⃣ Backend deployment (if needed)..."
echo "   ⚠️  Backend requires manual deployment via Azure CLI"
echo "   💡 Run backend deployment if you made backend changes:"
echo "      cd backend && npm run build"
echo "      [Azure CLI deployment commands from CLAUDE.md]"

echo ""
echo "🔍 Monitoring deployment..."
for i in {1..6}; do
    echo "   Checking in $(( (6-i) * 30 )) seconds... ($i/6)"
    sleep 30

    if curl -s "https://dev.unitedwerise.org" > /dev/null 2>&1; then
        echo "   ✅ Frontend responsive"
        break
    else
        echo "   ⏳ Frontend still deploying..."
    fi
done

echo ""
echo "5️⃣ Final verification..."
./scripts/test-api-endpoints.sh staging

echo ""
echo "✅ Staging deployment complete!"
echo "🌐 Test your changes at: https://dev.unitedwerise.org"
echo "🛡️ Admin access: https://dev.unitedwerise.org/admin-dashboard.html"
echo ""
echo "💡 Next steps:"
echo "   - Test your changes thoroughly on staging"
echo "   - If everything works, request production deployment"
echo "   - Monitor for any issues before proceeding"
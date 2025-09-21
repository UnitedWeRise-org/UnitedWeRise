#!/bin/bash
# Emergency Rollback Script
# Usage: ./scripts/emergency-rollback.sh [staging|production] [reason]

ENVIRONMENT=${1:-staging}
REASON=${2:-"Emergency rollback - no reason specified"}

if [ "$ENVIRONMENT" = "production" ]; then
    echo "🚨 EMERGENCY PRODUCTION ROLLBACK"
    echo "⚠️  This will revert production to the previous stable state"
    echo ""
    read -p "Are you sure you want to rollback production? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Rollback cancelled"
        exit 1
    fi
else
    echo "🔄 STAGING ROLLBACK"
fi

echo "Reason: $REASON"
echo ""

# Log the rollback attempt
echo "$(date): Emergency rollback initiated - $ENVIRONMENT - $REASON" >> scripts/rollback.log

if [ "$ENVIRONMENT" = "production" ]; then
    echo "1️⃣ Production rollback process:"
    echo "   ⚠️  Automated production rollback not implemented for safety"
    echo "   ⚠️  Manual intervention required"
    echo ""
    echo "🔧 Manual rollback steps:"
    echo "   1. Identify last stable commit:"
    echo "      git log --oneline main | head -5"
    echo ""
    echo "   2. Revert to stable commit:"
    echo "      git checkout main"
    echo "      git revert HEAD --no-edit"
    echo "      git push origin main"
    echo ""
    echo "   3. Verify rollback:"
    echo "      ./scripts/post-deployment-verify.sh production"
    echo ""
    echo "   4. Monitor for 15 minutes"
    echo "      ./scripts/deployment-status.sh"

else
    echo "1️⃣ Staging rollback process:"
    echo "   Reverting development branch to previous commit"
    echo ""

    # Get current commit for reference
    current_commit=$(git rev-parse --short HEAD)
    echo "   Current commit: $current_commit"

    # Get previous commit
    previous_commit=$(git rev-parse --short HEAD~1)
    echo "   Rolling back to: $previous_commit"

    # Perform rollback
    echo ""
    echo "2️⃣ Executing rollback..."

    git checkout development
    if [ $? -ne 0 ]; then
        echo "❌ Failed to checkout development branch"
        exit 1
    fi

    git revert HEAD --no-edit
    if [ $? -ne 0 ]; then
        echo "❌ Failed to revert commit"
        exit 1
    fi

    git push origin development
    if [ $? -ne 0 ]; then
        echo "❌ Failed to push rollback"
        exit 1
    fi

    echo "   ✅ Rollback committed and pushed"

    echo ""
    echo "3️⃣ Waiting for auto-deployment (5 minutes)..."
    for i in {1..10}; do
        echo "   Waiting... $(( (10-i) * 30 )) seconds remaining"
        sleep 30
    done

    echo ""
    echo "4️⃣ Verifying rollback..."
    if ./scripts/post-deployment-verify.sh staging; then
        echo "   ✅ Rollback verification successful"
    else
        echo "   ❌ Rollback verification failed"
        echo "   🚨 Manual intervention required"
        exit 1
    fi
fi

echo ""
echo "📊 Rollback Summary:"
echo "   Environment: $ENVIRONMENT"
echo "   Reason: $REASON"
echo "   Timestamp: $(date)"
if [ "$ENVIRONMENT" = "staging" ]; then
    echo "   Status: ✅ Completed"
    echo "   Previous commit: $current_commit"
    echo "   Rolled back to: $previous_commit"
else
    echo "   Status: ⚠️  Manual steps required"
fi

echo ""
echo "📝 Next steps:"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "   - Follow manual rollback steps above"
    echo "   - Monitor system health closely"
    echo "   - Investigate root cause of failure"
else
    echo "   - Test staging thoroughly"
    echo "   - Investigate and fix the issue"
    echo "   - Re-deploy once fixed"
fi

echo "   - Review rollback.log for details"
echo "   - Document lessons learned"

# Add entry to changelog
{
    echo ""
    echo "## [$(date +%Y-%m-%d)] - Emergency Rollback"
    echo ""
    echo "### Emergency"
    echo "- **Environment**: $ENVIRONMENT"
    echo "- **Reason**: $REASON"
    echo "- **Timestamp**: $(date)"
    if [ "$ENVIRONMENT" = "staging" ]; then
        echo "- **Status**: Completed successfully"
    else
        echo "- **Status**: Manual intervention required"
    fi
    echo ""
} >> rollback-changelog.md

echo ""
echo "📋 Rollback logged to rollback-changelog.md"
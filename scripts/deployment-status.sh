#!/bin/bash
# Quick Deployment Status Check
# Usage: ./scripts/deployment-status.sh

echo "🔍 Checking deployment status across environments..."
echo ""

# Function to check health endpoint
check_health() {
    local env_name=$1
    local url=$2

    echo "📍 $env_name:"

    response=$(curl -s "$url/health" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "   Status: ✅ Online"

        # Extract key info using grep (more compatible than jq)
        release_sha=$(echo "$response" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
        uptime=$(echo "$response" | grep -o '"uptime":[^,}]*' | cut -d':' -f2)

        if [ -n "$release_sha" ]; then
            echo "   Release: $release_sha"
        fi

        if [ -n "$uptime" ]; then
            # Convert uptime to human readable if it's a number
            if [[ $uptime =~ ^[0-9]+$ ]]; then
                hours=$((uptime / 3600))
                minutes=$(((uptime % 3600) / 60))
                echo "   Uptime: ${hours}h ${minutes}m"
            else
                echo "   Uptime: $uptime"
            fi
        fi
    else
        echo "   Status: ❌ Offline or unreachable"
    fi
    echo ""
}

# Check all environments
check_health "Production Backend" "https://api.unitedwerise.org"
check_health "Staging Backend" "https://dev-api.unitedwerise.org"

# Check git status
echo "📋 Local git status:"
echo "   Current branch: $(git branch --show-current)"
echo "   Last commit: $(git log -1 --oneline)"

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "   ⚠️  Uncommitted changes detected"
else
    echo "   ✅ Working tree clean"
fi

echo ""
echo "🌐 Quick access URLs:"
echo "   Production: https://www.unitedwerise.org"
echo "   Staging: https://dev.unitedwerise.org"
echo "   Admin Dashboard: https://www.unitedwerise.org/admin-dashboard.html"
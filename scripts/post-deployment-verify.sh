#!/bin/bash
# Post-Deployment Verification Script
# Usage: ./scripts/post-deployment-verify.sh [staging|production]

ENVIRONMENT=${1:-staging}
VERIFICATION_FAILED=false

if [ "$ENVIRONMENT" = "production" ]; then
    FRONTEND_URL="https://www.unitedwerise.org"
    BACKEND_URL="https://api.unitedwerise.org"
    echo "🚨 Verifying PRODUCTION deployment"
else
    FRONTEND_URL="https://dev.unitedwerise.org"
    BACKEND_URL="https://dev-api.unitedwerise.org"
    echo "🧪 Verifying STAGING deployment"
fi

echo "Frontend: $FRONTEND_URL"
echo "Backend: $BACKEND_URL"
echo ""

# Function to check and report
check_test() {
    local test_name=$1
    local result=$2

    if [ "$result" = "0" ]; then
        echo "   ✅ $test_name"
    else
        echo "   ❌ $test_name FAILED"
        VERIFICATION_FAILED=true
    fi
}

# 1. Backend Health Check
echo "1️⃣ Backend Health & Performance:"
response=$(curl -s "$BACKEND_URL/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   ✅ Backend responding"

    # Check uptime (should be low for fresh deployment)
    uptime=$(echo "$response" | grep -o '"uptime":[^,}]*' | cut -d':' -f2)
    if [[ $uptime =~ ^[0-9]+$ ]] && [ "$uptime" -lt 300 ]; then
        echo "   ✅ Fresh deployment (uptime: ${uptime}s)"
    else
        echo "   ⚠️  Uptime: ${uptime}s (may not be fresh deployment)"
    fi

    # Check release SHA
    release_sha=$(echo "$response" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$release_sha" ]; then
        local_sha=$(git rev-parse --short HEAD)
        if [ "$release_sha" = "$local_sha" ]; then
            echo "   ✅ Release SHA matches local commit ($release_sha)"
        else
            echo "   ⚠️  Release SHA mismatch - deployed: $release_sha, local: $local_sha"
            VERIFICATION_FAILED=true
        fi
    fi
else
    echo "   ❌ Backend not responding"
    VERIFICATION_FAILED=true
fi

echo ""

# 2. Frontend Accessibility
echo "2️⃣ Frontend Accessibility:"
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo "   ✅ Frontend responding"

    # Check if it's actually serving the app (look for key elements)
    frontend_content=$(curl -s "$FRONTEND_URL")
    if echo "$frontend_content" | grep -q "United We Rise" || echo "$frontend_content" | grep -q "unitedwerise"; then
        echo "   ✅ Frontend serving UWR content"
    else
        echo "   ⚠️  Frontend responding but content unclear"
    fi
else
    echo "   ❌ Frontend not responding"
    VERIFICATION_FAILED=true
fi

echo ""

# 3. Critical API Endpoints
echo "3️⃣ Critical API Endpoints:"
test_endpoints=(
    "/health:200"
    "/api/version:200"
    "/api/trending/topics:200"
    "/api/auth/me:401"
    "/api/feed:401"
)

for endpoint_test in "${test_endpoints[@]}"; do
    IFS=':' read -r endpoint expected_status <<< "$endpoint_test"
    response_code=$(curl -s -w "%{http_code}" "$BACKEND_URL$endpoint" -o /dev/null)

    if [ "$response_code" = "$expected_status" ]; then
        echo "   ✅ $endpoint ($response_code)"
    else
        echo "   ❌ $endpoint (got $response_code, expected $expected_status)"
        VERIFICATION_FAILED=true
    fi
done

echo ""

# 4. Database Connectivity
echo "4️⃣ Database Connectivity:"
db_test=$(curl -s "$BACKEND_URL/api/trending/topics" | grep -o '"ok":true' || echo "")
if [ -n "$db_test" ]; then
    echo "   ✅ Database queries working"
else
    echo "   ❌ Database connectivity issues"
    VERIFICATION_FAILED=true
fi

echo ""

# 5. Security Headers (for production)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "5️⃣ Security Headers:"
    security_headers=$(curl -s -I "$BACKEND_URL/health")

    if echo "$security_headers" | grep -q "X-Content-Type-Options"; then
        echo "   ✅ Security headers present"
    else
        echo "   ⚠️  Security headers missing"
    fi
fi

echo ""

# 6. Performance Baseline
echo "6️⃣ Performance Baseline:"
start_time=$(date +%s%3N)
curl -s "$BACKEND_URL/health" > /dev/null
end_time=$(date +%s%3N)
response_time=$((end_time - start_time))

if [ "$response_time" -lt 1000 ]; then
    echo "   ✅ Response time: ${response_time}ms"
else
    echo "   ⚠️  Slow response time: ${response_time}ms"
fi

# Summary
echo ""
echo "📊 Verification Summary:"
if [ "$VERIFICATION_FAILED" = true ]; then
    echo "   ❌ Deployment verification FAILED"
    echo ""
    echo "🔧 Recommended actions:"
    echo "   - Check deployment logs"
    echo "   - Verify environment variables"
    echo "   - Check database connectivity"
    echo "   - Consider rollback if critical issues"
    exit 1
else
    echo "   ✅ Deployment verification PASSED"
    echo ""
    echo "🎉 Deployment successful!"
    if [ "$ENVIRONMENT" = "staging" ]; then
        echo "💡 Ready for production deployment after user testing"
    else
        echo "🌐 Production deployment verified and ready"
    fi
    echo ""
    echo "🔍 Quick access:"
    echo "   Frontend: $FRONTEND_URL"
    echo "   API Health: $BACKEND_URL/health"
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "   Admin Dashboard: https://www.unitedwerise.org/admin-dashboard.html"
    else
        echo "   Admin Dashboard: https://dev.unitedwerise.org/admin-dashboard.html"
    fi
fi
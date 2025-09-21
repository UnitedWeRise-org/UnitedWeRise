#!/bin/bash
# API Endpoint Testing Script
# Usage: ./scripts/test-api-endpoints.sh [staging|production]

ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" = "production" ]; then
    BASE_URL="https://api.unitedwerise.org"
    echo "🚨 Testing PRODUCTION endpoints"
else
    BASE_URL="https://dev-api.unitedwerise.org"
    echo "🧪 Testing STAGING endpoints"
fi

echo "Base URL: $BASE_URL"
echo ""

passed=0
failed=0

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local name=$3
    local expected_status=${4:-200}

    echo -n "Testing $name... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" "$BASE_URL$endpoint" -o /dev/null)
    else
        # For POST endpoints, we expect 401/403 without auth
        response=$(curl -s -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" -o /dev/null)
    fi

    if [ "$response" = "$expected_status" ]; then
        echo "✅ ($response)"
        ((passed++))
    else
        echo "❌ (got $response, expected $expected_status)"
        ((failed++))
    fi
}

# Core endpoints
echo "🔍 Testing core endpoints:"
test_endpoint "GET" "/health" "Health check" "200"
test_endpoint "GET" "/api/version" "Version info" "200"

echo ""
echo "🔐 Testing auth endpoints (expect 401):"
test_endpoint "GET" "/api/auth/me" "Auth status" "401"
test_endpoint "POST" "/api/auth/logout" "Logout" "401"

echo ""
echo "📱 Testing public endpoints:"
test_endpoint "GET" "/api/trending/topics" "Trending topics" "200"
test_endpoint "GET" "/api/officials" "Officials" "200"

echo ""
echo "🔒 Testing protected endpoints (expect 401):"
test_endpoint "GET" "/api/feed" "Feed" "401"
test_endpoint "POST" "/api/posts" "Create post" "401"
test_endpoint "GET" "/api/notifications" "Notifications" "401"

echo ""
echo "👥 Testing admin endpoints (expect 401):"
test_endpoint "GET" "/api/admin/dashboard" "Admin dashboard" "401"
test_endpoint "GET" "/api/admin/candidates" "Admin candidates" "401"

# Summary
echo ""
echo "📊 Test Results:"
echo "   ✅ Passed: $passed"
echo "   ❌ Failed: $failed"
echo "   📍 Total: $((passed + failed))"

if [ $failed -eq 0 ]; then
    echo ""
    echo "🎉 All endpoint tests passed!"
    if [ "$ENVIRONMENT" = "staging" ]; then
        echo "💡 Staging is healthy - ready for production deployment"
    fi
else
    echo ""
    echo "⚠️  Some endpoints failed - investigate before deployment"
    exit 1
fi
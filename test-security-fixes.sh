#!/bin/bash

# Security Fixes Testing Script
# Run this on staging before deploying to production

echo "🧪 TESTING SECURITY FIXES ON STAGING"
echo "===================================="
echo ""

STAGING_API="https://dev-api.unitedwerise.org"
STAGING_FRONTEND="https://dev.unitedwerise.org"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Backend is running
echo "📋 Test 1: Backend Health Check"
HEALTH=$(curl -s "$STAGING_API/health" | grep -o '"status":"ok"')
if [ -n "$HEALTH" ]; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend health check failed - deployment may have failed${NC}"
    exit 1
fi
echo ""

# Test 2: JWT_SECRET is set (backend started = it's set)
echo "📋 Test 2: JWT_SECRET Validation"
echo -e "${GREEN}✓ Backend started successfully (JWT_SECRET must be set)${NC}"
echo ""

# Test 3: Check JWT expiration setting
echo "📋 Test 3: JWT Expiration Check"
echo -e "${YELLOW}⚠ Manual Check Required:${NC}"
echo "   Try logging in and check how long you stay logged in"
echo "   Expected: 1 hour (unless JWT_EXPIRES_IN env var overrides)"
echo ""

# Test 4: CORS Check
echo "📋 Test 4: CORS Configuration"
CORS_HEADER=$(curl -s -H "Origin: $STAGING_FRONTEND" -H "Access-Control-Request-Method: GET" -X OPTIONS "$STAGING_API/api/auth/me" -i | grep "access-control-allow-origin")
if [ -n "$CORS_HEADER" ]; then
    echo -e "${GREEN}✓ CORS allows staging frontend${NC}"
else
    echo -e "${RED}✗ CORS may be blocking staging frontend${NC}"
fi
echo ""

# Test 5: Admin route protection
echo "📋 Test 5: Admin Route Protection"
echo -e "${YELLOW}⚠ Manual Check Required:${NC}"
echo "   1. Login as NON-ADMIN user"
echo "   2. Try to access: $STAGING_API/api/admin/users"
echo "   3. Should return 403 Forbidden"
echo ""

# Test 6: Photo upload (requires manual test)
echo "📋 Test 6: Photo Upload"
echo -e "${YELLOW}⚠ Manual Check Required:${NC}"
echo "   1. Login to staging frontend: $STAGING_FRONTEND"
echo "   2. Try uploading a photo to a post"
echo "   3. Verify photo displays correctly"
echo ""

# Test 7: WebSocket connection
echo "📋 Test 7: WebSocket Connection"
echo -e "${YELLOW}⚠ Manual Check Required:${NC}"
echo "   1. Login to staging frontend: $STAGING_FRONTEND"
echo "   2. Open browser console and check for WebSocket connection"
echo "   3. Verify real-time notifications work"
echo ""

# Test 8: Token revocation (blacklist)
echo "📋 Test 8: Token Blacklist"
echo -e "${YELLOW}⚠ Manual Check Required:${NC}"
echo "   1. Login to staging"
echo "   2. Copy your auth token from browser cookies"
echo "   3. Logout (this should blacklist your token)"
echo "   4. Try using the old token - should return 401"
echo ""

# Test 9: Password reset token generation
echo "📋 Test 9: Password Reset Token"
echo -e "${YELLOW}⚠ Manual Check Required:${NC}"
echo "   1. Go to forgot password page"
echo "   2. Request password reset"
echo "   3. Check logs for token format (should be 64-char hex)"
echo ""

# Test 10: SQL query functionality
echo "📋 Test 10: SQL Query Functionality"
echo -e "${YELLOW}⚠ Manual Check Required:${NC}"
echo "   1. Test similarity search (if available in UI)"
echo "   2. Test friend/follow suggestions"
echo "   3. Verify results are returned correctly"
echo ""

echo ""
echo "============================================"
echo "🎯 CRITICAL PRE-DEPLOYMENT CHECKS"
echo "============================================"
echo ""
echo "1. ${YELLOW}Verify JWT_SECRET is set in production:${NC}"
echo "   az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg --query \"properties.template.containers[0].env\" | grep JWT_SECRET"
echo ""
echo "2. ${YELLOW}Consider JWT expiration override in production:${NC}"
echo "   Add JWT_EXPIRES_IN=24h to production env vars"
echo "   (Current default: 1h - may cause user complaints)"
echo ""
echo "3. ${YELLOW}Verify ALLOWED_ORIGINS includes all production frontends:${NC}"
echo "   Check that www.unitedwerise.org is in the whitelist"
echo ""
echo "4. ${YELLOW}Monitor error logs after deployment:${NC}"
echo "   az containerapp logs show --name unitedwerise-backend-staging --resource-group unitedwerise-rg --tail 100"
echo ""

echo ""
echo "✅ Automated checks complete"
echo "⚠️  Please complete manual checks above before deploying to production"

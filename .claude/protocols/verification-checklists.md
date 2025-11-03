# Verification Checklists

**Protection Status**: Standard
**Created**: 2025-10-31
**Last Updated**: 2025-10-31

---

## 🎯 When to Use This Protocol

**USE THIS PROTOCOL when**:
- After deploying code to staging or production
- After making code changes (before reporting complete)
- Need detailed checklist for post-deployment verification
- Need detailed checklist for post-code-change verification
- Verifying system health after any changes

**SKIP THIS PROTOCOL if**:
- Haven't deployed or changed anything yet
- Just planning or researching

**UNCERTAIN?** Ask yourself:
- Did I just deploy code?
- Did I just make code changes?
- Should I verify the changes work before moving on?

---

## Overview

**Core Principle**: Don't report success until verification complete.

This protocol provides detailed checklists for two critical verification scenarios:
1. **After deployment** - Verify deployment was successful and system is healthy
2. **After code changes** - Verify changes work correctly before reporting complete

---

## Prerequisites

- Deployment completed or code changes committed
- Access to relevant systems (staging/production URLs, logs, health endpoints)
- Understanding of what was changed

---

## Checklists

### Checklist 1: After Deployment Verification

Use this checklist after deploying to staging or production.

#### Health Endpoint Verification

- [ ] **Status**: Health endpoint returns "healthy" or "ok" status
  ```bash
  # Staging
  curl -s "https://dev-api.unitedwerise.org/health" | jq '.status'

  # Production
  curl -s "https://api.unitedwerise.org/health" | jq '.status'
  ```

- [ ] **Release SHA**: Deployed SHA matches local commit
  ```bash
  LOCAL_SHA=$(git rev-parse --short HEAD)
  DEPLOYED_SHA=$(curl -s "https://dev-api.unitedwerise.org/health" | jq -r '.releaseSha')
  echo "Local: $LOCAL_SHA | Deployed: $DEPLOYED_SHA"
  # Must match exactly
  ```

- [ ] **Database Connection**: Health endpoint shows database connected
  ```bash
  curl -s "https://dev-api.unitedwerise.org/health" | jq '.database'
  # Should show: "connected"
  ```

- [ ] **Database Host**: Correct database for environment
  ```bash
  # Staging should show: unitedwerise-db-dev
  curl -s "https://dev-api.unitedwerise.org/health" | jq '.databaseHost'

  # Production should show: unitedwerise-db
  curl -s "https://api.unitedwerise.org/health" | jq '.databaseHost'
  ```

- [ ] **Uptime**: Fresh restart (< 300 seconds for new deployment)
  ```bash
  curl -s "https://dev-api.unitedwerise.org/health" | jq '.uptime'
  # Should be less than 300 seconds (5 minutes)
  ```

#### Service Response Verification

- [ ] **Service responds**: API responds to typical requests with 200 status
  ```bash
  # Test a common endpoint
  curl -I "https://dev-api.unitedwerise.org/health"
  # Check status code: HTTP/1.1 200 OK
  ```

- [ ] **No server errors**: API doesn't return 500 errors for valid requests
  ```bash
  # Test multiple endpoints
  curl -s -o /dev/null -w "%{http_code}" "https://dev-api.unitedwerise.org/health"
  # Should be 200, not 500
  ```

#### Log Verification

- [ ] **No errors in recent logs**: Last 50 lines show no errors
  ```bash
  # Staging
  az containerapp logs show \
    --name unitedwerise-backend-staging \
    --resource-group unitedwerise-rg \
    --tail 50

  # Production
  az containerapp logs show \
    --name unitedwerise-backend \
    --resource-group unitedwerise-rg \
    --tail 50

  # Look for: ERROR, CRITICAL, Exception, failed, crash
  ```

- [ ] **Startup successful**: Logs show successful startup messages
  ```
  Look for:
  - "Server listening on port..."
  - "Database connected"
  - No "CRITICAL" or "ERROR" during startup
  ```

#### Frontend Verification

- [ ] **Frontend serves new content**: Check Last-Modified header
  ```bash
  # Staging
  curl -I "https://dev.unitedwerise.org/index.html" | grep "Last-Modified"

  # Production
  curl -I "https://www.unitedwerise.org/index.html" | grep "Last-Modified"

  # Date should be recent (within last hour for new deployment)
  ```

- [ ] **Frontend loads without errors**: Open browser and check console
  ```
  1. Open https://dev.unitedwerise.org (staging) or https://www.unitedwerise.org (production)
  2. Open browser developer console (F12)
  3. Check for errors (should be zero red errors)
  4. Check for failed network requests (should be none)
  ```

#### Functional Verification

- [ ] **Manual smoke test**: Test changed functionality works
  ```
  1. Navigate to the feature that was changed
  2. Test the specific functionality modified
  3. Verify it works as expected
  4. Test at least one happy path and one error path
  ```

- [ ] **No regressions**: Existing functionality still works
  ```
  1. Test a few critical user flows
  2. Login/logout
  3. Basic content viewing
  4. Verify no unexpected errors
  ```

#### Monitoring (First 5-10 Minutes)

- [ ] **Monitor for errors**: Watch logs for unexpected errors
  ```bash
  # Keep this running in terminal for 5-10 minutes
  az containerapp logs show \
    --name unitedwerise-backend-staging \
    --resource-group unitedwerise-rg \
    --follow
  ```

- [ ] **Monitor health endpoint**: Periodically check health
  ```bash
  # Run every 2 minutes for 10 minutes
  watch -n 120 'curl -s "https://dev-api.unitedwerise.org/health" | jq ".status, .database, .uptime"'
  ```

---

### Checklist 2: After Code Changes Verification

Use this checklist after making code changes (before reporting task complete).

#### Build Verification

- [ ] **Code compiles**: TypeScript/build completes without errors
  ```bash
  cd backend && npm run build
  # Should complete with exit code 0, no errors
  ```

- [ ] **No TypeScript errors**: Type checking passes
  ```bash
  cd backend && npx tsc --noEmit
  # Should show: "No errors found"
  ```

#### Test Verification

- [ ] **Tests pass**: All tests complete successfully
  ```bash
  cd backend && npm test
  # All tests should pass (if project has tests)
  ```

- [ ] **New tests added**: Tests added for new functionality (if applicable)
  ```
  1. Check if new feature needs tests
  2. Add unit tests for business logic
  3. Add integration tests for API endpoints
  4. Verify tests pass
  ```

#### Code Quality Verification

- [ ] **No console.log**: Debug code removed
  ```bash
  # Search for console.log in changed files
  git diff --name-only | xargs grep -n "console.log"
  # Should find none (or only intentional logging)
  ```

- [ ] **No commented code**: Old code deleted, not commented out
  ```
  Review git diff for large blocks of commented code
  Delete instead of comment (git preserves history)
  ```

- [ ] **Error handling present**: External calls have error handling
  ```typescript
  // Check for try/catch blocks or .catch() on promises
  // All API calls, database queries, file I/O should have error handling
  ```

#### Functional Verification

- [ ] **Manual smoke test**: Test changed functionality locally
  ```
  1. Run application locally
  2. Test the specific changes made
  3. Verify functionality works as expected
  4. Test both happy path and error cases
  ```

- [ ] **No console errors**: Browser console clean (for frontend changes)
  ```
  1. Open browser developer tools (F12)
  2. Go to Console tab
  3. Refresh page
  4. Verify no red errors
  ```

#### Git Verification

- [ ] **Changes saved**: `git diff` shows changes in correct files
  ```bash
  git diff
  # Review that all intended changes are present
  ```

- [ ] **No unintended changes**: Only intended files modified
  ```bash
  git status
  # Check for accidentally modified files
  ```

- [ ] **Commit message clear**: Commit message describes changes accurately
  ```bash
  git log -1 --pretty=%B
  # Verify commit message is clear and accurate
  ```

#### Documentation Verification

- [ ] **Code documented**: New code has inline documentation
  ```
  - Swagger on all endpoints
  - JSDoc on all services/functions
  - Prisma comments on schema changes
  - Frontend JSDoc on modules
  ```

- [ ] **Documentation updated**: Relevant docs updated
  ```
  - API documentation (if endpoints changed)
  - README (if setup process changed)
  - CHANGELOG.md (always for committed changes)
  ```

---

## Verification Outcomes

### Deployment Verification Outcomes

**All checks pass:**
✅ Deployment successful - Report completion to user with verification details

**Any check fails:**
❌ Deployment issue detected - Follow deployment troubleshooting protocol:
- See `.claude/protocols/deployment-troubleshooting.md`
- Don't report success until issue resolved

**Example success message:**
```
✅ Deployment verified successfully:
- Health endpoint: Healthy
- Release SHA: abc123d (matches local)
- Database: Connected (unitedwerise-db-dev)
- Uptime: 45 seconds (fresh restart)
- Logs: No errors
- Frontend: Serving new content
- Manual test: Feature working correctly
```

### Code Changes Verification Outcomes

**All checks pass:**
✅ Changes verified - Safe to proceed with deployment

**Any check fails:**
❌ Issue detected - Fix before deploying:
- Fix compilation errors
- Fix failing tests
- Remove debug code
- Add error handling
- Complete documentation

---

## Quick Reference

### Minimum Verification (Quick Check)

If time-constrained, at minimum verify:
- [ ] Health endpoint responds correctly
- [ ] Deployed SHA matches local
- [ ] No errors in logs (last 50 lines)
- [ ] Manual smoke test of changed functionality

### Comprehensive Verification (Recommended)

For production deployments or critical changes, complete ALL checklist items.

---

## Troubleshooting

**Issue**: Health endpoint doesn't respond
**Solution**: Check container logs for startup errors, see deployment troubleshooting protocol

**Issue**: SHA mismatch
**Solution**: See `.claude/protocols/deployment-troubleshooting.md` Step 7

**Issue**: Tests fail after changes
**Solution**: Debug test failures, fix issues, don't deploy until tests pass

**Issue**: Frontend not showing changes
**Solution**: Hard refresh browser (Ctrl+Shift+R), clear cache, wait 2-3 minutes for CDN

---

## Examples

### Example 1: Post-Deployment Verification

```bash
# Run complete verification sequence
curl -s "https://dev-api.unitedwerise.org/health" | jq '.'

{
  "status": "healthy",
  "timestamp": "2025-10-31T10:30:00Z",
  "uptime": 45,
  "environment": "development",
  "nodeEnv": "staging",
  "releaseSha": "a1b2c3d",
  "releaseDigest": "sha256:...",
  "database": "connected",
  "databaseHost": "unitedwerise-db-dev"
}

# Verify SHA matches
git rev-parse --short HEAD
# Output: a1b2c3d ✅

# Check logs
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 50
# No errors found ✅

# Test frontend
curl -I "https://dev.unitedwerise.org/index.html"
# Last-Modified: Recent timestamp ✅

# All checks pass ✅ - Deployment verified
```

### Example 2: Post-Code-Change Verification

```bash
# Build check
cd backend && npm run build
# Build successful ✅

# Git diff check
git diff
# Shows intended changes only ✅

# Manual test
# 1. Started local server
# 2. Tested new feature
# 3. Verified works correctly
# 4. No console errors
# All tests pass ✅

# Documentation check
# - Added Swagger docs ✅
# - Updated CHANGELOG.md ✅

# All checks pass ✅ - Ready to deploy
```

---

## Related Resources

- `.claude/protocols/deployment-procedures.md` - Deployment procedures
- `.claude/protocols/deployment-troubleshooting.md` - Troubleshooting failed deployments
- `CLAUDE.md` - Core verification principles
- Azure Container Apps health monitoring documentation

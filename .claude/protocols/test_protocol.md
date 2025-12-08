# Test Protocol

**Phase**: 4 of 5 (Audit → Plan → Execute → Test → Document)
**Last Updated**: 2025-12-08

---

## STOP Criteria

**SKIP comprehensive testing if ALL of these are true:**
- Single file change with no integration points
- No database, API, or auth changes
- Build compiles without errors
- Quick smoke test passes

**ALWAYS do comprehensive testing if ANY of these are true:**
- API endpoint added or modified
- Database schema changed
- Authentication/authorization affected
- Payment or user data involved
- Bug fix (must verify root cause fixed)
- Cross-system change (frontend + backend)

---

## Quick Reference

### Minimum Testing (All Changes)

- [ ] Build compiles without errors (`npm run build`)
- [ ] TypeScript passes (`npx tsc --noEmit`)
- [ ] Manual test of happy path
- [ ] Manual test of one error case
- [ ] No console errors
- [ ] Deploy to staging and verify health endpoint

### Post-Deployment Quick Check

```bash
# Health check
curl -s "https://dev-api.unitedwerise.org/health" | jq '.status, .releaseSha'

# Verify SHA matches
git rev-parse --short HEAD
```

---

## Full Procedure

### Testing Matrix by Task Type

| Task Type | Manual Tests | Integration | Security | Performance |
|-----------|--------------|-------------|----------|-------------|
| **New API endpoint** | Required | Required | Required | Required |
| **UI component** | Required | Required | If sensitive | If UX-critical |
| **Database changes** | Required | Required | Required | Required |
| **Bug fix** | Required | If integrated | If security bug | Not usually |
| **Auth changes** | Required | Required | CRITICAL | Not usually |
| **Payment flow** | Required | Required | CRITICAL | Not usually |

### Testing by Complexity Score

**Score 0-8 (Simple):**
- Manual test of happy path
- One error case
- Staging verification
- **Time**: 5-10 minutes

**Score 9-15 (Moderate):**
- All user flows tested
- Edge cases covered
- Error handling verified
- Cross-browser check (if UI)
- Staging monitoring for 10 minutes
- **Time**: 15-30 minutes

**Score 16+ (Complex):**
- All flows, edge cases, error scenarios
- Load testing (if performance-critical)
- Security testing (if auth/payment)
- Staging environment for 24 hours
- Rollback procedure tested
- Gradual production rollout
- **Time**: 1-2 hours

### Standard Testing Workflow

**Step 1: Local Testing**
```bash
cd backend && npm run build
cd backend && npx tsc --noEmit
```
- [ ] Build succeeds
- [ ] Happy path works
- [ ] Error case handled
- [ ] No console errors

**Step 2: Staging Deployment**
- [ ] Deploy to staging
- [ ] Health endpoint returns 200
- [ ] SHA matches local commit

**Step 3: Staging Verification**
```bash
# Verify deployment
curl -s "https://dev-api.unitedwerise.org/health" | jq '.'

# Check logs (no errors)
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 50
```

**Step 4: Functional Verification**
- [ ] Test changed functionality manually
- [ ] Verify no regression in related features
- [ ] Check browser console for errors

### Comprehensive Testing Checklist

#### Functional Testing

**Happy Path:**
- [ ] Primary user flow works end-to-end
- [ ] UI elements function correctly
- [ ] Data persists to database
- [ ] API returns expected data
- [ ] Success messages displayed

**Error Path:**
- [ ] Invalid input rejected with clear message
- [ ] Network errors handled gracefully
- [ ] Server errors show user-friendly message
- [ ] Edge cases don't crash application

**Regression:**
- [ ] Existing features still work
- [ ] No new console errors
- [ ] No performance degradation

#### Integration Testing

**API Integration:**
- [ ] Frontend calls backend correctly
- [ ] Request payload format correct
- [ ] Response parsed correctly
- [ ] Error responses handled
- [ ] Loading states displayed

**Database Integration:**
- [ ] Data written correctly
- [ ] Data read correctly
- [ ] Relationships work
- [ ] Migrations apply cleanly

**External Services:**
- [ ] Azure Blob Storage (if files)
- [ ] Azure OpenAI (if AI)
- [ ] Google OAuth (if auth)
- [ ] Fallback if service unavailable

#### Security Testing

**Authentication:**
- [ ] Unauthenticated users blocked
- [ ] Token validation works
- [ ] Logout clears session

**Authorization:**
- [ ] Role-based access enforced
- [ ] Users only access own data
- [ ] Admin features protected
- [ ] Staging admin-only (if applicable)

**Input Validation:**
- [ ] XSS attempts blocked
- [ ] SQL injection blocked
- [ ] File upload restrictions enforced

#### Performance Testing

**For API Changes:**
- [ ] Response time < 500ms (reads), < 2s (writes)
- [ ] No N+1 query problems
- [ ] Pagination works for large datasets

**For Database Changes:**
- [ ] Migration completes reasonably fast
- [ ] New queries use indexes
- [ ] No table locks on large tables

### Post-Deployment Verification

#### Health Endpoint Verification

```bash
# Check status
curl -s "https://dev-api.unitedwerise.org/health" | jq '.status'
# Expected: "healthy"

# Check SHA matches
LOCAL_SHA=$(git rev-parse --short HEAD)
DEPLOYED_SHA=$(curl -s "https://dev-api.unitedwerise.org/health" | jq -r '.releaseSha')
echo "Local: $LOCAL_SHA | Deployed: $DEPLOYED_SHA"

# Check database
curl -s "https://dev-api.unitedwerise.org/health" | jq '.database'
# Expected: "connected"

# Check uptime (should be fresh for new deployment)
curl -s "https://dev-api.unitedwerise.org/health" | jq '.replica.uptime'
```

#### Log Verification

```bash
# Check for errors
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --tail 50

# Look for: ERROR, CRITICAL, Exception, failed, crash
```

#### Frontend Verification

```bash
# Check frontend serving new content
curl -I "https://dev.unitedwerise.org/index.html" | grep "Last-Modified"
# Date should be recent

# Open browser, check DevTools console for errors
```

### Special Testing Scenarios

#### Authentication Changes

- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails
- [ ] Logout clears session
- [ ] Protected routes blocked when unauthenticated
- [ ] OAuth flow works
- [ ] Multiple concurrent logins handled

#### Database Migrations

- [ ] Migration applies on empty database
- [ ] Migration applies on production-like data
- [ ] No data loss
- [ ] Foreign keys maintained
- [ ] Rollback migration works
- [ ] Application works after migration

#### Payment Integration

- [ ] Successful payment processed
- [ ] Payment failure handled gracefully
- [ ] Webhook signatures validated
- [ ] Refund process works
- [ ] Test mode clearly indicated

### Test Failure Protocol

**Step 1: Document Failure**
- What test failed?
- Expected vs actual behavior?
- Error messages/stack traces?

**Step 2: Diagnose**
- Test issue or code issue?
- Fails consistently?
- Fails in all environments?

**Step 3: Fix**
- Fix code (most common)
- Fix test (if test was wrong)

**Step 4: Verify**
- Re-run failed test
- Run full test suite
- Verify no new failures

---

## Verification

**Test phase is complete when:**
- [ ] Build compiles without errors
- [ ] All required tests pass
- [ ] No console errors
- [ ] No regression in existing features
- [ ] Staging deployment verified
- [ ] Manual smoke test passes

**You should be able to answer:**
- Does the happy path work?
- Do errors fail gracefully?
- Did I break anything else?
- Is it secure?
- Is it fast enough?

---

## Troubleshooting

**Build fails after changes?**
- Check TypeScript errors (`npx tsc --noEmit`)
- Verify imports are correct
- Check for missing dependencies

**Tests fail?**
- Debug test failures
- Fix issues before deploying
- Don't deploy until tests pass

**SHA mismatch after deployment?**
- See deployment-troubleshooting.md
- Check GitHub Actions completed
- Verify correct branch deployed

**Frontend not showing changes?**
- Hard refresh (Ctrl+Shift+R)
- Clear browser cache
- Wait 2-3 minutes for CDN

**Health endpoint doesn't respond?**
- Check container logs for startup errors
- See deployment-troubleshooting.md

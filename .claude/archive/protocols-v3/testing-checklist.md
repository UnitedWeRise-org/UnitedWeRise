# Testing Checklist Protocol

**Protection Status**: Standard
**Created**: 2025-11-03
**Last Updated**: 2025-11-03

---

## 🎯 When to Use This Protocol

**USE THIS PROTOCOL** when executing the Test phase of Systematic Development Methodology.

Called automatically from CLAUDE.md after Execute phase to ensure comprehensive testing.

---

## Overview

This protocol provides comprehensive testing requirements and checklists to ensure changes work correctly, don't break existing functionality, and are ready for production deployment.

**Testing ensures**:
- Functionality works as intended (happy path)
- Error cases handled gracefully
- No regression in existing features
- Performance acceptable
- Security not compromised
- User experience maintained

---

## Testing Requirements by Task Type

### Required Testing Matrix

| Task Type | Unit Tests | Integration Tests | E2E Tests | Manual Tests | Performance | Security |
|-----------|------------|-------------------|-----------|--------------|-------------|----------|
| **New business logic** | ✅ Required | If integrates | Optional | ✅ Required | If applicable | If handles data |
| **API endpoint** | Optional | ✅ Required | Optional | ✅ Required | ✅ Required | ✅ Required |
| **UI component** | If complex | ✅ Required | Optional | ✅ Required | If affects UX | If shows sensitive data |
| **Database changes** | ✅ Required | ✅ Required | Optional | ✅ Required | ✅ Required | ✅ Required |
| **Bug fix** | ✅ Required | If integrated | Optional | ✅ Required | Not usually | If security bug |
| **Refactoring** | ✅ Required | ✅ Required | Optional | ✅ Required | ✅ Required | Not usually |
| **Auth changes** | ✅ Required | ✅ Required | Optional | ✅ Required | Not usually | ✅ CRITICAL |
| **Payment flow** | ✅ Required | ✅ Required | ✅ Required | ✅ Required | Not usually | ✅ CRITICAL |

---

## Standard Testing Workflow

### For All Changes

**Step 1: Local Testing**
- [ ] Changes compile/build without errors
- [ ] Changes run without errors
- [ ] Happy path works as expected
- [ ] At least one error case handled
- [ ] No console errors
- [ ] No console warnings (unless expected)

**Step 2: Staging Deployment**
- [ ] Changes deployed to staging environment
- [ ] Deployment succeeded (health check returns 200)
- [ ] Correct code version deployed (check SHA/revision)

**Step 3: Staging Verification**
- [ ] Manual testing on staging
- [ ] Automated tests pass (if applicable)
- [ ] Cross-browser check (if UI changes)
- [ ] Mobile responsive check (if UI changes)

**Step 4: Production Deployment**
- [ ] Only deploy after staging verification passes
- [ ] User approval obtained (if required)
- [ ] Deployment window appropriate (avoid high-traffic times for risky changes)

**Step 5: Production Monitoring**
- [ ] Watch health endpoints for 10-15 minutes
- [ ] Monitor error logs
- [ ] Check user-reported issues
- [ ] Verify critical user flows working

---

## Testing Workflow for High-Risk Changes

**For**: Security, payments, data migration, authentication, database schema

**Step 1: Comprehensive Local Testing**
- [ ] Test all user scenarios
- [ ] Test all error scenarios
- [ ] Test all edge cases
- [ ] Test rollback procedure
- [ ] Document test results

**Step 2: Staging Deployment & Verification**
- [ ] Deploy to staging
- [ ] Comprehensive manual testing (all scenarios)
- [ ] Load testing (if performance-critical)
- [ ] Security testing (penetration test if auth/payment)
- [ ] Test for at least 24 hours in staging

**Step 3: Limited Production Rollout** (if possible)
- [ ] Deploy to subset of users (feature flag/A-B test)
- [ ] Monitor closely for issues
- [ ] Gather user feedback
- [ ] Verify metrics acceptable

**Step 4: Full Production Rollout**
- [ ] Only after limited rollout succeeds
- [ ] Monitor closely for 24-48 hours
- [ ] Be ready to rollback immediately
- [ ] Document any issues found

**Step 5: Post-Deployment Review**
- [ ] Review metrics/performance
- [ ] Document lessons learned
- [ ] Update documentation if needed

---

## Comprehensive Testing Checklist

### Functional Testing

**Happy Path Testing**:
- [ ] Primary user flow works end-to-end
- [ ] All UI elements function as expected
- [ ] Data persists correctly to database
- [ ] API responses return expected data
- [ ] Success messages shown to user

**Error Path Testing**:
- [ ] Invalid input rejected with clear error message
- [ ] Network errors handled gracefully
- [ ] Server errors show user-friendly message
- [ ] Edge cases don't crash application
- [ ] Required fields enforced
- [ ] Data validation works correctly

**Regression Testing**:
- [ ] Existing features still work
- [ ] No new console errors
- [ ] No performance degradation
- [ ] No UI/UX regressions
- [ ] Related features tested

---

### Integration Testing

**API Integration**:
- [ ] Frontend correctly calls backend API
- [ ] Request payload format correct
- [ ] Response correctly parsed
- [ ] Error responses handled
- [ ] Loading states displayed
- [ ] Network timeouts handled

**Database Integration**:
- [ ] Data correctly written to database
- [ ] Data correctly read from database
- [ ] Relationships/foreign keys work
- [ ] Constraints enforced
- [ ] Indexes improve performance (if added)
- [ ] Migrations apply cleanly

**External Service Integration**:
- [ ] Azure Blob Storage (if file uploads)
- [ ] Azure OpenAI (if AI features)
- [ ] Stripe (if payments)
- [ ] Google OAuth (if auth)
- [ ] Fallback behavior if service unavailable

---

### Security Testing

**Authentication Testing**:
- [ ] Unauthenticated users blocked
- [ ] Token validation works
- [ ] Session management correct
- [ ] Logout clears session
- [ ] Token refresh works (if applicable)

**Authorization Testing**:
- [ ] Role-based access control enforced
- [ ] Users can only access own data
- [ ] Admin-only features protected
- [ ] Staging admin-only requirements met (if applicable)

**Input Validation Testing**:
- [ ] XSS attempts blocked
- [ ] SQL injection attempts blocked
- [ ] Command injection attempts blocked
- [ ] File upload restrictions enforced
- [ ] CSRF protection working

**Data Protection Testing**:
- [ ] Sensitive data not exposed in logs
- [ ] Sensitive data not exposed in errors
- [ ] httpOnly cookies used for tokens
- [ ] HTTPS enforced
- [ ] Personal data encrypted (if stored)

---

### Performance Testing

**For API Changes**:
- [ ] Response time acceptable (< 500ms for reads, < 2s for writes)
- [ ] No N+1 query problems
- [ ] Database indexes utilized
- [ ] Pagination works for large datasets
- [ ] Caching implemented where appropriate

**For UI Changes**:
- [ ] Page load time acceptable
- [ ] Images optimized
- [ ] No layout shift (CLS)
- [ ] Animations smooth (60 FPS)
- [ ] Memory leaks checked (long-running pages)

**For Database Changes**:
- [ ] Migration completes in reasonable time
- [ ] New queries use indexes
- [ ] No table locks on large tables
- [ ] Backup/restore tested

---

### UI/UX Testing

**Visual Testing**:
- [ ] Layout correct on desktop
- [ ] Layout correct on tablet
- [ ] Layout correct on mobile
- [ ] Colors/fonts consistent with design
- [ ] Icons/images display correctly
- [ ] Loading states shown
- [ ] Error states shown

**Interaction Testing**:
- [ ] Buttons clickable
- [ ] Forms submittable
- [ ] Validation messages clear
- [ ] Success feedback shown
- [ ] Keyboard navigation works
- [ ] Screen reader accessible (if applicable)

**Cross-Browser Testing**:
- [ ] Chrome (desktop & mobile)
- [ ] Firefox (desktop)
- [ ] Safari (desktop & mobile)
- [ ] Edge (desktop)

---

### Data Integrity Testing

**For Database Changes**:
- [ ] Data migrated correctly (if migration)
- [ ] No data loss
- [ ] Relationships maintained
- [ ] Constraints working
- [ ] Indexes created
- [ ] Rollback tested

**For Data Processing**:
- [ ] Calculations correct
- [ ] Aggregations accurate
- [ ] Sorting works
- [ ] Filtering works
- [ ] Search returns correct results

---

## Environment-Specific Testing

### Local Development Testing

**Checklist**:
- [ ] Code compiles/builds
- [ ] Development server starts
- [ ] Hot reload works (if applicable)
- [ ] Database seeded correctly
- [ ] Environment variables loaded
- [ ] Mock services work (if using mocks)

### Staging Environment Testing

**Checklist**:
- [ ] Deployment succeeded
- [ ] Health endpoint returns 200
- [ ] Correct SHA/revision deployed
- [ ] Environment variables correct
- [ ] Database connection working
- [ ] External services accessible
- [ ] CORS configured correctly
- [ ] Logging working

### Production Environment Testing

**Checklist** (post-deployment):
- [ ] Health endpoint returns 200
- [ ] Correct SHA/revision deployed
- [ ] Critical user flows working
- [ ] No error spikes in logs
- [ ] Performance metrics acceptable
- [ ] User-reported issues monitored

---

## Testing by Complexity Score

### Score 0-8 (Simple Changes)

**Required Testing**:
- [ ] Manual test of happy path
- [ ] Manual test of one error case
- [ ] Verify no console errors
- [ ] Quick smoke test of related features
- [ ] Deploy to staging and verify

**Time estimate**: 5-10 minutes
**Test on**: Local + Staging

### Score 9-15 (Moderate Complexity)

**Required Testing**:
- [ ] Manual test of all user flows
- [ ] Manual test of edge cases
- [ ] Test error handling
- [ ] Verify no console errors
- [ ] Test on staging environment
- [ ] Smoke test of dependent features
- [ ] Check database for expected data
- [ ] Cross-browser check (if UI)
- [ ] Monitor staging for 10 minutes

**Time estimate**: 15-30 minutes
**Test on**: Local + Staging + Production (monitor)

### Score 16+ (Complex Changes)

**Required Testing**:
- [ ] Unit tests for business logic
- [ ] Integration tests for API endpoints
- [ ] Manual test of all user flows
- [ ] Manual test of all edge cases
- [ ] Test all error scenarios
- [ ] Load testing (if performance-critical)
- [ ] Security testing (if auth/payment)
- [ ] Test on staging environment for 24 hours
- [ ] Comprehensive smoke test of all dependent features
- [ ] Database integrity verification
- [ ] Rollback procedure tested
- [ ] Gradual rollout to production (if possible)
- [ ] Monitor production for 48 hours

**Time estimate**: 1-2 hours
**Test on**: Local + Staging (extended) + Production (monitored rollout)

---

## Special Testing Scenarios

### Testing Authentication Changes

**Critical Tests**:
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails
- [ ] Logout clears session
- [ ] Protected routes blocked when not authenticated
- [ ] Token refresh works (if applicable)
- [ ] Password reset flow works
- [ ] Email verification flow works
- [ ] OAuth flow works (if applicable)
- [ ] Session timeout works
- [ ] Multiple concurrent logins handled

### Testing Payment Integration

**Critical Tests**:
- [ ] Successful payment processed
- [ ] Payment success callback received
- [ ] Payment failure handled gracefully
- [ ] Refund process works
- [ ] Webhook signatures validated
- [ ] Payment history displays correctly
- [ ] Receipts generated correctly
- [ ] Tax calculations correct (if applicable)
- [ ] Currency handling correct
- [ ] Test mode clearly indicated

### Testing Database Migrations

**Critical Tests**:
- [ ] Migration applies cleanly on empty database
- [ ] Migration applies cleanly on production-like data
- [ ] Migration completes in acceptable time (< 5 min for small DB, < 30 min for large)
- [ ] No data loss
- [ ] Foreign keys maintained
- [ ] Indexes created successfully
- [ ] Rollback migration works
- [ ] Application works after migration
- [ ] Application works after rollback

### Testing WebSocket/Real-Time Features

**Critical Tests**:
- [ ] Connection established successfully
- [ ] Authentication works
- [ ] Messages sent successfully
- [ ] Messages received successfully
- [ ] Reconnection works after disconnect
- [ ] Multiple clients can connect
- [ ] CORS allows connection
- [ ] Error handling works
- [ ] Connection cleanup on logout

---

## Documentation Verification

**Part of testing phase**:
- [ ] Documentation updated per documentation-requirements.md
- [ ] Inline documentation complete (Swagger/JSDoc/Prisma)
- [ ] CHANGELOG.md entry added
- [ ] Relevant project docs updated (MASTER_DOCUMENTATION.md, API guides)
- [ ] README updated (if user-facing changes)
- [ ] Architecture docs updated (if system design changed)

---

## Testing Tools & Commands

### Backend Testing

```bash
# Run TypeScript compilation
cd backend && npm run build

# Run tests (if exist)
cd backend && npm test

# Check for TypeScript errors
cd backend && npx tsc --noEmit

# Start backend locally
cd backend && npm run dev
```

### Frontend Testing

```bash
# Check for console errors (open browser DevTools)
# Check for React/Vue warnings in console

# Test on different screen sizes
# Use browser DevTools responsive mode

# Check network requests
# Use browser DevTools Network tab
```

### Database Testing

```bash
# Check migration status
cd backend && npx prisma migrate status

# Apply migrations to staging
DATABASE_URL="<staging-url>" npx prisma migrate deploy

# Generate Prisma client
cd backend && npx prisma generate

# Check database integrity
DATABASE_URL="<db-url>" npx prisma validate
```

### Staging Testing

```bash
# Check staging health
curl https://dev-api.unitedwerise.org/health

# Check staging deployment info
curl https://dev-api.unitedwerise.org/health/deployment

# View staging logs (Azure)
az containerapp logs show \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --follow
```

---

## Test Failure Protocol

### If Test Fails

**Step 1: Document Failure**
- What test failed?
- What was expected behavior?
- What was actual behavior?
- Error messages/stack traces?

**Step 2: Diagnose**
- Is this a test issue or code issue?
- Does it fail consistently?
- Does it fail in all environments?

**Step 3: Fix**
- Fix code issue (most common)
- Fix test issue (if test was wrong)
- Update requirements (if behavior changed)

**Step 4: Verify Fix**
- Re-run failed test
- Run full test suite
- Verify no new failures introduced

**Step 5: Document**
- Update test documentation
- Note any edge cases discovered
- Share findings with team

---

## Success Criteria

✅ **Testing is complete when**:
- All required tests pass
- No console errors
- No regression in existing features
- Performance acceptable
- Security verified
- Documentation updated
- User approval obtained (if required)

✅ **You should be able to answer**:
- Does the happy path work?
- Do error cases fail gracefully?
- Did I break anything else?
- Is it secure?
- Is it fast enough?
- Will it work for all users?

---

## Related Protocols

- `.claude/protocols/audit-checklist.md` - Audit identified what to test
- `.claude/protocols/risk-assessment-framework.md` - Risk level determines testing depth
- `.claude/protocols/documentation-requirements.md` - Document test results
- `CLAUDE.md` - Systematic Development Methodology

---

## Quick Reference

### Minimum Testing Requirements

```
Simple (0-8): Happy path + 1 error case + staging verification
Moderate (9-15): All flows + edge cases + staging + smoke tests
Complex (16+): Comprehensive testing + extended staging + monitored production
```

### Testing Time Estimates

```
Simple: 5-10 minutes
Moderate: 15-30 minutes
Complex: 1-2 hours
```

### Critical Tests Never Skip

```
✅ Happy path works
✅ At least one error case
✅ No console errors
✅ Staging verification
✅ Documentation updated
```

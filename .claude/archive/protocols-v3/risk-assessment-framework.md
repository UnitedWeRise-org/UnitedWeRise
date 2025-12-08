# Risk Assessment Framework

**Protection Status**: Standard
**Created**: 2025-11-03
**Last Updated**: 2025-11-03

---

## 🎯 When to Use This Protocol

**USE THIS PROTOCOL** when executing the Plan phase of Systematic Development Methodology.

Called automatically from CLAUDE.md after audit phase to assess complexity and plan approach.

---

## Overview

This protocol provides structured frameworks for objectively assessing task complexity, determining implementation approach, and establishing rollback procedures. Use this to determine:
- How complex is this change?
- What approach should I use?
- What could go wrong?
- How do I rollback if needed?

---

## Framework 1: Complexity Scoring System

Use this framework to objectively assess task complexity and determine appropriate implementation approach.

### Scoring Criteria (0-3 points each)

| Criterion | 0 points | 1 point | 2 points | 3 points |
|-----------|----------|---------|----------|----------|
| **Files Modified** | 1-2 files | 3-5 files | 6-10 files | 11+ files |
| **Systems Touched** | Single component | Same module | Cross-module | Cross-service |
| **Rollback Difficulty** | Instant (git revert) | Simple (revert + clear cache) | Complex (data migration needed) | Data recovery required |
| **Security Surface** | None (internal logic) | Display logic | User data handling | Admin/payment systems |

**Calculate total score**: Add points from all four criteria (max 12 points)

### Action Based on Score

**Score 0-8: Implement Directly**
- Find existing pattern in codebase
- Adapt pattern to current need
- Test thoroughly
- Commit and deploy
- **Still follow**: Basic Audit → Execute → Test flow

**Score 9-15: Plan First**
- Use full **Audit → Plan → Execute → Test → Document** methodology
- Document approach in detail in `.claude/scratchpads/[FEATURE]-PLAN.md`
- Get user approval if uncertain
- Break into phases if appropriate

**Score 16+: Full Review Required**
- Use full methodology with **multi-agent coordination**
- Complete architecture analysis
- Staged implementation (break into phases)
- Get approval at each stage
- Comprehensive testing at each stage
- Monitor closely in production

---

## Framework 2: Automatic Escalation

### Always Escalate (Regardless of Score)

**Always treat as high complexity if task involves:**
- ✅ Payment or billing systems
- ✅ Authentication or authorization changes
- ✅ Data deletion or migration
- ✅ Database schema changes
- ✅ Production configuration or secrets
- ✅ First-time patterns (no existing examples in codebase)
- ✅ WebSocket or real-time systems
- ✅ Email/SMS sending systems
- ✅ File upload/storage systems
- ✅ CORS or security headers
- ✅ Rate limiting or anti-abuse systems

**For these tasks**: Use "Plan First" or "Full Review" approach regardless of calculated score.

### Security-Critical Changes

**Require user approval BEFORE implementing:**
- Changing authentication logic
- Modifying authorization checks
- Exposing new admin endpoints
- Handling payment information
- Processing personal identifiable information (PII)
- Implementing encryption/decryption
- Managing API keys or secrets
- Cross-site request forgery (CSRF) protections
- Content security policy (CSP) changes

---

## Framework 3: Planning Deliverables

Based on complexity score, create appropriate planning documents.

### For Score 0-8 (Simple Changes)

**Mental Checklist** (no document needed):
- What's the pattern I'm following?
- What's different about my use case?
- What could go wrong?
- How will I test this?

### For Score 9-15 (Moderate Complexity)

**Create** `.claude/scratchpads/[FEATURE]-PLAN.md`:

```markdown
## Implementation Strategy

### Approach
[Describe the solution approach and why this approach was chosen]

### Change Sequence
1. **Database Changes** (if needed)
   - Schema modifications
   - Migration creation
   - Risk: [describe potential issues]

2. **Backend Changes**
   - API endpoints
   - Business logic
   - Risk: [describe potential issues]

3. **Frontend Changes**
   - UI components
   - State management
   - Risk: [describe potential issues]

### Testing Plan
- Unit tests: [what to test]
- Integration tests: [what to test]
- Manual tests: [what to verify]

### Rollback Plan
- How to revert if issues found
- Data recovery strategy (if applicable)
- Estimated rollback time: [X minutes]
```

### For Score 16+ (High Complexity)

**Create comprehensive plan with**:

1. **Architecture Analysis Document**
2. **Phase Implementation Plan** (break into stages)
3. **Risk Matrix** (probability × impact)
4. **Rollback Procedures** (detailed step-by-step)
5. **Testing Strategy** (per-phase testing)
6. **Monitoring Plan** (metrics to watch post-deployment)

---

## Framework 4: Risk Assessment Matrix

Assess likelihood and impact of potential issues.

### Risk Categories

| Risk Level | Probability | Impact | Action Required |
|------------|------------|--------|-----------------|
| **Critical** | High | High | Do not proceed without user approval. Implement staged rollout. |
| **High** | Medium-High | High | Document mitigation strategy. Have rollback plan ready. |
| **Medium** | Medium | Medium | Standard testing. Monitor closely post-deploy. |
| **Low** | Low | Low-Medium | Standard workflow. Basic testing sufficient. |

### Common Risks

**Data Loss Risk**:
- Schema changes without proper migration
- Deletion cascades not considered
- No backup before destructive operations

**Breaking Change Risk**:
- API contract changes without version bump
- Removing functionality still in use
- Changing data formats without migration

**Security Risk**:
- Exposing sensitive data
- Weakening authentication/authorization
- Creating injection vulnerabilities

**Performance Risk**:
- Missing database indexes
- N+1 query problems
- Memory leaks in long-running processes

**Integration Risk**:
- External API changes
- Third-party service failures
- CORS issues between services

---

## Framework 5: Rollback Protocol

### When to Rollback

**Rollback immediately if**:
- Authentication/authorization broken
- Payment processing failing
- Data corruption detected
- Database errors preventing app usage
- Health checks fail after deployment
- Security vulnerability discovered
- Performance degradation detected (>50% slower)

**Do NOT rollback immediately if**:
- Minor UI glitch (can be fixed forward)
- Non-critical feature issue (can be fixed forward)
- Expected temporary behavior during migration
- Single user reporting issue (investigate first)

### Rollback Decision Tree

```
Is production broken?
├─ YES → Are users affected?
│  ├─ YES → Can it be fixed in < 15 minutes?
│  │  ├─ YES → Fix forward
│  │  └─ NO → ROLLBACK
│  └─ NO → Can wait for proper fix
└─ NO → No rollback needed
```

### How to Rollback

**Step 1: Assess Impact**
- What is broken?
- How many users affected?
- Is data at risk?
- Can issue be fixed forward quickly (< 15 minutes)?

**Step 2: Notify Stakeholders**
- Immediately notify user of issue
- Provide clear description of symptoms
- Propose rollback with rationale
- Get approval to proceed

**Step 3: Execute Rollback** (only with user approval)

**For code deployment:**
```bash
# Method 1: Git revert (preferred for single commit)
git checkout main
git revert HEAD
git push origin main

# Method 2: Container revision rollback (Azure)
az containerapp revision activate \
  --name <app-name> \
  --resource-group <rg-name> \
  --revision <previous-working-revision>

# Method 3: Hard reset (emergency only, requires force push)
git reset --hard <previous-working-commit>
git push --force origin main
```

**For database changes:**
```bash
# Mark migration as rolled back (if migration caused issue)
DATABASE_URL="<db-url>" npx prisma migrate resolve --rolled-back <migration-name>

# Restore from backup (if data corrupted)
az postgres flexible-server restore \
  --resource-group <rg-name> \
  --name <db-name>-restored \
  --source-server <db-name> \
  --restore-time "YYYY-MM-DDTHH:MM:00Z"
```

**For frontend deployment:**
```bash
# GitHub Actions re-run previous working deployment
# Or manually revert commit and re-trigger workflow
```

**Step 4: Verify Rollback**
- Confirm system functioning normally
- Check health endpoints return 200 OK
- Verify user-reported issue resolved
- Test critical user flows
- Monitor error logs for 10-15 minutes

**Step 5: Root Cause Analysis**
- Analyze what went wrong
- Document findings in `.claude/scratchpads/INCIDENT-[DATE].md`
- Plan fix that addresses root cause
- Test fix thoroughly in staging before redeploying to production

### Rollback Checklist

Complete this checklist for every rollback:

- [ ] Issue severity assessed (Critical/High/Medium/Low)
- [ ] User notified of issue with clear symptoms
- [ ] User approved rollback
- [ ] Backup taken (if rolling back database)
- [ ] Rollback commands tested (dry-run if possible)
- [ ] Rollback executed
- [ ] System verified working after rollback
- [ ] Health endpoints checked
- [ ] User-reported issue confirmed resolved
- [ ] Monitoring logs for 15 minutes post-rollback
- [ ] Root cause identified and documented
- [ ] Fix planned and reviewed
- [ ] Testing plan created for fix
- [ ] Monitoring increased for next deployment

---

## Framework 6: Change Sequencing

Determine optimal order for implementing changes.

### Standard Sequence (Bottom-Up)

**For most features:**
1. **Database** - Schema changes, migrations
2. **Backend** - API endpoints, business logic
3. **Frontend** - UI components, API integration

**Rationale**: Each layer depends on the layer below. Test each layer before building next.

### Reverse Sequence (Top-Down)

**Use when:**
- Prototyping UI before committing to database schema
- Backend/database already support needed functionality
- Refactoring existing feature (UI changes only)

### Parallel Implementation

**Use when:**
- Changes are independent
- Multiple developers working
- Can test each part separately

**Example**: New notification system
- Backend team: API endpoints
- Frontend team: UI components (using mock data)
- Integration: Connect once both complete

---

## Framework 7: Testing Requirements by Complexity

### Score 0-8 (Simple)

**Required Testing:**
- [ ] Manual test of happy path
- [ ] Manual test of one error case
- [ ] Verify no console errors
- [ ] Quick smoke test of related features

**Time estimate**: 5-10 minutes

### Score 9-15 (Moderate)

**Required Testing:**
- [ ] Manual test of all user flows
- [ ] Manual test of edge cases
- [ ] Test error handling
- [ ] Verify no console errors
- [ ] Test on staging environment
- [ ] Smoke test of dependent features
- [ ] Check database for expected data

**Time estimate**: 15-30 minutes

### Score 16+ (Complex)

**Required Testing:**
- [ ] Unit tests for business logic
- [ ] Integration tests for API endpoints
- [ ] Manual test of all user flows
- [ ] Manual test of all edge cases
- [ ] Test all error scenarios
- [ ] Load testing (if performance-critical)
- [ ] Security testing (if auth/payment)
- [ ] Test on staging environment
- [ ] Comprehensive smoke test of all dependent features
- [ ] Database integrity verification
- [ ] Rollback procedure tested

**Time estimate**: 1-2 hours

---

## Framework 8: Escalation Criteria

### When to Ask User for Approval

**Always ask before:**
- Deploying to production
- Making database schema changes
- Changing authentication logic
- Modifying payment flows
- Deleting data
- Implementing first-time pattern

**Optional (use judgment):**
- Significant refactoring
- Performance optimization that changes behavior
- Adding new dependencies
- Changing build process

### When to Use Multi-Agent Coordination

**Required for:**
- Score 16+ tasks
- Tasks spanning frontend + backend + database
- Emergency production issues
- Complex debugging (unknown root cause)
- Large refactoring efforts

**Benefits:**
- Parallel investigation
- Multiple perspectives on root cause
- Faster completion of complex tasks
- Reduced risk of missing edge cases

---

## Quick Reference

### Complexity Score Calculation

```
Files Modified: 1-2 (0), 3-5 (1), 6-10 (2), 11+ (3)
Systems: Single (0), Module (1), Cross-module (2), Cross-service (3)
Rollback: Instant (0), Simple (1), Complex (2), Data recovery (3)
Security: None (0), Display (1), User data (2), Admin/payment (3)

TOTAL: 0-8 = Simple, 9-15 = Moderate, 16+ = Complex
```

### Rollback Decision

```
Broken? → Affects users? → Fix < 15 min? → Fix forward
                        → Fix > 15 min? → ROLLBACK
        → No users affected? → Plan proper fix
```

### Testing Time

```
Simple (0-8): 5-10 minutes
Moderate (9-15): 15-30 minutes
Complex (16+): 1-2 hours
```

---

## Related Protocols

- `.claude/protocols/audit-checklist.md` - Complete before using this framework
- `.claude/protocols/testing-checklist.md` - Use after planning to verify testing approach
- `.claude/protocols/documentation-requirements.md` - Document decisions made here
- `CLAUDE.md` - Systematic Development Methodology

---

## Success Criteria

✅ **Planning is complete when you have**:
- Clear implementation approach documented
- Change sequence determined
- Risks identified with mitigation strategies
- Testing plan defined
- Rollback procedure ready
- User approval (if required)

✅ **You should be able to**:
- Explain the plan to someone else clearly
- Identify what could go wrong and how to fix it
- Estimate time to implement and test
- Execute rollback if deployment fails

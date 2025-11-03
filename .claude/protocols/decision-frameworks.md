# Decision Frameworks

**Protection Status**: Standard
**Created**: 2025-10-31
**Last Updated**: 2025-10-31

---

## 🎯 When to Use This Protocol

**USE THIS PROTOCOL when**:
- Task complexity is uncertain or high
- Making architectural decisions
- Working on security-critical features
- Determining testing requirements
- Planning rollback strategies
- Choosing between multiple implementation approaches
- Need objective risk assessment

**SKIP THIS PROTOCOL if**:
- Simple bug fix (single file, obvious solution)
- Routine maintenance task
- Following established pattern exactly

**UNCERTAIN?** Ask yourself:
- Does this task touch multiple systems or files?
- Could this have security implications?
- Is rollback difficult if this breaks?
- Is this a new pattern without existing examples?

---

## Overview

This protocol provides structured frameworks for making development decisions. Use these frameworks to objectively assess task complexity, determine documentation needs, plan testing strategies, and establish rollback procedures.

**Frameworks included:**
1. **Complexity Scoring System** - Objective risk assessment
2. **Documentation Requirements** - When to update docs
3. **Testing Requirements** - What testing is needed
4. **Rollback Protocol** - How to safely revert changes
5. **Tool Selection Guidance** - Which tools to use when

---

## Prerequisites

- Understanding of the task or feature to be implemented
- Knowledge of project architecture (which systems/files involved)
- Awareness of dependencies and integration points

---

## Frameworks

### Framework 1: Complexity Scoring System

Use this framework to objectively assess task complexity and determine appropriate implementation approach.

#### Scoring Criteria (0-3 points each)

| Criterion | 0 points | 1 point | 2 points | 3 points |
|-----------|----------|---------|----------|----------|
| **Files Modified** | 1-2 files | 3-5 files | 6-10 files | 11+ files |
| **Systems Touched** | Single component | Same module | Cross-module | Cross-service |
| **Rollback Difficulty** | Instant (git revert) | Simple (revert + clear cache) | Complex (data migration needed) | Data recovery required |
| **Security Surface** | None (internal logic) | Display logic | User data handling | Admin/payment systems |

**Calculate total score**: Add points from all four criteria (max 12 points)

#### Action Based on Score

**Score 0-8: Implement Directly**
- Find existing pattern in codebase
- Adapt pattern to current need
- Test thoroughly
- Commit and deploy
- **Still follow**: Basic Audit → Execute → Test flow from audit-checklist.md and testing-checklist.md

**Score 9-15: Plan First**
- Use full **Audit → Plan → Execute → Test → Document** methodology
- Document approach in detail
- Get user approval if uncertain
- See: audit-checklist.md, risk-assessment-framework.md, testing-checklist.md, documentation-requirements.md

**Score 16+: Full Review Required**
- Use full **Audit → Plan → Execute → Test → Document** methodology with multi-agent coordination
- Complete architecture analysis
- Staged implementation (break into phases)
- Get approval at each stage
- Comprehensive testing at each stage
- Monitor closely in production
- See: audit-checklist.md, risk-assessment-framework.md, testing-checklist.md, documentation-requirements.md

#### Automatic Escalation (Regardless of Score)

**Always treat as high complexity if task involves:**
- Payment or billing systems
- Authentication or authorization
- Data deletion or migration
- Database schema changes
- Production configuration or secrets
- First-time patterns (no existing examples in codebase)

**For these tasks**: Use "Plan First" or "Full Review" approach regardless of score.

---

### Framework 2: Documentation Requirements

Determine when and what documentation needs updating.

#### When to Update Documentation

Update documentation **before merging** when:

| Change Type | Documentation Needed |
|-------------|---------------------|
| API endpoints added/modified | API docs, Swagger/OpenAPI specs |
| System behavior changes | Architecture docs, user guides |
| New patterns introduced | Code pattern guides, developer docs |
| Bug fixes affecting documented behavior | Relevant docs showing corrected behavior |
| Database schema changes | Schema documentation, migration guides |
| Configuration changes | Configuration reference, deployment guides |

#### Documentation Requirements

**All documentation must be:**
- **Technically precise**: Accurate technical details, correct syntax examples
- **Error scenarios included**: Document what errors can occur and how to handle them
- **Accurate cross-references**: Links to related docs remain valid
- **Examples provided**: Show real-world usage examples
- **Versioned**: Note when feature/behavior was added or changed

#### Documentation Checklist

- [ ] API documentation updated (if endpoints changed)
- [ ] Code comments added/updated (inline documentation)
- [ ] README updated (if user-facing changes)
- [ ] CHANGELOG.md updated (always for merged changes)
- [ ] Architecture docs updated (if system design changed)
- [ ] Examples updated (if behavior changed)

---

### Framework 3: Testing Requirements

Determine what level of testing is required for the task.

#### Required Testing by Task Type

| Task Type | Unit Tests | Integration Tests | E2E Tests | Manual Tests |
|-----------|------------|-------------------|-----------|--------------|
| New business logic | ✅ Required | If integrates | Optional | Required |
| API endpoint | Optional | ✅ Required | Optional | ✅ Required |
| UI component | If complex | ✅ Required | Optional | ✅ Required |
| Database changes | ✅ Required | ✅ Required | Optional | ✅ Required |
| Bug fix | ✅ Required | If integrated | Optional | ✅ Required |
| Refactoring | ✅ Required | ✅ Required | Optional | ✅ Required |

#### Testing Workflow

**Standard workflow** (for all changes):
1. **Test locally**: Run tests on development machine
2. **Deploy to staging**: Deploy changes to staging environment
3. **Verify staging**: Manual and automated tests on staging
4. **Deploy to production**: Only after staging verification passes
5. **Monitor production**: Watch for unexpected issues

**For high-risk changes** (security, payments, data):
1. **Test locally with multiple scenarios**
2. **Deploy to staging**
3. **Comprehensive staging verification** (all edge cases)
4. **Limited production rollout** (if possible)
5. **Monitor closely for 24-48 hours**
6. **Full rollout** after monitoring period

#### Testing Checklist

- [ ] Unit tests for business logic
- [ ] Integration tests for system interactions
- [ ] Error scenario testing (happy path + failure paths)
- [ ] Performance impact assessment (if applicable)
- [ ] Security testing (if user data or auth involved)
- [ ] Cross-browser testing (if UI changes)
- [ ] Mobile responsive testing (if UI changes)

---

### Framework 4: Rollback Protocol

Establish when and how to roll back changes.

#### When to Rollback

Execute rollback when:
- Deployment causes errors in production
- Tests fail after deployment to production
- User reports broken critical functionality
- Health checks fail after deployment
- Security vulnerability discovered in deployed code
- Performance degradation detected

**Do NOT rollback immediately if:**
- Minor UI glitch (can be fixed forward)
- Non-critical feature issue (can be fixed forward)
- Expected temporary behavior during migration

#### How to Rollback

**Step 1: Assess Impact**
- What is broken?
- How many users affected?
- Is data at risk?
- Can issue be fixed forward quickly (< 15 minutes)?

**Step 2: Notify Stakeholders**
- Immediately notify user of issue
- Provide clear description of symptoms
- Propose rollback with rationale

**Step 3: Execute Rollback** (only with user approval)

**For code deployment:**
```bash
# Method 1: Git revert
git checkout main
git revert HEAD
git push origin main

# Method 2: Container revision rollback
az containerapp revision activate \
  --name <app-name> \
  --resource-group <rg-name> \
  --revision <previous-working-revision>
```

**For database changes:**
```bash
# Mark migration as rolled back
DATABASE_URL="<db-url>" npx prisma migrate resolve --rolled-back <migration-name>

# Or restore from backup (if data corrupted)
az postgres flexible-server restore \
  --resource-group <rg-name> \
  --name <db-name>-restored \
  --source-server <db-name> \
  --restore-time "YYYY-MM-DDTHH:MM:00Z"
```

**Step 4: Verify Rollback**
- Confirm system functioning
- Check health endpoints
- Verify user-reported issue resolved
- Monitor for 10-15 minutes

**Step 5: Root Cause Analysis**
- Analyze what went wrong
- Document findings
- Plan fix that addresses root cause
- Test fix thoroughly before redeploying

#### Rollback Checklist

- [ ] Issue severity assessed
- [ ] User notified of issue
- [ ] User approved rollback
- [ ] Rollback executed
- [ ] System verified working after rollback
- [ ] Root cause identified
- [ ] Fix planned and reviewed
- [ ] Monitoring increased for next deployment

---

### Framework 5: Tool Selection Guidance

Choose the right tools for the task.

#### File Operations

| Task | Tool | Rationale |
|------|------|-----------|
| Search for files by pattern | **Glob** | Fast, supports wildcards |
| Search for code/text | **Grep** | Fast, regex support |
| Explore codebase architecture | **Task + Explore agent** | Comprehensive analysis |
| Read specific file | **Read** | Direct file access |
| Modify existing file | **Edit** | Precise replacements |
| Create new file | **Write** | Create from scratch |

**IMPORTANT**: Always **Read before Edit**, **Edit before Write** (never Write to existing files without reading first)

#### Search Strategy

**For specific files**:
1. Use **Glob** with pattern (e.g., `**/*auth*.ts`)
2. If not found, broaden pattern
3. If still not found, use **Task + Explore agent**

**For code patterns**:
1. Use **Grep** with specific pattern
2. If too many results, narrow with glob filter
3. If uncertain what to search, use **Task + Explore agent**

**For architectural understanding**:
1. Use **Task + Explore agent** directly
2. Specify thoroughness level (quick/medium/very thorough)
3. Agent will use multiple search strategies

#### Parallel Operations

**Run tools in parallel when**:
- Operations are independent (no dependencies)
- Gathering information from multiple sources
- Time-sensitive operations

**Run tools sequentially when**:
- One operation depends on result of another
- Modifying same files
- Order matters for correctness

**Example of parallel (single message, multiple tools)**:
```
Read: file1.ts
Read: file2.ts
Grep: pattern in directory
```

**Example of sequential (multiple messages)**:
```
Message 1: Read file to see current state
Message 2: Edit file based on what was read
Message 3: Verify changes with Read
```

---

## Verification

### Framework Usage Checklist

- [ ] Task complexity assessed using scoring system
- [ ] Appropriate implementation approach determined (implement/plan/review)
- [ ] Documentation needs identified
- [ ] Testing requirements determined
- [ ] Rollback strategy established
- [ ] Correct tools selected for task

---

## Examples

### Example 1: Using Complexity Scoring

**Task**: Add new user profile field

**Scoring**:
- Files Modified: 3 files (schema, API, frontend) = 1 point
- Systems Touched: Cross-module (database, backend, frontend) = 2 points
- Rollback Difficulty: Simple (migration can be reverted) = 1 point
- Security Surface: User data = 2 points
- **Total**: 6 points

**Action**: Score 6 = Implement directly
- Find similar field addition in codebase
- Adapt pattern for new field
- Test thoroughly
- Deploy to staging then production

---

### Example 2: Automatic Escalation

**Task**: Modify authentication token generation

**Scoring**: Would be ~5 points based on files/systems

**Escalation**: Authentication system = automatic escalation

**Action**: Treat as high complexity (Plan First approach)
- Document approach
- Review security implications
- Get approval
- Implement with comprehensive testing
- Monitor closely in production

---

### Example 3: Documentation Requirements

**Task**: Added new API endpoint `/api/posts/:id/reactions`

**Documentation needed**:
- ✅ Swagger documentation (required for API endpoints)
- ✅ API documentation file updated
- ✅ Code comments (JSDoc) added
- ✅ CHANGELOG.md updated
- ❌ Architecture docs (endpoint follows existing pattern)
- ❌ User guide (internal API, not user-facing)

---

## Troubleshooting

**Issue**: Scored as low complexity but task turned out complex
**Solution**: Re-score with new information. If score increases, switch to appropriate approach (Plan First or Full Review).

**Issue**: Uncertain which framework to apply
**Solution**: Start with Complexity Scoring. Based on score, other frameworks become clear.

**Issue**: Multiple frameworks give conflicting guidance
**Solution**: Use most conservative/cautious guidance. When in doubt, treat as higher complexity.

---

## Related Resources

- Phase-specific protocols: audit-checklist.md, risk-assessment-framework.md, testing-checklist.md, documentation-requirements.md
- `CLAUDE.md` - Core development principles (Tier 1-2)
- `.claude/protocols/deployment-procedures.md` - Deployment specifics
- `.claude/protocols/verification-checklists.md` - Testing checklists
- Project testing documentation

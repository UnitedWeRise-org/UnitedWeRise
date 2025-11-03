# 🔍 Comprehensive System Audit & Fix Protocol

**Purpose**: Standardized procedure for diagnosing and fixing complex system integration issues where one component isn't working but related components are functional.

**When to Use**:
- "X works but Y doesn't" scenarios (e.g., user-side works, admin dashboard doesn't)
- Integration issues between frontend/backend/database
- Features with placeholder/incomplete implementations
- Symptoms suggest missing data or misconfigured components

---

## Phase 1: Initial Scoping & Clarification (5-10 minutes)

### Before Starting: Ask Clarifying Questions

**CRITICAL**: Don't assume the problem scope. Ask these questions first:

1. **Symptom Specificity**:
   - "What exactly do you see? Empty tables? Error messages? Wrong data? Missing buttons?"
   - "Can you describe the expected vs. actual behavior?"
   - "Are there any error messages in browser console or backend logs?"

2. **User Actions**:
   - "Have you tried [specific action] recently?" (e.g., creating/editing the entity)
   - "Does the problem occur consistently or intermittently?"
   - "Did this ever work, or is it a new feature?"

3. **Related Systems**:
   - "You mentioned [X] works. Can you confirm [related Y] also works?"
   - "Are there any other components that depend on this?"

4. **Environment**:
   - "Is this happening in production, staging, or both?"
   - "When was the last deployment?"

**Goal**: Get specific symptoms, not just "it doesn't work"

### Create Initial TODO List

```javascript
[
  { content: "Gather clarifying information from user", status: "in_progress" },
  { content: "Audit [component A] implementation", status: "pending" },
  { content: "Audit [component B] implementation", status: "pending" },
  { content: "Audit [component C] implementation", status: "pending" },
  { content: "Synthesize findings and identify root cause", status: "pending" },
  { content: "Create implementation plan", status: "pending" },
  { content: "Implement fixes", status: "pending" },
  { content: "Test and verify fixes", status: "pending" },
  { content: "Deploy to staging", status: "pending" },
  { content: "Manual verification", status: "pending" },
  { content: "Update documentation", status: "pending" }
]
```

---

## Phase 2: Parallel Comprehensive Audit (10-15 minutes)

### Identify Audit Areas

For frontend-backend-database integration issues, typical areas:

1. **Frontend Component** (working or broken)
   - What UI elements exist?
   - What data fields are displayed?
   - What API endpoints are called?
   - What user interactions are supported?

2. **Backend API Endpoints** (admin and user-facing)
   - What endpoints exist?
   - What authentication/authorization is used?
   - What data fields are accepted/returned?
   - What validation is performed?
   - What documentation exists?

3. **Database Schema**
   - What tables/models exist?
   - What fields are defined?
   - What relationships exist?
   - What indexes are present?
   - What migrations exist?

4. **Related Frontend Components** (if applicable)
   - How does the working component differ from broken one?
   - What patterns can we learn from?

### Launch Parallel Agents

**Use Task tool with multiple agents in SINGLE message**:

```javascript
// Example: Launch 4 agents simultaneously
Task: Audit admin frontend (Explore, haiku, very thorough)
Task: Audit backend endpoints (Explore, haiku, very thorough)
Task: Audit user frontend (Explore, haiku, very thorough)
Task: Audit database schema (Explore, haiku, medium)
```

**Agent Instructions Template**:

```
Audit the [COMPONENT] implementation for [FEATURE].

Search for and analyze:
1. All [FEATURE]-related files in [LOCATION]
2. [Specific things to look for - be explicit]
3. [Additional context needed]

Provide a comprehensive report including:
- File locations and their purposes
- Current implementation state (working vs placeholder vs broken)
- API endpoints being called / Data fields being used
- Any issues, gaps, or discrepancies identified
- Code snippets showing key functionality

Set thoroughness to [quick/medium/very thorough] based on complexity.
```

**Don't ask agents to**:
- Make recommendations (you'll synthesize that)
- Fix anything (audit only)
- Summarize too much (need details for synthesis)

### What Agents Should Return

Each agent should provide:
- **File paths** (absolute paths for easy reference)
- **Code snippets** (showing actual implementation)
- **Data structures** (what fields/objects are used)
- **Discrepancies** (what's missing, wrong, or inconsistent)
- **Status assessment** (working, broken, placeholder, incomplete)

---

## Phase 3: Synthesis & Root Cause Analysis (5-10 minutes)

### Review All Audit Reports

Read each agent's full report. Don't skim.

### Create Comparison Matrix

Compare what each component expects vs. what exists:

| Component | Expects Field X | Expects Field Y | Expects Endpoint Z |
|-----------|-----------------|-----------------|-------------------|
| Admin Frontend | ✅ Uses priority | ✅ Uses targetAudience | ✅ Calls /admin/list |
| Backend API | ❌ Ignores priority | ❌ Ignores targetAudience | ✅ Implements /admin/list |
| Database Schema | ❌ No priority field | ❌ No targetAudience field | N/A |

### Identify Root Causes

**Root cause** = The fundamental reason the system doesn't work (not just symptoms)

Look for:
1. **Missing Components**: Database fields, API endpoints, frontend handlers
2. **Mismatched Expectations**: Frontend expects X, backend returns Y
3. **Incomplete Implementations**: Placeholder comments, TODO markers, hardcoded values
4. **Configuration Errors**: Wrong middleware, wrong environment variables, wrong URLs
5. **Security Issues**: Missing authentication, wrong authorization level
6. **Documentation Gaps**: Undocumented code, outdated docs, missing examples

### Synthesize Findings Document

Create a clear summary:

```markdown
## Root Cause: [One sentence description]

### Frontend Expectations:
- Expects fields: [list]
- Calls endpoints: [list]
- Implements features: [list]

### Backend Implementation:
- Provides fields: [list]
- Implements endpoints: [list]
- Missing: [list]

### Database Schema:
- Tables: [list]
- Fields: [list]
- Missing: [list]

### Critical Issues:
1. [Security issues - highest priority]
2. [Missing functionality - high priority]
3. [Documentation gaps - medium priority]
4. [Nice-to-have improvements - low priority]
```

**Update TODO**: Mark synthesis complete, add any new tasks discovered

---

## Phase 4: Implementation Planning (5-10 minutes)

### Create Phased Implementation Plan

**Phase dependencies matter**. Typical order:

1. **Database Schema** (if needed)
   - Add missing fields
   - Create migrations
   - Apply to dev database first

2. **Backend Security** (if needed)
   - Fix authentication/authorization bugs (CRITICAL)
   - These must be fixed before functionality

3. **Backend Functionality**
   - Add missing endpoints
   - Update existing endpoints to use new fields
   - Add input validation
   - Fix broken logic

4. **Backend Documentation** (project requirement)
   - Add Swagger/JSDoc to all endpoints
   - Update API docs

5. **Frontend Updates** (if needed)
   - Update components to use new fields
   - Add new UI elements
   - Update validation

6. **Testing**
   - Unit tests
   - Integration tests
   - Manual test plan

7. **Deployment**
   - Deploy to staging
   - Verify functionality
   - Update documentation

8. **Documentation**
   - Update DATABASE_SCHEMA.md
   - Update CHANGELOG.md
   - Update API docs

### Determine Deployment Strategy

Choose based on risk:

**Low Risk** (schema changes only, backward compatible):
- Deploy schema + code together
- Single commit, single deployment

**Medium Risk** (new fields, optional features):
- Deploy schema first, verify
- Deploy code second, verify
- Two commits, incremental

**High Risk** (breaking changes, security fixes):
- Deploy schema with defaults
- Test backward compatibility
- Deploy code in stages
- Multiple commits, multiple verifications
- Have rollback plan ready

### Create Test Plan

**Before implementing**, document test cases:

```markdown
## Test Plan

### Unit Tests Needed:
- [ ] Test validation: title length (3-100 chars)
- [ ] Test validation: content length (10-2000 chars)
- [ ] Test validation: date logic (end >= start)
- [ ] Test TOTP verification

### Integration Tests Needed:
- [ ] Test CREATE endpoint with all new fields
- [ ] Test UPDATE endpoint preserves existing data
- [ ] Test DELETE endpoint with TOTP

### Manual Test Cases:
- [ ] Create MOTD with priority=HIGH, targetAudience=ADMINS
- [ ] Edit MOTD and verify all fields persist
- [ ] Delete MOTD with TOTP verification
- [ ] View analytics for views and dismissals
- [ ] Check audit log shows all actions
```

### Create Rollback Plan

Document how to undo changes if deployment fails:

```markdown
## Rollback Plan

### If schema migration fails:
1. Check migration status: `npx prisma migrate status`
2. Mark as rolled back: `npx prisma migrate resolve --rolled-back [name]`
3. Revert schema.prisma to previous version
4. Redeploy previous backend version

### If backend deployment fails:
1. Check error logs: `az containerapp logs show...`
2. Revert to previous image: `az containerapp revision activate...`
3. Verify health endpoint returns previous SHA

### If functionality broken after deployment:
1. Verify database has new fields: `SELECT * FROM "MessageOfTheDay" LIMIT 1`
2. Verify backend sees new fields: Check Swagger docs at /api-docs
3. Check for TypeScript compilation errors in logs
```

**Update TODO**: Mark planning complete, expand implementation tasks

---

## Phase 5: Implementation (30-60 minutes)

### Implementation Order

Follow the phased plan. Complete each phase before moving to next.

### Database Schema Changes

If adding fields to existing model:

1. **Read Prisma schema** to understand current structure
2. **Add fields** with appropriate types, defaults, indexes
3. **Add enums** if needed (before the model that uses them)
4. **Add comments** explaining each new field
5. **Validate schema**: `npx prisma validate`
6. **Create migration**:
   - Try `npx prisma migrate dev --name descriptive_name`
   - If fails (shadow DB issues), create manual migration SQL
7. **Review migration SQL** before applying
8. **Apply to dev database**: `npx prisma migrate deploy`
9. **Generate Prisma client**: `npx prisma generate`
10. **Commit migration files**: Include both schema.prisma and migrations/

**Common Mistakes**:
- Forgetting to add defaults for new NOT NULL fields
- Adding enums after the model that uses them (wrong order)
- Not regenerating Prisma client after schema changes
- Committing schema.prisma without migration files

### Backend Code Changes

**For comprehensive rewrites** (multiple related fixes):

1. **Read current implementation** completely
2. **Identify patterns** to preserve (error handling, logging, etc.)
3. **Read project auth middleware** to understand correct usage
4. **Read similar endpoints** for documentation examples
5. **Write new version** with all fixes in one edit
6. **Add Swagger/JSDoc** to EVERY endpoint (project requirement)
7. **Add input validation** to EVERY endpoint that accepts data
8. **Test compilation**: `npm run build`
9. **Review diff**: `git diff src/routes/[file].ts`

**For incremental fixes** (one issue at a time):

1. Fix highest priority issue (security)
2. Test compilation
3. Fix next issue (functionality)
4. Test compilation
5. Continue until all issues fixed

**Documentation Requirements** (PROJECT MANDATORY):

Every endpoint needs Swagger:
```typescript
/**
 * @swagger
 * /api/endpoint:
 *   post:
 *     tags: [Category]
 *     summary: Brief description
 *     description: Detailed explanation
 *     security:
 *       - cookieAuth: []  # If requires auth
 *     requestBody: [full schema]
 *     responses:
 *       200: [success schema]
 *       400: [error schema]
 *       401: [auth error]
 */
```

Every service function needs JSDoc:
```typescript
/**
 * Brief description
 *
 * @param paramName - Description with constraints
 * @returns Promise<Type> Description of return value
 * @throws {ErrorType} When this error occurs
 * @example
 * const result = await func('value');
 */
```

**Validation Requirements** (PROJECT MANDATORY):

All endpoints that accept data need validation:
- String lengths (min/max)
- Date logic (end >= start)
- Enum values (must be in allowed list)
- Required vs optional fields
- Type checking (number, boolean, etc.)

**Update TODO**: Mark implementation tasks complete as you finish them

### Build & Test Locally

Before committing:

1. **Compile TypeScript**: `npm run build`
   - Must succeed with zero errors
   - Fix any type errors before proceeding

2. **Validate Prisma**: `npx prisma validate`
   - Must show "schema is valid"

3. **Run tests** (if project has them): `npm test`
   - All tests must pass

4. **Manual smoke test** (if possible locally):
   - Start dev server
   - Test one endpoint with curl or Postman
   - Verify new fields are accepted/returned

**Do not commit broken code**. If build fails, fix before committing.

---

## Phase 6: Deployment (15-30 minutes)

### Commit Strategy

**Two-commit approach** (recommended):

**Commit 1: Code changes**
```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/ backend/src/routes/[file].ts
git commit -m "feat: [Description of feature/fix]

- [Bullet list of changes]
- [Include security fixes prominently]
- [Include breaking changes]
- [Include migration details]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Commit 2: Documentation**
```bash
git add docs/DATABASE_SCHEMA.md CHANGELOG.md [other docs]
git commit -m "docs: [Description]

- [What documentation was added/updated]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Single-commit approach** (acceptable for smaller changes):
```bash
git add [all changed files]
git commit -m "feat: [Feature] with documentation

- [Code changes]
- [Doc changes]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Deployment to Staging

**Follow project deployment procedures** in CLAUDE.md.

For UnitedWeRise (example):

1. **Push to development branch**:
   ```bash
   git push origin development
   ```

2. **If automatic deployment not working**, use manual procedure:
   ```bash
   GIT_SHA=$(git rev-parse --short HEAD)
   DOCKER_TAG="backend-dev-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"

   # Build Docker image
   az acr build --registry uwracr2425 \
     --image "unitedwerise-backend:$DOCKER_TAG" \
     --no-wait \
     https://github.com/UnitedWeRise-org/UnitedWeRise.git#development:backend

   # Wait for build (2-3 minutes)
   sleep 180

   # Get image digest
   DIGEST=$(az acr repository show --name uwracr2425 \
     --image "unitedwerise-backend:$DOCKER_TAG" \
     --query "digest" -o tsv)

   # Deploy to staging
   az containerapp update \
     --name unitedwerise-backend-staging \
     --resource-group unitedwerise-rg \
     --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
     --revision-suffix "stg-$GIT_SHA-$(date +%H%M%S)" \
     --set-env-vars NODE_ENV=staging RELEASE_SHA=$GIT_SHA RELEASE_DIGEST=$DIGEST
   ```

3. **Wait for deployment** (30-60 seconds):
   ```bash
   sleep 30
   ```

4. **Verify health endpoint**:
   ```bash
   curl -s "https://dev-api.unitedwerise.org/health" | python -m json.tool
   ```

**Verification checklist**:
- ✅ Status: "healthy"
- ✅ releaseSha: matches local `git rev-parse --short HEAD`
- ✅ uptime: < 300 seconds (fresh restart)
- ✅ database: "connected"
- ✅ databaseHost: correct for environment (dev DB for staging)

**Update TODO**: Mark deployment complete

---

## Phase 7: Manual Verification (10-20 minutes)

### CRITICAL: Don't Skip This Step

**Deployed ≠ Working**. You must manually test the actual functionality.

### Test Plan Execution

Execute the test plan you created in Phase 4:

For MOTD example:

1. **Login to staging admin dashboard**:
   - URL: https://dev-admin.unitedwerise.org
   - Use admin credentials

2. **Navigate to MOTD module**:
   - Click MOTD tab
   - Verify list loads without errors

3. **Test CREATE functionality**:
   ```
   - Click "Create MOTD"
   - Fill in:
     - Title: "Test MOTD - Priority High"
     - Content: "This is a test MOTD with priority high and target audience admins"
     - Priority: HIGH
     - Target Audience: ADMINS
     - Start Date: [today]
     - End Date: [tomorrow]
     - Is Dismissible: true
     - Show Once: false
   - Save
   - Verify success message
   - Verify MOTD appears in list with correct priority badge
   ```

4. **Test EDIT functionality**:
   ```
   - Click Edit on test MOTD
   - Change priority to MEDIUM
   - Change target audience to ALL
   - Save
   - Verify changes persisted (reload page, check priority/audience)
   ```

5. **Test ANALYTICS**:
   ```
   - Click View Analytics on test MOTD
   - Verify shows:
     - View count
     - Dismissal count
     - Audit log entries (created, updated)
   ```

6. **Test DELETE with TOTP**:
   ```
   - Click Delete on test MOTD
   - Verify TOTP modal appears
   - Enter TOTP code
   - Enter deletion reason (>10 chars)
   - Confirm deletion
   - Verify MOTD removed from list
   - Verify audit log created (check analytics or logs)
   ```

7. **Test USER-FACING display**:
   ```
   - Go to https://dev.unitedwerise.org
   - Verify no MOTD displays (we deleted it)
   - Create another MOTD in admin with isActive=true
   - Reload user-facing site
   - Verify MOTD displays with correct content
   - Click dismiss
   - Verify MOTD disappears
   - Reload page
   - Verify MOTD doesn't reappear (dismissal persisted)
   ```

### Document Test Results

Create verification report:

```markdown
## Manual Verification Results - [Date] [Time]

### Environment: Staging (dev.unitedwerise.org)
### Tested By: Claude Code
### Release SHA: a1c65b4

### Test Results:

- [✅] Login to admin dashboard
- [✅] Navigate to MOTD module
- [✅] Create MOTD with all new fields
- [✅] Verify priority displays correctly
- [✅] Verify target audience saves
- [✅] Edit MOTD and verify changes persist
- [✅] View analytics (views, dismissals, logs)
- [✅] Delete MOTD with TOTP verification
- [✅] User-facing MOTD display
- [✅] User-facing MOTD dismissal

### Issues Found:
[None | List any issues discovered]

### Conclusion:
[All tests passed | Some tests failed - see issues]
```

**If tests fail**:
1. Document the failure clearly
2. Check backend logs: `az containerapp logs show...`
3. Check browser console for errors
4. Determine if issue is deployment or code bug
5. Fix and redeploy if needed

**Update TODO**: Mark manual verification complete

---

## Phase 8: Documentation Updates (10-15 minutes)

### Required Documentation Updates

**1. DATABASE_SCHEMA.md** (if schema changed):

Add comprehensive section for the feature:

```markdown
## [Feature Name] System

### [ModelName] Model

[Brief description of what this model represents]

```prisma
[Complete Prisma schema with comments]
```

### [Related Model 2]

[Description and schema]

### System Features

**Frontend** (`path/to/frontend/file.js`):
- [Feature list]

**Backend API** (`path/to/backend/file.ts`):
- Public endpoints: [list]
- Admin endpoints: [list]
- Documentation: [Swagger/JSDoc status]

**Security Features**:
- [List security measures]

**Added [Date]**:
- [List of fields/features added in this update]
```

**2. CHANGELOG.md**:

Add entry with current date:

```markdown
## [Unreleased] - YYYY-MM-DD

### Fixed - [Feature Name] [Type of Change]
- **[Component Name]**
  - [Detailed bullet list of changes]
  - Location: `path/to/file`

- **[Another Component]**
  - [Changes]

**Impact**: [Clear description of what users/admins can now do]

**Security**: [If any security fixes, highlight prominently]
```

**3. API Documentation** (if endpoints changed):

Update docs/API_[FEATURE].md with:
- New endpoint descriptions
- Request/response examples
- Error handling
- Use cases

**4. Architecture Documentation** (if architecture changed):

Update relevant architecture docs with:
- New components
- New data flows
- New dependencies

### Commit Documentation

Separate commit for documentation (or include in main commit):

```bash
git add docs/ CHANGELOG.md
git commit -m "docs: Update documentation for [feature]

- Added [ModelName] section to DATABASE_SCHEMA.md
- Updated CHANGELOG.md with [date] entry
- [Other doc updates]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin development
```

**Update TODO**: Mark documentation complete

---

## Phase 9: Final Wrap-Up (5 minutes)

### Create Summary for User

Provide comprehensive summary:

```markdown
## ✅ [Feature] Successfully Fixed and Deployed

### What Was Fixed:
1. **Root Cause**: [One sentence]
2. **Database**: [What was added/changed]
3. **Backend**: [What was fixed]
4. **Security**: [Any security issues fixed]
5. **Documentation**: [What was updated]

### Deployment Status:
- ✅ Deployed to staging: https://dev-[domain]
- ✅ Release SHA: [sha]
- ✅ Health check: Passing
- ✅ Manual testing: [Passed | See issues below]

### Manual Verification Results:
- [✅] [Test case 1]
- [✅] [Test case 2]
- [❌] [Test case 3] - Issue: [description]

### Files Changed:
1. `path/to/file1` - [What changed]
2. `path/to/file2` - [What changed]

### Next Steps:
- [ ] [Any remaining work]
- [ ] [Deploy to production when ready]
- [ ] [Monitor for issues]

### Verification Checklist for User:
Use these steps to verify on staging:
- [ ] [Step 1]
- [ ] [Step 2]
```

### Update Final TODO Status

Mark ALL todos complete:

```javascript
TodoWrite: [
  { content: "All tasks", status: "completed" }
]
```

---

## 🚨 Failure Modes & Recovery

### If Parallel Agents Fail

**Symptom**: Agent returns error or incomplete data

**Recovery**:
1. Check error message for specifics
2. Re-run single agent with different parameters
3. Try "medium" thoroughness instead of "very thorough"
4. Try different subagent_type (Plan instead of Explore)
5. Fallback: Use direct Grep/Read tools instead of agents

### If Synthesis Reveals Larger Scope

**Symptom**: Audit finds 20+ issues instead of expected 3-5

**Recovery**:
1. Present findings to user: "Found [X] issues. Prioritize which to fix first?"
2. Break into multiple phases: "Phase 1: Critical fixes | Phase 2: Nice-to-haves"
3. Consider separate tickets: "This is actually 3 separate issues"

### If Build Fails After Changes

**Symptom**: `npm run build` fails with TypeScript errors

**Recovery**:
1. Don't commit broken code
2. Read error messages carefully
3. Check if new fields break existing type definitions
4. Add type annotations to new code
5. Check if missing imports
6. Revert changes if can't fix quickly: `git restore [file]`

### If Deployment Fails

**Symptom**: Container won't start or health check fails

**Recovery**:
1. Check container logs: `az containerapp logs show...`
2. Look for: Environment validation errors, database connection errors, missing env vars
3. Check if migrations applied: `npx prisma migrate status`
4. Rollback if needed (see rollback plan from Phase 4)
5. Fix locally, rebuild, redeploy

### If Manual Tests Fail

**Symptom**: Feature doesn't work as expected after deployment

**Recovery**:
1. Don't mark as complete
2. Check browser console for frontend errors
3. Check backend logs for API errors
4. Check database for data (use pgAdmin or psql)
5. Determine if issue is: Frontend bug, backend bug, data issue, deployment issue
6. Fix and redeploy
7. Re-test

---

## 📊 Success Metrics

A successful audit & fix includes:

**Completeness**:
- ✅ All reported symptoms resolved
- ✅ Root cause identified and fixed (not just symptoms)
- ✅ No new issues introduced
- ✅ All related functionality tested

**Quality**:
- ✅ Code compiles without errors or warnings
- ✅ All endpoints documented (100% Swagger/JSDoc coverage)
- ✅ Input validation on all data-accepting endpoints
- ✅ Security best practices followed
- ✅ Project coding standards followed

**Verification**:
- ✅ Manual tests passed on staging
- ✅ Health checks passing
- ✅ Correct SHA deployed
- ✅ No errors in logs

**Documentation**:
- ✅ DATABASE_SCHEMA.md updated (if schema changed)
- ✅ CHANGELOG.md updated with clear entry
- ✅ API docs updated (if endpoints changed)
- ✅ Code comments explaining complex logic

**Process**:
- ✅ TODO list maintained throughout
- ✅ User kept informed of progress
- ✅ Rollback plan documented
- ✅ Git commits have clear, detailed messages

---

## 🎯 Key Principles

1. **Understand Before Fixing**: Comprehensive audit before any code changes
2. **Parallel When Possible**: Launch multiple agents simultaneously
3. **Root Cause First**: Fix the cause, not symptoms
4. **Dependencies Matter**: Database → Security → Functionality → Docs
5. **Document Everything**: Code, APIs, schemas, changes
6. **Test Before Claiming Success**: Deployed ≠ Working
7. **User Verification Important**: They know the symptoms best

---

## 📚 Related Protocols

- See `.claude/guides/multi-agent-patterns.md` for agent coordination
- See `CLAUDE.md` deployment procedures for environment-specific steps
- See `docs/DEPLOYMENT-MIGRATION-POLICY.md` for database migration safety

---

## 🔄 Protocol Maintenance

**This protocol should be updated when**:
- New better practices discovered
- Tool capabilities change
- Project requirements evolve
- Failure modes encountered

**Update Location**: `.claude/protocols/audit-and-fix-protocol.md`
**Maintained By**: Development team + Claude Code iterations
**Last Updated**: October 31, 2025

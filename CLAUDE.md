# Claude Code Development Reference - Condensed

## 🤖 Production Status & Environment

### Deployment URLs
- **Backend**: https://api.unitedwerise.org
- **Frontend**: https://www.unitedwerise.org
- **Admin Dashboard**: https://www.unitedwerise.org/admin-dashboard.html

### Platform Status: ✅ Complete Social Media Platform
- ✅ My Feed infinite scroll (15-post batches)
- ✅ Photo tagging with privacy controls
- ✅ User relationships & notifications
- ✅ Reputation system with democratic reporting
- ✅ AI content analysis & topic discovery
- ✅ Officials panel with voting records
- ✅ Admin dashboard with deployment monitoring
- ✅ LIVE Stripe payments with tax receipts
- ✅ OAuth Authentication (Google)
- ✅ TOTP 2FA with 24-hour sessions
- ✅ Logical candidate registration flow

---

## 🚨 CRITICAL DEVELOPMENT PROTOCOLS

### Pre-Implementation Requirements (MANDATORY)
**Before ANY code changes:**

1. **Quick Reference Check**: Review relevant CLAUDE.md sections first
2. **MASTER_DOCUMENTATION Search Strategy**:
   - Use Task Tool: "Search MASTER_DOCUMENTATION.md for [feature/system name]"  
   - Target specific sections: `{#api-reference}`, `{#security-authentication}`, etc.
   - Look for cross-references: `Related Systems:`, `Files Modified:`
   - Check "Known Issues" and "Recently Fixed" sections first
3. **Codebase Verification**: Use Grep across ALL files to confirm findings
4. **User Approval**: Never assume reorganization is needed without explicit confirmation


### MASTER_DOCUMENTATION.md Usage Guidelines
**When to consult MASTER_DOCUMENTATION.md:**
- ✅ **API endpoints**: Complete endpoint documentation with examples
- ✅ **System integrations**: How different components connect  
- ✅ **Troubleshooting**: Detailed error scenarios and solutions
- ✅ **Security patterns**: Authentication and authorization details
- ✅ **Known issues**: Current bugs and workarounds

**Quick Navigation Guide (28 Major Sections):**
```
Core Systems: {#executive-summary} {#system-architecture} {#database-schema} {#api-reference}
Security: {#security-authentication} {#deployment-infrastructure} {#monitoring-admin}
Features: {#social-features} {#reputation-system} {#media-photos} {#enhanced-search-system}
Civic: {#map-civic-features} {#civic-organizing-system} {#election-tracking-system}
Candidate: {#candidate-registration-admin-system} {#candidate-verification-reporting-system}
Advanced: {#ai-semantic-features} {#ai-trending-topics-system} {#relationship-system}
Operations: {#stripe-nonprofit-payment-system} {#performance-optimizations}
Development: {#known-issues-bugs} {#development-practices} {#troubleshooting}
Planning: {#session-history} {#future-roadmap}
```

**Priority Sections for Common Tasks:**
- **Adding Features**: Check {#api-reference}, {#database-schema}, {#system-architecture}
- **Authentication Issues**: Check {#security-authentication}, {#troubleshooting}
- **UI/Frontend Work**: Check {#ui-ux-components}, {#social-features}, {#media-photos}
- **Deployment**: Check {#deployment-infrastructure}, Recent Changes sections
- **Bug Fixes**: Check {#known-issues-bugs}, {#troubleshooting}, Recently Fixed sections

**How to search effectively:**
```bash
# Use Task Tool for complex searches
"Search MASTER_DOCUMENTATION.md for authentication workflows and related security systems"

# Use Grep for specific patterns
grep -n "API.*endpoint.*auth" MASTER_DOCUMENTATION.md
grep -n "Known Issues" MASTER_DOCUMENTATION.md  
grep -n "{#security-" MASTER_DOCUMENTATION.md
```

**Cross-reference patterns to follow:**
- `{#section-name}` → Jump to specific system documentation
- `Related Systems:` → Find interconnected components  
- `Files Modified:` → Locate implementation files
- `Recently Fixed:` → Avoid reimplementing solved problems

**If user suggests feature already exists but you can't find it:**
- Document search attempts made
- Request guidance: "Can you point me to where this is located?"
- FULL STOP - No implementation until explicitly told to proceed

### Multi-Developer Conflict Prevention
- **BEFORE ANY EDIT**: Check documentation for "Recently Modified" indicators
- **VERIFY**: No conflicts with other developers' work
- **CRITICAL**: Always verify functionality before removing "deprecated" code

---

## 🚨 CRITICAL: SCOPE CREEP PREVENTION PROTOCOL

### THE CARDINAL RULE: SOLVE THE SPECIFIC PROBLEM ONLY

**BEFORE making ANY code changes:**

#### Step 1: Define the Specific Problem
- Write the problem in ONE sentence
- Identify EXACTLY which user-facing behavior needs to change
- List ONLY the endpoints/functions that serve that behavior

#### Step 2: Minimum Viable Solution Check
- Can this be solved by changing 3 or fewer functions/endpoints?
- If not, STOP and get user approval for broader changes
- If yes, proceed with ONLY those specific changes

#### Step 3: No Architecture Changes Without Explicit Permission
- **NEVER** create new services/classes unless explicitly requested
- **NEVER** "improve consistency" across unrelated code  
- **NEVER** refactor working code that isn't causing the specific problem
- **NEVER** replace working implementations with "better" ones

#### Step 4: Working Code is Sacred
- If existing code works correctly, DO NOT TOUCH IT
- "Could be better" ≠ "should be changed"
- Optimization requests must be explicit from user

### 🚨 BANNED PHRASES THAT TRIGGER SCOPE CREEP:
- "While we're at it, let's also..."
- "This would be a good time to..."
- "I noticed we could improve..."
- "For consistency, I'll update..."
- "Let me fix this other issue I found..."

### ✅ ALLOWED APPROACH:
- "I will change exactly these 2 endpoints to solve the specific problem"
- "This change only affects the reported behavior"
- "I'm leaving all other working code unchanged"

### 🚨 MANDATORY SCOPE CHECK:
Before proceeding with ANY implementation:
1. **"Am I solving the exact problem stated?"**
2. **"Am I changing the minimum code necessary?"**  
3. **"Have I gotten explicit permission for any architectural changes?"**
4. **"Will this change break any working functionality?"**

If ANY answer is uncertain, STOP and clarify with user.

---

## 🚀 COMPREHENSIVE DEPLOYMENT GUIDE

### 📍 Deployment Endpoints
- **Backend**: https://api.unitedwerise.org
- **Frontend**: https://www.unitedwerise.org
- **Admin Dashboard**: https://www.unitedwerise.org/admin-dashboard.html

---

### 🚨 MANDATORY PRE-DEPLOYMENT CHECKLIST
**NEVER SKIP - Prevents 99% of deployment failures:**

```bash
# 1. VERIFY CHANGES EXIST (CRITICAL - ALWAYS RUN FIRST)
git status  
# ✅ Should show modified files OR "working tree clean" if already committed
# ❌ If "working tree clean" but you made changes = CHANGES NOT SAVED!

# 2. VERIFY TYPESCRIPT COMPILATION (for backend changes only)
cd backend && npm run build  
# ✅ Must compile without errors
# ❌ If fails = Fix TypeScript errors BEFORE proceeding

# 3. VERIFY GITHUB HAS YOUR CHANGES
git log -1 --oneline  
# ✅ Should show your recent commit with your changes
# ❌ If doesn't show your changes = NOT COMMITTED YET!

# 4. VERIFY ALL CHANGES PUSHED
git log origin/main..HEAD
# ✅ Should show nothing (all commits pushed)
# ❌ If shows commits = NOT PUSHED TO GITHUB!
```

**⚠️ CRITICAL UNDERSTANDING:**
- Docker builds from GitHub repository, NOT your local files
- Uncommitted changes will NEVER deploy
- This is the #1 cause of "mysterious" deployment failures

---

### 📋 DEPLOYMENT PROCEDURES

#### 1️⃣ Frontend Deployment (`frontend/` files)
```bash
# Simple 3-step process
git add .
git commit -m "feat/fix/docs: Description of changes"
git push origin main

# GitHub Actions auto-deploys in ~2-5 minutes
# Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
```

#### 2️⃣ Backend Deployment (`backend/src/` files) - IMPROVED WORKFLOW
```bash
# Step 1: Run pre-deployment checklist (see above)

# Step 2: Commit and push to GitHub
git add .
git commit -m "feat/fix/refactor: Description of changes"
git push origin main

# Step 3: Verify push succeeded
git status  # Must show "Your branch is up to date with 'origin/main'"

# Step 4: Build Docker image with Git SHA tracking
GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"
az acr build --registry uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --no-wait https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend
echo "Build queued with tag: $DOCKER_TAG for commit: $GIT_SHA"

# Step 5: Wait for build (typically 2-3 minutes)
sleep 180

# Step 6: Verify build succeeded
az acr task list-runs --registry uwracr2425 --output table | head -3
# Status column MUST show "Succeeded"

# Step 7: Get image digest for immutable deployment
DIGEST=$(az acr repository show --name uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --query "digest" -o tsv)
echo "Image digest: $DIGEST"

# Step 8: Deploy with digest + release metadata (PREVENTS CACHING ISSUES)
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "rel-$GIT_SHA-$(date +%H%M%S)" \
  --set-env-vars \
    RELEASE_SHA=$GIT_SHA \
    RELEASE_DIGEST=$DIGEST \
    DOCKER_TAG=$DOCKER_TAG \
    DEPLOYMENT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Step 9: Force single-revision mode (prevents traffic split issues)
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-mode Single

# Step 10: Verify deployment with improved checks
echo "Waiting for deployment to complete..."
sleep 30

# Check that health shows correct release SHA
DEPLOYED_SHA=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
if [ "$DEPLOYED_SHA" = "$GIT_SHA" ]; then
  echo "✅ Deployment verified: Release SHA matches ($GIT_SHA)"
else
  echo "❌ Deployment issue: Expected SHA $GIT_SHA, got $DEPLOYED_SHA"
fi

# Check uptime (should be <60 seconds for fresh deployment)
UPTIME=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"uptime":[^,]*' | cut -d':' -f2)
echo "Container uptime: $UPTIME seconds"
```

#### 3️⃣ Database Schema Changes (`prisma/schema.prisma`)
```bash
# Step 1: Commit schema changes
git add .
git commit -m "schema: Description of changes"
git push origin main

# Step 2: Generate Prisma client locally
cd backend && npx prisma generate

# Step 3: Apply migrations to production database
npx prisma db execute --file scripts/migration-name.sql --schema prisma/schema.prisma

# Step 4: Follow Backend Deployment steps above
```

---

### 🔍 QUICK FAILURE DIAGNOSIS - IMPROVED

**When changes don't appear in production, check in order:**

```bash
# 1. Are changes committed?
git status  # If shows modified files = NOT COMMITTED

# 2. Are changes pushed?
git log origin/main..HEAD  # If shows commits = NOT PUSHED

# 3. Did TypeScript compile?
cd backend && npm run build  # If errors = FIX FIRST

# 4. Did Docker build succeed?
az acr task list-runs --registry uwracr2425 --output table | head -3
# If Status = "Failed" = BUILD FAILED

# 5. Is correct release SHA deployed? (PREVENTS CACHE CONFUSION)
GIT_SHA=$(git rev-parse --short HEAD)
curl -s "https://api.unitedwerise.org/version" | grep releaseSha
# Should show your current commit SHA

# 6. Is new container running?
curl -s "https://api.unitedwerise.org/health" | grep uptime
# If uptime > 300 seconds = OLD CONTAINER

# 7. Check revision status (if Multi-revision enabled)
az containerapp revision list --name unitedwerise-backend --resource-group unitedwerise-rg -o table
# Newest revision should be Active with TrafficWeight=100

# 8. Verify image digest matches deployment
az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg --query "properties.template.containers[0].image"
# Should show uwracr2425.azurecr.io/unitedwerise-backend@sha256:...
```

---

### ⚠️ WHEN DOCKER REBUILD IS REQUIRED

**MUST Rebuild For:**
- ✅ Backend source code changes (`.ts`, `.js` files in `/backend/src/`)
- ✅ Package dependencies (`package.json`, `package-lock.json`)
- ✅ Dockerfile modifications
- ✅ Prisma schema changes (after migrations)
- ✅ New environment variables affecting app logic

**NO Rebuild Needed For:**
- ❌ Frontend changes (GitHub Actions handles)
- ❌ Config-only environment variables (API keys, URLs)
- ❌ Database migrations alone

---

### 🛠️ COMMON DEPLOYMENT ISSUES

#### Issue #1: Uncommitted Changes (50% of failures)
**Symptom**: Changes don't deploy despite "successful" builds  
**Cause**: Docker builds from GitHub, not local files  
**Fix**: 
```bash
git add . && git commit -m "Description" && git push origin main
```

#### Issue #2: TypeScript Compilation Errors
**Symptom**: Docker build fails at `RUN npm run build`  
**Cause**: TypeScript errors in code  
**Fix**: Run `cd backend && npm run build` locally first

#### Issue #3: Windows Unicode Display Errors
**Symptom**: `'charmap' codec can't encode character` errors  
**Reality**: Display issue only - build may still succeed  
**Fix**: Use `--no-wait` flag and check status separately

#### Issue #4: Stale Container Running
**Symptom**: Old code still running after deployment  
**Cause**: Environment variable update instead of image rebuild  
**Fix**: Always use `az acr build` for code changes

---

### 🚑 EMERGENCY PROCEDURES

```bash
# Backend emergency restart
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-suffix emergency-$(date +%m%d-%H%M)

# Frontend rollback
git revert HEAD && git push origin main

# Database restore (last resort)
az postgres flexible-server restore \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db-restored \
  --source-server unitedwerise-db \
  --restore-time "2025-MM-DDTHH:MM:00Z"
```

---

### ✅ POST-DEPLOYMENT VERIFICATION - ENHANCED

**Systematic Verification Checklist:**

```bash
# 1. Verify correct release SHA is deployed
GIT_SHA=$(git rev-parse --short HEAD)
DEPLOYED_SHA=$(curl -s "https://api.unitedwerise.org/version" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
echo "Local SHA: $GIT_SHA, Deployed SHA: $DEPLOYED_SHA"

# 2. Check container is fresh (uptime < 60 seconds)
curl -s "https://api.unitedwerise.org/health" | grep uptime

# 3. Verify single active revision
az containerapp revision list --name unitedwerise-backend --resource-group unitedwerise-rg -o table | head -3

# 4. Test new functionality works in production
curl -s "https://api.unitedwerise.org/health" | jq .

# 5. Check for X-Release header (quick browser verification)
curl -I "https://api.unitedwerise.org/version" | grep X-Release
```

```javascript
// Browser console check (legacy):
deploymentStatus.check()  
// Should show: uptime < 60 seconds for fresh deployment
```

**Always Verify:**
- ✅ Git status clean after push  
- ✅ Release SHA matches local commit
- ✅ Backend uptime < 60 seconds after deployment
- ✅ Only one active revision running
- ✅ New functionality works in production
- ✅ No TypeScript compilation errors locally

---

### 🚀 DEPLOYMENT IMPROVEMENTS (September 2025)

**Key Enhancements Based on Industry Best Practices:**

1. **Eliminated Cache Confusion**: 
   - ✅ Health endpoint now shows runtime release info, not misleading build-time metadata
   - ✅ Added `/version` endpoint with `X-Release` header for instant verification
   - ✅ Cache-Control headers prevent intermediary caching

2. **Immutable Deployments**:
   - ✅ Deploy by image digest, never reusable tags
   - ✅ Git SHA tracking throughout deployment pipeline  
   - ✅ Environment variables carry release metadata

3. **Atomic Deployment Strategy**:
   - ✅ Single-revision mode prevents traffic split issues
   - ✅ Revision suffixes include release SHA for traceability
   - ✅ Systematic verification prevents "mysterious" failures

4. **Enhanced Failure Diagnosis**:
   - ✅ Release SHA verification catches deployment mismatches instantly
   - ✅ Multi-step verification checklist covers all failure modes
   - ✅ Clear separation between build vs. deployment vs. runtime issues

**Result**: "New code is not live" failures are now virtually impossible to encounter.

---

### 📝 Git Workflow Standards

**Branch Strategy:**
```
main           # Production code
├── feature/*  # New features (feature/user-profiles)
├── fix/*      # Bug fixes (fix/auth-timeout)
└── hotfix/*   # Emergency fixes (hotfix/security-patch)
```

**Commit Message Format:**
```
feat: Add new feature
fix: Fix specific bug
docs: Update documentation
refactor: Code cleanup
schema: Database changes
```

---

## 🛡️ SECURITY & STANDARDS

### Server Operations (PROHIBITED)
- **NEVER RUN**: `npm run dev`, `npm start`, or server startup commands
- **REQUIRED**: Always ask user to run server commands
- **REASON**: Prevents server crashes and inability to stop/restart

### Admin-Only Debugging (MANDATORY)
- **PROHIBITED**: `console.log()` for debugging
- **REQUIRED**: Use admin verification functions only
```javascript
// ❌ Never
console.log('User data:', userData);

// ✅ Always  
await adminDebugLog('ComponentName', 'User data loaded', userData);
```

**Available Functions**: `adminDebugLog()`, `adminDebugError()`, `adminDebugWarn()`, `adminDebugTable()`, `adminDebugSensitive()`

### CSS Positioning Standards
- **DEFAULT**: Use responsive units (vh, vw, %, rem)
- **Troubleshooting Process**:
  1. Check target element positioning
  2. Check parent container hierarchy
  3. Check padding/margin chain
  4. Justify fixed units when used

---

## 🔧 DEVELOPMENT ESSENTIALS

### Key Environment Variables
```
# Azure AI
AZURE_OPENAI_ENDPOINT=https://unitedwerise-openai.openai.azure.com/
ENABLE_SEMANTIC_TOPICS=true

# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425
AZURE_STORAGE_CONTAINER_NAME=photos

# Stripe (LIVE)
STRIPE_SECRET_KEY=[LIVE_KEY]
STRIPE_PUBLISHABLE_KEY=[LIVE_KEY]

# OAuth
GOOGLE_CLIENT_ID=496604941751-663p6eiqo34iumaet9tme4g19msa1bf0.apps.googleusercontent.com
```

### Common Development Patterns
```bash
# After schema changes
npx prisma generate

# Database migrations
npx prisma db execute --file scripts/migration.sql --schema prisma/schema.prisma

# Find CSS usage
grep -r "class-name" frontend/

# Test auth manually
fetch('/api/endpoint', {
  headers: {'Authorization': `Bearer ${localStorage.getItem('authToken')}`}
})
```

### API Response Structure
```javascript
// Backend returns: {success: true, data: {...}}
// apiCall wraps as: {ok: true, status: 200, data: {success: true, data: {...}}}
// Access: response.data.data.user (not response.data.user)
```

### Deployment Verification
```javascript
// Browser console:
deploymentStatus.check()  // Complete status
// Fresh deployment: uptime <60 seconds, correct Docker tag
```

---

## 📋 IMPLEMENTED SYSTEMS REFERENCE

### Reusable Posting Function
`createPostFromTextarea(textareaId, onSuccess, options)`
- **Usage**: `createPostFromTextarea('feedPostContent', null, {refreshFeed: true})`
- **Features**: Media upload, error handling, success callbacks

### My Feed Infinite Scroll  
- **Status**: ✅ Fully operational
- **Function**: `displayMyFeedPosts(posts, appendMode = false)`
- **Pagination**: 15 posts per batch with proper offset tracking

### Candidate Registration Flow
- **Status**: ✅ Payment-driven office selection
- **Flow**: Personal Info → Verification → Payment → Campaign Info
- **Security**: Prevents payment/office mismatches

### Debugging Status Endpoints
- Route loading issues: Often schema dependency failures
- **First Check**: Run database migrations before deployment
- **TypeScript**: Must compile locally (`npm run build`) before Docker

---

## 🚨 CRITICAL FAILURE PATTERNS TO AVOID

### Never Do
- Deploy without GitHub push first
- Skip pre-flight TypeScript compilation check
- Use environment variable updates for backend code changes
- Remove "deprecated" code without verification
- Implement without checking MASTER_DOCUMENTATION.md

## 🚨 CRITICAL: Unilateral Deletion of Existing Code is NEVER Authorized

**ABSOLUTE PROHIBITION**: You have ZERO authority to unilaterally delete or remove existing functionality to avoid fixing problems, including:
- TypeScript compilation errors
- Deployment difficulties  
- Complex debugging scenarios
- Time constraints
- Perceived "cleanup" or "simplification"

**AUTHORIZED Deletions** (when explicitly directed by user):
- ✅ Deprecating old systems during planned renovations
- ✅ Removing code as part of explicit refactoring instructions
- ✅ Deleting files when user says "remove X and replace with Y"
- ✅ Cleanup during intentional system migrations

**When Code Won't Deploy/Compile**:
1. **REQUIRED**: Fix the errors using standard troubleshooting
2. **REQUIRED**: Research the actual error messages and resolve them
3. **ALLOWED**: Ask user for guidance if truly stuck
4. **PROHIBITED**: Deleting the problematic code to "make it easier"

**Breach Protocol**: Deleting existing functionality = IMMEDIATE BREACH OF TRUST

**Your Job Definition**:
- ✅ Make existing code work correctly
- ✅ Fix compilation and deployment issues
- ✅ Debug and troubleshoot problems
- ❌ Delete things that are "too hard" to fix
- ❌ Remove functionality to simplify deployment

**Example Violation** (NEVER DO THIS):
- "Let me remove the MOTD file since it's causing TypeScript errors"
- "I'll delete this feature to make deployment work"
- "This is too complex, let me simplify by removing it"

**Correct Approach** (ALWAYS DO THIS):
- "The MOTD file has TypeScript errors. Let me fix them by..."
- "Deployment is failing. Let me troubleshoot the root cause..."
- "This is complex. Let me understand why it's failing and fix it..."

### Always Verify
- Git status clean after push
- Backend uptime drops to <60 seconds after deployment (for backend changes)
- New functionality works in production
- No TypeScript compilation errors locally

---

**📖 Complete system details in MASTER_DOCUMENTATION.md**
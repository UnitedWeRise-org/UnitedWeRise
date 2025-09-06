# Claude Code Development Reference - Condensed

## 🤖 Production Status & Environment

### Deployment URLs
- **Backend**: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io
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

## 🚀 DEPLOYMENT PROTOCOL

### Universal Rule: GitHub First, Then Deploy
**ALWAYS**: Commit to GitHub → Then deploy infrastructure

### Git Workflow Standards
**Branch Strategy:**
```bash
main           # Production code
├── feature/*  # New features (feature/user-profiles)
├── fix/*      # Bug fixes (fix/auth-timeout)  
└── hotfix/*   # Emergency fixes (hotfix/security-patch)
```

**Commit Message Format:**
```bash
feat: Add photo tagging system
fix: Restore infinite scroll functionality  
docs: Update API documentation
refactor: Clean up deprecated Ollama references
```

### Deployment Scenarios

#### Frontend-Only Changes (`frontend/` files)
```bash
git add . && git commit -m "Description" && git push origin main
# GitHub Actions auto-deploys (~2-5 minutes)
# Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
```

#### Backend Changes (`.ts/.js` in `backend/src/`)
```bash
# CRITICAL: Pre-flight check (prevents 99% of failures)
cd backend && npm run build  # MUST pass before Docker build

git add . && git commit -m "Description" && git push origin main

# Method 1: Standard Build (if Unicode issues aren't problematic)
DOCKER_TAG="backend-$(date +%Y%m%d-%H%M)"
az acr build --registry uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend

# Method 2: Windows-Safe Build (RECOMMENDED - avoids Unicode display issues)
DOCKER_TAG="backend-$(date +%Y%m%d-%H%M%S)"
az acr build --registry uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --no-wait https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend
echo "Build queued with tag: $DOCKER_TAG"
sleep 180  # Wait 3 minutes for build completion

# Verify build succeeded (MANDATORY before deploying)
az acr task list-runs --registry uwracr2425 --output table | head -3
# Status should show "Succeeded", not "Failed"

# Deploy new image
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --image "uwracr2425.azurecr.io/unitedwerise-backend:$DOCKER_TAG"

# Verify deployment (uptime should be <60 seconds)
curl "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" | grep uptime
```

#### Schema Changes (`prisma/schema.prisma` modified)
```bash
git add . && git commit -m "Description" && git push origin main

# Apply migrations BEFORE backend deployment
cd backend && npx prisma db execute --file scripts/migration-name.sql --schema prisma/schema.prisma

# Then follow Backend deployment steps above
```

---

## 🚨 CRITICAL: When Docker Rebuilds Are Required

### **Docker Rebuild MANDATORY For:**
1. **Backend code changes** in `/backend/src/` (`.ts`, `.js`, `.json` files)
2. **Dependencies changes** (`package.json`, `package-lock.json`)
3. **Dockerfile modifications**
4. **Prisma schema changes** (after running migrations)
5. **New environment variables that affect backend app logic**

### **Docker Rebuild NOT NEEDED For:**
- **Frontend changes** (GitHub Actions handles deployment)
- **Configuration-only environment variables** (API keys, URLs, timeouts)
- **Database migrations only** (can run independently)

### **CRITICAL DISTINCTION:**
- **Environment Variable Updates**: Restart existing containers with old code ❌ For backend code changes
- **Docker Image Rebuilds**: Deploy new containers with latest GitHub code ✅ For backend code changes
- **GitHub Actions**: Handles frontend deployment automatically ✅ For frontend changes

---

## 🛡️ Docker Build Troubleshooting

#### #1 Most Common Failure: TypeScript Compilation Errors
- **Real Cause**: TypeScript compilation errors (NOT Docker infrastructure issues)
- **Symptoms**: Build fails at Step 22 (`RUN npm run build`) 
- **Solution**: Run `cd backend && npm run build` locally first - MUST pass before Docker build
- **Common Errors**: Missing imports, wrong field/model names, Prisma schema mismatches
- **Prevention**: Pre-flight checklist prevents 99% of Docker build failures

#### #2 Windows Unicode Display Issues
- **Problem**: `'charmap' codec can't encode character` CLI errors
- **Reality**: Display issue only - builds may still succeed/fail independently
- **Solution**: Use Method 2 (--no-wait) and check build status separately
- **Never Debug With**: `az acr task logs` - logs corrupted by Unicode issues
- **Always Use**: Build status verification:
```bash
az acr task list-runs --registry uwracr2425 --output table | head -3
# Focus on Status column: "Succeeded" vs "Failed"
```

#### #3 Stale Code Deployment (Critical Understanding)
- **Problem**: Environment variable restarts use OLD Docker images
- **Cause**: `az containerapp update --set-env-vars` restarts existing containers, doesn't pull new code
- **Result**: May appear to "deploy" but actually runs outdated code
- **Solution**: Always use `az acr build` for backend code changes
- **Environment Variables**: Only for configuration changes, never backend code changes

### Emergency Recovery Procedures
**When**: System-wide failures, database corruption, critical production issues

```bash
# Backend crash recovery with clean restart
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-suffix emergency-$(date +%m%d-%H%M)

# Frontend emergency rollback (if bad deployment)
git revert HEAD
git push origin main  # GitHub Actions auto-deploys rollback

# Database point-in-time restore (last resort)
az postgres flexible-server restore \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db-restored \
  --source-server unitedwerise-db \
  --restore-time "2025-MM-DDTHH:MM:00Z"
```

**Verification**: Always check `deploymentStatus.check()` after emergency procedures

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
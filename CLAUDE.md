# Claude Code Development Reference

## 🤖 Current Production Status

### Deployment URLs
- **Backend**: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io
- **Frontend**: https://www.unitedwerise.org
- **Admin Dashboard**: https://www.unitedwerise.org/admin-dashboard.html
- **Status**: ✅ All services operational

### 🎉 CURRENT SYSTEM STATUS

**Complete Social Media Platform** with advanced civic engagement features:
- ✅ **My Feed infinite scroll system** - Proper pagination with 15-post batches
- ✅ Photo tagging system with privacy controls
- ✅ User relationships (friends/followers) with notification system  
- ✅ Reputation system with democratic reporting and appeals
- ✅ AI-powered content analysis and topic discovery
- ✅ Officials panel with voting records and news tracking
- ✅ Admin dashboard with real-time deployment monitoring
- ✅ Async feedback analysis (10x performance improvement)
- ✅ Azure Blob Storage for persistent media storage
- ✅ **LIVE Stripe Payment System** - Production donation processing with tax-deductible receipts
- ✅ **OAuth Authentication** - Google Sign-In for easy account creation/login
- ✅ **TOTP 2FA** - Extended to regular users with 24-hour session persistence
- ✅ **Logical Candidate Registration Flow** - Payment-driven office selection prevents fraud

### Key Environment Variables
```
# Azure AI Integration
AZURE_OPENAI_ENDPOINT=https://unitedwerise-openai.openai.azure.com/
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-35-turbo
ENABLE_SEMANTIC_TOPICS=true
SEMANTIC_PROVIDER=azure
SIMILARITY_THRESHOLD=0.60

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425
AZURE_STORAGE_ACCOUNT_KEY=[key]
AZURE_STORAGE_CONTAINER_NAME=photos

# Stripe Payment Processing (LIVE)
STRIPE_SECRET_KEY=[LIVE_KEY_CONFIGURED]
STRIPE_PUBLISHABLE_KEY=[LIVE_KEY_CONFIGURED]
STRIPE_WEBHOOK_SECRET=[LIVE_WEBHOOK_CONFIGURED]

# OAuth Authentication (Google only)
GOOGLE_CLIENT_ID=496604941751-663p6eiqo34iumaet9tme4g19msa1bf0.apps.googleusercontent.com
OAUTH_ENCRYPTION_KEY=a8f5f167f44f4964e6c998dee827110c

# News Aggregation (Optional)
NEWS_API_KEY=your_newsapi_key_here
THE_NEWS_API_KEY=your_thenewsapi_key_here
```

---

## 🚨 CRITICAL: Claude Code Session Permission Issue

**UNRESOLVED BUG**: Claude Code does not retain tool authorization permissions across interactions within a session.

**Symptoms**:
- User repeatedly prompted: "Allow reading from /unitedwerise-dev/backend this session" 
- Same authorization required multiple times for identical file paths
- Creates significant friction during development workflows
- "This session" language suggests authorization should persist but doesn't

**Impact**: 
- High development friction, especially during multi-step debugging/implementation
- Interrupts workflow continuity during complex tasks
- User frustration with repetitive authorization requests

**Current Status**: 
- Documented as known limitation (September 5, 2025)
- May be Claude Code design decision for security purposes
- No known workaround available

**Mitigation Strategies**:
- Batch multiple tool calls in single response when possible
- Group related file operations together
- User awareness that re-authorization is expected behavior

---

## 🚨 CRITICAL: Claude Technical Limitations & Documentation Protocol

### The Core Problem
- **MASTER_DOCUMENTATION.md is ~15,000+ lines** - Claude can only read ~2,000 lines at a time
- **Snippet-based reading leads to false assumptions** - "Not in this snippet = doesn't exist"
- **Causes redundant implementations** - Recreating existing systems because they weren't found in limited reads
- **Results in accidental deletions** - Removing "deprecated" code that's actually functional

### 🛡️ MANDATORY PRE-IMPLEMENTATION PROTOCOL
**BEFORE making ANY code changes, follow this exact sequence:**

#### Step 1: Comprehensive Documentation Review
```
1. Use multiple Read tool calls to systematically review ALL sections of MASTER_DOCUMENTATION.md
2. Search for keywords related to planned implementation using Grep tool
3. Check cross-references using patterns: `{#[a-z-]+}`, `Related Systems:`, `Files Modified:`
4. Map ALL existing systems that might be related to the planned change
```

#### Step 2: Codebase Verification  
```
1. Use Grep extensively across ALL files to find existing implementations
2. Search for function names, component names, and feature keywords
3. Check multiple files before concluding something doesn't exist
4. Cross-reference findings with documentation
```

#### Step 3: Use Task Tool for Complex Searches
```
1. For any multi-component feature, use Task tool with general-purpose agent
2. Have agent create comprehensive summary of existing systems
3. Only proceed after getting complete picture from agent report
```

#### Step 4: Verify No Redundancy
```
1. Confirm the planned implementation doesn't duplicate existing functionality
2. If similar functionality exists, plan integration rather than recreation
3. Document WHY new implementation is needed vs. using existing system
```

### 🚫 NEVER PROCEED WITHOUT:
- **Complete system map** - Understanding all components that might be affected
- **Existing functionality verification** - Confirming what already works
- **Cross-reference confirmation** - Checking all related systems mentioned in docs
- **User approval for architectural changes** - Never assume reorganization is needed

### ⚠️ WARNING SIGNS TO STOP:
- Creating new sections/components without verifying none exist
- Removing code marked as "deprecated" without testing if it's actually used
- Making "cleanup" changes without comprehensive system understanding
- Assuming simple solutions when documentation suggests complexity

### 🚨 CRITICAL: If User Suggests Feature Already Exists
**If user in any way suggests that a feature already exists, if unable to locate that feature, indicate the inability to find it and STOP immediately. NEVER build a new system without a direct and explicit go-ahead.**

**Required Response**:
1. "I apologize - I cannot find [feature] that should exist"
2. Document search attempts made
3. Request guidance: "Can you point me to where this is located?"
4. FULL STOP - No implementation until explicitly told to proceed

### 🎯 Success Criteria:
- Can explain exactly what exists before starting work
- Can identify all systems that will be affected by changes  
- Can justify why new implementation is needed vs. using existing
- Has user confirmation for any structural changes

---

## Development Workflow Rules

### 🚨 STRIPE LIVE MODE DEPLOYMENT PROTOCOL
**WHEN**: Switching from test to live Stripe keys
**CRITICAL**: Database contains test mode Stripe customer IDs that won't work with live keys

**Solution**:
```sql
-- Clear test Stripe customers before going live
DELETE FROM "StripeCustomer";
```
**Run**: `npx prisma db execute --file scripts/clear-stripe-customers.sql --schema prisma/schema.prisma`
**Result**: Users will get new live Stripe customers on first live payment

### 🚨 COMPREHENSIVE DEPLOYMENT PROTOCOL (ALWAYS FOLLOW)

**Universal Rule**: ALWAYS commit to GitHub first, then deploy infrastructure

## 📋 PROVEN DEPLOYMENT METHODS (Fixed September 4, 2025)

### **SCENARIO A: Frontend-Only Changes**
**When**: HTML/CSS/JS files in `/frontend/` modified
**Detection**: Only files under `frontend/` directory changed

```bash
# STEP 1: Commit and push (MANDATORY FIRST)
git add . && git commit -m "Feature description" && git push origin main

# STEP 2: Wait for GitHub Actions (automatic)
# Frontend auto-deploys via GitHub Actions workflow (~2-5 minutes)
# Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions

# STEP 3: Verify deployment
# Hard refresh browser (Ctrl+F5) after GitHub Actions completes
```

### **SCENARIO B: Backend-Only Changes**  
**When**: Files in `/backend/src/` modified (no schema changes)
**Detection**: Backend code modified, no new Prisma models
**CRITICAL**: All backend code changes require Docker image rebuilds

## 🚨 MANDATORY DOCKER BUILD PRE-FLIGHT CHECKLIST (Updated September 4, 2025)

**BEFORE attempting ANY Docker build, follow this exact sequence to prevent 99% of build failures:**

### **STEP 0: LOCAL VALIDATION (CRITICAL - NEVER SKIP)**
```bash
# Navigate to backend directory
cd backend

# Test TypeScript compilation locally - THIS IS THE #1 FAILURE POINT
npm run build

# ⚠️ If this fails, Docker build WILL fail
# ⚠️ Fix ALL TypeScript errors before proceeding
# ⚠️ Common errors: missing imports, wrong field names, model mismatches
```

**Why This Matters:** Docker builds fail silently at Step 22 (`RUN npm run build`) when TypeScript compilation errors exist. Azure CLI Unicode encoding issues on Windows prevent us from seeing the actual error, making debugging nearly impossible.

### **STEP 1: GIT-FIRST WORKFLOW (MANDATORY)**
```bash
# Commit and push BEFORE building - Docker builds from GitHub, not local
git add -A
git commit -m "Fix: Description of changes"  
git push origin main

# Verify git working directory is clean
git status  # Should show "nothing to commit, working tree clean"
```

**Why This Matters:** Docker builds from GitHub source, not local files. Local inconsistencies cause mysterious build failures that waste hours of debugging time.

### **STEP 2: BUILD VERIFICATION**
```bash
# Check that your latest commit is actually on GitHub
git log --oneline -1  # Note the commit hash

# Verify no TypeScript errors were introduced by other developers
git diff HEAD~1 --name-only | grep -E "\.(ts|js)$"  # Check for TS/JS changes
```

## 🔧 RELIABLE DOCKER BUILD PROCESS

### **Method 1: Standard Docker Build (USE AFTER PRE-FLIGHT CHECKLIST)**
**When**: Pre-flight checklist passes, normal deployment scenario
**Pros**: Builds from GitHub, reliable when TypeScript compiles locally
**Cons**: Takes 2-3 minutes, may show Unicode errors on Windows (ignore them)

```bash
# Only proceed if STEP 0 (npm run build) succeeded locally!

# STEP 3: Build new Docker image from GitHub with descriptive tag
DOCKER_TAG="backend-$(date +%Y%m%d-%H%M)"
az acr build --registry uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend

# STEP 4: Verify build succeeded (ignore Unicode CLI errors)
az acr task list-runs --registry uwracr2425 --output table | head -3
# Status should show "Succeeded", not "Failed"

# STEP 5: Deploy the new Docker image  
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --image "uwracr2425.azurecr.io/unitedwerise-backend:$DOCKER_TAG"

# STEP 6: Verify deployment success (uptime should drop to <60 seconds)
curl "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" | grep uptime
```

### **Method 2: Windows-Safe Async Build (RECOMMENDED for Windows)**
**When**: Windows CLI shows Unicode errors, or want to avoid streaming output
**Pros**: Avoids CLI Unicode issues, builds from latest GitHub code, proven reliable
**Cons**: Requires manual timing coordination

```bash
# Only proceed if STEP 0 (npm run build) succeeded locally!

# STEP 3: Start async build with descriptive tag (bypasses Unicode issues)
DOCKER_TAG="backend-$(date +%Y%m%d-%H%M%S)"
az acr build --registry uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --no-wait https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend
echo "Build queued with tag: $DOCKER_TAG"

# STEP 4: Wait for build completion (2-3 minutes typically)
echo "Waiting for build to complete... Check build status in 3 minutes"
sleep 180

# STEP 5: Verify build succeeded before deploying
az acr task list-runs --registry uwracr2425 --output table | head -3
# Status should show "Succeeded" for latest run

# STEP 6: Deploy the new image
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --image "uwracr2425.azurecr.io/unitedwerise-backend:$DOCKER_TAG"

# STEP 7: Verify deployment success
curl "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" | grep uptime
```

### **Method 3: Emergency Fast Deploy (If builds are too slow)**
**When**: Urgent fixes needed, builds taking too long
**Pros**: Faster, bypasses build issues
**Cons**: May use stale code, not recommended for code changes

```bash
# STEP 1: Ensure latest code is pushed to GitHub  
git push origin main

# STEP 2: Force restart with environment variable change
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --set-env-vars "EMERGENCY_RESTART=$(date +%Y%m%d-%H%M%S)"

# STEP 3: Verify uptime reset
curl "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" | grep uptime

# ⚠️ WARNING: This may still run old code if Docker images are stale!
```

### **🚨 DOCKER BUILD FAILURE TROUBLESHOOTING (Updated Sept 4, 2025)**

**#1 MOST COMMON FAILURE**: Docker builds showing "Failed" status
**Real Cause**: TypeScript compilation errors (NOT Docker issues)
**Symptoms**: Build fails at Step 22 (`RUN npm run build`)
**Solution**: 
1. Run `cd backend && npm run build` locally first
2. Fix ALL TypeScript errors before attempting Docker build
3. Common errors: missing imports, wrong field/model names, schema mismatches

**#2 WINDOWS UNICODE ERRORS**: `'charmap' codec can't encode character`
**Cause**: Unicode characters in build output on Windows CLI
**Reality**: This is a display issue - builds may still succeed/fail independent of Unicode errors
**Solution**: 
1. Ignore Unicode CLI errors - focus on build status
2. Use `--no-wait` flag and check status with `az acr task list-runs`
3. Use Method 2 (Windows-Safe Async Build)

**#3 BUILD STATUS vs BUILD LOGS**: 
**Problem**: Build logs are corrupted by Unicode issues
**Solution**: NEVER debug using `az acr task logs` - use build status instead:
```bash
az acr task list-runs --registry uwracr2425 --output table | head -3
# Focus on Status column: "Succeeded" vs "Failed"
```

**#4 STALE CODE DEPLOYED**: Environment variable restarts use OLD Docker images
**Cause**: `az containerapp update --set-env-vars` restarts existing containers, doesn't pull new code
**Solution**: Always use `az acr build` for code changes, environment variables only for config

**ROOT CAUSE ANALYSIS**: 99% of Docker build failures are TypeScript compilation errors, not infrastructure issues. The pre-flight checklist prevents hours of wasted debugging time.

### **SCENARIO C: Backend + Database Schema Changes**
**When**: Prisma schema modified AND backend code uses new models
**Detection**: `backend/prisma/schema.prisma` changed

```bash
# STEP 1: Commit and push (MANDATORY FIRST)
git add . && git commit -m "Feature description" && git push origin main

# STEP 2: Apply database migrations (BEFORE backend deployment)
cd backend && npx prisma db execute --file scripts/migration-name.sql --schema prisma/schema.prisma

# STEP 3: Build new Docker image from GitHub  
az acr build --registry uwracr2425 --image unitedwerise-backend:$(date +%Y%m%d-%H%M) https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend

# STEP 4: Deploy the new Docker image
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --image uwracr2425.azurecr.io/unitedwerise-backend:$(date +%Y%m%d-%H%M)

# STEP 5: Verify deployment success
curl "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" | grep uptime
```

### **SCENARIO D: Full Stack Changes (Frontend + Backend)**
**When**: Both frontend and backend files modified
**Detection**: Changes in both `/frontend/` AND `/backend/` directories

```bash
# STEP 1: Commit and push (MANDATORY FIRST)
git add . && git commit -m "Feature description" && git push origin main

# STEP 2A: Build and deploy backend (if schema changes, run migrations first)
az acr build --registry uwracr2425 --image unitedwerise-backend:$(date +%Y%m%d-%H%M) https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --image uwracr2425.azurecr.io/unitedwerise-backend:$(date +%Y%m%d-%H%M)

# STEP 2B: Frontend auto-deploys via GitHub Actions (wait for completion)
# Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions

# STEP 3: Verify both deployments
curl "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" | grep uptime
# Hard refresh browser after GitHub Actions completes
```

## 🚨 CRITICAL: When Docker Rebuilds Are Required

### **Environment Variable Updates vs Code Changes**
- **Environment Variable Changes**: Only restart existing container (old code) ✅ Use `az containerapp update --set-env-vars`
- **Code Changes in Backend**: Require new Docker image build ⚠️ Must use `az acr build`

### **WHEN DOCKER REBUILD IS MANDATORY**:
1. **Any `.ts`, `.js`, `.json` file changes in `/backend/src/`**
2. **Dependencies changes** (`package.json`, `package-lock.json`)
3. **Dockerfile modifications**
4. **Prisma schema changes** (after running migrations)
5. **New environment variables that affect app logic** (not just config)

### **WHEN DOCKER REBUILD IS NOT NEEDED**:
1. **Configuration-only environment variable changes** (API keys, URLs, etc.)
2. **Frontend-only changes** (GitHub Actions handles deployment)
3. **Database migrations only** (can run independently)

**ROOT CAUSE OF FAILURES**: Environment variable deployments restart OLD Docker images - they DON'T pull new code from GitHub!

## 🔍 DEPLOYMENT STATUS VERIFICATION

### **Enhanced Deployment Status Checker**
**Use the browser console commands to verify deployments:**

```javascript
// Check complete deployment status
deploymentStatus.check()

// Manual component checks  
deploymentStatus.checkBackend()
deploymentStatus.getStatus()
```

### **Key Deployment Indicators to Check**:
1. **Docker Image**: Verify the correct Docker image and tag are running
2. **Build Commit**: Check if the deployed code matches your latest GitHub commit  
3. **Backend Uptime**: Fresh deployment should show <60 seconds
4. **GitHub Branch**: Confirm deployment is from the correct branch

### **Deployment Status Response Example**:
```
✅ Backend:
  uptime: 2 minutes  
  dockerImage: uwracr2425.azurecr.io/unitedwerise-backend:backend-20250904-1015
  dockerTag: backend-20250904-1015
  buildCommit: 3d9b517
  githubBranch: main
```

**CRITICAL**: If `buildCommit` doesn't match your latest commit, the Docker image is stale and needs rebuilding!

## 🚀 RECOMMENDED ARCHITECTURAL IMPROVEMENTS

### **Immediate Optimizations**
1. **GitHub Actions CI/CD Pipeline**: Auto-build on every commit
2. **Webhook-based Deployments**: Instant deploy when builds complete  
3. **Development Environment**: Fast-deploy staging environment for iteration
4. **Docker Layer Caching**: Reduce build times from 3+ minutes to 30 seconds

### **Long-term Solutions**
1. **Kubernetes with Rolling Deployments**: Zero-downtime updates
2. **Multi-stage Docker Builds**: Separate build and runtime environments
3. **Container Registry Webhooks**: Auto-deploy new images
4. **Local Development with Docker Compose**: Test changes locally first

### **Current Deployment Pain Points**
- ❌ **3+ hour lag** between code changes and deployment
- ❌ **Windows Unicode CLI errors** breaking deployment commands  
- ❌ **Stale `latest` tags** causing confusion about deployed code
- ❌ **No build status visibility** during long builds
- ❌ **Manual timing coordination** required for async builds

### **Success with Enhanced Status Checker**
- ✅ **Real-time deployment visibility** shows exactly what's running
- ✅ **Docker image and commit verification** eliminates guesswork
- ✅ **Uptime tracking** confirms fresh deployments
- ✅ **Component health monitoring** across all services

## ⚠️ CRITICAL FAILURE PATTERNS TO AVOID

### **❌ NEVER DO**:
- Deploy without committing to GitHub first
- Skip GitHub push when making frontend changes  
- Use Docker build for routine code changes
- Apply schema migrations AFTER deploying backend code
- Assume frontend changes auto-deploy (verify GitHub Actions)

### **🔍 ALWAYS VERIFY**:
- Git status shows clean working directory after push
- GitHub Actions workflow starts for frontend changes
- Backend uptime drops to <60 seconds after deployment
- New functionality works in production environment

## 🤖 CORRECTED AUTOMATED DEPLOYMENT LOGIC

**When User Says**: "deploy", "push to production", "update live server", "get changes live"

**Claude Must Execute**:

```bash
# STEP 1: Analyze changes (MANDATORY)
git status

# STEP 2: Determine deployment method
# Frontend only: git diff HEAD --name-only | grep "^frontend/" → Use Scenario A (GitHub Actions)
# Backend only: git diff HEAD --name-only | grep "^backend/" → Use Scenario B (Docker Build REQUIRED)
# Schema changes: git diff HEAD --name-only | grep "schema.prisma" → Use Scenario C (Migrations + Docker)
# Full stack: Changes in both → Use Scenario D (Docker + GitHub Actions)

# STEP 3: For ANY backend changes - ALWAYS build Docker image from GitHub
# STEP 4: Verify deployment success with uptime check
# STEP 5: Report status with specific verification steps
```

## 🚨 CRITICAL DEPLOYMENT ISSUES DISCOVERED (September 4, 2025)

### **❌ MAJOR PROBLEM: 3-Hour Deployment Lag**
**Issue**: Code changes from 3 hours ago still not deployed despite multiple rebuild attempts
**Root Cause**: Azure Container Registry builds are extremely slow and unreliable on Windows
**Impact**: Makes iterative development nearly impossible

### **🔧 URGENT OPTIMIZATIONS NEEDED:**

#### **1. Stale Docker Image Tags**
- **Problem**: `latest` tag points to code from weeks ago
- **Solution**: Always use timestamped tags: `backend-$(date +%Y%m%d-%H%M)`
- **Never rely on `latest` tag for deployments**

#### **2. Windows Unicode CLI Issues** 
- **Problem**: `'charmap' codec can't encode character` errors
- **Workaround**: Build still succeeds despite CLI errors (check Azure portal)
- **Solution**: Use `--no-wait` flag and check build status separately

#### **3. Build vs Deploy Timing**
- **Problem**: Trying to deploy before build completes fails
- **Solution**: Add explicit wait/check between build and deploy steps

#### **4. Enhanced Status Verification is CRITICAL**
- **Success**: New deployment status shows Docker image, commit hash, uptime
- **Benefit**: Immediately identifies when deployments contain old code
- **Must Use**: `deploymentStatus.check()` after every deployment

**CRITICAL CORRECTION**: Environment variable deployments are WORTHLESS for code changes - they restart old containers!

## 🎯 DEPLOYMENT SUCCESS INDICATORS

### **Frontend Deployment Success**:
- ✅ GitHub Actions workflow completes successfully  
- ✅ Hard refresh shows new functionality
- ✅ Browser console shows new script functions available
- ✅ No 404 errors on new static files

### **Backend Deployment Success**:
- ✅ Backend uptime drops to <60 seconds
- ✅ Health endpoint returns "healthy" status
- ✅ New API endpoints return proper responses (not 404/500)
- ✅ No compilation or runtime errors in logs

**CRITICAL LESSONS LEARNED (August 25, 2025):**
- **Schema dependency failures**: Backend code referencing non-existent database models causes 404 errors on ALL routes in that file
- **Frontend deployment missed**: Creating local files without GitHub push means frontend changes never deploy
- **Docker build failures**: Unicode encoding errors, Node version mismatches common in Windows environments
- **Solution**: GitHub-first workflow with environment variable restarts eliminates 90% of deployment issues

### 🚨 CRITICAL - Server Operations
- **PROHIBITED**: Never run `npm run dev`, `npm start`, or server startup commands
- **REQUIRED**: Always ask user to run server commands
- **REASON**: Prevents server crashes and inability to stop/restart processes

### 🎯 API Consistency Rules
- **BEFORE changing ANY API endpoint**: Check MASTER_DOCUMENTATION.md for existing implementation
- **NEVER modify existing endpoints** without explicit user approval
- **ALWAYS preserve exact endpoint paths and parameters** that are documented as working

### 📋 Documentation Protocol
- **Update MASTER_DOCUMENTATION.md** when features are confirmed working
- **Check for cross-references** using patterns like `{#section-name}` before changes
- **Verify no conflicts** with other developers' work by checking "Recently Modified" indicators

### 📱 CSS Positioning Standards
- **DEFAULT**: Use responsive positioning (vh, vw, %, rem) unless specifically justified
- **TROUBLESHOOTING PROCESS**:
  1. Check target element's positioning properties
  2. Check each parent container's positioning up the hierarchy  
  3. Check padding/margin on all containers in the chain
  4. Explain positioning rationale when using fixed units

### 🔄 Deployment Verification Protocol
- **WHEN USER REPORTS**: "Feature not deployed" or similar
- **MANDATORY FIRST STEP**: Check last restart/update times for all components
- **PROHIBITED**: Complex debugging before verifying deployment status
- **TOOLS**: Use `deploymentStatus.check()` in browser console


### 🛡️ Multi-Developer Conflict Prevention
- **BEFORE ANY EDIT**: Check MASTER_DOCUMENTATION.md for recent updates
- **REQUIRED**: Verify no conflicts with other developers' work
- **CRITICAL LESSON**: Always verify functionality before removing "deprecated" code
- **METHOD**: Look for "Recently Modified", "Last Updated" indicators

### 🏗️ Implementation Standards
- **BEFORE ANY CODE CHANGE**: Search MASTER_DOCUMENTATION.md for relevant systems
- **IDENTIFY**: All cross-referenced components and system interactions
- **VERIFY**: Implementation approach against documented patterns
- **PROHIBITED**: "Quick fixes" without full system understanding

---

## Essential Development Commands

### Deployment Status Monitoring
```javascript
// Browser console commands:
deploymentStatus.check()           // Manual status check
deploymentStatus.getStatus()       // Get last known status  
deploymentStatus.checkBackend()    // Backend-specific check
deploymentStatus.checkDatabase()   // Database-specific check
```

### Authentication Troubleshooting
```javascript
// Check localStorage tokens:
localStorage.getItem('authToken')    // Should return JWT string
localStorage.getItem('currentUser') // Should return user JSON

// Verify auth token variables:
window.authToken    // Should match localStorage
authToken          // Global variable should match
```

### Backend Development Patterns
- Always run `npx prisma generate` after schema changes
- Check imports: `QwenService` not `qwenService`, `EmbeddingService` not `embeddingService`
- Database migrations: Use `npx prisma db execute --file path --schema prisma/schema.prisma`

### 🔧 ADMIN-ONLY DEBUGGING SYSTEM SOP

**Status**: ✅ **IMPLEMENTED** (September 4, 2025)

#### **Secure Debugging Protocol**
All debugging code MUST use the admin-only debugging system to prevent security vulnerabilities.

#### **Required Usage Pattern**
```javascript
// ❌ NEVER DO (Security Risk)
console.log('User data:', userData);

// ✅ ALWAYS DO (Admin-Only)
await adminDebugLog('ComponentName', 'User data loaded', userData);
```

#### **Available Admin Debug Functions**
```javascript
await adminDebugLog('Component', 'Message', data);      // Standard debugging
await adminDebugError('Component', 'Error message', error); // Error debugging  
await adminDebugWarn('Component', 'Warning message', data);  // Warning debugging
await adminDebugTable('Component', 'Table data', tableData); // Table display
await adminDebugSensitive('Component', 'Message', sensitiveData); // Double-verified
await adminDebugTime('Component', 'Performance Label');    // Start timing
await adminDebugTimeEnd('Component', 'Performance Label'); // End timing
```

#### **Security Features**
- **Admin Verification**: Uses existing `/api/admin/dashboard` endpoint
- **Fail Secure**: No output if admin verification fails
- **Caching**: 5-minute verification cache to prevent API spam
- **Double Verification**: Sensitive data requires re-verification
- **Silent Failure**: Non-admin users see absolutely nothing

#### **Integration Requirements**
```html
<!-- Add to HTML files that need admin debugging -->
<script src="js/adminDebugger.js"></script>
```

#### **Mandatory Development Rules**
1. **NEVER use `console.log()` for sensitive data** - Use `adminDebugLog()` instead
2. **ALWAYS use admin debugging for authentication/authorization logic**
3. **REQUIRED for TOTP, credentials, user data, system internals**
4. **Component names should be descriptive** (e.g., 'TOTPAuth', 'UserLogin', 'AdminVerify')

#### **Deployment Security**
- **Production Safe**: Only admins see debug output even in production
- **No Environment Gates Needed**: Security handled by admin verification
- **Performance Optimized**: Cached verification prevents excessive API calls

#### **Examples of Required Usage**
```javascript
// Authentication debugging
await adminDebugLog('AuthSystem', 'Login attempt', {user: email, timestamp: Date.now()});

// TOTP debugging  
await adminDebugSensitive('TOTPAuth', 'TOTP verification', {enabled: totpEnabled, hasSecret: !!secret});

// Database query debugging
await adminDebugTable('DatabaseQuery', 'User query results', queryResults);

// Error debugging
await adminDebugError('APICall', 'Backend request failed', {endpoint, status, error});
```

**This system eliminates security vulnerabilities while maintaining full debugging capabilities for admin users.**

### 🚨 CRITICAL: Route Loading & Data Issues Debugging (August 2025)

#### Schema Dependency Failures Causing 404 Route Errors (August 25, 2025)
**Problem**: All routes in admin.ts returning 404 "Route not found" despite code being deployed
**Root Cause**: Backend code referencing CandidateAdminMessage model but database table didn't exist
**Symptoms**: 
- Routes work locally but fail in production with 404
- Other routes in different files work fine
- Backend starts successfully but specific route file fails to load
**RESOLUTION**: Run database migration BEFORE backend deployment
- Command: `npx prisma db execute --file scripts/add-candidate-admin-messaging.sql --schema prisma/schema.prisma`
- Result: All admin.ts routes immediately started working (404 → 401 auth errors)

**CRITICAL INSIGHT**: When Prisma models reference non-existent database tables/enums, the entire route file fails to load at runtime, causing 404 errors for ALL routes in that file.

#### TypeScript Compilation Errors Blocking Route Loading (August 16, 2025)
**Problem**: All API routes returning 404 "Route not found" despite successful route mounting in server.ts
**Root Cause**: TypeScript compilation errors preventing Express.js from loading route modules
**RESOLVED**: Fixed field name mismatches in users.ts

#### Admin Dashboard Endpoint Issues (August 22, 2025)
**Problem**: Admin endpoints returning 404/500 errors, AI suggestions showing today's date instead of post dates
**Root Causes**: 
1. TypeScript compilation preventing route loading (admin.ts field mismatches)
2. Dynamic date calculation in example suggestions using relative dates
**RESOLVED**: Fixed admin.ts TypeScript errors and AI insights date logic

**DEBUGGING PROCESS** (Future Reference):
1. **FIRST: Check for schema dependencies** when debugging 404 route errors
   - Symptom: Specific route file returns 404 for ALL endpoints while other files work
   - Check: Does the route file import any new Prisma models?
   - Solution: Run database migration for missing tables/enums before deployment
   - Command: `npx prisma db execute --file scripts/migration.sql --schema prisma/schema.prisma`

2. **SECOND: Verify TypeScript compilation** when debugging route loading issues
   - Command: `cd backend && npm run build` - must complete without errors
   - Symptom: All API routes return 404 even for basic endpoints
   - Common Errors: Field name mismatches, object property issues

3. **Check database schema field names** when working with Prisma models
   - Use: `grep -A 15 "model ModelName" backend/prisma/schema.prisma`
   - Fix: Update field references to match actual schema

4. **Dynamic Date Issues**: Avoid using relative date calculations like `new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)`
   - Problem: Creates "rolling" dates that change each time API is called
   - Solution: Use fixed historical dates like `new Date('2025-08-19T10:30:00.000Z')`

5. **Deploy with forced revision** if Docker build encounters encoding errors
   - Azure CLI Unicode issues: Use COMPREHENSIVE DEPLOYMENT PROTOCOL above
   - Refer to Scenario B (Backend-Only) or Scenario E (Emergency Docker) as appropriate

6. **Verify deployment success** by checking backend uptime  
   - Health check: `curl https://backend-url/health | grep uptime`
   - New deployment: Uptime should be <60 seconds
   - Stale deployment: Uptime in minutes/hours indicates old revision

**RESOLVED**: All admin endpoints now operational
- Candidates endpoint: ✅ Returns proper auth errors instead of 404
- Analytics endpoint: ✅ Returns proper auth errors instead of 500  
- AI Insights: ✅ Fixed date display showing historical dates instead of today's date

### Frontend Development Patterns  
- Component state: Check `localStorage` vs `window` properties for auth state
- API caching: Use `bypassCache: true` for fresh data
- Sticky positioning: Account for parent container positioning and padding

### ✅ REUSABLE POSTING BOX FUNCTION (August 16, 2025)

**Status**: ✅ **IMPLEMENTED** - Standardized posting function for use across entire site

**Function**: `createPostFromTextarea(textareaId, onSuccess, options)`

**Purpose**: Single reusable function for creating posts from any textarea on the site, eliminating code duplication

**Parameters**:
- `textareaId` (string): ID of the textarea containing post content
- `onSuccess` (function): Optional callback after successful post creation
- `options` (object): Configuration options
  - `refreshFeed`: Whether to refresh the feed after posting (default: false)
  - `clearMedia`: Whether to clear media attachments after posting (default: true)

**Usage Examples**:
```javascript
// My Feed posting box
createPostFromTextarea('feedPostContent', null, { refreshFeed: true });

// Profile posting box with callback
createPostFromTextarea('quickPostContent', (newPost) => {
    this.userPosts.unshift(newPost);
    this.insertNewPostSmoothly(newPost);
});

// Simple usage anywhere
createPostFromTextarea('anyTextareaId');
```

**Locations Used**:
- `frontend/index.html:3486` - Main reusable function definition
- `frontend/index.html:3579` - My Feed wrapper (`createPostFromFeed`)
- `frontend/src/components/MyProfile.js:637` - Profile posts tab

**Features**:
- ✅ Media upload support with POST_MEDIA type
- ✅ Error handling with user-friendly messages
- ✅ Success callbacks for custom post-creation behavior
- ✅ Optional feed refresh after posting
- ✅ Automatic textarea clearing
- ✅ Returns boolean for success/failure

### ✅ FIXED: My Feed Infinite Scroll System (August 16, 2025)

**Status**: ✅ **FULLY OPERATIONAL** - Complete infinite scroll with proper pagination

**Problem Solved**: My Feed was replacing posts instead of appending them during infinite scroll

**Solution Implemented**:
1. **Added `appendMode` parameter** to `displayMyFeedPosts(posts, appendMode = false)`
2. **Fixed `displayPosts()` function** to use `insertAdjacentHTML('beforeend', html)` in append mode
3. **Updated fallback functions** to append instead of replace when `appendMode = true`
4. **Rate limiting fixed** - Changed scroll trigger from 400px to 50px from bottom

**Technical Implementation**:
- **Initial Load**: `showMyFeedInMain()` displays first 15 posts (replace mode)
- **Infinite Scroll**: `loadMoreMyFeedPosts()` appends 15 posts when scrolling to bottom
- **Offset Tracking**: `currentFeedOffset` tracks total posts loaded (15 → 30 → 45...)
- **API Integration**: `/feed/?limit=15&offset=${currentFeedOffset}` with proper pagination

**User Experience**: 
- ✅ Loads 15 posts initially
- ✅ Appends 15 more when scrolling to bottom (total 30)
- ✅ Continues appending batches: 45, 60, 75, 90... posts
- ✅ No scrollbar visible but scroll functionality preserved
- ✅ No rate limiting (429 errors) or multiple simultaneous requests

**Key Functions Modified**:
- `frontend/index.html:3231` - `displayMyFeedPosts(posts, appendMode = false)`
- `frontend/index.html:4131` - `displayPosts(posts, containerId, appendMode = false)`
- `frontend/index.html:3301` - `loadMoreMyFeedPosts()` with proper offset tracking
- `frontend/index.html:3378` - `setupMyFeedInfiniteScroll()` with 50px trigger distance

**Commits**: `8b71ddb` (append mode), `12d6ddf` (rate limiting fix)

### ✅ LOGICAL CANDIDATE REGISTRATION FLOW (August 22, 2025)

**Status**: ✅ **IMPLEMENTED** - Payment-driven office selection prevents registration fraud

**Problem Solved**: Previous flow allowed users to select high-level offices (e.g., President) then pay for lower-level fees (e.g., Local $50), creating confusion and potential fraud.

**New Registration Flow**: Personal Info → Verification → Payment → Campaign Info

**Payment-Driven Office Selection**:
1. **Step 3 (Payment)**: Users select and pay for office level tier first
   - Local Office: $50 (School Board, City Council, Local Judges)
   - Regional Office: $100 (Mayor, County, State House/Senate)  
   - State Office: $200 (US House, Governor, Attorney General)
   - Federal Office: $400 (US Senate, Lt. Governor)
   - Presidential: $1,000 (President of the United States)

2. **Step 4 (Campaign Info)**: Office dropdown filtered by payment level
   - Shows only offices **at or below** paid tier
   - Higher options appear disabled with "Requires upgrade" messages
   - Prevents payment/office mismatches

**Technical Implementation**:
- `populateOfficeOptionsBasedOnPaymentLevel()` - Dynamic office filtering
- `updatePaidLevelDisplay()` - Shows user's paid level
- Hierarchical payment system with tier validation
- Enhanced step navigation with payment verification

**Key Files Modified**:
- `frontend/src/integrations/candidate-system-integration.js:1815` - Added filtering logic
- `frontend/src/integrations/candidate-system-integration.js:1923` - Office filtering function
- `frontend/src/integrations/candidate-system-integration.js:1976` - Payment display function
- `frontend/src/integrations/candidate-system-integration.js:1543` - Added payment level CSS

**Security Benefits**:
- ✅ Prevents users from selecting Presidential office with Local payment
- ✅ Enforces payment integrity across registration process
- ✅ Maintains flexibility within paid tiers
- ✅ Clear user feedback on payment requirements

### CSS Positioning Troubleshooting
When an element isn't positioning correctly:
1. Check target element's positioning properties
2. Check each parent container's positioning up the hierarchy
3. Check padding/margin on all containers in the chain
4. Calculate total offset and compensate with negative values

### API Response Structure
```javascript
// Backend returns:
{success: true, data: {user: {...}, notifications: 0, posts: [...]}}

// apiCall wraps as:
{ok: true, status: 200, data: {success: true, data: {...}}}

// Always access: response.data.data.user (not response.data.user)
```

---

## Common Debugging Commands

### Find CSS class usage:
```bash
grep -r "class-name" frontend/
```

### Check for TypeScript compilation issues:
```bash
cd backend && npm run build
```

### Test auth endpoints manually:
```javascript
fetch('/api/batch/initialize', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
}).then(r => r.json()).then(console.log)
```

---

## Quick Fixes

### Missing exports in services:
- Check if service exports class vs instance
- Use `ClassName.method()` for static methods
- Import: `import { ClassName } from './file'`

### Prisma field not found:
1. Update schema in `prisma/schema.prisma`
2. Run `npx prisma generate`
3. May need database migration

### Sticky positioning not working:
1. Find all parent containers
2. Calculate total positioning offset
3. Use `calc()` with negative values to compensate

---

## File Structure
```
backend/src/
├── routes/           # API endpoints
├── services/         # Business logic  
├── middleware/       # Auth, validation, etc.
└── utils/           # Helper functions

frontend/src/
├── components/      # Reusable UI components
├── styles/         # CSS files
├── js/             # Utility functions
└── integrations/   # System integrations
```

---

**📖 Complete API documentation and detailed system information available in MASTER_DOCUMENTATION.md**
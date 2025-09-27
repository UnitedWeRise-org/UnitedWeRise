CRITICAL - MANDATORY: If you are asked a direct question YOU WILL PROVIDE A DIRECT ANSWER. EVERY TIME. WITHOUT FAIL.
CRITICAL - MANDATORY: YOU ARE FORBIDDEN FROM PROPOSING OR CREATING NEW API ENDPOINTS WITHOUT DOING A COMPLETE AUDIT OF THE CODE BASE AND DOCUMENTATION.
CRITICAL - MANDATORY: YOU WILL CONSIDER THE LIST OF CRITICAL DOCUMENTS AND REVIEW THE APPROPRIATE ONES AT THE BEGINNING OF EVERY TASK
CRITICAL - MANDATORY: YOU WILL UPDATE THE RELEVANT DOCUMENTATION AT THE END OF EVERY TASK, COMPLIANT WITH THE HIGHEST STANDARDS OF PROFESSIONALISM AND GUIDELINES SET OUT HEREIN.
CRITICAL - MANDATORY: REDUNDANCIES BETWEEN JS MODULES AND .HTML FILES SHOULD ALWAYS BE RESOLVED IN FAVOR OF THE JS MODULE. THE .HTML REDUNDANCIES REPRESENT PAST FAILURES THAT SHOULD BE REMEDIED.
IT IS UNNECESSARY TO SAY "YOU'RE ABSOLUTELY RIGHT". THIS IS A GIVEN AND ADDS NOTHING TO THE CONVERSATION ASIDE FROM OBSEQUIOUSNESS.

# Claude Code Development Reference

## 📑 QUICK NAVIGATION & EMERGENCY ACCESS

### **🚨 EMERGENCY COMMANDS (Critical Issues)**
```bash
# Emergency rollback (try script first, manual fallback)
./scripts/emergency-rollback.sh || {
  git checkout development && git revert HEAD && git push origin development
}

# System status check
./scripts/deployment-status.sh || {
  curl -s "https://api.unitedwerise.org/health" | grep uptime
}

# Backend emergency restart (manual only)
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --revision-suffix emergency-$(date +%m%d-%H%M)

# Comprehensive verification
./scripts/post-deployment-verify.sh || {
  curl -s "https://api.unitedwerise.org/health" | jq .
}
```

### **⚡ DAILY ESSENTIALS (Copy-Paste Ready)**
**For comprehensive workflow see: [Daily Development Workflow](#daily-development-workflow-streamlined)**

```bash
# Quick start development session
git checkout development && git pull origin development

# Deploy to staging
git add . && git commit -m "feat: your changes" && git push origin development

# Check deployment status
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime
```

### **📋 CRITICAL DOCUMENTATION PROTECTIONS**

**🚨 PROTECTED DOCUMENTATION FILES** (Referenced to prevent obsolescence)
These files are explicitly referenced here to ensure they remain active and maintained:

- **MASTER_DOCUMENTATION.md** ✅ Primary system documentation
- **CHANGELOG.md** ✅ Version history and release notes
- **README.md** ✅ Project overview and getting started
- **SYSTEM-ARCHITECTURE-DESIGN.md** ✅ Architecture reference
- **INCIDENT_RESPONSE.md** ✅ Security procedures
- **PERFORMANCE_BASELINE.md** ✅ Performance monitoring reference
- **PRODUCTION-ENV-TEMPLATE.md** ✅ Environment configuration templates

### **📋 SECTION QUICK REFERENCE**
| Section | Anchor | When to Use |
|---------|--------|-------------|
| **🚨 Development Protocols** | [#critical-development-protocols](#critical-development-protocols) | Before starting any development work |
| **🚨 Scope Prevention** | [#scope-creep-prevention-protocol](#scope-creep-prevention-protocol) | When implementing new features |
| **🚀 Deployment Guide** | [#comprehensive-deployment-guide](#comprehensive-deployment-guide) | When deploying to staging/production |
| **🛡️ Security & Standards** | [#security--standards](#security--standards) | For authentication/admin debugging |
| **🔧 Development Essentials** | [#development-essentials](#development-essentials) | For environment setup and common patterns |
| **🤖 Multi-Agent Coordination** | [#multi-agent-coordination](#multi-agent-coordination) | For complex features or emergency response |
| **🚨 Critical Failure Prevention** | [#critical-failure-patterns-to-avoid](#critical-failure-patterns-to-avoid) | When troubleshooting deployment issues |

### **🔍 FIND ANYTHING FAST**
```bash
# Find deployment procedures
grep -n "deployment\|deploy" CLAUDE.md

# Find multi-agent workflows
grep -n "Multi-Agent\|coordination" CLAUDE.md

# Find emergency procedures
grep -n "emergency\|critical\|urgent" CLAUDE.md

# Find specific environment info
grep -n "production\|staging\|dev\." CLAUDE.md
```

---

## 🤖 Production Status & Environment
**Last Updated:** September 20, 2025

### Deployment URLs
**Production:**
- **Backend**: https://api.unitedwerise.org
- **Frontend**: https://www.unitedwerise.org
- **Admin Dashboard**: https://www.unitedwerise.org/admin-dashboard.html

**Staging (Development Branch):**
- **Frontend**: https://dev.unitedwerise.org
- **Backend**: https://dev-api.unitedwerise.org
- **Admin Dashboard**: https://dev.unitedwerise.org/admin-dashboard.html

**Azure Direct URLs (for reference):**
- **Staging Frontend**: https://delightful-smoke-097b2fa0f.3.azurestaticapps.net
- **Staging Backend**: https://unitedwerise-backend-staging.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io

### Platform Status: ✅ Complete Social Media Platform
- ✅ My Feed infinite scroll (15-post batches)
- ✅ Photo tagging with privacy controls
- ✅ User relationships & notifications
- ✅ Reputation system with democratic reporting
- ✅ AI content analysis & topic discovery
- ✅ Officials panel with voting records
- ✅ Comprehensive 13-section admin dashboard with deployment monitoring
- ✅ LIVE Stripe payments with tax receipts
- ✅ OAuth Authentication (Google)
- ✅ TOTP 2FA with 24-hour sessions
- ✅ Logical candidate registration flow

---

## 🚨 CRITICAL DEVELOPMENT PROTOCOLS
**Related Sections:** [Scope Prevention](#scope-prevention) | [Deployment Guide](#deployment-guide) | [Multi-Agent Coordination](#multi-agent-coordination)

### 🗣️ COLLABORATIVE LANGUAGE PROTOCOL
**CRITICAL**: When the user uses collaborative words, they indicate a desire for DISCUSSION ONLY, not implementation:

**Collaborative Keywords That Mean "DISCUSS ONLY":**
- "Let's discuss..." = Present options and analysis, DO NOT implement
- "Let's plan..." = Create strategy and approach, DO NOT execute
- "Let's brainstorm..." = Generate ideas and possibilities, DO NOT build
- "Let's figure out..." = Analyze and evaluate options, DO NOT code
- "Let's strategize..." = Develop approach and timeline, DO NOT start work
- "Can we talk about..." = Discussion mode only
- "What do you think about..." = Opinion and analysis requested
- "How should we approach..." = Strategy discussion, not action

**REQUIRED BEHAVIOR**: When these words appear, ALWAYS:
1. Present analysis, options, and recommendations
2. Ask clarifying questions
3. Wait for explicit implementation approval
4. NEVER jump to coding or making changes

**Implementation Only Begins With**:
- "Implement this..."
- "Make these changes..."
- "Fix this..."
- "Add this feature..."
- "Go ahead and..."
- "Start building..."
- Explicit approval after discussion

### 🔥 MANDATORY DEVELOPMENT BRANCH WORKFLOW (NEVER WORK ON MAIN)
**ABSOLUTE REQUIREMENT - ALL development work MUST be done on development branch:**

#### Step 1: Always Start on Development Branch
```bash
# REQUIRED at start of every development session
git checkout development
git pull origin development
```

#### Step 2: Create Feature Branch from Development (Optional)
```bash
# For complex features, create feature branch from development
git checkout -b feature/feature-name development

# When feature is complete, merge back to development:
# git checkout development
# git pull origin development
# git merge feature/feature-name
# git push origin development
# git branch -d feature/feature-name
```

**Branch Strategy:**
```
main           # Production code (ONLY merge from development with user approval)
development    # Staging code (ALL development work happens here)
├── feature/*  # New features (feature/user-profiles) - branch from development
├── fix/*      # Bug fixes (fix/auth-timeout) - branch from development
└── hotfix/*   # Emergency fixes (hotfix/security-patch) - branch from development
```

#### Step 3: Development and Testing on Development Branch
```bash
# Make changes, commit to development branch
git add .
git commit -m "feat/fix: Description of changes"
git push origin development  # Deploys to staging automatically
```

**Commit Message Format:**
```
feat: Add new feature
fix: Fix specific bug
docs: Update documentation
refactor: Code cleanup
schema: Database changes
```

#### Step 4: Verify on Staging Before Main Merge
- **Staging URL**: https://dev.unitedwerise.org
- **Backend API**: https://dev-api.unitedwerise.org
- **MANDATORY**: Test ALL functionality on staging environment
- **STAGING BEHAVIOR**: Requires admin login for all protected routes
- **REQUIRED**: User approval that staging deployment works correctly

**Deployment Mapping:**
```
development branch → STAGING
  - Frontend: https://dev.unitedwerise.org
  - Backend:  https://dev-api.unitedwerise.org
  - Access:   Admin-only for protected routes

main branch → PRODUCTION
  - Frontend: https://www.unitedwerise.org
  - Backend:  https://api.unitedwerise.org
  - Access:   Open to all registered users
```

#### Step 5: Production Deployment (FORBIDDEN WITHOUT EXPLICIT USER APPROVAL)
**❌ THESE COMMANDS ARE FORBIDDEN WITHOUT USER SAYING "DEPLOY TO PRODUCTION":**
```bash
# git checkout main
# git pull origin main
# git merge development
# git push origin main
```
**✅ ALWAYS ASK USER: "Ready to deploy to production?" and wait for explicit approval**

**🚨 CRITICAL RULES:**
- ❌ **NEVER** work directly on main branch
- ❌ **NEVER** push to main without explicit user approval
- ❌ **NEVER** merge to main "while we're at it"
- ✅ **ALWAYS** start work on development branch
- ✅ **ALWAYS** test on staging before requesting production merge
- ✅ **ALWAYS** get user approval: "Ready to deploy to production?"

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
- **Complex Development**: Use Multi-Agent Coordination (CLAUDE.md Line 1069+)
- **Emergency Response**: Multi-Agent rapid response patterns (CLAUDE.md Line 1116+)
- **Performance Issues**: Multi-Agent optimization workflows (CLAUDE.md Line 1125+)

**How to search effectively:**
```bash
# Use Task Tool for complex searches
"Search MASTER_DOCUMENTATION.md for authentication workflows and related security systems"

# Use Grep for specific patterns
grep -n "API.*endpoint.*auth" MASTER_DOCUMENTATION.md
grep -n "Known Issues" MASTER_DOCUMENTATION.md
grep -n "{#security-" MASTER_DOCUMENTATION.md

# Find multi-agent coordination quickly
grep -n "MULTI-AGENT" CLAUDE.md
grep -n "Quick-Start.*Agent" CLAUDE.md
grep -n "Coordination.*Infrastructure" CLAUDE.md
```

**Cross-reference patterns to follow:**
- Section anchor format (like `#security-authentication`) → Jump to specific system documentation
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

## 🚨 SCOPE CREEP PREVENTION PROTOCOL

### THE CARDINAL RULE: SOLVE THE SPECIFIC PROBLEM ONLY

**Pre-Implementation Checklist:**
1. **Define Problem**: Write in ONE sentence, identify exact user-facing behavior change
2. **Minimum Solution**: Can this be solved by changing ≤3 functions/endpoints?
3. **Working Code**: If existing code works correctly, DO NOT TOUCH IT
4. **No Architecture Changes** without explicit user permission

**🚨 BANNED SCOPE CREEP PHRASES:**
- "While we're at it..." | "This would be a good time to..." | "For consistency, I'll update..."

**🚨 BANNED WORKAROUND APPROACHES (ZERO TOLERANCE):**
- "Let me create a workaround..." | "I'll add a temporary fix..." | "I'll hardcode this for now..."

**⚡ FUNDAMENTAL PRINCIPLE: NO WORKAROUNDS EVER**

**Only Two Acceptable Responses:**
1. **"This is the wrong approach"** - Stop and reassess strategy
2. **"Fix it the right way"** - Implement correct, permanent, industry-standard solution

**Required Mindset:**
- ✅ "What is the industry-standard way to solve this?"
- ✅ "How would a senior engineer implement this properly?"
- ❌ Create "quick fixes" to move forward

**Mandatory Scope Check Before Any Implementation:**
1. Am I solving the exact problem stated?
2. Am I changing the minimum code necessary?
3. Have I gotten explicit permission for architectural changes?
4. Will this change break any working functionality?

**If ANY answer is uncertain, STOP and clarify with user.**

---

## 🚀 COMPREHENSIVE DEPLOYMENT GUIDE
**Last Updated:** September 20, 2025
**Related Sections:** [Development Protocols](#development-protocols) | [Emergency Commands](#emergency-commands) | [Quick Command Reference](#quick-command-reference-appendix)

### 📍 Deployment Endpoints

**🎯 GOLD STANDARD STAGING ARCHITECTURE:**
- **Development Branch** → **Staging Environment** → **User Testing** → **Production Deployment**
- **Same Codebase, Different Behavior**: Environment-aware access control ensures staging safety
- **True Isolation**: Staging backend deployment doesn't affect production users

**Production Environment:**
- **Backend**: https://api.unitedwerise.org
- **Frontend**: https://www.unitedwerise.org
- **Admin Dashboard**: https://www.unitedwerise.org/admin-dashboard.html
- **Database**: unitedwerise-db.postgres.database.azure.com (PRODUCTION ONLY)
- **Access**: Open to all registered users

**Staging Environment (Admin-Only):**
- **Backend**: https://dev-api.unitedwerise.org
- **Frontend**: https://dev.unitedwerise.org
- **Admin Dashboard**: https://dev.unitedwerise.org/admin-dashboard.html
- **Database**: unitedwerise-db-dev.postgres.database.azure.com (ISOLATED DEV DATABASE)
- **Access**: Requires admin login for all protected routes
- **Purpose**: Safe testing of development branch changes

---

### 🚨 MANDATORY PRE-DEPLOYMENT CHECKLIST
**NEVER SKIP - Prevents 99% of deployment failures:**

```bash
# Run comprehensive validation (script with manual fallback)
./scripts/validate-before-commit.sh || {
  # Manual validation if script fails:
  git status  # Verify changes exist
  cd backend && npm run build  # TypeScript compilation
  git log -1 --oneline  # Verify GitHub has changes
  git log origin/development..HEAD  # Verify all changes pushed
  cd ..
}

# DATABASE SCHEMA VALIDATION (CRITICAL for database changes)
cd backend
npx prisma validate  # Ensures schema is valid
npx prisma generate   # Regenerates client to match schema
npm run build        # Ensures code compiles with current schema
cd ..
```

**⚠️ CRITICAL UNDERSTANDING:**
- Docker builds from GitHub repository, NOT your local files
- Uncommitted changes will NEVER deploy
- This is the #1 cause of "mysterious" deployment failures
- **NEW**: Database schema and code MUST be synchronized before deployment

---

### 📋 DEVELOPMENT BRANCH DEPLOYMENT PROCEDURES

#### 🔥 MANDATORY WORKFLOW: Development → Staging → Production

#### 1️⃣ Frontend Development Deployment (STAGING)
```bash
# Deploy to staging (script with manual fallback)
./scripts/quick-deploy-staging.sh "feat: your changes" || {
  # Manual deployment if script fails:
  git checkout development && git pull origin development
  git add . && git commit -m "feat: your changes" && git push origin development
  # GitHub Actions auto-deploys to STAGING in ~2-5 minutes
  # Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
}
```

#### 1️⃣-B Frontend Production Deployment (FORBIDDEN WITHOUT USER APPROVAL)
**❌ PRODUCTION DEPLOYMENT IS FORBIDDEN WITHOUT USER EXPLICITLY SAYING "DEPLOY TO PRODUCTION"**

**ALWAYS ASK USER**: "Ready to deploy to production?" and wait for explicit approval

**IF AND ONLY IF USER APPROVES:**
```bash
# git checkout main
# git pull origin main
# git merge development  
# git push origin main
```

#### 2️⃣ Backend Development Deployment (STAGING FIRST)
```bash
# Deploy backend to staging (script with manual fallback for git operations)
./scripts/quick-deploy-staging.sh "feat: your backend changes" || {
  # Manual git operations if script fails:
  ./scripts/validate-before-commit.sh || {
    git status && cd backend && npm run build && cd ..
  }
  git checkout development && git pull origin development
  git add . && git commit -m "feat: your backend changes" && git push origin development
  git status  # Verify push succeeded
}

# Backend-specific Docker build steps:

# Step 5: Build Docker image with Git SHA tracking FROM DEVELOPMENT BRANCH
GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-dev-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"
az acr build --registry uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --no-wait https://github.com/UnitedWeRise-org/UnitedWeRise.git#development:backend
echo "STAGING build queued with tag: $DOCKER_TAG for commit: $GIT_SHA"

# Step 6: Wait for build (typically 2-3 minutes)
sleep 180

# Step 7: Verify build succeeded
az acr task list-runs --registry uwracr2425 --output table | head -3
# Status column MUST show "Succeeded"

# Step 8: Get image digest for immutable deployment
DIGEST=$(az acr repository show --name uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --query "digest" -o tsv)
echo "Image digest: $DIGEST"

# Step 9: Deploy to STAGING backend with digest + release metadata
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "stg-$GIT_SHA-$(date +%H%M%S)" \
  --set-env-vars \
    NODE_ENV=staging \
    STAGING_ENVIRONMENT=true \
    RELEASE_SHA=$GIT_SHA \
    RELEASE_DIGEST=$DIGEST \
    DOCKER_TAG=$DOCKER_TAG \
    DEPLOYMENT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Step 10: Force single-revision mode for STAGING (prevents traffic split issues)
az containerapp update \
  --name unitedwerise-backend-staging \
  --resource-group unitedwerise-rg \
  --revision-mode Single

# Step 11: Verify deployment with improved checks
echo "Waiting for deployment to complete..."
sleep 30

# Check that STAGING health shows correct release SHA
DEPLOYED_SHA=$(curl -s "https://dev-api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
if [ "$DEPLOYED_SHA" = "$GIT_SHA" ]; then
  echo "✅ STAGING deployment verified: Release SHA matches ($GIT_SHA)"
else
  echo "❌ STAGING deployment issue: Expected SHA $GIT_SHA, got $DEPLOYED_SHA"
fi

# Check uptime (should be <60 seconds for fresh deployment)
UPTIME=$(curl -s "https://dev-api.unitedwerise.org/health" | grep -o '"uptime":[^,]*' | cut -d':' -f2)
echo "STAGING container uptime: $UPTIME seconds"
```

#### 2️⃣-B Backend Production Deployment (FORBIDDEN WITHOUT USER APPROVAL)
**❌ PRODUCTION DEPLOYMENT IS FORBIDDEN WITHOUT USER EXPLICITLY SAYING "DEPLOY TO PRODUCTION"**

**ALWAYS ASK USER**: "Ready to deploy to production?" and wait for explicit approval

**IF AND ONLY IF USER APPROVES:**
```bash
# Step 1: Merge development to main
# git checkout main
# git pull origin main
# git merge development
# git push origin main

# Step 2: Build production Docker image from main branch
GIT_SHA=$(git rev-parse --short HEAD)
DOCKER_TAG="backend-prod-$GIT_SHA-$(date +%Y%m%d-%H%M%S)"
az acr build --registry uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --no-wait https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend
echo "PRODUCTION build queued with tag: $DOCKER_TAG for commit: $GIT_SHA"

# Step 3: Wait for build (typically 2-3 minutes)
sleep 180

# Step 4: Verify build succeeded
az acr task list-runs --registry uwracr2425 --output table | head -3
# Status column MUST show "Succeeded"

# Step 5: Get image digest for immutable deployment
DIGEST=$(az acr repository show --name uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --query "digest" -o tsv)
echo "Image digest: $DIGEST"

# Step 6: Deploy to PRODUCTION backend with digest + release metadata
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" \
  --revision-suffix "prod-$GIT_SHA-$(date +%H%M%S)" \
  --set-env-vars \
    NODE_ENV=production \
    RELEASE_SHA=$GIT_SHA \
    RELEASE_DIGEST=$DIGEST \
    DOCKER_TAG=$DOCKER_TAG \
    DEPLOYMENT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Step 7: Force single-revision mode (prevents traffic split issues)
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-mode Single

# Step 8: Verify PRODUCTION deployment
echo "Waiting for deployment to complete..."
sleep 30

# Check that health shows correct release SHA
DEPLOYED_SHA=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
if [ "$DEPLOYED_SHA" = "$GIT_SHA" ]; then
  echo "✅ PRODUCTION deployment verified: Release SHA matches ($GIT_SHA)"
else
  echo "❌ PRODUCTION deployment issue: Expected SHA $GIT_SHA, got $DEPLOYED_SHA"
fi

# Check uptime (should be <60 seconds for fresh deployment)
UPTIME=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"uptime":[^,]*' | cut -d':' -f2)
echo "Container uptime: $UPTIME seconds"
```

#### 3️⃣ Database Schema Changes (`prisma/schema.prisma`)
**✅ DATABASES NOW ISOLATED: Changes to development database do NOT affect production**

```bash
# Development database schema changes (SAFE - affects staging only)
cd backend

# 1. Check which database you're connected to (CRITICAL SAFETY CHECK)
echo "Connected to: $(echo $DATABASE_URL | grep -o '@[^.]*')"
# Should show "@unitedwerise-db-dev" for safe development

# 2. Apply schema changes safely to development database
npx prisma migrate dev --name "description_of_change"
npx prisma generate
npm run build

# 3. Deploy to staging (development branch) - uses dev database
git add . && git commit -m "schema: description" && git push origin development

# 4. Test thoroughly on staging before production deployment
# 5. Production deployment requires explicit user approval (separate main branch merge)
```

**🛡️ SAFETY**: Development schema changes are now isolated from production
**🚨 PRODUCTION SCHEMA**: Only deploy to production after thorough staging testing

---

### 🔍 QUICK FAILURE DIAGNOSIS - CHECKLIST

**When changes don't appear in production, check in order:**

- [ ] **Changes committed?** → `git status` (should show no modified files)
- [ ] **Changes pushed to development?** → `git log origin/development..HEAD` (should show no commits)
- [ ] **TypeScript compiled?** → `cd backend && npm run build` (should show no errors)
- [ ] **Docker build succeeded?** → `az acr task list-runs --registry uwracr2425 --output table | head -3` (Status = "Succeeded")
- [ ] **Correct SHA deployed?** → `curl -s "https://api.unitedwerise.org/version" | grep releaseSha` (matches local commit)
- [ ] **New container running?** → `curl -s "https://api.unitedwerise.org/health" | grep uptime` (< 300 seconds)
- [ ] **Active revision correct?** → `az containerapp revision list --name unitedwerise-backend --resource-group unitedwerise-rg -o table`
- [ ] **Image digest matches?** → `az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg --query "properties.template.containers[0].image"`

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
# ALWAYS push to development branch (staging)
git checkout development
git add . && git commit -m "Description" && git push origin development

# ❌ FORBIDDEN: No main branch operations without user explicitly saying "deploy to production"
# ❌ FORBIDDEN: git checkout main && git merge development && git push origin main
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
# Complete emergency rollback (script with manual fallback)
./scripts/emergency-rollback.sh || {
  # Manual rollback if script fails:
  git checkout development && git revert HEAD && git push origin development
}

# Backend emergency restart (manual only)
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-suffix emergency-$(date +%m%d-%H%M)

# Verify system recovery
./scripts/post-deployment-verify.sh || {
  curl -s "https://api.unitedwerise.org/health" | jq .
}

# Database restore (last resort)
az postgres flexible-server restore \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db-restored \
  --source-server unitedwerise-db \
  --restore-time "2025-MM-DDTHH:MM:00Z"
```

---

### ✅ POST-DEPLOYMENT VERIFICATION
```bash
# Comprehensive post-deployment verification (script with manual fallback)
./scripts/post-deployment-verify.sh || {
  # Manual verification steps if script fails:
  GIT_SHA=$(git rev-parse --short HEAD)
  DEPLOYED_SHA=$(curl -s "https://api.unitedwerise.org/version" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
  echo "Local SHA: $GIT_SHA, Deployed SHA: $DEPLOYED_SHA"
  curl -s "https://api.unitedwerise.org/health" | grep uptime
  curl -s "https://api.unitedwerise.org/health" | jq .
  curl -I "https://api.unitedwerise.org/version" | grep X-Release
}
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


---

## 🎯 STAGING ENVIRONMENT STANDARDS

### 🏗️ Architecture Overview
Our staging environment implements industry best practices with **environment-aware code** that behaves differently based on deployment context while maintaining a **single codebase**.

**Key Innovation**: Same Docker image deployed to both environments with different environment variables controlling behavior.

### 🔒 Security & Access Control

**Production Environment:**
- **Access**: Open to all registered users
- **Authentication**: Standard user login system
- **Purpose**: Public-facing application

**Staging Environment:**
- **Access**: Admin-only for all protected routes  
- **Authentication**: Requires admin privileges after login
- **Purpose**: Safe testing of development changes
- **Protection**: Prevents non-admin users from affecting development testing

### 🚀 Deployment Flow
```
Development Branch Changes
        ↓
    Automatic Deploy
        ↓
   Staging Environment (dev.unitedwerise.org)
        ↓  
    Admin Testing & Approval
        ↓
   Manual Merge to Main
        ↓
  Production Environment (www.unitedwerise.org)
```

### 🛠️ Technical Implementation

**Frontend Environment Detection:**
```javascript
// Automatically routes API calls based on hostname
if (hostname.includes('dev.unitedwerise.org')) {
  return 'https://dev-api.unitedwerise.org/api';
}
```

**Backend Environment-Aware Authentication:**
```javascript
// Same code, different behavior based on NODE_ENV
if (process.env.NODE_ENV === 'staging') {
  // Require admin access for all protected routes
  if (!req.user?.isAdmin) {
    return res.status(403).json({ 
      error: 'This is a staging environment - admin access required.',
      environment: 'staging'
    });
  }
}
```

**Container Configuration:**
- **Staging**: `NODE_ENV=staging` + `STAGING_ENVIRONMENT=true`
- **Production**: `NODE_ENV=production`
- **Same Docker Image**: Deployed to both with different environment variables

### ✅ Benefits Achieved

1. **True Isolation**: Development changes never impact production users
2. **Zero Code Duplication**: Single codebase with conditional behavior
3. **Professional URLs**: `dev.unitedwerise.org` vs Azure's auto-generated names
4. **Cookie Domain Sharing**: Same `.unitedwerise.org` domain improves authentication
5. **Industry Standard**: Standard staging → production deployment pipeline

### 🧪 Testing Workflow

1. **Deploy to Staging**: Push to development branch
2. **Admin Testing**: Only admins can access protected staging routes
3. **Verify Functionality**: Test all changes in isolated environment
4. **User Approval**: Confirm staging deployment works correctly  
5. **Production Deploy**: Merge to main only with explicit user permission

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

### 🌍 Centralized Environment Detection (Added September 23, 2025)
**ARCHITECTURE**: Single source of truth for environment detection across entire application

**Frontend Environment Detection** (`frontend/src/utils/environment.js`):
```javascript
// Based on window.location.hostname
export function getEnvironment() {
    const hostname = window.location.hostname;
    if (hostname === 'dev.unitedwerise.org' ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1') {
        return 'development';
    }
    return 'production';
}

export function getApiBaseUrl() {
    return isDevelopment() ? 'https://dev-api.unitedwerise.org/api' : 'https://api.unitedwerise.org/api';
}
```

**Backend Environment Detection** (`backend/src/utils/environment.ts`):
```typescript
// Based on NODE_ENV
export function getEnvironment(): 'development' | 'production' {
    if (process.env.NODE_ENV === 'production') {
        return 'production';
    }
    return 'development'; // Default for staging, test, undefined, etc.
}

export function requiresCaptcha(): boolean {
    return isProduction(); // Only production requires captcha
}
```

**Environment Mapping**:
```
Frontend Hostname          → Environment    → Backend NODE_ENV
dev.unitedwerise.org       → development    → staging
localhost/127.0.0.1        → development    → development
www.unitedwerise.org       → production     → production
```

**CRITICAL**: All environment detection MUST use these centralized functions. Direct NODE_ENV or hostname checks are prohibited.

### 🚀 ES6 Module System (Added September 23, 2025)
**ARCHITECTURE**: Modern JavaScript module system with proper dependency management

**Migration Completed**: Entire frontend converted from legacy script loading to ES6 modules

#### Module Loading Architecture
```html
<!-- OLD: Legacy script loading (20+ individual scripts) -->
<script src="src/config/api.js"></script>
<script src="src/js/websocket-client.js"></script>
<script src="src/components/Profile.js"></script>
<!-- ... many more scripts with global pollution -->

<!-- NEW: Modern ES6 module system -->
<script type="module" src="src/js/main.js"></script>
```

#### Module Dependency Chain
```javascript
// main.js - Single entry point
import '../utils/environment.js';           // Core utilities
import '../config/api.js';                  // Configuration
import '../integrations/backend-integration.js'; // Integration layer
import '../components/Profile.js';          // Components
import './app-initialization.js';           // Orchestration
```

#### ES6 Module Standards
```javascript
// Standard import pattern
import { getEnvironment, getApiBaseUrl } from '../utils/environment.js';

// Standard export pattern
export { ClassName, functionName };

// Legacy compatibility during transition
window.ClassName = ClassName;
```

#### Key Benefits
- ✅ **Proper Dependency Management**: Explicit import/export declarations
- ✅ **No Global Pollution**: Clean module encapsulation
- ✅ **Modern Standards**: Industry-standard JavaScript practices
- ✅ **Better Performance**: Tree shaking and optimized loading
- ✅ **Enhanced IDE Support**: Better autocomplete and error detection

#### Development Guidelines
1. **New modules**: Use ES6 import/export syntax
2. **Import order**: Core → Config → Integration → Components → App
3. **Legacy compatibility**: Maintain global exports during transition
4. **File extensions**: Always include `.js` in import paths

### 📋 Daily Development Workflow (Streamlined)
```bash
# Complete development session (script with manual fallback)
# 1. START SESSION
./scripts/dev-start.sh || {
  git checkout development && git pull origin development
}

# 2. MAKE CHANGES AND DEPLOY
# [Your development work here]
./scripts/quick-deploy-staging.sh "feat: your description" || {
  ./scripts/validate-before-commit.sh || {
    git status && cd backend && npm run build && cd ..
  }
  git add . && git commit -m "feat: your description" && git push origin development
}

# 3. MONITOR AND VERIFY
./scripts/deployment-status.sh || {
  curl -s "https://dev-api.unitedwerise.org/health" | grep uptime
}

# 4. TEST ON STAGING
# Visit: https://dev.unitedwerise.org (requires admin login)
# Verify all functionality works as expected

# 5. PRODUCTION DEPLOYMENT (Only with explicit user approval)
# [User must explicitly say "deploy to production"]
```

### Common Development Patterns
```bash
# MANDATORY: Daily database safety check
bash scripts/check-database-safety.sh

# After schema changes (development only)
cd backend && node test-db-isolation.js  # Verify safe database
npx prisma generate

# Database migrations (ISOLATED - safe for development)
npx prisma migrate dev --name "description"

# TypeScript compilation check (backend) - MANDATORY before deployment
cd backend && npm run build

# Find CSS usage
grep -r "class-name" frontend/

# Test auth manually with environment-aware API
fetch('/api/endpoint', {
  headers: {'Authorization': `Bearer ${localStorage.getItem('authToken')}`}
})

# Environment detection verification
# Frontend: Check console for environment logs
# Backend: Check /health endpoint for environment info

# ES6 Module Development (NEW)
# Create new module file
touch frontend/src/components/NewComponent.js

# Add ES6 module structure
echo 'import { getEnvironment } from "../utils/environment.js";
export class NewComponent {
  // implementation
}
window.NewComponent = NewComponent; // Legacy compatibility' > frontend/src/components/NewComponent.js

# Add to main.js dependency chain
echo "import '../components/NewComponent.js';" >> frontend/src/js/main.js

# Verify module loads correctly
# Check browser console for module loading messages
```

### 🛡️ Database Safety (Added September 23, 2025)
**CRITICAL**: Complete database isolation now implemented

**Architecture:**
```
Production:  unitedwerise-db          (api.unitedwerise.org)
Development: unitedwerise-db-dev      (dev-api.unitedwerise.org + local)
```

**Safety Commands:**
```bash
# Check isolation daily
bash scripts/check-database-safety.sh

# Verify local connection before migrations
cd backend && node test-db-isolation.js

# Emergency production restore (if ever needed)
az postgres flexible-server restore \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db-emergency \
  --source-server unitedwerise-db \
  --restore-time "YYYY-MM-DDTHH:MM:00Z"
```

### Performance Optimization Workflow
**Last Updated:** September 20, 2025

```bash
# Pre-commit validation (runs all checks)
bash scripts/validate-before-commit.sh
# Checks: TypeScript compilation, cross-references, API endpoints, documentation freshness

# Cross-reference validation
node scripts/validate-cross-references.js
# Validates all {#section-name} references across documentation files

# API endpoint testing
bash scripts/test-api-endpoints.sh
# Tests critical endpoints on staging environment

# Deployment status monitoring
bash scripts/deployment-status.sh
# Shows current deployment status, uptime, and release versions
```

**Frontend Performance Utilities** (Auto-loaded):
```javascript
// Smart caching with TTL and request deduplication
window.PerformanceUtils.apiCallWithCache(apiCall, '/endpoint', options)

// Advanced error handling with user-friendly messages
window.ErrorHandler.handleError(error, {context: 'feed-loading'})

// Progressive module loading
window.AdvancedCaching.loadModuleOnDemand('maps', '/js/leaflet.js')
```

**Backend Performance Monitoring** (Automatic):
- Real-time API performance tracking via `performanceMiddleware`
- Slow request detection (>1000ms) with automatic logging
- Error rate monitoring with status code tracking
- Performance reports available at admin endpoints

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

## 🤖 MULTI-AGENT COORDINATION
**Last Updated:** September 20, 2025
**Related Sections:** [Development Protocols](#development-protocols) | [Emergency Commands](#emergency-commands) | [Performance Optimization](#performance-optimization-workflow)

### When to Use Multi-Agent Approach
**High-Benefit Scenarios (Use Multi-Agent):**
- **Complex Feature Development**: Frontend + Backend + Testing coordination
- **Emergency Response**: Parallel debugging, hotfix, and verification
- **Performance Optimization**: Analysis + Implementation + Benchmarking
- **Security-Sensitive Changes**: Development + Review + Testing + Documentation
- **Database Migrations**: Schema + Application Updates + Verification + Rollback Planning

**Single Agent Scenarios (Keep Simple):**
- Bug fixes within single component or file
- Documentation updates or styling changes
- Simple API endpoint additions
- Configuration changes only

### Coordinator Decision Framework
**Task Complexity Assessment:**
```bash
# Simple Task (Single Agent):
- Affects 1-2 files, single system component
- Implementation time: <30 minutes
- Low risk, minimal cross-system impact

# Complex Task (Consider Multi-Agent):
- Affects 3+ system components or files
- Implementation time: 30+ minutes
- High risk, significant cross-system impact
- Requires specialized expertise (security, performance, testing)
```

### Quick-Start Multi-Agent Workflows

**Feature Development (4-Agent Proven Pattern):**
```bash
# Launch existing comprehensive workflow
# See detailed instructions: .claude/commands/parallel-feature-development.md

# Terminal 1 - Research Agent: Architecture and integration analysis
# Terminal 2 - Backend Agent: API endpoints and database changes
# Terminal 3 - Frontend Agent: UI components and user experience
# Terminal 4 - Testing Agent: Quality assurance and validation

# Expected Time Savings: 40-60% vs sequential development
```

**Emergency Response (2-Agent Rapid Pattern):**
```bash
# Terminal 1 - Analysis Agent: Root cause analysis and impact assessment
# Terminal 2 - Hotfix Agent: Immediate fix implementation and deployment

# Coordination via: .claude/scratchpads/EMERGENCY-STATUS.md
# Result: Parallel problem-solving with faster resolution
```

**Performance Optimization (3-Agent Specialist Pattern):**
```bash
# Terminal 1 - Analysis Agent: Performance bottleneck identification
# Terminal 2 - Implementation Agent: Code optimization and caching
# Terminal 3 - Benchmarking Agent: Before/after metrics and validation

# Coordination via: .claude/scratchpads/PERFORMANCE-OPTIMIZATION.md
# Result: Data-driven optimization with verified improvements
```

### Agent Specialization Areas
**Development Agent:**
- Implement core functionality on development branch only
- Follow existing authentication and security patterns
- Log all changes to `.claude/scratchpads/DEVELOPMENT-LOG.md`
- Use admin-only debugging functions (no console.log)

**Review Agent:**
- Security pattern compliance verification
- Code quality assessment and standards enforcement
- Log findings to `.claude/scratchpads/REVIEW-LOG.md`
- Integration with development workflow via shared coordination files

**Testing Agent:**
- Staging environment verification (https://dev.unitedwerise.org)
- API endpoint testing and error scenario validation
- User flow testing with admin authentication
- Report results to `.claude/scratchpads/TESTING-STATUS.md`

**Deployment Agent:**
- Pre-deployment checklist execution
- Staging deployment first, production only with explicit approval
- Azure deployment pipeline management
- Monitoring and rollback capability

### Coordination Infrastructure
**Communication Files** (Auto-managed):
```bash
.claude/scratchpads/DEVELOPMENT-LOG.md    # Backend progress tracking
.claude/scratchpads/API-CHANGES.md        # Endpoint coordination
.claude/scratchpads/FRONTEND-PROGRESS.md  # UI development status
.claude/scratchpads/TESTING-STATUS.md     # Quality assurance results
.claude/scratchpads/REVIEW-LOG.md         # Security and quality review
```

**Handoff Protocol:**
1. **Research → Development**: Architecture plan finalized in coordination file
2. **Development → Testing**: Implementation complete with API documentation
3. **Testing → Review**: Verification complete with test results
4. **Review → Deployment**: All quality gates passed, ready for staging

### Fallback Strategies
**When Multi-Agent Coordination Fails:**
- **Immediate Fallback**: Switch to single-agent mode
- **Communication Issues**: Use TodoWrite for simple progress tracking
- **Complex Conflicts**: Manual coordination with clear task separation
- **Emergency Situations**: Single agent completes critical path end-to-end

**Cost-Conscious Decision Making:**
- **Single Agent Tasks**: 1,000-3,000 tokens (simple fixes, styling, documentation)
- **Multi-Agent Tasks**: 5,000-15,000 tokens (complex features, emergency response)
- **Decision Point**: "Is 3-5x token cost justified by parallel execution benefits?"

### Coordination Monitoring & Status
**Quick Status Check Commands:**
```bash
# Monitor all coordination files at once
ls -la .claude/scratchpads/*LOG*.md .claude/scratchpads/*STATUS*.md .claude/scratchpads/*PROGRESS*.md

# Check latest updates across coordination files
find .claude/scratchpads -name "*LOG*.md" -o -name "*STATUS*.md" -o -name "*PROGRESS*.md" | xargs ls -lt

# View current agent progress quickly
tail -5 .claude/scratchpads/DEVELOPMENT-LOG.md
tail -5 .claude/scratchpads/TESTING-STATUS.md
tail -5 .claude/scratchpads/REVIEW-LOG.md
```

**Coordination Dashboard** (Copy-paste for quick overview):
```bash
echo "🤖 MULTI-AGENT STATUS DASHBOARD"
echo "=================================="
echo "📁 Development Progress:"
[ -f .claude/scratchpads/DEVELOPMENT-LOG.md ] && tail -2 .claude/scratchpads/DEVELOPMENT-LOG.md || echo "No development activity"
echo ""
echo "🧪 Testing Status:"
[ -f .claude/scratchpads/TESTING-STATUS.md ] && tail -2 .claude/scratchpads/TESTING-STATUS.md || echo "No testing activity"
echo ""
echo "🔍 Review Status:"
[ -f .claude/scratchpads/REVIEW-LOG.md ] && tail -2 .claude/scratchpads/REVIEW-LOG.md || echo "No review activity"
echo ""
echo "📊 API Changes:"
[ -f .claude/scratchpads/API-CHANGES.md ] && grep -c "| " .claude/scratchpads/API-CHANGES.md || echo "0"
echo " new endpoints documented"
```

**Agent Handoff Checklist:**
```markdown
### Multi-Agent Handoff Verification
- [ ] **Research Complete**: FEATURE-ARCHITECTURE.md contains detailed plan
- [ ] **Backend Ready**: API endpoints documented in API-CHANGES.md
- [ ] **Frontend Ready**: UI components logged in FRONTEND-PROGRESS.md
- [ ] **Testing Complete**: All scenarios verified in TESTING-STATUS.md
- [ ] **Review Approved**: Security and quality sign-off in REVIEW-LOG.md
- [ ] **Deployment Ready**: Staging verification complete, production approval obtained
```

### Success Metrics
**Time Savings Achieved:**
- **Feature Development**: 40-50% faster completion
- **Emergency Response**: 60-70% faster resolution
- **Performance Optimization**: 50-60% faster implementation

**Quality Improvements:**
- Reduced bugs through continuous review during development
- Better security pattern compliance with specialized review
- More thorough testing coverage with dedicated testing agent
- Enhanced documentation through specialized technical writing

---

## 🚨 CRITICAL FAILURE PATTERNS TO AVOID

### Never Do
- Deploy without GitHub push first
- Skip pre-flight TypeScript compilation check
- Use environment variable updates for backend code changes
- Remove "deprecated" code without verification
- Implement without checking MASTER_DOCUMENTATION.md

### 🚨 CRITICAL: Unilateral Deletion of Existing Code is NEVER Authorized

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

## 📋 QUICK COMMAND REFERENCE APPENDIX

### 🚨 Emergency Commands
```bash
# Backend restart
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --revision-suffix emergency-$(date +%m%d-%H%M)

# Health check
curl -s "https://api.unitedwerise.org/health" | grep uptime

# Rollback to staging
git checkout development && git revert HEAD && git push origin development
```

### ⚡ Daily Development
**See: [Daily Development Workflow](#daily-development-workflow-streamlined) for comprehensive version**
```bash
# Quick commands
git checkout development && git pull origin development
git add . && git commit -m "feat/fix: Description" && git push origin development
curl -s "https://dev-api.unitedwerise.org/health" | grep uptime
```

### 🤖 Multi-Agent Launch
```bash
# Feature development (4 agents)
# See: .claude/commands/parallel-feature-development.md

# Emergency response (2 agents)
# Coordination: .claude/scratchpads/EMERGENCY-STATUS.md

# Performance optimization (3 agents)
# Coordination: .claude/scratchpads/PERFORMANCE-OPTIMIZATION.md
```

### 🔧 Development Tools
```bash
# TypeScript check
cd backend && npm run build

# Cross-reference validation
node scripts/validate-cross-references.js

# API endpoint testing
bash scripts/test-api-endpoints.sh

# Deployment status
bash scripts/deployment-status.sh
```

### 📊 Quick Status Checks
```bash
# Multi-agent coordination status
ls -la .claude/scratchpads/*LOG*.md .claude/scratchpads/*STATUS*.md

# Git status check
git status && git log -1 --oneline

# Deployment verification
DEPLOYED_SHA=$(curl -s "https://api.unitedwerise.org/health" | grep -o '"releaseSha":"[^"]*"' | cut -d'"' -f4)
echo "Deployed: $DEPLOYED_SHA, Local: $(git rev-parse --short HEAD)"
```

### 🔍 Search Commands
```bash
# Find anything in CLAUDE.md
grep -n "search_term" CLAUDE.md

# Find deployment procedures
grep -n "deploy" CLAUDE.md

# Find multi-agent workflows
grep -n "Multi-Agent\|coordination" CLAUDE.md

# Find environment URLs
grep -n "https://" CLAUDE.md
```

---

## 🚨 CRITICAL DOCUMENTATION PROTECTION SAFEGUARDS

### **⚠️ PROTECTED FILES - NEVER OBSOLETE OR ARCHIVE**

**These files are PERMANENTLY PROTECTED from lifecycle cleanup:**

- **MASTER_DOCUMENTATION.md** ✅ Core system documentation - ALWAYS KEEP
- **API_Quick_Reference.md** ✅ Essential API lookup reference - ALWAYS KEEP
- **CHANGELOG.md** ✅ Version history - ALWAYS KEEP
- **README.md** ✅ Project overview - ALWAYS KEEP
- **CLAUDE.md** ✅ Development reference (this file) - ALWAYS KEEP
- **INCIDENT_RESPONSE.md** ✅ Security procedures - ALWAYS KEEP
- **PERFORMANCE_BASELINE.md** ✅ Performance monitoring - ALWAYS KEEP
- **PRODUCTION-ENV-TEMPLATE.md** ✅ Environment templates - ALWAYS KEEP

### **❌ FORBIDDEN CLEANUP ACTIONS ON PROTECTED FILES**

**NEVER do any of the following to protected files:**
- Mark as obsolete in any document cleanup process
- Move to archive directories or delete from repository
- Remove references to these files from CLAUDE.md
- Exclude from active documentation lists
- Consider these files "stale" regardless of modification date

### **✅ REQUIRED PROTECTIONS**

**All protected files MUST:**
1. Remain in root directory of repository
2. Be explicitly referenced in CLAUDE.md (this file)
3. Be excluded from all cleanup scripts and procedures
4. Be maintained as active documentation regardless of age
5. Have their critical status preserved in any future updates

### **🛡️ SAFEGUARD VALIDATION**

Before any major cleanup or documentation changes:
```bash
# Verify all protected files exist and are referenced
ls -la MASTER_DOCUMENTATION.md CHANGELOG.md README.md SYSTEM-ARCHITECTURE-DESIGN.md INCIDENT_RESPONSE.md PERFORMANCE_BASELINE.md PRODUCTION-ENV-TEMPLATE.md
grep -q "MASTER_DOCUMENTATION.md" CLAUDE.md && echo "✅ Protected files referenced in CLAUDE.md" || echo "❌ CRITICAL: Protected file references missing"
```

---

**📖 Complete system details in MASTER_DOCUMENTATION.md**
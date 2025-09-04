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

## 📋 DEPLOYMENT DECISION MATRIX

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

```bash
# STEP 1: Commit and push (MANDATORY FIRST)  
git add . && git commit -m "Feature description" && git push origin main

# STEP 2: Force backend restart (RECOMMENDED - 95% success rate)
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --set-env-vars "DEPLOY_TIMESTAMP=$(date -u +%Y%m%d%H%M%S)"

# STEP 3: Verify deployment success (uptime should drop to <60 seconds)
curl "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" | grep uptime
```

### **SCENARIO C: Backend + Database Schema Changes**
**When**: Prisma schema modified AND backend code uses new models
**Detection**: `backend/prisma/schema.prisma` changed

```bash
# STEP 1: Commit and push (MANDATORY FIRST)
git add . && git commit -m "Feature description" && git push origin main

# STEP 2: Apply database migrations (BEFORE backend deployment)
cd backend && npx prisma db execute --file scripts/migration-name.sql --schema prisma/schema.prisma

# STEP 3: Force backend restart  
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --set-env-vars "SCHEMA_DEPLOY=$(date -u +%Y%m%d%H%M%S)"

# STEP 4: Verify deployment success
curl "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" | grep uptime
```

### **SCENARIO D: Full Stack Changes (Frontend + Backend)**
**When**: Both frontend and backend files modified
**Detection**: Changes in both `/frontend/` AND `/backend/` directories

```bash
# STEP 1: Commit and push (MANDATORY FIRST)
git add . && git commit -m "Feature description" && git push origin main

# STEP 2A: Deploy backend (if schema changes, run migrations first)
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --set-env-vars "FULLSTACK_DEPLOY=$(date -u +%Y%m%d%H%M%S)"

# STEP 2B: Frontend auto-deploys via GitHub Actions (wait for completion)
# Monitor: https://github.com/UnitedWeRise-org/UnitedWeRise/actions

# STEP 3: Verify both deployments
curl "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" | grep uptime
# Hard refresh browser after GitHub Actions completes
```

### **SCENARIO E: Emergency Docker Rebuild** 
**When**: New npm packages, Dockerfile changes, or environment variable restart fails
**Use**: Only as last resort (30% success rate due to encoding/Node version issues)

```bash
# STEP 1: Commit and push (MANDATORY FIRST)
git add . && git commit -m "Feature description" && git push origin main

# STEP 2: Build new Docker image from GitHub
az acr build --registry uwracr2425 --image unitedwerise-backend:latest https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend

# STEP 3: Deploy new Docker image
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --image uwracr2425.azurecr.io/unitedwerise-backend:latest
```

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

## 🤖 AUTOMATED DEPLOYMENT DECISION LOGIC

**When User Says**: "deploy", "push to production", "update live server", "get changes live"

**Claude Must Execute**:

```bash
# STEP 1: Analyze changes (MANDATORY)
git status

# STEP 2: Determine deployment scenario
# Frontend only: git diff HEAD --name-only | grep "^frontend/"
# Backend only: git diff HEAD --name-only | grep "^backend/" 
# Schema changes: git diff HEAD --name-only | grep "schema.prisma"
# Full stack: Changes in both frontend/ AND backend/

# STEP 3: Execute appropriate scenario from matrix above
# STEP 4: Verify deployment success
# STEP 5: Report status to user with specific verification steps
```

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
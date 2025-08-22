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

# News Aggregation (Optional)
NEWS_API_KEY=your_newsapi_key_here
THE_NEWS_API_KEY=your_thenewsapi_key_here
```

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

### 🚨 CRITICAL - Backend Deployment Process (ALWAYS FOLLOW)
**WHEN USER SAYS "rebuild backend" or "deploy backend" YOU MUST:**
```bash
# STEP 1: Build new Docker image from current GitHub code (MANDATORY)
az acr build --registry uwracr2425 --image unitedwerise-backend:latest https://github.com/UnitedWeRise-org/UnitedWeRise.git#main:backend

# STEP 2: Deploy the new image to Container Apps (ONLY AFTER STEP 1)
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --image uwracr2425.azurecr.io/unitedwerise-backend:latest
```
**NEVER skip Step 1!** Running `az containerapp update` without building a new Docker image just restarts old code.
**These are NOT separate processes** - they are two required steps of ONE deployment process.

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

### 🚀 Azure Container Apps Deployment Fix
**WHEN**: Backend uptime is high but changes aren't live
```bash
# Quick UnitedWeRise deployment fix sequence:
APP_NAME="unitedwerise-backend"
RESOURCE_GROUP="unitedwerise-rg"

# 1. Check status
az containerapp revision list -n $APP_NAME -g $RESOURCE_GROUP -o table
az containerapp ingress traffic show -n $APP_NAME -g $RESOURCE_GROUP

# 2. Force traffic to latest revision
az containerapp ingress traffic set -n $APP_NAME -g $RESOURCE_GROUP --revision-weight latest=100

# 3. If needed, restart active revision
ACTIVE_REV=$(az containerapp revision list -n $APP_NAME -g $RESOURCE_GROUP --query "[?active].name" -o tsv)
az containerapp revision restart -n $APP_NAME -g $RESOURCE_GROUP --revision $ACTIVE_REV

# 4. Force new revision if above fails
az containerapp update -n $APP_NAME -g $RESOURCE_GROUP --set-env-vars "DEPLOY_TIMESTAMP=$(date +%s)"
```
**SUCCESS INDICATORS**: Backend uptime drops to minutes, console shows new debug messages
**FULL PROTOCOL**: See `docs-archive-2025-08-15/AZURE_CONTAINER_APPS_DEPLOYMENT_PROTOCOL.md` for comprehensive troubleshooting

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
1. **ALWAYS verify TypeScript compilation** when debugging route loading issues
   - Command: `cd backend && npm run build` - must complete without errors
   - Symptom: All API routes return 404 even for basic endpoints
   - Common Errors: Field name mismatches, object property issues

2. **Check database schema field names** when working with Prisma models
   - Use: `grep -A 15 "model ModelName" backend/prisma/schema.prisma`
   - Fix: Update field references to match actual schema

3. **Dynamic Date Issues**: Avoid using relative date calculations like `new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)`
   - Problem: Creates "rolling" dates that change each time API is called
   - Solution: Use fixed historical dates like `new Date('2025-08-19T10:30:00.000Z')`

4. **Deploy with forced revision** if Docker build encounters encoding errors
   - Azure CLI Unicode issues: Use environment variable update to force new revision
   - Command: `az containerapp update --name app-name --resource-group rg-name --set-env-vars "DEPLOY_TIMESTAMP=$(date -u +%Y%m%d%H%M%S)"`

5. **Verify deployment success** by checking backend uptime
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
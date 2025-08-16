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

# News Aggregation (Optional)
NEWS_API_KEY=your_newsapi_key_here
THE_NEWS_API_KEY=your_thenewsapi_key_here
```

---

## Development Workflow Rules

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

### Frontend Development Patterns  
- Component state: Check `localStorage` vs `window` properties for auth state
- API caching: Use `bypassCache: true` for fresh data
- Sticky positioning: Account for parent container positioning and padding

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
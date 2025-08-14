# Claude Code Development Reference

## 🤖 Azure AI Integration - LIVE & OPERATIONAL

### Production Deployment Status
- **Backend**: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io
- **Frontend**: https://www.unitedwerise.org (https://yellow-mud-043d1ca0f.2.azurestaticapps.net)
- **Azure OpenAI**: https://unitedwerise-openai.openai.azure.com/
- **Status**: ✅ All services operational

### ✅ RESOLVED: Login Persistence Authentication System

**Status**: ✅ **FIXED** - Login persistence now works correctly across page refreshes

**Final Root Cause**: Response data structure mismatch in batch initialization
- Backend returns: `{success: true, data: {user: {...}}}`
- apiCall wrapper adds: `{ok: true, data: {backend response}}`
- Code was checking `initData.success` instead of `initData.data.success`
- Result: API calls succeeded but login state was never set

**Complete Fix History** (commits b8d461b, 8ee2906, 7391a48):

1. **Auth Token Synchronization** - Fixed mismatch between `window.authToken` and global `authToken` variables
2. **Global Fetch Handler Interference** - Prevented backend-integration.js from clearing tokens during initialization 
3. **Response Data Structure** - Corrected data access path for batch initialization success condition

**Critical Lessons Learned**:
- ⚠️ **Multiple auth token variables**: Both `window.authToken` and global `authToken` must be synchronized
- ⚠️ **Global fetch wrappers**: Can interfere with app initialization - exclude initialization endpoints
- ⚠️ **API response structure**: Always verify data access paths match actual response structure
- ⚠️ **Debug systematically**: Add logging at each step to isolate where the flow breaks

**Authentication Flow Verification**:
```javascript
// Verify these debug messages appear on refresh:
// 🔄 About to call /batch/initialize with token: EXISTS
// 🔄 Received response from /batch/initialize: {ok: true, status: 200, data: {...}}
// ✅ Batch initialization successful
// ✅ Logged in state set for: [username]
```

**Files Modified**:
- `frontend/src/js/app-initialization.js`: Token sync, response parsing, debug logging
- `frontend/src/integrations/backend-integration.js`: Prevented auth handler interference

### Azure AI Features
- **Embedding Model**: text-embedding-ada-002 (1536 dimensions)
- **Chat Model**: gpt-35-turbo (topic analysis & summaries)
- **Vector Storage**: Float[] arrays in PostgreSQL (Azure PostgreSQL Flexible Server)
- **Similarity Threshold**: 60% (captures opposing viewpoints for balanced discourse)
- **Provider**: Azure OpenAI (production), Local transformers (fallback)

### Key Environment Variables (Production)
```
AZURE_OPENAI_ENDPOINT=https://unitedwerise-openai.openai.azure.com/
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-35-turbo
ENABLE_SEMANTIC_TOPICS=true
SEMANTIC_PROVIDER=azure
SIMILARITY_THRESHOLD=0.60
```

### Semantic Features Live
1. **Topic Discovery**: Real-time clustering of political discussions
2. **Smart Feeds**: Vector similarity-based content recommendations  
3. **Trending Analysis**: AI-generated summaries of political conversations
4. **Opposing Viewpoints**: 60% threshold captures both sides of issues

### API Endpoints for AI Features
- `GET /api/topics/trending` - AI-analyzed trending political topics
- `POST /api/topics/analyze/recent` - Trigger topic discovery (auth required)
- `POST /api/feedback/analyze` - Content analysis (admin only)
- `GET /health` - Backend health including Azure OpenAI status

### Admin Dashboard & Monitoring - NEW ✨
- **Dashboard URL**: https://www.unitedwerise.org/admin-dashboard.html
- **Current Status**: ✅ Operational with comprehensive monitoring
- **System Health**: Error rate improved from 4.05% to 3.57% (11.8% reduction)

#### Admin API Endpoints (Auth Required)
- `GET /api/admin/dashboard` - Overview statistics and system health
- `GET /api/admin/errors?severity=all&timeframe=24h` - Error tracking with filtering
- `GET /api/admin/ai-insights/suggestions` - User suggestions and feedback analysis
- `GET /api/admin/ai-insights/analysis` - AI content analysis results
- `GET /api/admin/security/stats` - Security metrics and threat detection
- `GET /api/admin/security/events` - Security event log with risk scoring
- `GET /api/admin/users` - User management with advanced filtering
- `GET /api/admin/analytics` - Platform analytics and growth metrics

#### Admin Console Debugging Tools
**In Dashboard Console** (auto-loaded at admin-dashboard.html):
```javascript
adminConsole.getSuggestions('features', 'new')  // Filter suggestions
adminConsole.getErrors('critical', '7d')        // Error analysis
adminConsole.getHealth()                        // System health
adminConsole.testAll()                          // Test all endpoints
adminConsole.help()                             // Show all commands
```

**Standalone Console Helper** (any page):
```javascript
// Load helper first
const script = document.createElement('script');
script.src = '/admin-console-helper.js';
document.head.appendChild(script);

// Then use commands
adminHelper.analyze()                           // Full system analysis
adminHelper.suggestions('ui_ux', 'reviewed')    // Filtered suggestions
adminHelper.health()                            // Quick health check
adminHelper.help()                              // Show commands
```

#### Dashboard Features
1. **📊 Overview**: User stats, system health, error rates
2. **🔒 Security**: Failed logins, risk events, security score
3. **👥 Users**: User management, suspensions, role assignments
4. **📝 Content**: Flagged content moderation
5. **📈 Analytics**: Growth metrics, report breakdowns
6. **🐛 Errors**: Error tracking with severity and trend analysis
7. **🤖 AI Insights**: User suggestions and AI content analysis
8. **⚙️ System**: Infrastructure monitoring and configuration

---

## CSS Positioning Troubleshooting Cheat Sheet

### Sticky/Fixed Element Positioning Issues

When an element isn't positioning correctly (too high/low), follow this systematic approach:

#### 1. Identify Container Hierarchy
```bash
# Find the element in HTML files
grep -r "class.*element-name" frontend/
# Trace parent containers from the element outward
```

#### 2. Analyze Each Container's CSS Impact
For each parent container, check these properties that affect positioning:
- `position: fixed/relative/absolute/sticky`
- `top/bottom/left/right` values
- `padding` (all sides, especially top for vertical issues)
- `margin` (all sides, especially top for vertical issues)
- `transform` properties (can create new stacking contexts)

#### 3. Calculate Total Offset
Add up all positioning values from viewport to target element:
```css
/* Example calculation for sticky element too low: */
.parent-container { top: 6vh; padding: 2rem; }
.tab-section { margin-bottom: 2rem; }
/* Total offset = 6vh + 2rem + 2rem = 6vh + 4rem */

/* Solution: Compensate with negative positioning */
.sticky-element.sticky { 
    top: calc(-6vh - 4rem); 
}
```

#### 4. Common CSS Properties That Affect Positioning
- **Viewport units**: `vh`, `vw` (responsive to screen size)
- **Fixed units**: `px`, `rem`, `em`
- **Container properties**: `box-sizing`, `overflow`
- **Flexbox/Grid**: Can change element flow

#### 5. Testing Approach
1. Use browser dev tools to inspect computed styles
2. Temporarily add bright background colors to identify container boundaries
3. Test on different screen sizes (viewport units behave differently)

---

## Common Project Patterns

### Backend Development
- Always run `npx prisma generate` after schema changes
- Check imports: `QwenService` not `qwenService`, `EmbeddingService` not `embeddingService`
- Database migrations: Use `npx prisma db execute --file path --schema prisma/schema.prisma`

### Frontend Development
- Component state: Check `localStorage` vs `window` properties for auth state
- API caching: Use `bypassCache: true` for fresh data
- Sticky positioning: Account for parent container positioning and padding

### UI Navigation System
- **Window Toggle Behavior**: All main windows (Profile, Messages, Sidebar panels) now have toggle functionality
  - First click opens the window, second click closes and returns to default view
  - Default view is My Feed for logged-in users, map/welcome for logged-out users
- **Sidebar Toggle Button**: Positioned at sidebar edge with directional arrows (▶/◀)
  - Dark gray arrows (#2c2c2c) for contrast against olive green sidebar and greige backgrounds
  - Button moves dynamically with sidebar expansion (3vw → 10vw on desktop)
  - Hidden on mobile where sidebar is not used

### Vector Similarity & Feedback Analysis
- **Qdrant Integration**: All posts stored with 384-dimensional embeddings for similarity search
- **Multi-stage Analysis**: Keywords (20%) + Qdrant similarity (50%) + AI analysis (30%)
- **Feedback Detection**: Compares new posts against existing feedback database using cosine similarity
- **Graceful Fallback**: Falls back to in-memory vectors → keywords → AI if services unavailable

### Semantic Topic Discovery & Navigation System
- **Topic Clustering**: Groups similar posts using vector similarity clustering
- **AI Summarization**: Qwen3 generates prevailing positions and leading critiques for each topic
- **Topic Navigation**: Users can enter/exit topic-filtered conversation modes
- **Map Integration**: Topics displayed as conversation bubbles on geographical map
- **Trending System**: Enhanced existing trending panel with semantic topic cards
- **Content Flow**: 
  - Discovery → Preview → Topic Mode → Filtered Posts → Exit to Algorithm Feed
- **API Endpoints**:
  - `GET /api/topic-navigation/trending` - Discover trending topics
  - `POST /api/topic-navigation/enter/:topicId` - Enter topic mode
  - `POST /api/topic-navigation/exit` - Return to main feed
  - `GET /api/topic-navigation/:topicId/posts` - Get topic posts

### Authentication System Architecture

**Critical Components**:

1. **Token Storage**: 
   - `localStorage.authToken` - Persistent JWT token
   - `window.authToken` - Runtime token for window scope
   - `authToken` - Global variable for legacy compatibility

2. **Initialization Flow**:
   - `app-initialization.js` - Primary auth initialization system
   - `backend-integration.js` - Global fetch wrapper with auth error handling
   - `index.html` - Contains legacy auth functions and apiCall wrapper

3. **API Response Structure**:
   ```javascript
   // Backend returns:
   {success: true, data: {user: {...}, notifications: 0, posts: [...]}}
   
   // apiCall wraps as:
   {ok: true, status: 200, data: {success: true, data: {...}}}
   
   // Always access: response.data.data.user (not response.data.user)
   ```

4. **Auth State Management**:
   - `setLoggedInState()` - Sets UI to logged in state
   - `setLoggedOutState()` - Clears tokens and sets logged out UI
   - `clearAuthAndSetLoggedOut()` - Complete logout with cache clearing

**⚠️ CRITICAL RULES**:
- **Always sync all auth token variables** when setting/clearing
- **Never clear tokens during initialization** - let fallbacks handle errors
- **Check response.data.data.success** not response.success for batch endpoints
- **Exclude initialization endpoints** from global auth error handling

### File Structure
```
backend/
├── src/
│   ├── routes/ (API endpoints)
│   │   └── batch.ts (Batch initialization endpoint)
│   ├── services/ (Business logic)
│   ├── middleware/ (Auth, validation, etc.)
│   └── utils/ (Helper functions)
frontend/
├── src/
│   ├── components/ (Reusable UI components)
│   ├── styles/ (CSS files)
│   ├── js/ (Utility functions)
│   │   └── app-initialization.js (Primary auth system)
│   └── integrations/
│       └── backend-integration.js (Global fetch wrapper)
```

---

## AI Services Setup

### Required API Keys and Services:

1. **Hugging Face API Key** (Free):
   - Go to https://huggingface.co/settings/tokens
   - Create new token with "Read" permission
   - Add to `.env`: `HUGGINGFACE_API_KEY="hf_your_token_here"`

2. **Qdrant Vector Database** (Local setup):
   ```bash
   # Option A: Docker (Recommended)
   docker run -p 6333:6333 qdrant/qdrant
   
   # Option B: Direct install
   # Download from: https://github.com/qdrant/qdrant/releases
   ```

3. **Qwen3 AI Model** (Choose one):
   
   **Option A: Local Ollama (Free)**:
   ```bash
   # Install Ollama: https://ollama.ai/
   ollama pull qwen2.5:7b
   ollama serve
   # Use: QWEN3_API_URL="http://localhost:11434/v1"
   ```
   
   **Option B: OpenAI API**:
   ```bash
   # Get API key from: https://platform.openai.com/
   # Use: QWEN3_API_URL="https://api.openai.com/v1"
   ```

### Testing Services:
```bash
# Test Qdrant connection
curl http://localhost:6333/health

# Test Ollama
curl http://localhost:11434/api/version

# Test embeddings endpoint
curl -X POST http://localhost:3001/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"content": "Test post", "isPolitical": true}'

# Test topic discovery
curl http://localhost:3001/api/topic-navigation/trending
```

## Debugging Commands

### Authentication Troubleshooting (CRITICAL)

**If login doesn't persist after refresh:**

1. **Check localStorage tokens**:
```javascript
// In browser console:
localStorage.getItem('authToken')  // Should return JWT string
localStorage.getItem('currentUser') // Should return user JSON
```

2. **Verify auth token variables**:
```javascript
// In browser console:
window.authToken    // Should match localStorage
authToken          // Global variable should match
```

3. **Check initialization debug logs**:
```javascript
// Look for these console messages on refresh:
// 🔄 About to call /batch/initialize with token: EXISTS
// 🔄 Received response from /batch/initialize: {ok: true, status: 200, data: {...}}
// ✅ Batch initialization successful
```

4. **Common Auth Issues & Fixes**:
- **No token in localStorage**: User needs to log in again  
- **Token exists but variables don't match**: Auth token sync issue
- **API call succeeds but no login state**: Response parsing problem
- **Global fetch wrapper clearing tokens**: Check backend-integration.js interference

5. **Debug localStorage clearing**:
```bash
# Find what's removing tokens:
grep -r "localStorage.removeItem.*authToken" frontend/
```

6. **Test auth endpoints manually**:
```javascript
// Test batch endpoint:
fetch('/api/batch/initialize', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
}).then(r => r.json()).then(console.log)
```

### General Development Debugging

### Find CSS class usage:
```bash
grep -r "class-name" frontend/
```

### Find specific CSS properties:
```bash
grep -A5 -B5 "property-name" frontend/src/styles/main.css
```

### Check for TypeScript compilation issues:
```bash
cd backend && npm run build
```

### Test API connectivity:
```bash
cd backend && npm run dev
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

### UI Toggle Implementation (New):
**Files Modified:**
- `frontend/index.html`: Added `toggleMyProfile()`, `showDefaultView()`, updated sidebar toggle
- `frontend/src/styles/main.css`: Sidebar font sizes, edge toggle button positioning
- `frontend/src/styles/responsive.css`: Mobile/tablet responsive positioning
- `frontend/src/js/mobile-navigation.js`: Updated mobile profile handling

**Key Functions:**
- `toggleMyProfile()`: Profile window toggle with state detection
- `showDefaultView()`: Returns to My Feed/map when windows closed
- `toggleMessages()`, `togglePanel()`: Updated with default view return
- Sidebar toggle: Edge-positioned button with dynamic arrow direction
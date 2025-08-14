# Claude Code Development Reference

## 🤖 Azure AI Integration - LIVE & OPERATIONAL

### Production Deployment Status
- **Backend**: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io
- **Frontend**: https://www.unitedwerise.org (https://yellow-mud-043d1ca0f.2.azurestaticapps.net)
- **Azure OpenAI**: https://unitedwerise-openai.openai.azure.com/
- **Status**: ✅ All services operational

### 🎉 CURRENT STATUS: Comprehensive Photo/GIF Upload System

**Backend Status**: ✅ **READY FOR DEPLOYMENT** - Complete media upload system with GIF support
**Frontend Status**: ✅ **READY FOR DEPLOYMENT** - Full photo gallery and post attachment system
**Database Status**: 🚨 **SCHEMA UPDATE REQUIRED** - Prisma regeneration needed for POST_MEDIA type

**Recently Completed (Ready for Deployment)**:
- ✅ **IMPLEMENTED**: Full photo/GIF upload system with animation preservation
- ✅ **IMPLEMENTED**: Post media attachments with preview and full-screen viewer
- ✅ **IMPLEMENTED**: Photo gallery management with folder organization
- ✅ **IMPLEMENTED**: 100MB account storage limits with quota tracking
- ✅ **IMPLEMENTED**: Content moderation framework for uploaded media
- 🚨 **DEPLOYMENT NEEDED**: Database schema changes + backend deployment + Prisma regen

**System Overview**: Complete media upload system supporting photos and animated GIFs with gallery management

**Core Features Deployed**:
1. **Reputation Scoring (0-100)** - Starting score 70, behavioral focus not content censorship
2. **AI Content Analysis** - Azure OpenAI powered hate speech, harassment, and spam detection  
3. **Democratic Penalties** - Community reporting with automated and manual validation
4. **Appeals System** - AI-powered appeals review with admin escalation
5. **Feed Algorithm Integration** - Visibility multipliers based on reputation tiers
6. **Visual Badge System** - Green (95+), Yellow (30-49), Brown (0-29), None (50-94)

**Penalty Structure**:
- Hate Speech: -10 points | Harassment: -8 points | Spam: -2 points
- Excessive Profanity: -3 points | Personal Attacks: -1 point
- Per-post caps prevent pile-on attacks | Daily gain limit: +2 points max

**Algorithmic Effects**:
- 95+ reputation: +10% visibility boost (1.1x multiplier)
- 50-94 reputation: Normal visibility (1.0x multiplier)  
- 30-49 reputation: -10% visibility (0.9x multiplier)
- 0-29 reputation: -20% visibility (0.8x multiplier)

**Database Schema Deployed**:
- `ReputationEvent` model with full audit trail
- User reputation scores with update timestamps
- Post-level reputation caching for performance

**API Endpoints Live**:
- `GET /api/reputation/user/:userId` - Get user reputation score
- `POST /api/reputation/report` - Community reporting system
- `GET /api/reputation/appeals/:userId` - Appeals management
- `GET /api/reputation/admin/stats` - Admin analytics dashboard
- `GET /api/reputation/health` - System health monitoring

**Files Deployed**:
- `backend/src/services/reputationService.ts` (686 lines) - Core reputation logic
- `backend/src/routes/reputation.ts` (398 lines) - Complete API endpoints
- `backend/src/middleware/reputationWarning.ts` (198 lines) - Content warnings
- `frontend/src/js/reputation-badges.js` (208 lines) - Badge display system
- `frontend/src/js/reputation-integration.js` (166 lines) - Frontend integration
- `backend/prisma/schema.prisma` - ReputationEvent model added

### ✅ DEPLOYED: Deployment Status Monitoring System

**Status**: ✅ **LIVE & OPERATIONAL** - Real-time deployment tracking across all components

**Features Deployed**:
1. **Console Monitoring** - Automatic status checks every 30 seconds in browser console
2. **Component Tracking** - Frontend build times, backend uptime, database migrations
3. **Health Endpoints** - `/health`, `/health/deployment`, `/health/database`
4. **Manual Commands** - `deploymentStatus.check()`, `deploymentStatus.getStatus()`
5. **Response Time Monitoring** - Performance tracking with slow response warnings
6. **Deployment Scripts** - Automated timestamp tracking for build identification

**Tracking Components**:
- **Frontend**: Build time, cache status, schema version compatibility
- **Backend**: Server uptime, last restart, deployment count, version info  
- **Database**: Connection status, migration timestamps, schema version
- **Services**: Reputation system, batch API, AI services availability

**Console Commands Available**:
```javascript
deploymentStatus.check()           // Manual status check
deploymentStatus.getStatus()       // Get last known status  
deploymentStatus.checkBackend()    // Backend-specific check
deploymentStatus.checkDatabase()   // Database-specific check
deploymentStatus.checkReputation() // Reputation system check
```

**Files Deployed**:
- `frontend/src/js/deployment-status.js` (300+ lines) - Core monitoring system
- `backend/src/routes/health.ts` (200+ lines) - Health endpoints
- `backend/scripts/update-deployment.js` - Deployment timestamp tracking
- `frontend/build-timestamp.js` - Frontend build tracking

### 🎉 NEW FEATURE: Comprehensive Photo/GIF Upload System

**Status**: ✅ **READY FOR DEPLOYMENT** - Complete media upload system integrated

**Features Implemented**:

**Core Upload System**:
- **Multi-Format Support**: JPEG, PNG, WebP, GIF (with animation preservation)
- **Size Management**: 10MB limit for images, 5MB for GIFs, 100MB per account
- **Smart Processing**: Auto-resize, WebP conversion (except GIFs), thumbnail generation
- **Content Moderation**: Basic filtering with extensible AI framework

**Photo Gallery Management**:
- **Gallery Organization**: Folder system with custom categories ("My Photos", "Events", etc.)
- **Profile Integration**: Select any gallery photo as profile picture
- **Storage Tracking**: Real-time quota display with cleanup options
- **Bulk Operations**: Multi-select upload, gallery management

**Post Media Attachments**:
- **Seamless Integration**: Attach photos/GIFs directly in post composer
- **Preview System**: See media before posting with removal option
- **Display Enhancement**: Click-to-expand full-screen media viewer
- **GIF Support**: Animated GIFs with special badges and preservation

**Technical Implementation**:

**Backend Extensions**:
- `PhotoService.ts`: GIF processing, storage limits, POST_MEDIA type support
- `posts.ts` routes: Media attachment validation and linking
- `photos.ts` routes: Gallery management, profile picture selection
- Database schema: POST_MEDIA enum, postId linking, gallery organization

**Frontend Integration**:
- `PostComponent.js`: Media display with full-screen viewer capability
- `MyProfile.js`: Complete photo gallery management interface
- Post composer: Media upload with preview and validation
- CSS enhancements: Media styling, viewer overlay, upload interfaces

**API Endpoints**:
- `POST /api/photos/upload` - Upload with type (AVATAR, GALLERY, POST_MEDIA)
- `GET /api/photos/galleries` - Organized gallery view with storage stats
- `PUT /api/photos/:id/gallery` - Move between galleries
- `POST /api/photos/:id/set-profile` - Set as profile picture
- Enhanced post routes include attached photos in responses

**🚨 Deployment Requirements**:
1. **Database Schema Update**: `npx prisma generate && npx prisma migrate deploy`
2. **Backend Restart**: Deploy updated routes and services
3. **Frontend Deployment**: Updated components and styles
4. **Storage Directory**: Ensure `/uploads/photos` and `/uploads/thumbnails` exist

### ✅ RESOLVED: Login Persistence Authentication System

**Status**: ✅ **FIXED** - Login persistence works correctly across page refreshes (Previous issue)

### ✅ DEPLOYED: Enhanced Topic-Centric Trending System

**Status**: ✅ **FULLY OPERATIONAL** - AI-powered topic discovery with My Feed integration

**Major Update**: Trending system completely revamped from post-based to AI topic-based approach with geographic intelligence

**New Features Deployed**:
1. **AI Topic Discovery**: Replaces trending POSTS with AI-synthesized TOPICS
2. **My Feed Integration**: Topics clickable to filter entire feed experience  
3. **Map Synchronization**: Speech bubbles show same AI topics as trending panels
4. **Geographic Layering**: National view with 45-60 second state/local topic injection
5. **Enhanced User Experience**: Rich topic cards with prevailing positions and critiques

**Technical Implementation**:
- **API Integration**: `/api/topic-navigation/trending`, `/enter/{topicId}`, `/exit`
- **Fallback Systems**: Post-based trending if AI topics unavailable
- **Performance**: 2-minute topic cache, geographic balancing timer
- **Cross-Compatibility**: Works with both MapLibre and Leaflet map systems
- **User-Aware**: Leverages user geographic data for contextual topics

**User Flow**:
1. **Discovery**: AI topics appear in trending panels and map bubbles
2. **Selection**: Click topic to enter filtered mode
3. **Feed Filtering**: My Feed shows only topic-related posts
4. **Context**: Rich topic header with prevailing position and leading critique
5. **Exit**: Easy return to algorithm-based feed

**Geographic Intelligence**:
- **National View**: Primarily national topics with periodic local injection
- **Balanced Timing**: State/local topics every 45-60 seconds for geographic diversity
- **State/Local Views**: Context-appropriate topic distribution
- **Geographic Labels**: Topics tagged with [State Local], [Regional] indicators

**Files Modified**:
- `frontend/index.html`: Complete trending system overhaul (500+ lines)
- Enhanced trending panels (mini and sidebar)
- Map bubble synchronization with AI topics
- Topic mode My Feed integration
- Geographic layering system

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

### 🤝 Follow/Friend Relationship System ✨

**Status**: ✅ **FULLY IMPLEMENTED** - Complete follow/friend system with reusable architecture

**System Overview**: Dual relationship model with one-way following for content discovery and bidirectional friendships for private messaging and enhanced interactions.

**Core Features**:
1. **Follow System**: One-way algorithmic following for content curation in feeds
2. **Friend System**: Bidirectional relationships with request/accept workflow for private messaging  
3. **Reusable Architecture**: Service layer and UI components work across all contexts
4. **Real-time Updates**: Event-driven UI synchronization across relationship contexts
5. **Privacy Controls**: Friend-only messaging, content visibility based on relationships
6. **Bulk Operations**: Efficient status checks for user lists and feeds

**Database Schema**:
- **`Follow` model**: Existing one-way follow relationships with follower/following counts
- **`Friendship` model**: New bidirectional friendship system with status workflow (PENDING/ACCEPTED/REJECTED/BLOCKED)
- **Enhanced notifications**: Added FRIEND_REQUEST and FRIEND_ACCEPTED notification types

**Backend Services (`/api/relationships/`)**:
- **`FollowService`**: Complete follow/unfollow with atomic transactions and notifications
- **`FriendService`**: Friend request workflow (send/accept/reject/remove) with validation
- **`RelationshipUtils`**: Combined utilities, suggestions, and bulk operations
- **Bulk endpoints**: Efficient status checks for multiple users simultaneously

**Frontend Components**:
- **`relationship-utils.js`**: Core utilities for follow/friend actions across any UI context
- **`user-relationship-display.js`**: Reusable component for relationship status and controls
- **Event-driven architecture**: Real-time UI updates via custom events

**API Endpoints**:
- **Follow**: `POST/DELETE /api/relationships/follow/:userId`, `GET /api/relationships/follow-status/:userId`
- **Friends**: `POST /api/relationships/friend-request/:userId`, `POST /api/relationships/friend-request/:userId/accept`
- **Lists**: `GET /api/relationships/:userId/followers`, `GET /api/relationships/:userId/friends`
- **Bulk**: `POST /api/relationships/bulk/follow-status`, `POST /api/relationships/bulk/friend-status`
- **Combined**: `GET /api/relationships/status/:userId` - comprehensive relationship status
- **Suggestions**: `GET /api/relationships/suggestions/follow` - mutual connection recommendations

**Usage Examples**:
```javascript
// Quick follow toggle anywhere in the UI
await FollowUtils.toggleFollow(userId, currentlyFollowing);

// Create relationship buttons for any user context
const container = document.getElementById('user-actions');
addRelationshipDisplay(userId, container, { size: 'sm', inline: true });

// Bulk status for user lists (efficient for feeds)
const statusMap = await FollowService.getBulkFollowStatus(currentUserId, userIds);

// Friend request workflow
await FriendUtils.sendFriendRequest(userId);
await FriendUtils.acceptFriendRequest(userId);
```

**Files Implemented**:
- `backend/src/services/relationshipService.ts` (400+ lines) - Complete service layer
- `backend/src/routes/relationships.ts` (300+ lines) - All API endpoints  
- `frontend/src/js/relationship-utils.js` (400+ lines) - Core utilities
- `frontend/src/components/user-relationship-display.js` (250+ lines) - Reusable UI component
- `backend/migrations/friendship-system-migration.sql` - Production-safe database migration

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

## Feedback System Optimization (NEW) 🚀

### **Performance Enhancement - Async Analysis**:
**Problem**: Post creation was slow (2-3 seconds) due to blocking AI analysis
**Solution**: Implemented async non-blocking feedback detection

**Files Modified:**
- `backend/src/routes/posts.ts`: Async feedback analysis after post creation
- `backend/src/services/feedbackAnalysisService.ts`: Added `analyzePostAsync()` and `performQuickKeywordCheck()`
- `backend/src/routes/admin.ts`: Connected to real database instead of mock data

**Performance Gains:**
- Post creation: 2-3 seconds → **Instant** (<100ms)
- Background AI analysis updates posts with feedback metadata
- Graceful error handling - failures don't block posts

**Flow:**
```
1. User creates post → Quick keyword check (1ms)
2. Post saved immediately → User gets instant response
3. Background: Full AI analysis → Updates post with feedback data
4. Admin console shows real feedback from database
```

**Deployment Status**: Committed (e507649, ac59a17), pending Azure Container Apps deployment

### **Real User Feedback in Admin Console**:
**Problem**: Admin dashboard showed only mock data examples
**Solution**: Connected `/api/admin/ai-insights/suggestions` to real feedback database

**Enhanced Detection Keywords**: Added patterns for UI/UX feedback:
- "shouldn't be able to", "should just", "infinite scroll", "feed should"
- Better detection of suggestions like "You shouldn't be able to scroll to the end"

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

### Feedback Not Appearing in Admin Console:
1. Check if Azure deployment completed: `deploymentStatus.check()` in browser console
2. Look for backend uptime change (indicates new deployment)
3. Check posts table: `SELECT COUNT(*) FROM "Post" WHERE "containsFeedback" = true`
4. Test with new feedback posts after deployment

### UI Toggle Implementation:
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
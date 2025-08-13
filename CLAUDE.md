# Claude Code Development Reference

## 🤖 Azure AI Integration - LIVE & OPERATIONAL

### Production Deployment Status
- **Backend**: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io
- **Frontend**: https://www.unitedwerise.org (https://yellow-mud-043d1ca0f.2.azurestaticapps.net)
- **Azure OpenAI**: https://unitedwerise-openai.openai.azure.com/
- **Status**: ✅ All services operational

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

### File Structure
```
backend/
├── src/
│   ├── routes/ (API endpoints)
│   ├── services/ (Business logic)
│   ├── middleware/ (Auth, validation, etc.)
│   └── utils/ (Helper functions)
frontend/
├── src/
│   ├── components/ (Reusable UI components)
│   ├── styles/ (CSS files)
│   └── js/ (Utility functions)
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
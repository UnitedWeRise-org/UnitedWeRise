# United We Rise - Project Summary (Updated August 2025)

## Overview
United We Rise is a political social media platform that connects candidates, elected officials, and citizens. Originally designed as a single HTML file application, it has evolved into a comprehensive full-stack platform with modern architecture and extensive features.

## 🏗️ Current Architecture

### Backend Stack (✅ Production Ready)
- **Framework**: Node.js + Express + TypeScript
- **Database**: PostgreSQL via Azure Flexible Server (previously Neon.tech)
- **ORM**: Prisma with comprehensive schema
- **Authentication**: JWT tokens with bcrypt password hashing
- **Real-time**: Socket.IO WebSockets for messaging
- **Geospatial**: H3 indexing for voting districts
- **APIs**: RESTful endpoints + WebSocket events
- **Hosting**: Azure Container Apps with auto-scaling
- **Security**: Rate limiting, CORS, input validation, moderation

### Frontend Stack (✅ Modernized)
- **Architecture**: Multi-component JavaScript modules
- **Hosting**: Azure Static Web Apps
- **UI Framework**: Vanilla JavaScript with modular components
- **Maps**: Leaflet integration with political overlays
- **Real-time**: WebSocket integration for messaging
- **Responsive**: Mobile-first design with adaptive layouts

### Cloud Infrastructure (✅ Azure-based)
- **Backend**: Azure Container Apps with auto-scaling
- **Frontend**: Azure Static Web Apps with CDN
- **Database**: Azure PostgreSQL Flexible Server
- **Container Registry**: Azure Container Registry
- **CI/CD**: GitHub Actions with automated deployment
- **Custom Domain**: www.unitedwerise.org (configured)

## 🗄️ Database Schema (Enhanced)

### Core Models
```typescript
User {
  id, email, username, password, profile info
  politicalType, address, H3Index
  verification status, follower counts
  onboarding progress, moderation status
}

Post {
  id, content, imageUrl, authorId
  isPolitical, tags, embedding (vector search)
  topic relationships, like/comment counts
}

// Enhanced Models Added
Topic          // AI-powered topic classification
TopicPost      // Many-to-many topic-post relationships
Candidate      // Enhanced candidate profiles with positions
Election       // Election data with office information
CandidateMessage // Direct citizen-candidate communication
Follow         // One-way following for content discovery
Friendship     // Bidirectional friendship system with status workflow
Notification   // Enhanced with friend request notifications
Photo          // Profile/campaign photo management
Onboarding     // Guided user onboarding system
```

### Advanced Features
- **AI Integration**: Qwen3 LLM for content analysis
- **Vector Search**: Sentence embeddings via Qdrant
- **Content Moderation**: Automated + manual review
- **Campaign Management**: Enhanced candidate tools
- **Topic Analysis**: AI-powered political topic detection

## 🚀 API Endpoints (Comprehensive)

### Authentication & Users (/api/auth, /api/users)
- ✅ Registration/Login with validation
- ✅ Profile management with political info
- ✅ Password reset functionality  
- ✅ User search and following system
- ✅ Verification system for candidates/officials

### Enhanced Political Features (/api/candidates, /api/elections)
- ✅ Candidate profile management
- ✅ Election data integration
- ✅ Position statements and stances
- ✅ Enhanced candidate comparison tools
- ✅ Public Q&A system for candidates

### Messaging & Communication (/api/messages, /api/candidate-messages)
- ✅ Direct messaging between users
- ✅ Candidate-citizen communication portal
- ✅ Real-time WebSocket messaging
- ✅ Message threading and management

### Content & Moderation (/api/posts, /api/feed, /api/topics)
- ✅ Post creation and management
- ✅ Like/comment system
- ✅ Trending posts algorithm
- ✅ AI-powered topic analysis
- ✅ Content moderation pipeline

### Onboarding & User Experience (/api/onboarding)
- ✅ Guided user onboarding flow
- ✅ Progressive profile completion
- ✅ Interest-based content personalization
- ✅ Location-based representative discovery

### Photo & Media Management (/api/photos)
- ✅ Profile photo upload and processing
- ✅ Campaign photo management
- ✅ Thumbnail generation
- ✅ Azure Blob Storage integration

## 💻 Frontend Features (Modernized)

### Component Architecture
```
frontend/
├── src/
│   ├── components/          # Modular UI components
│   │   ├── CandidateSystem.js
│   │   ├── OnboardingFlow.js
│   │   ├── VerificationFlow.js
│   │   └── ContentReporting.js
│   ├── integrations/        # System integrations
│   │   ├── backend-integration.js
│   │   ├── candidate-system-integration.js
│   │   └── elections-system-integration.js
│   └── styles/              # Component-specific styling
└── index.html               # Main application entry
```

### Working Features
- ✅ **Advanced Feed Algorithm**: Probability cloud-based personalized content discovery
- ✅ **My Feed Interface**: Dedicated scrollable feed with intelligent content mixing
- ✅ **My Profile System**: Comprehensive profile management with tabbed interface
- ✅ **Enhanced Authentication**: Modal-based login/register with validation
- ✅ **Candidate Discovery**: Advanced candidate search and comparison
- ✅ **Follow/Friend System**: Complete relationship management with reusable UI components
- ✅ **Real-time Updates**: Event-driven UI synchronization for relationship changes
- ✅ **Interactive Elections**: Upcoming elections with candidate information
- ✅ **Official Lookup**: Find representatives by location
- ✅ **Real-time Messaging**: Direct communication with candidates
- ✅ **Content Feed**: Personalized political content streams
- ✅ **Interactive Map**: Political boundary visualization
- ✅ **Onboarding System**: Guided user setup and preferences
- ✅ **Responsive Design**: Mobile-optimized interface
- ✅ **Progressive Enhancement**: Works without JavaScript for accessibility

### UI/UX Improvements
- **Modern Design**: Clean, accessible interface design
- **Mobile-First**: Responsive layouts for all screen sizes
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Performance**: Optimized loading with lazy loading and caching
- **Real-time Updates**: Live content updates without page refresh
- **Toggle Navigation**: Consistent window toggle behavior across all interfaces
- **Edge-Positioned Controls**: Sidebar toggle button with directional arrows
- **Reduced Visual Clutter**: Smaller sidebar fonts for better proportion

## 🔧 Recent Major Updates (August 2025)

### Infrastructure Modernization
- **Azure Migration**: Complete migration from development to production Azure infrastructure
- **Auto-scaling**: Implemented container auto-scaling for high availability
- **CI/CD Pipeline**: Automated deployment via GitHub Actions
- **Security Hardening**: Rate limiting, CORS policies, input sanitization

### Feature Enhancements
- **AI Integration**: Added Qwen3 LLM for intelligent content analysis
- **Vector Search**: Implemented semantic search via Qdrant
- **Enhanced Candidates**: Comprehensive candidate management system
- **Photo System**: Professional photo management for candidates
- **Onboarding Flow**: Guided user experience for new users

### Technical Improvements  
- **Error Handling**: Comprehensive error handling and user feedback
- **API Documentation**: Complete Swagger documentation
- **Testing Coverage**: Automated testing for critical features
- **Performance**: Optimized database queries and API responses
- **Monitoring**: Application monitoring and logging

### UI/UX Enhancements (August 13, 2025)
- **Window Toggle System**: Implemented consistent toggle behavior for all windows
  - Profile window: `toggleMyProfile()` replaces `showMyProfile()` with state detection
  - Messages window: Enhanced `toggleMessages()` with default view return
  - Sidebar panels: Updated `togglePanel()` for true toggle functionality
- **Default View Logic**: Added `showDefaultView()` function
  - Returns to My Feed for authenticated users
  - Shows map or welcome screen for logged-out users
- **Sidebar Improvements**: 
  - Toggle button moved to sidebar edge with directional arrows (▶/◀)
  - Reduced font sizes: thumbs (1.5rem→1.1rem), labels (0.8rem), logout (1.0rem)
  - Dark gray arrows (#2c2c2c) for better contrast
  - Dynamic positioning with sidebar expansion (3vw→10vw)

### ✨ Enhanced Topic-Centric Trending System (August 14, 2025)
**Status**: ✅ **DEPLOYED** - Revolutionary upgrade from post-based to AI topic-based trending

**Major System Overhaul**:
- **Previous System**: Trending individual POSTS with basic engagement metrics
- **New System**: AI-synthesized TOPICS with rich analysis and feed integration

**Key Features Deployed**:

#### 1. **AI Topic Discovery & Analysis**
- Azure OpenAI powered topic synthesis from political discussions
- Rich topic cards displaying prevailing positions and leading critiques
- Balanced representation: 60% similarity threshold captures opposing viewpoints
- Smart engagement scoring combining recency, participation, and activity

#### 2. **My Feed Integration**
- **Topic Filtering**: Click any topic to filter entire My Feed experience
- **Smooth Transitions**: Enter/exit topic mode with cached state restoration
- **Rich Context**: Topic headers show AI-analyzed positions and critiques
- **Easy Exit**: One-click return to algorithm-based feed

#### 3. **Geographic Intelligence**
- **National View**: Primarily national topics with periodic local injection
- **Balanced Timing**: State/local topics appear every 45-60 seconds for diversity
- **Context Indicators**: Topics labeled with [State Local], [Regional] tags
- **User-Aware Distribution**: Leverages user's geographic data for relevant content

#### 4. **Map Synchronization**
- **Unified Topics**: Map speech bubbles show same AI topics as trending panels
- **Geographic Distribution**: Topics distributed across major US cities
- **Interactive Bubbles**: Map bubbles clickable to enter topic mode
- **Real-time Updates**: Map and trending panels synchronized via shared topic cache

**Technical Architecture**:
- **API Endpoints**: `/api/topic-navigation/trending`, `/enter/{topicId}`, `/exit`
- **Performance**: 2-minute topic cache, geographic balancing timer
- **Fallback Systems**: AI topics → posts → static content hierarchy
- **Cross-Compatibility**: Works with both MapLibre and Leaflet map systems
- **Files Modified**: `frontend/index.html` (500+ lines added/modified)

**User Experience Flow**:
1. **Discovery**: AI topics in trending panels and map bubbles
2. **Selection**: Click topic to enter filtered viewing mode
3. **Immersion**: My Feed shows only topic-related posts with rich context
4. **Navigation**: Geographic layers adapt to user's zoom level (National/State/Local)
5. **Exit**: Seamless return to full algorithm feed

## 🎯 Production Status

### ✅ Currently Working
- **Backend API**: Core endpoints functional (some minor issues with empty data)
- **Frontend Interface**: Modern, responsive user interface  
- **Authentication**: User registration and login (requires completing hCaptcha)
- **Content Management**: Post creation, interaction, and moderation
- **Candidate Tools**: Enhanced candidate profile and communication
- **Real-time Features**: Live messaging and notifications
- **Search & Discovery**: AI-powered content and candidate discovery

### 🔄 Active Development
- **Advanced AI**: Enhanced content recommendation algorithms
- **Analytics Dashboard**: User engagement and platform metrics
- **Mobile App**: Native mobile application development
- **API Integrations**: Third-party political data sources
- **Advanced Moderation**: ML-powered content moderation

### 🚀 Deployment URLs
- **Production Frontend**: https://yellow-mud-043d1ca0f.2.azurestaticapps.net
- **Production Backend**: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io
- **Custom Domain**: www.unitedwerise.org (configured)
- **API Documentation**: /api/swagger (Swagger UI available)

## 📊 Technical Metrics

### Performance
- **Backend Response Time**: < 200ms average
- **Frontend Load Time**: < 3s first contentful paint
- **Database Performance**: Optimized queries with indexing
- **Auto-scaling**: Handles traffic spikes automatically

### Security
- **Authentication**: JWT with secure token rotation
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive request validation
- **CORS Policy**: Proper cross-origin resource sharing
- **Content Moderation**: Multi-layer content screening

### Reliability
- **Uptime**: 99.9% availability target
- **Error Handling**: Graceful degradation for failures
- **Monitoring**: Real-time application health monitoring
- **Backup**: Automated database backups
- **Recovery**: Disaster recovery procedures in place

## 📁 Development Documentation

### Important Project Documents
- **API Documentation**: `API_DOCUMENTATION.md` - Complete API endpoint reference
- **Current API Status**: `CURRENT_API_STATUS.md` - Real-time status of implemented features
- **Test Files Tracker**: `TEST_FILES_TRACKER.md` - Tracks all test files for cleanup management
- **Documentation Review**: `DOCUMENTATION_REVIEW_2025-08-09.md` - Latest documentation audit and status
- **Session Handoff**: `SESSION_HANDOFF_2025-08-08.md` - Latest development session notes
- **Security Checklist**: `SECURITY_DEPLOYMENT_CHECKLIST.md` - Security review checklist
- **Deployment Guide**: `PRODUCTION_DEPLOYMENT_GUIDE.md` - Azure deployment procedures
- **OAuth Integration Plan**: `OAUTH_GOOGLE_IMPLEMENTATION.md` - Future OAuth implementation strategy
- **SMS Verification Plan**: `SMS_VALIDATION_FUTURE.md` - Future SMS validation for anti-bot protection

## 🏆 Key Achievements

1. **Full Azure Production Deployment** - Successfully migrated to scalable cloud infrastructure
2. **Advanced Feed Algorithm** - Probability cloud-based content discovery with 4-factor intelligent scoring
3. **Modern Component Architecture** - Evolved from single HTML file to modular system
4. **AI-Powered Features** - Integrated LLM and vector search capabilities for content matching
5. **Comprehensive API** - 40+ endpoints with full documentation
6. **Enhanced User Experience** - Modern, accessible, mobile-first interface with My Profile and My Feed
7. **Security Hardening** - Production-ready security measures with anti-bot protection
8. **Real-time Communication** - WebSocket-based messaging system
9. **Advanced Candidate Tools** - Professional-grade campaign management
10. **Tunable Algorithm System** - A/B testing and personalization capabilities for feed optimization
11. **Complete Relationship System** - Reusable follow/friend functionality with production-safe database migration

## 🔮 Future Roadmap

### Short Term (Q4 2025)
- **OAuth Integration**: Google, Microsoft, Apple Sign-In options
- **SMS Account Validation**: Phone verification for enhanced bot protection
- **Mobile App Development**: Native iOS/Android applications
- **Advanced Analytics**: Comprehensive platform analytics dashboard

### Medium Term (Q1-Q2 2026)
- **Enhanced AI Features**: Improved content recommendations and analysis
- **API Partnerships**: Integration with external political data sources
- **Advanced Moderation**: ML-powered content moderation system
- **Enterprise Features**: White-label solutions for organizations

### Long Term (Q3+ 2026)
- **Blockchain Integration**: Transparent voting and verification systems
- **Global Expansion**: Multi-language support and international features
- **Advanced Analytics**: Predictive analytics for political trends

---

*Last Updated: August 13, 2025*
*Platform Status: Production Ready with Enhanced UI Navigation*
*Current Version: v2.3 (Toggle Navigation System)*
*Next Documentation Review: August 20, 2025*
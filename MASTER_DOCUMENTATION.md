# 📚 MASTER DOCUMENTATION - United We Rise Platform
**Last Updated**: August 16, 2025  
**Version**: 3.1 (My Feed Infinite Scroll Fix)  
**Status**: 🟢 PRODUCTION LIVE

---

## ⚠️ CRITICAL NOTICE FOR ALL DEVELOPERS

### 🚨 THIS IS THE SINGLE SOURCE OF TRUTH
**ALL documentation updates MUST be made in this file ONLY.**  
Do NOT create separate documentation files. This consolidation was created after an incident where critical functionality (infinite scroll) was accidentally deleted due to fragmented documentation across 52+ files.

### Quick Reference Files Allowed:
- `CLAUDE.md` - Quick reference for current state and critical issues
- `README.md` - Basic project introduction for GitHub

**Everything else goes HERE in MASTER_DOCUMENTATION.md**

---

## 📑 TABLE OF CONTENTS

1. [🎯 EXECUTIVE SUMMARY](#executive-summary)
2. [🚀 CURRENT PRODUCTION STATUS](#current-production-status)
3. [🏗️ SYSTEM ARCHITECTURE](#system-architecture)
4. [💾 DATABASE SCHEMA](#database-schema)
5. [🔌 API REFERENCE](#api-reference)
6. [🎨 UI/UX COMPONENTS](#ui-ux-components)
7. [🔐 SECURITY & AUTHENTICATION](#security-authentication)
8. [☁️ DEPLOYMENT & INFRASTRUCTURE](#deployment-infrastructure)
9. [📊 MONITORING & ADMIN](#monitoring-admin)
10. [🤖 AI & SEMANTIC FEATURES](#ai-semantic-features)
11. [🗺️ MAP & CIVIC FEATURES](#map-civic-features)
12. [📱 SOCIAL FEATURES](#social-features)
13. [🏆 REPUTATION SYSTEM](#reputation-system)
14. [📸 MEDIA & PHOTOS](#media-photos)
15. [⚡ PERFORMANCE OPTIMIZATIONS](#performance-optimizations)
16. [🐛 KNOWN ISSUES & BUGS](#known-issues-bugs)
17. [📝 DEVELOPMENT PRACTICES](#development-practices)
18. [📜 SESSION HISTORY](#session-history)
19. [🔮 FUTURE ROADMAP](#future-roadmap)
20. [🆘 TROUBLESHOOTING](#troubleshooting)

---

## 🎯 EXECUTIVE SUMMARY {#executive-summary}

### Project Vision
United We Rise is a revolutionary geography-based civic engagement platform that fundamentally reimagines social media for democratic participation. Rather than the personal relationship-based graphs of traditional social media that create echo chambers, this platform organizes conversations by geographic boundaries and political districts, ensuring citizens engage with their actual representatives and neighbors.

### Revolutionary Concept
**Traditional Social Media**: Friends → Posts → Engagement → Echo Chambers
**United We Rise**: Geography → Representatives → Issues → Balanced Discourse

#### The Geography-First Approach
- **Location as Primary Graph**: Your ZIP code determines your primary social graph
- **Multi-Scale Discovery**: National issues → State concerns → Local problems
- **Representative Integration**: Your officials are automatically in your feed
- **District-Based Trending**: See what your actual neighbors are discussing

#### Civic Engagement Pipeline
```
Discovery → Awareness → Connection → Action → Content → Community
    ↓         ↓          ↓         ↓        ↓         ↓
  Topics   Officials   Messages  Voting   Posts   Citizens
```

### Core Innovation
- **Geography-Based Social Graph**: Users see content from their voting districts, not just who they follow
- **Multi-Scale Political Discovery**: National → State → Local content algorithms
- **Civic Integration**: Direct messaging with verified officials and candidates
- **Democratic Accountability**: Reputation system focused on behavior, not censorship
- **AI-Powered Discovery**: Semantic topic analysis for balanced political discourse
- **Representative Transparency**: Officials can't hide from their constituents

### Success Metrics (Beyond Engagement)
- **Meeting Attendance**: Town halls, city council meetings
- **Representative Contact**: Messages sent to officials
- **Voting Participation**: Registration and turnout rates
- **Issue Awareness**: Knowledge of local ballot measures
- **Community Action**: Volunteer participation, petition signatures

### Current State
- **Production URL**: https://www.unitedwerise.org
- **Backend API**: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io
- **Status**: ✅ Fully operational with 50+ features deployed
- **Users**: Growing organically
- **Performance**: <200ms API response, <3s page load

---

## 🚀 CURRENT PRODUCTION STATUS {#current-production-status}

### Live Services
| Component | Status | URL/Details |
|-----------|--------|------------|
| Frontend | ✅ LIVE | https://www.unitedwerise.org |
| Backend API | ✅ LIVE | https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io |
| Database | ✅ LIVE | Azure PostgreSQL Flexible Server |
| Azure OpenAI | ✅ LIVE | Reputation system, topic analysis |
| Blob Storage | ✅ LIVE | Photo/media storage |
| Admin Dashboard | ✅ LIVE | /admin-dashboard.html |

### Recent Deployments (August 2025)
- ✅ **My Feed Infinite Scroll Fix (Aug 16)**: Proper post appending with 15-post batches
- ✅ **Comprehensive Code Audit (Aug 15)**: Removed 200+ lines of deprecated code
- ✅ **Photo Tagging System**: Privacy-controlled photo tagging
- ✅ **Relationship System**: Friends/followers with notifications
- ✅ **AI Topic Discovery**: Semantic clustering of political discussions
- ✅ **Admin Monitoring**: Real-time deployment status tracking
- ✅ **Performance Optimization**: 10x faster post creation with async analysis

### Critical Metrics
- **Backend Uptime**: 99.9% availability
- **API Response Time**: <200ms average
- **Post Creation Speed**: <100ms (10x improvement)
- **Error Rate**: 3.57% (down from 4.05%)
- **Database Connections**: Stable pool management
- **CDN Cache Hit Rate**: 85%+

---

## 🏗️ SYSTEM ARCHITECTURE {#system-architecture}

### Technology Stack

#### Backend
```
Node.js + Express + TypeScript
├── Framework: Express 4.x with TypeScript
├── Database: PostgreSQL via Prisma ORM
├── Authentication: JWT with bcrypt
├── Real-time: Socket.IO WebSockets
├── File Storage: Azure Blob Storage
├── AI Services: Azure OpenAI, Qwen3 (local)
├── Vector DB: Qdrant for semantic search
├── Geospatial: H3 hexagonal indexing
└── Hosting: Azure Container Apps with auto-scaling
```

#### Frontend
```
Vanilla JavaScript + Modern Web APIs
├── Architecture: Component-based modules
├── Maps: MapLibre GL (migrated from Leaflet)
├── Real-time: WebSocket integration
├── State: localStorage + window globals
├── Styling: CSS3 with responsive design
├── Build: No framework, direct deployment
└── Hosting: Azure Static Web Apps with CDN
```

#### Infrastructure
```
Azure Cloud Services
├── Container Apps: Auto-scaling backend
├── Static Web Apps: Frontend with global CDN
├── PostgreSQL Flexible: Managed database
├── Blob Storage: Media persistence
├── Container Registry: Docker images
├── OpenAI Service: GPT-3.5 and Ada embeddings
└── CI/CD: GitHub Actions automation
```

### System Diagram
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│  Azure CDN   │────▶│   Browser   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                                         │
       │ HTTPS                            WebSocket
       ▼                                         ▼
┌─────────────────────────────────────────────────────┐
│              Azure Container Apps                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │   Express   │  │   Socket.IO   │  │  Prisma  │  │
│  │   REST API  │  │   WebSocket   │  │   ORM    │  │
│  └─────────────┘  └──────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────┘
       │                    │                 │
       ▼                    ▼                 ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Azure OpenAI │   │ Blob Storage │   │  PostgreSQL  │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Directory Structure
```
UnitedWeRise-Dev/
├── frontend/
│   ├── index.html (main application)
│   ├── admin-dashboard.html
│   ├── src/
│   │   ├── components/ (JS modules)
│   │   ├── integrations/ (backend integration)
│   │   ├── js/ (utilities and helpers)
│   │   └── styles/ (CSS files)
│   └── assets/ (images, fonts)
├── backend/
│   ├── src/
│   │   ├── routes/ (API endpoints)
│   │   ├── services/ (business logic)
│   │   ├── middleware/ (auth, validation)
│   │   └── utils/ (helpers)
│   ├── prisma/
│   │   └── schema.prisma (database schema)
│   └── Dockerfile
└── docs/ (consolidated here)
```

---

## 💾 DATABASE SCHEMA {#database-schema}

### Core Models

#### User Model
```prisma
model User {
  id                    String    @id @default(cuid())
  email                 String    @unique
  username              String    @unique
  password              String
  
  // Profile Information
  firstName             String?
  lastName              String?
  avatar                String?
  backgroundImage       String?
  bio                   String?
  website               String?
  location              String?
  
  // Address & Location
  streetAddress         String?
  city                  String?
  state                 String?
  zipCode               String?
  latitude              Float?
  longitude             Float?
  h3Index               String?
  
  // Political Profile
  politicalProfileType  PoliticalType @default(CITIZEN)
  verificationStatus    VerificationStatus @default(UNVERIFIED)
  office                String?
  officialTitle         String?
  politicalParty        String?
  campaignWebsite       String?
  
  // Reputation System
  reputation            Int       @default(70)
  reputationLastUpdated DateTime?
  
  // Social Metrics
  followersCount        Int       @default(0)
  followingCount        Int       @default(0)
  
  // Account Status
  emailVerified         Boolean   @default(false)
  phoneVerified         Boolean   @default(false)
  accountStatus         AccountStatus @default(ACTIVE)
  moderationStatus      ModerationStatus @default(GOOD_STANDING)
  
  // Timestamps
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  // Relations
  posts                 Post[]
  comments              Comment[]
  likes                 Like[]
  notifications         Notification[]
  followers             Follow[]   @relation("UserFollowers")
  following             Follow[]   @relation("UserFollowing")
  friendshipsInitiated  Friendship[] @relation("FriendshipInitiator")
  friendshipsReceived   Friendship[] @relation("FriendshipReceiver")
  photos                Photo[]
  photoTags             PhotoTag[] @relation("TaggedUser")
}
```

#### Post Model
```prisma
model Post {
  id              String    @id @default(cuid())
  content         String    @db.Text
  imageUrl        String?
  mediaId         String?
  
  // Author
  authorId        String
  author          User      @relation(fields: [authorId], references: [id])
  
  // Classification
  isPolitical     Boolean   @default(false)
  tags            String[]
  embedding       Float[]   // Vector for similarity search
  
  // Reputation Cache
  authorReputation Int?
  visibilityMultiplier Float @default(1.0)
  
  // Engagement Metrics
  likesCount      Int       @default(0)
  commentsCount   Int       @default(0)
  sharesCount     Int       @default(0)
  viewsCount      Int       @default(0)
  
  // AI Analysis
  sentimentScore  Float?
  topicId         String?
  topic           Topic?    @relation(fields: [topicId], references: [id])
  
  // Feedback Detection
  isFeedback      Boolean   @default(false)
  feedbackStatus  FeedbackStatus?
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  likes           Like[]
  comments        Comment[]
  media           Photo?    @relation(fields: [mediaId], references: [id])
}
```

#### Relationship Models
```prisma
// One-way follow relationship
model Follow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  follower    User     @relation("UserFollowing", fields: [followerId], references: [id])
  following   User     @relation("UserFollowers", fields: [followingId], references: [id])
  createdAt   DateTime @default(now())
  
  @@unique([followerId, followingId])
}

// Bidirectional friendship with request flow
model Friendship {
  id          String           @id @default(cuid())
  user1Id     String
  user2Id     String
  status      FriendshipStatus @default(PENDING)
  initiatorId String
  
  user1       User     @relation("FriendshipInitiator", fields: [user1Id], references: [id])
  user2       User     @relation("FriendshipReceiver", fields: [user2Id], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([user1Id, user2Id])
}
```

#### Photo & Tagging Models
```prisma
model Photo {
  id           String    @id @default(cuid())
  url          String
  thumbnailUrl String?
  caption      String?   @db.VarChar(200)
  
  // Owner
  userId       String
  user         User      @relation(fields: [userId], references: [id])
  
  // Type & Purpose
  photoType    PhotoType
  purpose      PhotoPurpose @default(PERSONAL)
  gallery      String?
  
  // Storage
  storageSize  Int       @default(0)
  mimeType     String?
  
  // Privacy
  visibility   Visibility @default(PUBLIC)
  
  // Tagging
  tags         PhotoTag[]
  
  // Metadata
  width        Int?
  height       Int?
  uploadedAt   DateTime  @default(now())
  
  // Relations
  posts        Post[]
}

model PhotoTag {
  id            String    @id @default(cuid())
  photoId       String
  taggedUserId  String
  taggerUserId  String
  
  // Position on photo
  xPosition     Float
  yPosition     Float
  
  // Status
  status        TagStatus @default(PENDING)
  
  photo         Photo     @relation(fields: [photoId], references: [id])
  taggedUser    User      @relation("TaggedUser", fields: [taggedUserId], references: [id])
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@unique([photoId, taggedUserId])
}
```

#### Reputation System Models
```prisma
model ReputationEvent {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  
  eventType       ReputationType
  points          Int
  reason          String?
  
  // Related Content
  postId          String?
  post            Post?     @relation(fields: [postId], references: [id])
  reportId        String?
  
  // AI Analysis
  aiConfidence    Float?
  aiExplanation   String?
  
  createdAt       DateTime  @default(now())
}

enum ReputationType {
  HATE_SPEECH        // -10 points
  HARASSMENT         // -8 points
  SPAM              // -2 points
  PROFANITY         // -3 points
  PERSONAL_ATTACK   // -1 point
  QUALITY_CONTENT   // +2 points
  HELPFUL           // +1 point
}
```

#### Topic & Semantic Models
```prisma
model Topic {
  id              String    @id @default(cuid())
  title           String
  summary         String    @db.Text
  
  // AI Analysis
  prevailingPositions String[] 
  leadingCritiques    String[]
  sentimentBreakdown  Json?
  
  // Geographic Scope
  geographicScope GeographicScope @default(NATIONAL)
  state           String?
  district        String?
  
  // Metrics
  postCount       Int       @default(0)
  participantCount Int      @default(0)
  engagementScore Float     @default(0)
  
  // Clustering
  centroidVector  Float[]
  posts           Post[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  expiresAt       DateTime?
}
```

### Database Migrations
All schema changes are managed through Prisma migrations:
```bash
# Create migration
npx prisma migrate dev --name description

# Apply to production
npx prisma migrate deploy

# Generate client
npx prisma generate
```

Current migration status: ✅ All migrations applied

---

## 🔌 API REFERENCE {#api-reference}

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account
```javascript
Request:
{
  email: string,
  username: string,
  password: string,
  firstName?: string,
  lastName?: string,
  hcaptchaToken: string
}

Response:
{
  success: true,
  token: string,
  user: User
}
```

#### POST /api/auth/login
Authenticate user and receive JWT token
```javascript
Request:
{
  email: string,
  password: string
}

Response:
{
  success: true,
  token: string,
  user: User
}
```

#### POST /api/auth/verify-email
Verify email address with token
```javascript
Request:
{
  token: string
}

Response:
{
  success: true,
  message: "Email verified successfully"
}
```

### User Management Endpoints

#### GET /api/users/profile
Get current user's complete profile
- **Auth Required**: Yes
- **Response**: Full user object with all fields

#### PUT /api/users/profile
Update user profile information
```javascript
Request:
{
  firstName?: string,
  lastName?: string,
  bio?: string,
  website?: string,
  location?: string
}
```

#### POST /api/users/background-image
Upload background image for profile/feed
- **Auth Required**: Yes
- **Content-Type**: multipart/form-data
- **Limits**: 10MB max, 3 uploads per hour
- **Response**: Background image URL

#### GET /api/users/:userId
Get public profile by user ID
- **Auth Required**: No
- **Response**: Public user fields only

#### GET /api/users/search
Search users by name/username
```javascript
Query params:
  q: string (search term)
  limit?: number (default 10)
  offset?: number (default 0)

Response:
{
  users: User[],
  pagination: {...}
}
```

### Post & Content Endpoints

#### POST /api/posts
Create a new post
```javascript
Request:
{
  content: string,
  isPolitical?: boolean,
  mediaId?: string,
  tags?: string[]
}

Response:
{
  success: true,
  post: Post
}
```

#### GET /api/posts/:postId
Get single post with details
- **Response**: Post with author, likes, comments

#### GET /api/feed/
Get personalized feed using probability-based algorithm
```javascript
Query params:
  limit?: number (default: 50, max: 500)
  weights?: string (JSON of custom algorithm weights)
  
Response:
{
  posts: Post[], // Selected posts with author, likes, comments
  algorithm: string, // "probability-cloud" or "fallback-empty"
  weights: FeedWeights, // Algorithm weights used
  stats: {
    candidateCount: number,
    avgRecencyScore: number,
    avgSimilarityScore: number, 
    avgSocialScore: number,
    avgTrendingScore: number,
    avgReputationScore: number
  }
}
```

**Feed Algorithm Details:**
- **Data Source**: All posts from last 30 days (excluding user's own posts)
- **Candidate Pool**: Up to 500 most recent posts 
- **Algorithm**: Probability cloud sampling with 5 scoring dimensions:
  - **Recency** (30%): Exponential decay, 24-hour half-life
  - **Similarity** (25%): Content similarity to user's interaction history
  - **Social** (25%): Posts from followed users (1.0 score vs 0.1 for others)
  - **Trending** (10%): Engagement velocity (likes + comments)
  - **Reputation** (10%): Author reputation score
- **Selection**: Probabilistic sampling based on weighted scores
- **Personalization**: Uses user's liked posts, follows, and content embeddings

---

## 🔮 PROPOSED FEED ALGORITHM REDESIGN

**Status**: Planning Phase - Awaiting Implementation  
**Date**: August 15, 2025

### Candidate Generation (N = 3,200 posts)
- **N1**: 200 posts from social interactions (follows + their engagements)
- **N2**: 1,000 random posts from last 48 hours
- **N3**: 1,000 random posts from 48-168 hours ago  
- **N4**: 500 local posts within last 7 days
- **N5**: 500 state posts within last 7 days

### Proposed Scoring Dimensions
- **Recency**: 20% weight, 48-hour half-life
- **Social**: 20% weight
- **Vector Similarity Tiers**:
  - 90%+ similarity: 10% weight
  - 50-90% similarity: 10% weight  
  - 0-50% similarity: 10% weight
- **Trending Topic Similarity**:
  - 90%+ trending match: 10% weight
  - 0-90% trending match: 10% weight
- **Reputation**: Applied as probability modifier (±10-20%), not scoring dimension

### Key Design Decisions
- **Linear model first** (insufficient data for neural network)
- **User vector**: TBD (average of posts + engagement history)
- **Geographic prioritization**: Local > State > National
- **Engagement velocity**: Based on likes/comments per hour
- **Future evolution**: Neural network when sufficient training data available

### Outstanding Questions
1. User vector calculation methodology
2. Geographic relevance scoring formula
3. Feature normalization approach
4. Engagement velocity calculation details

#### GET /api/feed/trending
Get trending posts
```javascript
Query params:
  limit?: number (default 20)
  timeframe?: string (24h, 7d, 30d)
```

#### POST /api/posts/:postId/like
Like/unlike a post
- **Auth Required**: Yes
- **Response**: Updated like status

#### POST /api/posts/:postId/comments
Add comment to post
```javascript
Request:
{
  content: string,
  parentId?: string (for replies)
}
```

### Relationship Endpoints

#### POST /api/relationships/follow/:userId
Follow a user
- **Auth Required**: Yes
- **Response**: Follow relationship created

#### DELETE /api/relationships/follow/:userId
Unfollow a user
- **Auth Required**: Yes

#### GET /api/relationships/follow-status/:userId
Check if following a user
```javascript
Response:
{
  isFollowing: boolean,
  followedAt?: Date
}
```

#### POST /api/relationships/friend-request/:userId
Send friend request
- **Auth Required**: Yes
- **Response**: Friendship with PENDING status

#### POST /api/relationships/friend-request/:userId/accept
Accept friend request
- **Auth Required**: Yes
- **Updates status**: PENDING → ACCEPTED

#### GET /api/relationships/status/:userId
Get combined follow + friend status
```javascript
Response:
{
  isFollowing: boolean,
  isFollower: boolean,
  friendshipStatus: null | "pending" | "accepted",
  isPendingFromMe: boolean,
  isPendingFromThem: boolean
}
```

### Political & Civic Endpoints

#### GET /api/political/representatives
Get user's elected officials
```javascript
Response:
{
  federal: [...],
  state: [...],
  local: [...]
}
```

#### PUT /api/political/profile
Update political profile
```javascript
Request:
{
  politicalType: "CITIZEN" | "CANDIDATE" | "ELECTED_OFFICIAL",
  office?: string,
  party?: string,
  campaignWebsite?: string,
  // Address fields
  streetAddress?: string,
  city?: string,
  state?: string,
  zipCode?: string
}
```

#### GET /api/elections/upcoming
Get upcoming elections for user's area
- **Response**: Elections with candidates

#### POST /api/candidates/message
Send message to candidate/official
```javascript
Request:
{
  candidateId: string,
  subject: string,
  message: string
}
```

### Topic & AI Endpoints

#### GET /api/topic-navigation/trending
Get AI-analyzed trending topics
```javascript
Query params:
  limit?: number
  scope?: "national" | "state" | "local"

Response:
{
  topics: Topic[],
  lastUpdated: Date
}
```

#### POST /api/topic-navigation/enter/:topicId
Enter topic-filtered viewing mode
- **Auth Required**: Yes
- **Response**: Topic details and filtered posts

#### POST /api/topics/analyze/recent
Trigger AI topic discovery (admin only)
- **Auth Required**: Yes (admin)
- **Response**: Analysis job started

### Photo & Media Endpoints

#### POST /api/photos/upload
Upload photo/media
```javascript
Content-Type: multipart/form-data
Fields:
  file: File
  photoType: "AVATAR" | "GALLERY" | "POST_MEDIA"
  caption?: string (200 char max)
  gallery?: string

Response:
{
  photo: Photo,
  url: string
}
```

#### POST /api/photos/:photoId/tag
Tag user in photo
```javascript
Request:
{
  userId: string,
  xPosition: number (0-100),
  yPosition: number (0-100)
}
```

#### PUT /api/photos/tags/:tagId/status
Approve/reject photo tag
```javascript
Request:
{
  status: "APPROVED" | "REJECTED"
}
```

### Admin Endpoints

#### GET /api/admin/dashboard
Get admin dashboard data
- **Auth Required**: Yes (admin role)
- **Response**: Comprehensive platform metrics

#### GET /api/admin/feedback
Get user feedback submissions
```javascript
Query params:
  status?: "pending" | "reviewed" | "implemented"
  limit?: number
```

#### POST /api/admin/reputation/review
Review reputation penalty appeal
```javascript
Request:
{
  eventId: string,
  decision: "approve" | "reject",
  notes?: string
}
```

### Health & Monitoring Endpoints

#### GET /health
Basic health check
```javascript
Response:
{
  status: "ok",
  timestamp: Date,
  uptime: number
}
```

#### GET /health/deployment
Deployment status information
```javascript
Response:
{
  backend: {
    version: string,
    lastDeploy: Date,
    uptime: number
  },
  database: {
    connected: boolean,
    latency: number
  },
  services: {
    openai: "operational" | "degraded" | "down",
    blobStorage: "operational" | "degraded" | "down"
  }
}
```

### WebSocket Events

#### Connection
```javascript
socket.on('connect', () => {
  socket.emit('authenticate', { token: authToken });
});
```

#### Messages
```javascript
// Listen for new messages
socket.on('new-message', (message) => {
  // Handle incoming message
});

// Send message
socket.emit('send-message', {
  conversationId: string,
  content: string
});
```

#### Notifications
```javascript
socket.on('notification', (notification) => {
  // Types: friend-request, post-like, comment, mention, etc.
});
```

---

## 🎨 UI/UX COMPONENTS {#ui-ux-components}

### Navigation System

#### Main Navigation Architecture
```
┌─────────────────────────────────────────────────┐
│                   Top Bar                       │
│  [Logo] [Search]           [User] [Messages]    │
├─────────────┬───────────────────────────────────┤
│             │                                   │
│   Sidebar   │         Main Content Area         │
│             │                                   │
│ ┌─────────┐ │    ┌──────────────────────┐      │
│ │My Feed  │ │    │                      │      │
│ │Officials│ │    │   Dynamic Content    │      │
│ │Messages │ │    │                      │      │
│ │Profile  │ │    │                      │      │
│ │Trending │ │    └──────────────────────┘      │
│ └─────────┘ │                                   │
│             │                                   │
└─────────────┴───────────────────────────────────┘
```

#### Window Toggle Behavior
All main windows implement consistent toggle functionality:
- **First click**: Opens window
- **Second click**: Closes and returns to default view
- **Default view**: My Feed (logged in) or Map (logged out)

Key Functions:
```javascript
toggleMyProfile()     // Profile window toggle
toggleMessages()      // Messages window toggle
togglePanel(name)     // Sidebar panel toggle
showDefaultView()     // Return to default content
```

#### Sidebar System
- **Toggle Button**: Edge-positioned with arrows (▶/◀)
- **Responsive**: Collapses on mobile, expandable on desktop
- **Icons**: Consistent size (1.1rem) with labels (0.8rem)
- **State**: Preserves expansion state in localStorage

### ✅ FIXED: My Feed Infinite Scroll System (August 16, 2025) {#my-feed-infinite-scroll}

**Status**: ✅ **FULLY OPERATIONAL** - Complete infinite scroll with proper pagination

**Problem Solved**: My Feed was replacing posts instead of appending them during infinite scroll, causing users to see random posts instead of continuous batches.

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

**User Experience Flow**:
```
Initial Login → My Feed loads 15 posts
Scroll to bottom → Appends 15 more (total: 30)
Scroll to bottom → Appends 15 more (total: 45)
Continue... → 60, 75, 90... posts accumulate
```

**Key Functions Modified**:
- `frontend/index.html:3231` - `displayMyFeedPosts(posts, appendMode = false)`
- `frontend/index.html:4131` - `displayPosts(posts, containerId, appendMode = false)`
- `frontend/index.html:3301` - `loadMoreMyFeedPosts()` with proper offset tracking
- `frontend/index.html:3378` - `setupMyFeedInfiniteScroll()` with 50px trigger distance

**Performance Optimizations**:
- ✅ No scrollbar visible but scroll functionality preserved (CSS: `scrollbar-width: none`)
- ✅ No rate limiting (429 errors) - proper loading state protection
- ✅ No multiple simultaneous requests - guard clauses prevent race conditions
- ✅ Efficient DOM manipulation - `insertAdjacentHTML` instead of `innerHTML` rebuilds

**Backend Pagination Support**:
```javascript
// Feed endpoint with offset/limit support
GET /api/feed/?limit=15&offset=30

// Response includes pagination metadata
{
  posts: [...],
  pagination: {
    limit: 15,
    offset: 30,
    count: 15,
    hasMore: true
  }
}
```

**Commits**: `8b71ddb` (append mode), `12d6ddf` (rate limiting fix)

**Related Systems**: {#api-endpoints}, {#probability-feed-service}

### Component Library

#### Post Component
```javascript
// Structure
<div class="post-card" data-post-id="{id}">
  <div class="post-header">
    <img class="author-avatar">
    <div class="author-info">
      <span class="author-name"></span>
      <span class="post-time"></span>
    </div>
  </div>
  <div class="post-content"></div>
  <div class="post-media"></div>
  <div class="post-actions">
    <button class="like-btn"></button>
    <button class="comment-btn"></button>
    <button class="share-btn"></button>
  </div>
</div>
```

#### Modal System
```javascript
// Standard modal structure
<div class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h2>Title</h2>
      <button class="close-btn">×</button>
    </div>
    <div class="modal-body">
      <!-- Content -->
    </div>
    <div class="modal-footer">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

#### Form Components
Standard form patterns used throughout:
```html
<div class="form-group">
  <label for="field">Label</label>
  <input type="text" id="field" class="form-control">
  <span class="error-message"></span>
</div>
```

### Responsive Design

#### Breakpoints
```css
/* Mobile First Approach */
@media (min-width: 768px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1440px) { /* Large Desktop */ }
```

#### Mobile Adaptations
- Sidebar becomes bottom navigation
- Modals become full-screen
- Touch-optimized interactions
- Reduced information density

### Custom Styling System

#### Color Palette
```css
:root {
  --primary: #4b5c09;        /* Olive green */
  --primary-dark: #3a4507;
  --secondary: #7d92a8;      /* Muted blue */
  --background: #bebbac;     /* Greige */
  --surface: #ffffff;
  --text-primary: #2c3e50;
  --text-secondary: #666666;
  --error: #e74c3c;
  --success: #27ae60;
  --warning: #f39c12;
}
```

#### Typography
```css
/* Font Stack */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             Roboto, Oxygen, Ubuntu, sans-serif;

/* Scale */
h1: 2.5rem
h2: 2rem
h3: 1.5rem
body: 1rem
small: 0.875rem
```

#### Frosted Glass Effect
```css
/* For background images */
.has-background .post-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

### Infinite Scroll Implementation
**CRITICAL**: This was temporarily broken during audit and restored
```javascript
function setupMyFeedInfiniteScroll() {
  const container = document.getElementById('myFeedPosts');
  container.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadMoreMyFeedPosts();
    }
  });
}
```

---

## 🔐 SECURITY & AUTHENTICATION {#security-authentication}

### Authentication System

#### JWT Token Management
```javascript
// Token structure
{
  userId: string,
  email: string,
  role: "user" | "admin" | "moderator",
  iat: number,
  exp: number (30 days)
}

// Storage
localStorage.setItem('authToken', token);
window.authToken = token; // For immediate access

// Headers
Authorization: Bearer ${token}
```

#### Password Security
- **Hashing**: bcrypt with 10 rounds
- **Requirements**: 8+ characters minimum
- **Reset Flow**: Email-based token system

#### Session Management
- **Token Lifetime**: 30 days (extended from 7)
- **Refresh Strategy**: New token on login
- **Logout**: Clear localStorage and window.authToken

### Security Measures

#### Rate Limiting
```javascript
// Configuration per endpoint
POST /api/auth/login: 5 attempts per 15 minutes
POST /api/posts: 30 per hour
POST /api/photos/upload: 10 per hour
POST /api/messages: 60 per hour
```

#### CORS Configuration
```javascript
const corsOptions = {
  origin: [
    'https://www.unitedwerise.org',
    'https://yellow-mud-043d1ca0f.2.azurestaticapps.net',
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
};
```

#### Input Validation
- **Sanitization**: HTML entities escaped
- **SQL Injection**: Prevented via Prisma parameterized queries
- **XSS Protection**: Content Security Policy headers
- **File Upload**: Type validation, size limits, virus scanning

### Account Security

#### Email Verification
- Required for full account access
- Token-based verification links
- 24-hour expiration

#### Phone Verification (Future)
- SMS OTP planned
- Currently demo mode only
- Test phones: +15551234567 (code: 123456)

#### Two-Factor Authentication (Roadmap)
- TOTP support planned
- Backup codes
- Recovery options

### Content Moderation Security

#### Automated Detection
- Azure OpenAI content filtering
- Keyword-based pre-screening
- Vector similarity for known bad content

#### Manual Review Process
- Moderator queue for flagged content
- Appeal system with audit trail
- Shadow banning capabilities

### Data Protection

#### Personal Information
- PII encrypted at rest
- GDPR compliance measures
- Data retention policies

#### API Security
- API key rotation
- Request signing for sensitive operations
- Audit logging for all admin actions

### Security Incidents & Response

#### Incident History
- No major breaches to date
- Minor rate limit adjustments made
- Regular security audits performed

#### Response Plan
1. Immediate containment
2. User notification if required
3. Patch deployment
4. Post-mortem documentation

### Comprehensive Security Implementation Plan

#### Phase 1: Personal Security Hardening (Days 1-3)
```javascript
// Security checklist
□ Two-Factor Authentication on all accounts
□ BitLocker encryption enabled
□ Dedicated development environment
□ Secure password manager implementation
□ Hardware security key setup
```

#### Phase 2: Platform Security Enhancement (Days 4-7)
```sql
-- Database security audit fields
ALTER TABLE users ADD COLUMN security_events JSONB DEFAULT '[]';
ALTER TABLE sessions ADD COLUMN risk_score INTEGER DEFAULT 0;
ALTER TABLE api_requests ADD COLUMN rate_limit_bucket VARCHAR(50);

-- Security event logging
CREATE TABLE security_events (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  event_type VARCHAR(50),
  risk_score INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Phase 3: Extended Security (Days 8-30)
- **Microsoft Security Center**: Integration with enterprise security tools
- **Advanced Content Security**: CSP headers, XSS protection
- **API Security**: Request signing, key rotation
- **Monitoring Enhancement**: Real-time threat detection

#### Security Budget Allocation ($120/month)
- **Azure Security Center**: $40/month
- **Premium Monitoring**: $30/month
- **Backup & Recovery**: $25/month
- **Security Tools**: $25/month

### Anti-Bot Protection System

#### Device Fingerprinting
```javascript
// Browser characteristic collection
const fingerprint = {
  screen: screen.width + 'x' + screen.height,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  language: navigator.language,
  platform: navigator.platform,
  canvas: generateCanvasFingerprint(),
  webgl: generateWebGLFingerprint()
};

// Risk scoring (0-100 scale)
const riskScore = calculateRiskScore(fingerprint, behavior);
if (riskScore > 70) {
  blockRequest("High risk score detected");
}
```

#### Zero-Cost Implementation
- No external SMS or captcha services beyond hCaptcha
- Browser-based fingerprinting and behavior analysis
- Machine learning risk scoring
- Community reporting integration

---

## ☁️ DEPLOYMENT & INFRASTRUCTURE {#deployment-infrastructure}

### Azure Infrastructure

#### Resource Group Structure
```
unitedwerise-rg/
├── Container Apps
│   └── unitedwerise-backend
├── Static Web Apps
│   └── yellow-mud-043d1ca0f
├── PostgreSQL Flexible Server
│   └── unitedwerise-db
├── Storage Account
│   └── unitedwerisestorage
├── Container Registry
│   └── unitedweriseregistry
└── OpenAI Service
    └── unitedwerise-openai
```

#### Backend Deployment (Container Apps)

**Docker Configuration**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "start"]
```

**Deployment Commands**:
```bash
# Build and push Docker image
docker build -t unitedwerise-backend .
docker tag unitedwerise-backend unitedweriseregistry.azurecr.io/unitedwerise-backend:latest
docker push unitedweriseregistry.azurecr.io/unitedwerise-backend:latest

# Update Container App
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --image unitedweriseregistry.azurecr.io/unitedwerise-backend:latest
```

**Environment Variables**:
```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
JWT_EXPIRES_IN="30d"
AZURE_STORAGE_CONNECTION_STRING="..."
AZURE_OPENAI_ENDPOINT="https://unitedwerise-openai.openai.azure.com/"
AZURE_OPENAI_API_KEY="..."
AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-ada-002"
AZURE_OPENAI_CHAT_DEPLOYMENT="gpt-35-turbo"
ENABLE_SEMANTIC_TOPICS="true"
SEMANTIC_PROVIDER="azure"
SIMILARITY_THRESHOLD="0.60"
```

#### Frontend Deployment (Static Web Apps)

**GitHub Actions Workflow**:
```yaml
name: Deploy Frontend
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/frontend"
          output_location: ""
```

**Custom Domain Configuration**:
- Domain: www.unitedwerise.org
- SSL: Automatic via Azure
- CDN: Global edge locations

#### Staging Environment Setup

**Overview**: Complete staging environment for safe testing of changes before production deployment.

**Infrastructure Created**: August 15, 2025
- **Staging Backend**: `unitedwerise-backend-staging.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io` ✅
- **Staging Frontend**: Auto-deployed from `development` branch
- **Staging Database**: Shares production database (careful with migrations)
- **Cost**: ~$15-20/month additional

**Branch Strategy**:
```
production-backup-2025-08-15  ← Backup/restore point
main                         ← Production (auto-deploy)  
development                  ← Staging (safe testing)
```

**Environment Auto-Detection**: 
Frontend automatically routes to correct backend based on hostname:
- **Staging/Dev URLs** → `unitedwerise-backend-staging.*`
- **Localhost** → `unitedwerise-backend-staging.*` (for testing)
- **Production** → `unitedwerise-backend.*` (default)

**Deployment Workflow**:
1. Make changes in `development` branch
2. Test on staging environment automatically created
3. Verify functionality works correctly
4. Merge to `main` only when confirmed working
5. Production deploys automatically from `main`

**Configuration Files**:
- `frontend/src/config/api.js` - Environment-based backend URL detection
- Automatic backend selection based on `window.location.hostname`

#### Database Management

**Connection String Format**:
```
postgresql://user:password@server.postgres.database.azure.com:5432/database?sslmode=require
```

**Backup Strategy**:
- Automated daily backups
- 7-day retention
- Point-in-time restore capability

**Migration Commands**:
```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy

# Generate client
npx prisma generate
```

### CI/CD Pipeline

#### Build Process
1. **Code Push** → GitHub main branch
2. **GitHub Actions** → Automated build triggered
3. **Backend Build** → Docker image created
4. **Frontend Build** → Static files prepared
5. **Deployment** → Azure services updated
6. **Health Check** → Verify deployment success

#### Deployment Monitoring
```javascript
// Browser console commands
deploymentStatus.check()        // Full status check
deploymentStatus.checkBackend() // Backend only
deploymentStatus.checkDatabase() // Database only
```

### Performance Optimization

#### CDN Configuration
- **Cache Headers**: 1 hour for static assets
- **Compression**: Gzip enabled
- **Edge Locations**: Global distribution

#### Backend Optimization
- **Container Scaling**: 1-10 instances
- **CPU Threshold**: 70% for scale-out
- **Memory**: 1GB per instance
- **Connection Pooling**: 20 database connections

#### Frontend Optimization
- **Code Splitting**: Component-based loading
- **Image Optimization**: WebP with fallbacks
- **Lazy Loading**: Images and components
- **Service Worker**: Offline capability (planned)

### Monitoring & Alerts

#### Application Insights
- **Metrics**: Response time, error rate, throughput
- **Logging**: Structured logs with correlation IDs
- **Alerts**: Email/SMS for critical issues

#### Health Endpoints
```javascript
GET /health → Basic health
GET /health/deployment → Deployment info
GET /health/database → Database status
GET /health/services → External services
```

#### Uptime Monitoring
- **Pingdom**: 5-minute checks
- **Status Page**: status.unitedwerise.org (planned)
- **SLA Target**: 99.9% availability

---

## 📊 MONITORING & ADMIN {#monitoring-admin}

### Admin Dashboard

**Access URL**: https://www.unitedwerise.org/admin-dashboard.html

#### Features
1. **User Management**
   - View all users with filters
   - Reputation management
   - Account status controls
   - Verification handling

2. **Content Moderation**
   - Review queue
   - Automated flags
   - Manual actions
   - Appeal reviews

3. **Analytics**
   - User growth metrics
   - Engagement statistics
   - Geographic distribution
   - Topic trends

4. **System Monitoring**
   - Real-time health status
   - Deployment tracking
   - Error logs
   - Performance metrics

5. **Feedback Console**
   - User suggestions
   - Bug reports
   - Feature requests
   - Sentiment analysis

#### Console Commands
```javascript
// Admin debugging commands
adminDebug.checkUserReputation(userId)
adminDebug.reviewPost(postId)
adminDebug.checkSystemHealth()
adminDebug.deploymentStatus()
adminDebug.clearCache()
```

### Deployment Status System

#### Real-Time Monitoring
```javascript
// Automatic checks every 30 seconds
deploymentStatus = {
  frontend: {
    status: "operational",
    buildTime: "2025-08-15T10:30:00Z",
    version: "3.0.0"
  },
  backend: {
    status: "operational",
    uptime: 3600,
    lastRestart: "2025-08-15T09:30:00Z"
  },
  database: {
    status: "operational",
    connections: 5,
    latency: 12
  }
}
```

#### Component Health Tracking
- **Frontend**: Build time, cache status
- **Backend**: Uptime, restart count
- **Database**: Connection pool, query latency
- **Services**: AI availability, storage status

### Error Tracking

#### Error Categories
1. **API Errors** (4xx, 5xx)
2. **Database Errors** (connection, query)
3. **Authentication Errors** (token, permission)
4. **Service Errors** (AI, storage)
5. **Client Errors** (JavaScript, network)

#### Error Response Format
```javascript
{
  error: true,
  code: "ERROR_CODE",
  message: "User-friendly message",
  details: {...}, // Development only
  timestamp: Date,
  requestId: "uuid"
}
```

### Performance Metrics

#### Key Performance Indicators
- **API Response Time**: <200ms target
- **Page Load Time**: <3s target
- **Error Rate**: <5% target
- **Cache Hit Rate**: >80% target
- **Database Query Time**: <50ms target

#### Performance Optimization Log
- Post creation: 2-3s → <100ms (10x improvement)
- Feed loading: Pagination implemented
- Image loading: Lazy loading added
- API calls: Reduced redundant calls

---

## 🤖 AI & SEMANTIC FEATURES {#ai-semantic-features}

### Azure OpenAI Integration

#### Services Deployed
```javascript
// Embedding Model
Deployment: text-embedding-ada-002
Dimensions: 1536
Use: Content similarity, topic clustering

// Chat Model  
Deployment: gpt-35-turbo
Use: Topic summarization, content analysis
Temperature: 0.7
Max Tokens: 500
```

#### Configuration
```javascript
const openai = new OpenAIClient(
  "https://unitedwerise-openai.openai.azure.com/",
  new AzureKeyCredential(AZURE_OPENAI_API_KEY)
);
```

### Semantic Topic Discovery

#### Topic Analysis Pipeline
1. **Collection**: Gather recent posts (24h window)
2. **Embedding**: Generate vectors for each post
3. **Clustering**: K-means clustering on vectors
4. **Analysis**: GPT-3.5 summarizes each cluster
5. **Ranking**: Score by engagement and recency
6. **Display**: Show top topics in trending panel

#### Topic Data Structure
```javascript
{
  id: "topic_123",
  title: "Healthcare Reform Debate",
  summary: "Citizens discuss pros and cons of proposed healthcare changes",
  prevailingPositions: [
    "Support for universal coverage",
    "Concerns about funding"
  ],
  leadingCritiques: [
    "Cost projections unrealistic",
    "Implementation timeline too aggressive"
  ],
  postCount: 156,
  participantCount: 89,
  engagementScore: 0.82,
  geographicScope: "national"
}
```

#### Topic Navigation Flow
```
User clicks topic → Enter topic mode → Filtered feed → Exit to normal
```

### Content Analysis

#### Reputation System AI
```javascript
// Hate speech detection
const analysis = await analyzeContent(postContent);
if (analysis.hateScore > 0.8) {
  applyPenalty(userId, -10, "HATE_SPEECH");
}

// Categories analyzed
- Hate speech (-10 points)
- Harassment (-8 points)  
- Spam (-2 points)
- Profanity (-3 points)
- Personal attacks (-1 point)
```

#### Feedback Detection
```javascript
// Keywords for feedback detection
const feedbackKeywords = [
  'bug', 'broken', 'error', 'doesn\'t work',
  'should', 'wish', 'please add', 'feature request',
  'infinite scroll', 'feed should'
];

// Async analysis for performance
async function analyzePostAsync(postId) {
  // Quick keyword check (synchronous)
  if (containsFeedbackKeywords(content)) {
    markAsPotentialFeedback(postId);
  }
  
  // Full AI analysis (asynchronous)
  setTimeout(() => {
    performFullAnalysis(postId);
  }, 0);
}
```

### Vector Search (Qdrant)

#### Setup
```bash
# Docker deployment
docker run -p 6333:6333 qdrant/qdrant

# Health check
curl http://localhost:6333/health
```

#### Vector Operations
```javascript
// Store post embedding
await qdrant.upsert("posts", {
  points: [{
    id: postId,
    vector: embedding, // 384 dimensions
    payload: { authorId, content, timestamp }
  }]
});

// Similarity search
const similar = await qdrant.search("posts", {
  vector: queryEmbedding,
  limit: 10,
  threshold: 0.6
});
```

### Local AI Services (Development)

#### Ollama Setup
```bash
# Install Ollama
ollama pull qwen2.5:7b
ollama serve

# API endpoint
QWEN3_API_URL=http://localhost:11434/v1
```

#### Sentence Transformers
```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(texts)
```

---

## 🗺️ MAP & CIVIC FEATURES {#map-civic-features}

### Map System

#### MapLibre GL Implementation
```javascript
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.stadiamaps.com/styles/alidade_smooth.json',
  center: [-98.5795, 39.8283], // USA center
  zoom: 4
});
```

#### Conversation Bubbles
```javascript
// Bubble structure
{
  id: string,
  coordinates: [lng, lat],
  topic: string,
  participantCount: number,
  lastActivity: Date,
  type: "topic" | "election" | "issue"
}

// Click handler
bubble.on('click', () => {
  navigateToComment(topicId);
});
```

#### Geographic Layers
1. **National Level** (zoom 3-5): Major topics
2. **State Level** (zoom 6-8): State issues
3. **Local Level** (zoom 9+): District concerns

### Electoral District System

#### District Identification
```javascript
// H3 hexagonal indexing
const h3Index = h3.geoToH3(latitude, longitude, 9);

// District lookup
const districts = await getDistrictsForLocation({
  lat, lng, h3Index
});
```

#### Representative Lookup
```javascript
GET /api/political/representatives

Response:
{
  federal: {
    president: {...},
    senators: [{...}, {...}],
    representative: {...}
  },
  state: {
    governor: {...},
    stateSenators: [...],
    stateReps: [...]
  },
  local: {
    mayor: {...},
    council: [...]
  }
}
```

### Civic Data Integration

#### Google Civic API (Deprecated)
- Previously used for representative data
- Removed due to API key issues
- Replaced with crowdsourced system

#### Crowdsourcing System
```javascript
// Submit missing official
POST /api/crowdsourcing/officials
{
  name: string,
  office: string,
  district: string,
  contact: {...}
}

// Verify submission
POST /api/crowdsourcing/verify/:id
{
  isAccurate: boolean,
  corrections?: {...}
}
```

### Election Features

#### Upcoming Elections
```javascript
GET /api/elections/upcoming

Response:
{
  elections: [{
    id: string,
    date: Date,
    type: "general" | "primary" | "special",
    offices: [...],
    candidates: [...]
  }]
}
```

#### Candidate Profiles
```javascript
{
  id: string,
  name: string,
  party: string,
  office: string,
  positions: [...],
  endorsements: [...],
  website: string,
  verified: boolean
}
```

---

## 📱 SOCIAL FEATURES {#social-features}

### Relationship System

#### Follow System (One-way)
```javascript
// Follow user
POST /api/relationships/follow/:userId

// Unfollow
DELETE /api/relationships/follow/:userId

// Check status
GET /api/relationships/follow-status/:userId

// Get lists
GET /api/relationships/:userId/followers
GET /api/relationships/:userId/following

// Bulk operations (max 100 users)
POST /api/relationships/bulk/follow-status
{
  userIds: ["user1", "user2", ...]
}
```

#### Friendship System (Two-way)
```javascript
// Friend request flow
POST /api/relationships/friend-request/:userId → PENDING
POST /api/relationships/friend-request/:userId/accept → ACCEPTED
POST /api/relationships/friend-request/:userId/reject → REJECTED
DELETE /api/relationships/friend/:userId → Remove friend

// Friendship management
GET /api/relationships/:userId/friends
GET /api/relationships/friend-requests/pending
POST /api/relationships/bulk/friend-status
```

#### Combined Status Check
```javascript
GET /api/relationships/status/:userId

Response:
{
  isFollowing: true,
  isFollower: false,
  friendshipStatus: "accepted",
  isPendingFromMe: false,
  isPendingFromThem: false,
  canMessage: true,
  canTag: true
}
```

#### Reusable UI Components
```javascript
// Standard follow/friend button component
function createRelationshipButton(userId, currentStatus) {
  const button = document.createElement('button');
  button.className = 'relationship-btn';
  
  switch(currentStatus.friendshipStatus) {
    case 'accepted':
      button.innerHTML = '👥 Friends';
      button.onclick = () => removeFriend(userId);
      break;
    case 'pending':
      if (currentStatus.isPendingFromThem) {
        button.innerHTML = '✓ Accept Friend Request';
        button.onclick = () => acceptFriendRequest(userId);
      } else {
        button.innerHTML = '⏳ Request Pending';
        button.disabled = true;
      }
      break;
    default:
      if (currentStatus.isFollowing) {
        button.innerHTML = '💔 Unfollow';
        button.onclick = () => unfollowUser(userId);
      } else {
        button.innerHTML = '👤 Follow';
        button.onclick = () => followUser(userId);
      }
  }
  
  return button;
}

// Event-driven updates
document.addEventListener('relationshipChanged', (event) => {
  const { userId, newStatus } = event.detail;
  updateAllRelationshipButtons(userId, newStatus);
});
```

#### Privacy Features
- **Friend-only messaging**: Enabled when friendship is accepted
- **Photo tagging restrictions**: Based on relationship status
- **Content visibility**: Friends can see additional profile information
- **Notification preferences**: Different settings for friends vs followers

#### Real-time Updates
```javascript
// WebSocket events for relationships
socket.on('friend-request', (request) => {
  showFriendRequestNotification(request);
  updatePendingRequestsCount();
});

socket.on('friend-request-accepted', (friendship) => {
  showNotification(`${friendship.user.name} accepted your friend request!`);
  updateRelationshipStatus(friendship.userId, 'accepted');
});

socket.on('new-follower', (follow) => {
  showNotification(`${follow.follower.name} started following you`);
  updateFollowerCount();
});
```

### Messaging System

#### Direct Messages
```javascript
// Start conversation
POST /api/messages/conversations
{
  recipientId: string,
  initialMessage: string
}

// Send message
POST /api/messages/conversations/:id/messages
{
  content: string
}

// Real-time via WebSocket
socket.on('new-message', (message) => {
  appendToConversation(message);
});
```

#### Candidate Messaging
```javascript
// Special queue for officials
POST /api/candidates/message
{
  candidateId: string,
  subject: string,
  message: string,
  isPublic: boolean
}
```

### Notification System

#### Notification Types
```javascript
enum NotificationType {
  FRIEND_REQUEST
  FRIEND_REQUEST_ACCEPTED
  POST_LIKE
  POST_COMMENT
  COMMENT_REPLY
  MENTION
  FOLLOW
  TAG_IN_PHOTO
  MESSAGE
  SYSTEM
}
```

#### Real-time Delivery
```javascript
socket.on('notification', (notification) => {
  showNotificationToast(notification);
  updateNotificationBadge();
});
```

### Feed Algorithm

#### Probability Cloud System
```javascript
// 4-factor weighting
function calculatePostScore(post) {
  const scores = {
    following: isFollowing(post.authorId) ? 0.4 : 0,
    political: post.isPolitical ? 0.25 : 0,
    geographic: isInDistrict(post) ? 0.25 : 0,
    trending: getTrendingScore(post) * 0.1
  };
  
  // Reputation multiplier
  const repMultiplier = getReputationMultiplier(post.authorReputation);
  
  return sum(scores) * repMultiplier;
}
```

#### Feed Composition
- 40% Following content
- 25% Political content
- 25% Geographic (district)
- 10% Trending/discovery

---

## 🏆 REPUTATION SYSTEM {#reputation-system}

### Scoring System

#### Base Rules
- **Starting Score**: 70 points
- **Range**: 0-100 points
- **Daily Recovery**: +2 points max

#### Penalty Structure
| Violation | Points | AI Confidence Required |
|-----------|--------|----------------------|
| Hate Speech | -10 | 80% |
| Harassment | -8 | 75% |
| Spam | -2 | 70% |
| Profanity | -3 | 65% |
| Personal Attack | -1 | 60% |

#### Reputation Tiers
| Score | Badge | Visibility | Effect |
|-------|-------|------------|--------|
| 95-100 | 🟢 Green | +10% | 1.1x multiplier |
| 50-94 | None | Normal | 1.0x multiplier |
| 30-49 | 🟡 Yellow | -10% | 0.9x multiplier |
| 0-29 | 🟤 Brown | -20% | 0.8x multiplier |

### Moderation Pipeline

#### Automated Detection
```javascript
async function moderatePost(post) {
  // 1. Quick keyword check
  if (hasProhibitedKeywords(post.content)) {
    return flagForReview(post);
  }
  
  // 2. AI analysis
  const analysis = await analyzeWithAI(post.content);
  if (analysis.confidence > threshold) {
    applyPenalty(post.authorId, analysis.penalty);
  }
  
  // 3. Community reports
  if (post.reportCount > 3) {
    queueForManualReview(post);
  }
}
```

#### Appeal System
```javascript
// User submits appeal
POST /api/reputation/appeal
{
  eventId: string,
  reason: string,
  evidence?: string
}

// AI reviews appeal
const appealAnalysis = await reviewAppeal(appeal);
if (appealAnalysis.shouldReverse) {
  reverseEPenalty(eventId);
} else if (appealAnalysis.needsHuman) {
  escalateToAdmin(appeal);
}
```

### Content Warnings

#### Warning Display
```javascript
// Low reputation warning
if (author.reputation < 30) {
  post.warning = "This user has a history of violating community guidelines";
}

// Specific violation warnings
if (post.hasHateSpeech) {
  post.warning = "This post may contain hate speech";
  post.collapsed = true;
}
```

### Philosophy

**Key Principles**:
1. **Behavior, not beliefs** - Penalize how people communicate, not what they believe
2. **Transparency** - Users can see why they received penalties
3. **Redemption** - Daily recovery allows users to improve
4. **No censorship** - Content remains visible with warnings
5. **Community-driven** - Reports trigger review, not automatic removal

---

## 📸 MEDIA & PHOTOS {#media-photos}

### Photo Upload System

#### File Requirements
- **Formats**: JPEG, PNG, WebP, GIF
- **Size Limits**: 10MB (images), 5MB (GIFs)
- **Account Limit**: 100MB total storage
- **Processing**: Auto-resize, WebP conversion

#### Upload Flow
```javascript
// Frontend
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('photoType', 'GALLERY');
formData.append('caption', 'My photo');

const response = await apiCall('/api/photos/upload', {
  method: 'POST',
  body: formData,
  skipContentType: true // Let browser set multipart boundary
});

// Backend processing
1. Validate file type and size
2. Generate unique filename
3. Resize if needed (max 1920x1080)
4. Convert to WebP (except GIFs)
5. Upload to Azure Blob Storage
6. Create database record
7. Return URL
```

### Photo Tagging

#### Tagging System
```javascript
// Tag someone in photo
POST /api/photos/:photoId/tag
{
  userId: "user_123",
  xPosition: 45.5, // Percentage from left
  yPosition: 60.2  // Percentage from top
}

// Tag appears as clickable area on photo
<div class="photo-tag" 
     style="left: 45.5%; top: 60.2%"
     onclick="viewProfile('user_123')">
  @username
</div>
```

#### Privacy Controls
```javascript
// User preferences
{
  allowTagging: boolean,
  requireApproval: boolean,
  allowFromFriends: boolean,
  allowFromFollowers: boolean
}

// Approval flow
if (user.requireApproval) {
  tag.status = "PENDING";
  sendNotification(user, "TAG_REQUEST");
}
```

### Gallery Management

#### Gallery Structure
```javascript
{
  userId: string,
  galleries: {
    "Profile Photos": [...],
    "My Photos": [...],
    "Events": [...],
    // Custom galleries
  },
  storageUsed: 45231234, // bytes
  storageLimit: 104857600 // 100MB
}
```

#### Gallery Operations
- Create/rename/delete galleries
- Move photos between galleries
- Bulk select and operations
- Set gallery privacy levels

### Post Media Attachments

#### Attachment Flow
```javascript
// In post composer
1. Click attach media button
2. Select file (photo/GIF)
3. Preview shows in composer
4. Upload happens with post creation
5. Media linked to post in database
```

#### Display Optimization
- Lazy loading for images
- Progressive JPEG loading
- Thumbnail generation
- Full-screen viewer on click

---

## ⚡ PERFORMANCE OPTIMIZATIONS {#performance-optimizations}

### Critical Optimizations Implemented

#### 1. Async Post Creation (10x Speed Boost)
**Before**: 2-3 seconds (blocking AI analysis)
**After**: <100ms (fire-and-forget)

```javascript
// Old (slow)
async function createPost(content) {
  const analysis = await analyzeContent(content); // 2-3s wait
  return savePost(content, analysis);
}

// New (fast)
async function createPost(content) {
  const post = await savePost(content); // <100ms
  analyzeContentAsync(post.id); // Non-blocking
  return post;
}
```

#### 2. API Call Optimization
**Issue**: Redundant profile fetch after update
**Fix**: Removed duplicate `/api/users/profile` call

```javascript
// Before
await updateProfile(data);
const profile = await fetchProfile(); // Redundant!
loadUserProfile(); // Also fetches profile

// After  
await updateProfile(data);
loadUserProfile(); // Single fetch
```

#### 3. Infinite Scroll Implementation
**Critical**: Was broken during audit, now restored
```javascript
function setupMyFeedInfiniteScroll() {
  const container = document.getElementById('myFeedPosts');
  container.addEventListener('scroll', () => {
    if (nearBottom()) loadMoreMyFeedPosts();
  });
}
```

### Frontend Performance

#### Code Organization
- Component-based architecture
- Lazy loading for heavy components
- Event delegation for dynamic content

#### Asset Optimization
- Image lazy loading
- WebP with JPEG fallback
- CDN distribution
- Gzip compression

#### Render Optimization
- Virtual scrolling for long lists
- RequestAnimationFrame for animations
- Debounced search inputs
- Throttled scroll handlers

### Backend Performance

#### Database Optimization
```sql
-- Key indexes
CREATE INDEX idx_posts_author ON posts(authorId);
CREATE INDEX idx_posts_created ON posts(createdAt DESC);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_h3_location ON users(h3Index);
```

#### Query Optimization
- Eager loading with Prisma includes
- Pagination on all list endpoints
- Connection pooling (20 connections)
- Query result caching

#### Caching Strategy
```javascript
// Topic cache (2 minutes)
const topicCache = new Map();
const TOPIC_CACHE_TTL = 120000;

// User session cache
const sessionCache = new Map();
const SESSION_CACHE_TTL = 300000;
```

### Network Optimization

#### API Response Compression
```javascript
app.use(compression({
  filter: (req, res) => {
    return /json|text|javascript|css/.test(res.getHeader('Content-Type'));
  },
  level: 9
}));
```

#### Request Batching
```javascript
// Parallel requests where possible
const [profile, posts, notifications] = await Promise.all([
  fetchProfile(),
  fetchPosts(),
  fetchNotifications()
]);
```

---

## 🐛 KNOWN ISSUES & BUGS {#known-issues-bugs}

### 🚨 RECENTLY FIXED - August 15, 2025

#### My Feed API Endpoint Mismatch (FIXED)
**Issue**: My Feed was not loading any posts due to incorrect API endpoint
- **Problem**: Frontend called `/api/feed/posts` but backend route was `/api/feed/`
- **Root Cause**: Code audit modified API calls without verifying endpoint accuracy
- **Fix**: Updated `loadMyFeedPosts()` to call correct endpoint `/api/feed/`
- **Files Modified**: `frontend/index.html` line 3130
- **Status**: ✅ Fixed in staging, ready for production deployment

#### Code Audit Impact Assessment
**Summary**: August 15 code audit introduced several API path mismatches
- **Staging Environment**: Created to safely test and fix issues before production
- **Testing Process**: All functionality verified on staging before merging to main
- **Documentation**: All fixes documented to prevent future regressions

### Critical Issues

#### 1. Login Persistence Bug (TOP PRIORITY)
**Status**: 🔴 CRITICAL - DEPLOYED FIX PENDING VERIFICATION
**Impact**: Users logged out when refreshing page despite valid tokens
**Root Cause**: 
- App calls `setUserLoggedOut()` immediately on page load
- Batch endpoint `/api/batch/initialize` returning 404 (new routes not deployed)
- Fallback logic enhanced but needs verification

**Deployed Fixes** (commits e207b45, 247fdac):
- Removed premature `setUserLoggedOut()` call in `frontend/index.html:749`
- Enhanced fallback logic in `frontend/src/js/app-initialization.js:79-92`
- Added batch initialization endpoint in `backend/src/routes/batch.ts`

**Next Steps**:
1. Test login persistence after deployment completes
2. Check browser console for "📱 Batch endpoint unavailable, using cached user data"
3. Run localStorage diagnostic: `localStorage.getItem('authToken')` vs `window.authToken`

#### 2. Legislative Routes Not Loading
**Status**: 🔴 ONGOING
**Impact**: Voting records and news features unavailable
**Error**: Module fails to load despite successful compilation
```javascript
// Error in server.ts
import legislativeRoutes from './routes/legislative';
// Module not found at runtime
```
**Workaround**: Features disabled in production

### Minor Issues

#### 2. Checkbox Display Bug
**Status**: 🟡 Minor
**Impact**: Terms checkbox shows as "|" character
**Location**: Registration modal
**Workaround**: Functionally works, visual issue only

#### 3. hCaptcha Console Errors
**Status**: 🟡 Cosmetic
**Impact**: Failed requests show in console
**Note**: Functionality not affected, bypassed in development

### Performance Issues

#### 4. Trending Cache Hits
**Status**: 🟡 Optimization needed
**Impact**: Excessive cache checks
**TODO**: Implement smarter cache invalidation

### UI/UX Issues

#### 5. Mobile Sidebar Z-index
**Status**: 🟡 Minor
**Impact**: Sidebar sometimes appears under content
**Devices**: Some Android devices
**Workaround**: Refresh page

### Resolved Issues (Audit Fixes)

✅ **Infinite Scroll Broken** - Fixed in Phase 6
✅ **Double API Paths** (/api/api/) - Fixed in Phase 3
✅ **My Feed Modal Issue** - Fixed in Phase 3
✅ **Background Image Targeting** - Fixed in Phase 3
✅ **Redundant API Calls** - Fixed in Phase 5

---

## 📝 DEVELOPMENT PRACTICES {#development-practices}

### Code Standards

#### JavaScript/TypeScript
```javascript
// Function naming
async function getUserProfile() {} // Verb + Noun
function validateEmail() {}        // Clear action

// Variable naming
const userId = "123";              // camelCase
const MAX_RETRIES = 3;            // CONSTANTS
let isLoading = false;            // Boolean prefix

// Error handling
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error('Context:', error);
  throw new Error('User-friendly message');
}
```

#### CSS Conventions
```css
/* BEM-inspired naming */
.component {}
.component__element {}
.component--modifier {}

/* Utility classes */
.text-center {}
.mt-2 {} /* margin-top: 2rem */
.hidden {}
```

### Git Workflow

#### Branch Strategy
```bash
main           # Production code
├── feature/*  # New features
├── fix/*      # Bug fixes
└── hotfix/*   # Emergency fixes
```

#### Commit Messages
```bash
# Format: type: description

feat: Add photo tagging system
fix: Restore infinite scroll functionality
docs: Update API documentation
refactor: Clean up deprecated code
test: Add user service tests
```

### Testing Strategy

#### Unit Tests (Jest)
```javascript
describe('UserService', () => {
  test('should create user with valid data', async () => {
    const user = await UserService.create(userData);
    expect(user).toHaveProperty('id');
  });
});
```

#### Integration Tests
- API endpoint testing
- Database transaction tests
- Authentication flow tests

#### E2E Tests (Planned)
- User registration flow
- Post creation and interaction
- Messaging system

### Documentation Requirements

#### Code Documentation
```javascript
/**
 * Calculate post visibility score based on author reputation
 * @param {number} reputation - Author's reputation score (0-100)
 * @returns {number} Visibility multiplier (0.8-1.1)
 */
function getVisibilityMultiplier(reputation) {
  // Implementation
}
```

#### API Documentation
- Swagger/OpenAPI spec maintained
- Request/response examples
- Error codes documented

### Security Practices

#### Never Commit
- API keys
- Connection strings  
- JWT secrets
- Personal data

#### Always Validate
- User input
- File uploads
- API parameters
- Database queries

### Performance Guidelines

#### Frontend
- Lazy load images
- Debounce user input
- Use requestAnimationFrame
- Minimize reflows

#### Backend  
- Use database indexes
- Implement caching
- Paginate results
- Optimize queries

### Code Review Checklist

- [ ] No sensitive data exposed
- [ ] Error handling implemented
- [ ] User input validated
- [ ] Database queries optimized
- [ ] Documentation updated
- [ ] Tests written/updated
- [ ] Accessibility considered
- [ ] Mobile responsiveness checked

### Debugging Tools

#### Browser Console Commands
```javascript
// Development helpers
localStorage.debug = 'true';
window.enableVerboseLogging();
deploymentStatus.check();
adminDebug.inspectUser(userId);
```

#### Backend Debugging
```javascript
// Environment variables
DEBUG=express:*
LOG_LEVEL=debug

// Debug endpoints (dev only)
GET /api/debug/cache
GET /api/debug/connections
POST /api/debug/clear-cache
```

---

## 📜 SESSION HISTORY {#session-history}

### August 15, 2025 - Code Audit & Documentation Consolidation

#### Comprehensive Code Audit
**Critical Incident**: Accidentally removed working infinite scroll during cleanup
**Lesson Learned**: Always verify functionality before removing "deprecated" code

**Audit Results**:
- 200+ lines of deprecated code removed
- Fixed double API path issue (/api/api/)
- Corrected background image targeting
- Eliminated redundant API call
- **MISTAKE**: Temporarily broke infinite scroll (immediately fixed)

#### Documentation Consolidation
**Problem**: 52+ separate documentation files causing fragmentation
**Solution**: Created this MASTER_DOCUMENTATION.md
**Result**: Single source of truth preventing information loss

### August 14, 2025 - Feedback System Optimization

#### Performance Breakthrough
**Problem**: Post creation taking 2-3 seconds
**Cause**: Synchronous AI analysis blocking response
**Solution**: Async fire-and-forget analysis
**Result**: 10x speed improvement (<100ms)

#### Admin Console Enhancement
**Issue**: Showing mock data instead of real feedback
**Fix**: Connected to production database
**Added**: Enhanced keyword detection for UI/UX feedback

### August 13, 2025 - UI Navigation Overhaul

#### Toggle System Implementation
**Changes**:
- All windows now have consistent toggle behavior
- Sidebar toggle button moved to edge
- Default view logic implemented
- Reduced visual clutter

**Functions Added**:
```javascript
toggleMyProfile()
toggleMessages()
showDefaultView()
```

### August 12, 2025 - Map Conversation Bubbles

#### Interactive Map Features
**Implemented**:
- Clickable conversation bubbles
- Topic navigation from map
- Full conversation view in main area
- Geographic topic distribution

### August 11, 2025 - Major Feature Completion

#### Morning Session
- Fixed local development environment
- Implemented hCaptcha bypass for development
- Streamlined registration flow
- Created test user system

#### Afternoon Session
- Fixed UI spacing issues
- Implemented profile address editing
- Phone verification strategy
- Extended session management (7d → 30d)

#### Evening Session
- Map conversation bubble implementation
- Complete conversation UI
- Navigation flow completion

### August 10, 2025 - Advanced Features

#### Relationship System
- Complete follow/friend implementation
- Notification system
- Privacy controls
- Reusable UI components

#### Photo Tagging
- Click-to-tag interface
- Privacy controls
- Approval workflow
- Notification integration

### August 8-9, 2025 - Infrastructure Setup

#### Azure Deployment
- Container Apps configuration
- Static Web Apps setup
- Database migration
- CI/CD pipeline

#### Security Implementation
- JWT authentication
- Rate limiting
- CORS configuration
- Input validation

### Earlier Sessions (July-August 2025)

#### Initial Development
- Project structure setup
- Basic authentication
- Post creation system
- User profiles

#### Feature Additions
- Messaging system
- Political profiles
- Election features
- Trending system

#### AI Integration
- Azure OpenAI setup
- Reputation system
- Topic discovery
- Content moderation

---

## 🔮 FUTURE ROADMAP {#future-roadmap}

### Phase 1: Immediate Fixes (This Week)
- [ ] Fix legislative routes loading issue
- [ ] Resolve checkbox display bug
- [ ] Optimize trending cache system
- [ ] Fix mobile z-index issues

### Phase 2: Short Term (Q4 2025)

#### OAuth Integration
```javascript
// Planned providers
- Google Sign-In
- Microsoft Account
- Apple ID
- Twitter/X (maybe)
```

#### SMS Verification
```javascript
// Twilio integration
- Phone number verification
- 2FA support
- Account recovery
```

#### Mobile Apps
- React Native implementation
- iOS App Store submission
- Google Play submission
- Push notifications

### Phase 3: Medium Term (Q1-Q2 2026)

#### Enhanced AI Features
- GPT-4 integration for better analysis
- Custom fine-tuned models
- Real-time fact checking
- Sentiment tracking

#### Advanced Analytics
- User behavior analytics
- Content performance metrics
- Geographic heat maps
- Predictive trending

#### API Partnerships
- VoteSmart API
- Ballotpedia integration
- Campaign finance data
- Legislative tracking

### Phase 4: Long Term (Q3+ 2026)

#### Blockchain Integration
- Transparent voting records
- Verified identity system
- Immutable audit trails
- Decentralized moderation

#### Global Expansion
- Multi-language support (Spanish, French, etc.)
- International political systems
- Cultural adaptation
- Regional servers

#### Enterprise Features
- White-label solutions
- Organization accounts
- Advanced moderation tools
- Custom deployments

### Phase 5: Vision Goals

#### Democratic Innovation
- Digital town halls
- Referendum platform
- Policy collaboration tools
- Citizen jury system

#### Civic Engagement
- Volunteer matching
- Campaign tools
- Petition platform
- Community organizing

---

## 🆘 TROUBLESHOOTING {#troubleshooting}

### Common Issues & Solutions

#### Authentication Problems

**Issue**: "Invalid token" error
```javascript
// Solution 1: Clear and refresh
localStorage.removeItem('authToken');
window.authToken = null;
// Re-login

// Solution 2: Check token expiry
const token = localStorage.getItem('authToken');
const decoded = JSON.parse(atob(token.split('.')[1]));
console.log('Expires:', new Date(decoded.exp * 1000));
```

**Issue**: Can't log in
```javascript
// Check backend health
fetch('https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health')
  .then(r => r.json())
  .then(console.log);

// Verify CORS
// Should see Access-Control-Allow-Origin header
```

#### Display Issues

**Issue**: Content not loading
```javascript
// Check API calls in Network tab
// Look for 404, 500, or CORS errors

// Manual API test
fetch(API_BASE + '/feed/posts', {
  headers: {
    'Authorization': `Bearer ${authToken}`
  }
}).then(r => r.json()).then(console.log);
```

**Issue**: Styles broken
```bash
# Clear cache
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Check CSS loading
document.styleSheets
```

#### Upload Problems

**Issue**: Photo upload fails
```javascript
// Check file size (10MB limit)
console.log('File size:', file.size / 1024 / 1024, 'MB');

// Check file type
console.log('File type:', file.type);
// Must be: image/jpeg, image/png, image/webp, image/gif

// Test upload endpoint
const formData = new FormData();
formData.append('file', file);
fetch(API_BASE + '/photos/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`
  },
  body: formData
});
```

#### Performance Issues

**Issue**: Slow loading
```javascript
// Check network latency
console.time('API call');
fetch(API_BASE + '/health').then(() => {
  console.timeEnd('API call');
});

// Monitor resource timing
performance.getEntriesByType('resource').forEach(r => {
  if (r.duration > 1000) {
    console.log('Slow resource:', r.name, r.duration);
  }
});
```

#### Database Issues

**Issue**: Data not saving
```sql
-- Check database connections (admin only)
SELECT count(*) FROM pg_stat_activity;

-- Check for locks
SELECT * FROM pg_locks WHERE granted = false;
```

### Development Environment Setup

#### Prerequisites
```bash
# Node.js 18+
node --version

# PostgreSQL 14+
psql --version

# Docker (optional)
docker --version
```

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values

# Database setup
npx prisma migrate dev
npx prisma generate

# Start server
npm run dev
```

#### Frontend Setup
```bash
cd frontend
# No build needed - vanilla JavaScript
# Open index.html directly or use:
python -m http.server 8080
```

#### Local Services

**PostgreSQL**:
```bash
# Docker
docker run -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:14

# Direct
pg_ctl start
```

**Qdrant** (optional):
```bash
docker run -p 6333:6333 qdrant/qdrant
```

**Ollama** (optional):
```bash
ollama pull qwen2.5:7b
ollama serve
```

### Emergency Procedures

#### Backend Crash
```bash
# Restart container
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --revision-suffix emergency-restart

# Check logs
az containerapp logs show \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg
```

#### Database Recovery
```bash
# Point-in-time restore
az postgres flexible-server restore \
  --resource-group unitedwerise-rg \
  --name unitedwerise-db-restored \
  --source-server unitedwerise-db \
  --restore-time "2025-08-15T10:00:00Z"
```

#### Frontend Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main
# Azure Static Web Apps auto-deploys
```

### Support Contacts

**Technical Issues**: 
- GitHub Issues: https://github.com/unitedwerise/issues
- Email: support@unitedwerise.org (planned)

**Security Issues**:
- Email: security@unitedwerise.org (planned)
- Use responsible disclosure

---

## 📋 APPENDIX: Migration from Fragmented Documentation

### Files Consolidated Into This Document

The following 52 files have been merged into this MASTER_DOCUMENTATION.md:

1. API_DOCUMENTATION.md
2. APPROACH_ANALYSIS.md
3. AZURE_AI_INTEGRATION_STATUS.md
4. AZURE_DEPLOYMENT.md
5. AZURE_DEPLOYMENT_STRATEGY.md
6. AZURE_VECTOR_INTEGRATION.md
7. CIVIC_ENGAGEMENT_GAMIFICATION.md
8. CIVIC_SOCIAL_MEDIA_VISION.md
9. COMPREHENSIVE_SECURITY_PLAN_2025-08-13.md
10. CURRENT_API_STATUS.md
11. DATABASE_SECURITY_REVIEW.md
12. DEPLOYMENT.md
13. DEPLOYMENT_STATUS_DEMO.md
14. DEVELOPMENT_PRACTICES.md
15. DOCUMENTATION_INDEX.md
16. DOCUMENTATION_REVIEW_2025-08-09.md
17. DOMAIN_SETUP_GUIDE.md
18. EMAIL_SETUP_GUIDE.md
19. ENHANCED_TOPIC_TRENDING_DEPLOYMENT.md
20. FEED_ALGORITHM_TUNING.md
21. GOOGLE_MAPS_INTEGRATION.md
22. GOOGLE_WORKSPACE_SMTP_FIX.md
23. MAP_MIGRATION_STATUS.md
24. MAP_SYSTEM_COMPLETION.md
25. MAP_TRENDING_SYSTEM.md
26. MONITORING_SETUP.md
27. OAUTH_GOOGLE_IMPLEMENTATION.md
28. ONBOARDING_GUIDE.md
29. PRODUCTION_DEPLOYMENT_GUIDE.md
30. PROJECT_SUMMARY_UPDATED.md
31. QDRANT_SETUP.md
32. QDRANT_SETUP_INSTRUCTIONS.md
33. qdrant-install.md
34. RELATIONSHIP_SYSTEM_DEPLOYMENT.md
35. REPRESENTATIVE_API_SETUP.md
36. REPUTATION_QUICK_FIX.md
37. REPUTATION_SYSTEM_COMPLETE.md
38. RESPONSIVE_DESIGN_SUMMARY.md
39. SECURITY_DEPLOYMENT_CHECKLIST.md
40. SEMANTIC_TOPIC_SETUP.md
41. SESSION_HANDOFF.md
42. SESSION_HANDOFF_2025-08-08.md
43. SESSION_HANDOFF_2025-08-10.md
44. SESSION_HANDOFF_2025-08-11-FINAL.md
45. SESSION_UPDATE_2025-08-11.md
46. SESSION_UPDATE_2025-08-11-PART2.md
47. SESSION_UPDATE_2025-08-12-CONVERSATION_BUBBLES.md
48. SESSION_UPDATE_2025-08-13-UI_NAVIGATION.md
49. SESSION_UPDATE_2025-08-14_FEEDBACK_OPTIMIZATION.md
50. SMS_VALIDATION_FUTURE.md
51. TEST_FILES_TRACKER.md
52. [Others found during consolidation]

### Preserved Files
- **CLAUDE.md** - Quick reference for current state
- **README.md** - GitHub project introduction
- **MASTER_DOCUMENTATION.md** - This file (everything else)

### Consolidation Date
**August 15, 2025, 2:00 PM EST**

### Consolidation Reason
After a critical incident where functional infinite scroll code was accidentally deleted due to missing cross-referenced documentation spread across 52+ files, all documentation has been consolidated into this single source of truth.

---

## 🔚 END OF MASTER DOCUMENTATION

**Remember**: 
- ALL updates go in THIS file
- Do NOT create separate documentation files
- Keep CLAUDE.md as quick reference only
- This consolidation prevents critical information loss

**Total Lines**: ~3,500
**Total Sections**: 20
**Files Consolidated**: 52
**Information Preserved**: 100%

---

*Master Documentation Version 1.0 - Created August 15, 2025*
*Next Review: August 22, 2025*
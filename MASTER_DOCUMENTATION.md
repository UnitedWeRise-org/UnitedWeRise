# 📚 MASTER DOCUMENTATION - United We Rise Platform
**Last Updated**: August 19, 2025  
**Version**: 4.2 (Stripe Nonprofit Payment Integration)  
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
16. [🔍 ENHANCED SEARCH SYSTEM](#enhanced-search-system)
17. [🏛️ CIVIC ORGANIZING SYSTEM](#civic-organizing-system)
18. [🗳️ ELECTION TRACKING SYSTEM](#election-tracking-system)
19. [🤝 RELATIONSHIP SYSTEM](#relationship-system)
20. [🔥 AI TRENDING TOPICS SYSTEM](#ai-trending-topics-system)
21. [💳 STRIPE NONPROFIT PAYMENT SYSTEM](#stripe-nonprofit-payment-system)
22. [🐛 KNOWN ISSUES & BUGS](#known-issues-bugs)
23. [📝 DEVELOPMENT PRACTICES](#development-practices)
24. [📜 SESSION HISTORY](#session-history)
25. [🔮 FUTURE ROADMAP](#future-roadmap)
26. [🆘 TROUBLESHOOTING](#troubleshooting)

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
- ✅ **Stripe Nonprofit Payment Integration (Aug 19)**: Complete tax-deductible donation system with nonprofit rates
- ✅ **Window Management Consistency Fix (Aug 19)**: All main view systems now properly close when others open
- ✅ **Friend Status Rate Limiting Fix (Aug 19)**: Optimized API requests to prevent 429 errors
- ✅ **Comprehensive Analytics Dashboard (Aug 16)**: Complete civic engagement intelligence platform
- ✅ **Election System Integration (Aug 16)**: Real backend API integration replacing mock data
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
├── Payments: Stripe (nonprofit rates)
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

### Payment Endpoints (Stripe Integration) {#payment-endpoints}

#### POST /api/payments/donation
Create tax-deductible donation
```javascript
Request:
{
  amount: number,              // Amount in cents ($25.00 = 2500)
  donationType: "ONE_TIME" | "MONTHLY" | "YEARLY",
  isRecurring?: boolean,       // For monthly/yearly donations
  recurringInterval?: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
  campaignId?: string         // Optional campaign association
}

Response:
{
  success: true,
  data: {
    paymentId: string,         // Internal payment ID
    checkoutUrl: string,       // Stripe Checkout URL
    sessionId: string          // Stripe session ID
  }
}
```

#### POST /api/payments/fee
Create non-tax-deductible fee payment
```javascript
Request:
{
  amount: number,              // Amount in cents
  feeType: "CANDIDATE_REGISTRATION" | "VERIFICATION_FEE" | "PREMIUM_FEATURES" | "EVENT_HOSTING" | "ADVERTISING" | "OTHER",
  description: string,         // Fee description
  candidateRegistrationId?: string
}

Response:
{
  success: true,
  data: {
    paymentId: string,
    checkoutUrl: string,
    sessionId: string
  }
}
```

#### GET /api/payments/campaigns
Get active donation campaigns
```javascript
Response:
{
  success: true,
  data: [
    {
      id: string,
      name: string,
      description: string,
      goal: number,              // Goal amount in cents
      raised: number,            // Amount raised in cents
      featured: boolean,
      isActive: boolean,
      endDate: Date
    }
  ]
}
```

#### GET /api/payments/history
Get user payment history
```javascript
Query params:
  type?: "DONATION" | "FEE"
  limit?: number (default: 10)
  offset?: number (default: 0)

Response:
{
  success: true,
  data: {
    payments: Payment[],
    total: number,
    hasMore: boolean
  }
}
```

#### GET /api/payments/receipt/:paymentId
Get payment receipt
```javascript
Response:
{
  success: true,
  data: {
    receiptUrl: string,        // Stripe receipt URL
    receiptNumber: string,     // Internal receipt number
    taxDeductible: boolean,    // Tax status
    amount: number,
    date: Date
  }
}
```

#### GET /api/payments/tax-summary/:year
Get annual tax summary for donations
```javascript
Response:
{
  success: true,
  data: {
    year: number,
    totalDonations: number,    // Total tax-deductible amount
    donationCount: number,
    donations: Payment[],
    taxMessage: string         // 501(c)(3) tax information
  }
}
```

#### POST /api/payments/webhook
Stripe webhook endpoint (internal use)
- **Content-Type**: application/json (raw)
- **Stripe-Signature**: Required header
- **Purpose**: Handle payment completion, failures, subscription updates

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

### OAuth Social Login System

**Status**: ✅ **FULLY IMPLEMENTED** - Complete OAuth social authentication with Google, Microsoft, and Apple

#### OAuth Provider Support
- **Google**: Google Identity Services (GSI) with ID token verification
- **Microsoft**: Microsoft Authentication Library (MSAL) with Graph API profile access
- **Apple**: Sign in with Apple using identity tokens and user data

#### Authentication Flow
```javascript
// Client-side OAuth initiation
async function handleGoogleLogin() {
  const credential = await google.accounts.id.prompt();
  const response = await fetch('/api/oauth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken: credential.idToken })
  });
}

// Backend token verification and user creation/linking
const profile = await verifyGoogleToken(idToken);
const result = await OAuthService.handleOAuthLogin(profile);
```

#### Database Schema
```sql
-- OAuth provider enum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'MICROSOFT', 'APPLE');

-- User OAuth connections
model UserOAuthProvider {
  id           String        @id @default(cuid())
  userId       String
  provider     OAuthProvider
  providerId   String        // Provider's unique user ID
  email        String?       // Provider email
  name         String?       // Provider display name
  picture      String?       // Profile picture URL
  accessToken  String?       // Encrypted access token
  refreshToken String?       // Encrypted refresh token
  expiresAt    DateTime?     // Token expiration
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

-- User model updates
model User {
  password        String?              // Now nullable for OAuth-only accounts
  oauthProviders  UserOAuthProvider[]
}
```

#### Security Features
**Token Encryption**: OAuth tokens encrypted with AES-256-CBC before database storage
**Account Linking**: Users can link multiple OAuth providers to existing accounts
**OAuth-Only Accounts**: Support for users who register via social login without passwords
**Provider Verification**: Full token verification with each provider's API endpoints

#### API Endpoints
```javascript
// OAuth Authentication
POST /api/oauth/google      // Google OAuth login/register
POST /api/oauth/microsoft   // Microsoft OAuth login/register  
POST /api/oauth/apple       // Apple OAuth login/register

// OAuth Management
POST /api/oauth/link/:provider     // Link provider to existing account
DELETE /api/oauth/unlink/:provider // Unlink provider from account
GET /api/oauth/linked              // Get user's linked providers
```

#### Frontend Integration
**Login/Register Forms**: OAuth buttons with provider branding and icons
**User Profile Settings**: OAuth provider management component for linking/unlinking
**Seamless Authentication**: Automatic account creation or existing account linking

#### Account Management Features
**New User Flow**: OAuth registration creates account with auto-verified email
**Existing User Linking**: Link OAuth providers to accounts created with email/password
**Account Merging**: Smart detection of existing accounts by email address
**Provider Management**: Users can view and manage connected social accounts

#### Error Handling & Edge Cases
**OAuth-Only Login Attempts**: Clear messaging for users trying to use password on OAuth-only accounts
**Provider Conflicts**: Prevents linking same OAuth account to multiple platform accounts
**Last Authentication Method**: Prevents unlinking the only remaining authentication method
**Token Refresh**: Automatic token refresh handling for long-lived sessions

#### User Experience Enhancements
**Provider Recognition**: Visual indicators for which providers are linked to account
**Quick Registration**: One-click account creation through social login
**Profile Data Sync**: Automatic population of name and avatar from OAuth provider
**Consistent Branding**: Provider-specific styling and iconography

**Technical Implementation**:
- `backend/src/services/oauthService.ts` (400+ lines) - Core OAuth authentication logic
- `backend/src/routes/oauth.ts` (350+ lines) - Complete OAuth API endpoints
- `frontend/src/components/OAuthProviderManager.js` (300+ lines) - Profile settings component
- OAuth buttons integrated in login/register modals with proper styling

**Security Compliance**:
- Provider token verification against official APIs
- Encrypted storage of sensitive OAuth tokens
- Audit logging for all OAuth authentication events
- Rate limiting on OAuth endpoints to prevent abuse

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

3. **Comprehensive Analytics Dashboard** ✨ **ENHANCED**
   - **User Growth & Demographics**: Total users, new signups, active users (24h/7d/30d), verified users, geographic distribution
   - **Content & Engagement**: Posts created, comments, likes, messages, engagement rates, political content analysis
   - **Civic Engagement Metrics** 🏛️: Petition signatures, event RSVPs, upcoming elections, civic participation rates
   - **System Health**: Reputation scores, moderation actions, reports filed, performance indicators
   - **Geographic Insights**: State-by-state user growth with visual bar charts
   - **Time Period Analysis**: 7, 30, or 90-day analytics windows with real-time calculations

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

### Comprehensive Analytics System ✨ **NEW**

#### Overview
Advanced analytics platform providing deep insights into civic engagement, user behavior, and platform performance. Built to measure not just social media metrics, but actual democratic participation and community impact.

**Status**: ✅ **FULLY DEPLOYED & OPERATIONAL**

#### Core Analytics Categories

##### 👥 User Growth & Demographics
- **Total Users**: Complete user count with historical growth tracking
- **New User Signups**: Daily/weekly/monthly growth patterns
- **Active Users**: 24-hour, 7-day, and 30-day active user counts
- **Verified Users**: Platform verification status tracking
- **Users with Location**: Geographic profile completion rates
- **Suspended Users**: Moderation impact tracking

##### 📱 Content & Engagement Analytics
- **Content Creation**: Posts, comments, messages, photo uploads
- **Engagement Metrics**: Likes given, average engagement per post
- **Engagement Rate**: (Posts + Comments) / Active Users × 100
- **Political Content Analysis**: Percentage of posts marked as political
- **Content Quality**: Posts with AI feedback analysis
- **Average Post Length**: Character count analytics for content depth

##### 🏛️ Civic Engagement Metrics (Core Mission)
- **Petition Activity**: Petitions created and signatures collected
- **Event Participation**: Events organized and RSVP responses
- **Upcoming Elections**: Active election tracking for voter awareness
- **Civic Participation Rate**: (Petitions + Events) / Active Users × 100
- **Official Communications**: Messages sent to verified representatives
- **Candidate Engagement**: Candidate registrations and profile activity

##### ⚡ System Health & Performance
- **Reputation System**: Average scores, events, low-reputation user tracking
- **Moderation Metrics**: Reports filed, content flags, resolution rates
- **Photo System**: Upload volumes and storage utilization
- **Error Tracking**: System stability and performance indicators
- **API Performance**: Response times and availability metrics

#### Advanced Analytics Features

##### 🗺️ Geographic Intelligence
- **State-by-State Growth**: Visual bar charts showing user distribution
- **Regional Civic Engagement**: Geographic patterns in political participation
- **Electoral District Mapping**: User distribution by voting districts
- **Growth Heat Maps**: Visual representation of platform expansion

##### 📊 Interactive Dashboard Components
- **Metric Cards**: Real-time updating statistics with hover effects
- **Time Period Controls**: 7, 30, or 90-day analytics windows
- **Visual Charts**: Geographic distribution bars and breakdown lists
- **Reputation Analysis**: Event types with positive/negative impact scoring
- **Report Breakdown**: Community moderation patterns and trending issues

##### 🔍 Advanced Calculations
```javascript
// Key Performance Indicators
Engagement Rate = (Posts + Comments) / Active 24h Users × 100
Civic Participation Rate = (Petitions + Events) / Active 30d Users × 100
Political Content Rate = Political Posts / Total Posts × 100
Retention Rate = Users Active After X Days / Total New Users × 100
```

#### API Endpoints

##### GET /api/admin/analytics
**Enhanced analytics endpoint** with comprehensive parallel queries
```javascript
Query Parameters:
- days: 7|30|90 (analytics time window)

Response Structure:
{
  "success": true,
  "data": {
    "period": "30 days",
    "summary": {
      "userGrowth": { /* demographic metrics */ },
      "engagement": { /* content engagement */ },
      "civicEngagement": { /* democratic participation */ },
      "content": { /* content analysis */ },
      "systemHealth": { /* platform health */ }
    },
    "geographicDistribution": [ /* state-by-state data */ ],
    "reputationEventBreakdown": [ /* reputation system activity */ ],
    "reportBreakdown": [ /* moderation patterns */ ],
    "dailyActivity": [ /* time series data */ ]
  }
}
```

#### Database Analytics Queries
**Optimized parallel queries** for maximum performance:
- **User Demographics**: Registration patterns, activity levels, verification status
- **Engagement Analysis**: Content creation, interaction patterns, message volume
- **Civic Participation**: Petition signatures, event attendance, election engagement
- **Content Intelligence**: Political content analysis, feedback detection, quality metrics
- **System Performance**: Reputation events, moderation actions, error tracking

#### Civic Engagement Intelligence
**Unique focus on democratic participation metrics:**

##### Democratic Participation Tracking
- **Petition Signature Rates**: Measure community mobilization effectiveness
- **Event Attendance**: Track real-world civic engagement from digital organizing
- **Electoral Awareness**: Monitor user engagement with upcoming elections
- **Representative Communication**: Track citizen-to-official communication volume

##### Impact Measurement
- **Civic Action Conversion**: Digital engagement → Real-world participation
- **Geographic Civic Health**: Regional patterns in democratic engagement
- **Issue-Based Mobilization**: Topic-specific organizing effectiveness
- **Community Building**: Social features supporting civic participation

#### Performance Optimizations
- **Parallel Query Execution**: All analytics run simultaneously for <500ms response
- **Intelligent Caching**: Time-appropriate caching for frequently accessed metrics
- **Efficient Aggregations**: Optimized SQL queries for large dataset analysis
- **Real-time Updates**: Live dashboard updates with automatic refresh cycles

#### Files Modified
- **Backend**: `/api/admin/analytics` endpoint enhanced with comprehensive queries
- **Frontend**: `admin-dashboard.html` analytics section completely redesigned
- **Database**: Optimized queries across User, Post, Petition, Event, Election tables
- **UI Components**: Responsive metric cards, geographic charts, breakdown lists

#### Future Enhancements
- **📈 Chart Integration**: Add Chart.js for visual trend analysis
- **🎯 Predictive Analytics**: ML-powered growth and engagement forecasting
- **📊 Export Capabilities**: CSV/PDF report generation for stakeholder sharing
- **🔄 Real-time Streaming**: Live-updating dashboard with WebSocket integration

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

## 🔍 ENHANCED SEARCH SYSTEM {#enhanced-search-system}

### Overview
Comprehensive search system with multi-type content discovery and advanced filtering capabilities. Replaces basic search with powerful content exploration tools.

**Status**: ✅ **DEPLOYED & OPERATIONAL**

### Core Features

#### Multi-Type Search
- **Users**: Find people by name, username, location, interests
- **Posts**: Search content with political categorization
- **Officials**: Search representatives by name, office, party, district
- **Topics**: Discover trending political discussions

#### Advanced Filtering
```javascript
// Search API structure
GET /api/search/unified?q=healthcare&type=posts&location=state&timeframe=week
```

**Filter Categories**:
- **Content Type**: Users, Posts, Officials, Topics, All
- **Geographic**: Location-based filtering with proximity search
- **Temporal**: This week, This month, All time
- **Topic Categories**: Healthcare, Education, Environment, etc.

#### Smart Result Display
- **Categorized Results**: Separate sections for each content type
- **Action Integration**: Direct follow, message, view official profiles
- **Contextual Information**: Location, date, engagement metrics
- **Real-time Updates**: Live search with debounced input

### Technical Implementation

#### Frontend Components
```javascript
// Search container with dynamic filtering
function executeEnhancedSearch(query) {
  const searchType = getSelectedSearchType();
  const filters = gatherFilters();
  
  // Parallel API calls for multi-type search
  const searchPromises = buildSearchPromises(query, searchType, filters);
  return Promise.all(searchPromises);
}
```

#### Backend API Structure
- **Unified Search**: `/api/search/unified` - Single endpoint for all content types
- **Type-Specific**: `/api/search/users`, `/api/search/posts`, etc.
- **Filtering Support**: Query parameters for location, time, category filtering
- **Performance**: Indexed search with Prisma full-text search capabilities

#### Database Optimization
```sql
-- Search indexes for performance
CREATE INDEX idx_users_search ON users USING gin(to_tsvector('english', username || ' ' || firstName || ' ' || lastName));
CREATE INDEX idx_posts_search ON posts USING gin(to_tsvector('english', content));
CREATE INDEX idx_posts_political ON posts(isPolitical, createdAt DESC);
```

### UI/UX Features

#### Smart Search Container
- **Responsive Design**: Adapts to mobile and desktop layouts
- **Filter Persistence**: Remembers user preferences across sessions
- **Quick Actions**: One-click follow, message, view profile buttons
- **Result Counts**: Shows match counts for each content type

#### Search Integration
- **Global Search Bar**: Accessible from all pages
- **Contextual Search**: Different defaults based on current page
- **Keyboard Shortcuts**: Quick access with keyboard navigation
- **Search History**: Recent searches for quick re-access

### Files Implemented
- `frontend/index.html` (lines 332-409): Enhanced search UI container
- `frontend/index.html` (lines 4697-5285): Complete search JavaScript implementation
- Backend APIs: Integrated with existing search endpoints

---

## 🏛️ CIVIC ORGANIZING SYSTEM {#civic-organizing-system}

### Overview
Complete civic organizing platform enabling users to create petitions, organize events, and mobilize communities for political action. Transforms digital engagement into real-world civic participation.

**Status**: ✅ **FULLY DEPLOYED & OPERATIONAL**

### Core Features

#### Petition System
- **Creation**: Comprehensive petition builder with category targeting
- **Signature Collection**: Digital signature workflow with progress tracking
- **Geographic Targeting**: Local, County, State, National petition scope
- **Official Integration**: Target specific officials and organizations
- **Progress Visualization**: Real-time signature count and goal tracking

#### Event Organization
- **Event Types**: Town halls, voter registration, candidate forums, rallies, workshops
- **Scheduling**: Date/time management with timezone support
- **RSVP Management**: Capacity tracking and attendance management
- **Location Support**: Physical venues and virtual events
- **Organizer Profiles**: Contact information and organization details

#### Smart Discovery
- **Geographic Filtering**: Find civic activities by proximity
- **Issue-Based Search**: Filter by healthcare, education, environment, etc.
- **Time-Based Filtering**: Upcoming events, active petitions
- **Non-Partisan Design**: Issue-focused categories avoiding tribal labels

### Technical Architecture

#### Database Schema
```sql
-- Petition management
model Petition {
  id: String @id @default(cuid())
  title: String
  description: String @db.Text
  petitionType: PetitionType // PETITION, REFERENDUM
  category: IssueCategory // HEALTHCARE, EDUCATION, etc.
  geographicScope: GeographicScope // LOCAL, COUNTY, STATE, NATIONAL
  targetOfficials: String[]
  signatureGoal: Int
  currentSignatures: Int @default(0)
  status: PetitionStatus @default(ACTIVE)
  location: Json? // Geographic data
  createdBy: String
  expiresAt: DateTime?
  
  creator: User @relation("PetitionCreator")
  signatures: PetitionSignature[]
}

-- Event management
model CivicEvent {
  id: String @id @default(cuid())
  title: String
  description: String @db.Text
  eventType: EventType // TOWN_HALL, VOTER_REGISTRATION, etc.
  category: EventCategory // ELECTORAL, CIVIC_ENGAGEMENT, etc.
  scheduledDate: DateTime
  endDate: DateTime?
  location: Json // Address, coordinates, venue info
  capacity: Int?
  currentRSVPs: Int @default(0)
  organizerInfo: Json // Contact and organization details
  rsvpRequired: Boolean @default(false)
  
  creator: User @relation("EventCreator")
  rsvps: EventRSVP[]
}
```

#### API Endpoints
```javascript
// Petition management
POST /api/civic/petitions          // Create petition
GET  /api/civic/petitions          // Browse with filtering
GET  /api/civic/petitions/:id      // Petition details
POST /api/civic/petitions/:id/sign // Sign petition

// Event management  
POST /api/civic/events             // Create event
GET  /api/civic/events             // Browse with filtering
GET  /api/civic/events/:id         // Event details
POST /api/civic/events/:id/rsvp    // RSVP to event

// User activity
GET  /api/civic/user/petitions     // User's created petitions
GET  /api/civic/user/events        // User's created events
GET  /api/civic/user/signatures    // User's signed petitions
GET  /api/civic/user/rsvps         // User's RSVP'd events

// Search and discovery
GET  /api/civic/search             // Search across petitions and events
```

#### Rate Limiting & Security
```javascript
// Civic action rate limiting (10 actions per 15 minutes)
const civicActionLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many civic actions. Please try again later.' }
});

// Browse rate limiting (60 requests per minute)  
const civicBrowseLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60
});
```

### User Experience

#### Petition Creation Workflow
1. **Type Selection**: Choose between petition or referendum
2. **Issue Definition**: Title, description, target officials
3. **Categorization**: Issue category and geographic scope
4. **Goal Setting**: Signature targets and timeline
5. **Publication**: Immediate activation with sharing tools

#### Event Organization Workflow
1. **Event Type**: Select from categorized event types
2. **Details**: Title, description, agenda information
3. **Scheduling**: Date, time, duration with timezone support
4. **Location**: Address input with venue details
5. **Capacity**: Expected attendance and RSVP settings
6. **Organizer Info**: Contact details and organization

#### Discovery Interface
- **Smart Filters**: Location (nearby, city, county, state, national, custom)
- **Time Filters**: Upcoming, this week, this month, active petitions
- **Type Filters**: Events only, petitions only, specific event types
- **Issue Filters**: Healthcare, education, environment, transportation, etc.

### Civic Engagement Features

#### Progress Tracking
- **Petition Progress**: Visual progress bars showing signature collection
- **Event Attendance**: RSVP counts and capacity utilization
- **User Activity**: Personal dashboard of civic participation
- **Community Impact**: Aggregate participation metrics

#### Non-Partisan Design
- **Issue-Based Categories**: Focus on policy areas rather than ideology
- **Balanced Language**: Neutral terminology avoiding partisan triggers
- **Inclusive Participation**: Welcoming to all political perspectives
- **Solution-Oriented**: Emphasis on constructive civic action

### Integration Points

#### User Profile Integration
- **Organizing History**: Track of created petitions and events
- **Participation Records**: Signatures and RSVPs in user profile
- **Civic Reputation**: Recognition for constructive organizing
- **Geographic Context**: Leverage user location for relevant discovery

#### Notification System
- **Petition Updates**: Progress notifications and milestone alerts
- **Event Reminders**: RSVP confirmations and event reminders
- **Community Activity**: Updates on local civic engagement

### Files Implemented
- `backend/src/services/civicOrganizingService.ts` (850+ lines): Complete business logic
- `backend/src/routes/civic.ts` (400+ lines): Full API implementation with validation
- `backend/scripts/populate-civic-data.ts` (400+ lines): Realistic test data generation
- `frontend/index.html` (lines 7234-7945): Complete UI implementation
- `backend/prisma/schema.prisma`: Database models and relationships

### Sample Data Populated
- **5 Realistic Petitions**: Covering transportation, climate, healthcare, education, housing
- **6 Diverse Events**: Town halls, forums, voter registration, rallies, workshops
- **28 Signatures**: Distributed across petitions with realistic patterns
- **27 RSVPs**: Event attendance with capacity considerations

---

## 🗳️ ELECTION TRACKING SYSTEM {#election-tracking-system}

### Overview
Comprehensive election and ballot information system providing voters with real-time election calendars, candidate profiles, voter guides, and ballot measures. Integrates existing sophisticated UI components with robust backend APIs for location-aware civic engagement.

**Status**: ✅ **FULLY DEPLOYED & OPERATIONAL**

### Core Features

#### Election Calendar & Discovery
- **Location-Aware Elections**: Automatically shows elections for user's state/county/city
- **Multi-Level Coverage**: Federal, State, Local, and Municipal elections
- **Real-Time Data**: Live election dates, registration deadlines, and candidate information
- **Comprehensive Details**: Election types (Primary, General, Special, Municipal) with full descriptions
- **Interactive Cards**: Rich election display with candidate counts and ballot measure summaries

#### Voter Guide & Registration
- **Personalized Voter Guides**: State-specific registration information and voting options
- **Registration Assistance**: Direct links to state voter registration systems
- **Voting Options**: In-person, early voting, and absentee/mail-in ballot information
- **Important Deadlines**: Registration deadlines, ballot request deadlines, and voting periods
- **Polling Information**: Hours, locations, and requirements for each voting method

#### Candidate Profiles & Information
- **Comprehensive Profiles**: Candidate names, parties, incumbent status, platforms
- **Financial Data**: Campaign fundraising, spending, and donation information
- **Interactive Modals**: Detailed candidate views with platform summaries and campaign links
- **Verification Status**: Verified candidates with enhanced profile information
- **Campaign Integration**: Direct links to candidate websites and contact information

#### Ballot Measures & Propositions
- **Complete Ballot Information**: All local, state, and federal ballot measures
- **Detailed Descriptions**: Full measure text, fiscal impact, and arguments
- **Pro/Con Arguments**: Balanced presentation of ballot measure positions
- **Geographic Scope**: Measures displayed by relevance to user's location
- **Historical Context**: Measure numbers, types, and legislative context

### Backend Infrastructure

#### Database Models
- **`Election`**: Core election information with dates, levels, and locations
- **`Office`**: Political offices being contested (President, Governor, Mayor, etc.)
- **`Candidate`**: Candidate profiles with platforms, financial data, and verification
- **`BallotMeasure`**: Ballot propositions with full text and fiscal analysis
- **`FinancialData`**: Campaign finance tracking and transparency

#### API Endpoints
```
GET  /api/elections/calendar         # Location-based election calendar
GET  /api/elections/voter-guide      # Comprehensive voter information
GET  /api/elections/:id              # Specific election details
GET  /api/elections/:id/candidates   # Candidates for specific election
GET  /api/elections/candidates/search # Search candidates by criteria
GET  /api/elections/ballot-measures  # Ballot measures by location
POST /api/elections/:id/register-candidate # Candidate registration
POST /api/elections/candidates/compare # Compare multiple candidates
```

#### Rate Limiting & Performance
- **Elections Rate Limit**: 100 requests per 15-minute window
- **Caching Strategy**: Intelligent caching for election data with admin cache refresh
- **Location Optimization**: State-based filtering for efficient data retrieval
- **Pagination Support**: Configurable limits (default 50, max 100 elections)

### Frontend Integration

#### Enhanced Elections UI
- **Main Content Integration**: Full-screen elections interface replacing mock data
- **Feature Cards**: Election Calendar, Voter Guide, Registration, and Reminders
- **Smart Loading**: Real API calls with graceful fallback to mock data
- **Interactive Elements**: Clickable elections, candidate modals, and action buttons
- **Responsive Design**: Leverages existing elections-system.css for consistent styling

#### Key Frontend Files
- **`elections-system-integration.js`**: Main integration class with API calls
- **`elections-system.css`**: Comprehensive styling (340+ lines)
- **Backend Integration**: Seamless API integration with user location detection

#### User Experience Flow
1. **Access**: Click "Upcoming" in sidebar to open enhanced elections view
2. **Load**: System detects user location and fetches relevant elections
3. **Browse**: Rich election cards with dates, candidates, and ballot measures
4. **Explore**: Click elections for detailed modals with candidate information
5. **Vote**: Access voter guide with registration and polling information

### Sample Data Generated

#### Realistic Election Data
- **6 Elections**: Covering 2024-2025 federal, state, and local elections
- **16 Offices**: President, Senate, House, Governor, Mayor, City Council, etc.
- **10 Candidates**: Diverse political profiles with platforms and financial data
- **5 Ballot Measures**: Realistic propositions covering housing, taxes, and public safety

#### Geographic Coverage
- **States**: California, Illinois, New York
- **Levels**: Federal (President, Congress), State (Governor, Legislature), Local (Mayor, City Council)
- **Types**: General, Primary, Special, and Municipal elections
- **Timeframes**: Elections spanning 2024-2025 with realistic scheduling

### API Response Examples

#### Election Calendar Response
```javascript
{
  "success": true,
  "data": {
    "elections": [{
      "id": "election_123",
      "name": "2024 General Election",
      "type": "GENERAL",
      "level": "FEDERAL",
      "date": "2024-11-05T00:00:00Z",
      "registrationDeadline": "2024-10-15T00:00:00Z",
      "state": "CA",
      "description": "Federal general election for President, Senate, and House",
      "offices": [{ /* office details */ }],
      "ballotMeasures": [{ /* ballot measure details */ }]
    }],
    "count": 6,
    "location": { "state": "CA", "county": null, "city": null }
  }
}
```

#### Voter Guide Response
```javascript
{
  "success": true,
  "data": {
    "elections": [{ /* upcoming elections */ }],
    "registrationInfo": {
      "registrationUrl": "https://www.ca.gov/elections/register",
      "deadlines": [{ "type": "Online Registration", "date": "...", "description": "..." }]
    },
    "votingOptions": {
      "inPerson": { "available": true, "hours": "6:00 AM - 8:00 PM", "locations": ["..."] },
      "earlyVoting": { "available": true, "period": "2 weeks before election", "locations": ["..."] },
      "absentee": { "available": true, "requirements": ["..."], "deadlines": ["..."] }
    }
  }
}
```

### System Integration

#### Cross-Referenced Systems
- **{#enhanced-search-system}**: Elections searchable through main search interface
- **{#civic-organizing-system}**: Elections complement petition and event organizing
- **{#map-civic-features}**: Geographic election data aligns with map-based civic features
- **{#security-authentication}**: Candidate registration requires authenticated users

#### Files Modified
- **Backend**: `elections.ts` routes, `electionsService.ts`, population script
- **Frontend**: `elections-system-integration.js` (1200+ lines enhanced)
- **Database**: Comprehensive election models in Prisma schema
- **Styling**: `elections-system.css` provides complete visual framework

### Known Features & Future Enhancements
- **✅ Real-time election data** from backend APIs
- **✅ Location-aware filtering** by state/county/city
- **✅ Comprehensive voter guides** with registration assistance
- **✅ Interactive candidate profiles** with financial transparency
- **✅ Ballot measure integration** with full text and fiscal analysis
- **🔄 Future**: Integration with official state election APIs
- **🔄 Future**: Candidate messaging and Q&A features
- **🔄 Future**: Election reminders and calendar sync

---

## 🤝 RELATIONSHIP SYSTEM {#relationship-system}

### Overview
Comprehensive social relationship management system supporting both one-way following for content discovery and bidirectional friendships for private messaging and enhanced interactions.

**Status**: ✅ **FULLY DEPLOYED & OPERATIONAL**

### Dual Relationship Model

#### Follow System (One-Way)
- **Purpose**: Content discovery and algorithmic feeds
- **Behavior**: Asymmetric following like Twitter
- **Use Cases**: Following officials, candidates, interest-based accounts
- **Privacy**: Public following relationships
- **Impact**: Affects content visibility in feeds

#### Friend System (Bidirectional)
- **Purpose**: Private messaging and enhanced social features
- **Behavior**: Mutual friendship with request/accept workflow
- **Use Cases**: Personal connections, private discussions
- **Privacy**: Friend-only content and messaging
- **Workflow**: Request → Accept/Reject → Friendship

### Technical Implementation

#### Database Schema
```sql
-- One-way following relationships
model Follow {
  id: String @id @default(cuid())
  followerId: String
  followingId: String
  createdAt: DateTime @default(now())
  
  follower: User @relation("Follower")
  following: User @relation("Following")
  
  @@unique([followerId, followingId])
}

-- Bidirectional friendship system
model Friendship {
  id: String @id @default(cuid())
  requesterId: String
  recipientId: String
  status: FriendshipStatus @default(PENDING) // PENDING, ACCEPTED, REJECTED, BLOCKED
  createdAt: DateTime @default(now())
  acceptedAt: DateTime?
  
  requester: User @relation("FriendshipRequester")
  recipient: User @relation("FriendshipRecipient")
  
  @@unique([requesterId, recipientId])
}
```

#### API Endpoints
```javascript
// Follow system
POST   /api/relationships/follow/:userId        // Follow user
DELETE /api/relationships/follow/:userId        // Unfollow user
GET    /api/relationships/follow-status/:userId // Check follow status
GET    /api/relationships/:userId/followers     // Get followers list
GET    /api/relationships/:userId/following     // Get following list

// Friend system
POST   /api/relationships/friend-request/:userId        // Send friend request
POST   /api/relationships/friend-request/:userId/accept // Accept friend request
POST   /api/relationships/friend-request/:userId/reject // Reject friend request
DELETE /api/relationships/friend/:userId                // Remove friend
GET    /api/relationships/friend-status/:userId         // Check friend status
GET    /api/relationships/:userId/friends               // Get friends list
GET    /api/relationships/friend-requests/pending       // Get pending requests

// Combined utilities
GET    /api/relationships/status/:userId              // Combined follow + friend status
GET    /api/relationships/suggestions/:type           // Follow/friend suggestions
POST   /api/relationships/bulk/follow-status          // Bulk follow status (max 100)
POST   /api/relationships/bulk/friend-status          // Bulk friend status (max 100)
```

### Frontend Integration

#### Reusable JavaScript Classes
```javascript
// Follow system utilities
class FollowUtils {
  static async toggleFollow(userId, currentlyFollowing)
  static async getFollowStatus(userId)
  static createFollowButton(userId, isFollowing, size)
  static updateFollowUI(userId, isFollowing)
}

// Friend system utilities
class FriendUtils {
  static async sendFriendRequest(userId)
  static async acceptFriendRequest(userId)
  static async rejectFriendRequest(userId)
  static async removeFriend(userId)
  static createFriendButton(userId, status)
}

// Combined relationship management
class RelationshipUtils {
  static async getCombinedStatus(userId)
  static createRelationshipButtons(userId, status)
}
```

#### UI Components
- **Follow Buttons**: Toggle follow/unfollow with real-time updates
- **Friend Buttons**: Context-sensitive based on relationship status
- **Status Indicators**: Visual representation of relationship state
- **Action Menus**: Combined follow/friend/message options
- **Notification Integration**: Real-time updates for relationship events

### User Experience Features

#### Smart Button States
```javascript
// Friend button states and actions
switch (friendshipStatus) {
  case 'none':         // "Add Friend" (blue) → Send request
  case 'request_sent': // "Request Sent" (gray, disabled)
  case 'request_received': // "Accept Request" (green) → Accept
  case 'friends':      // "Friends" (green) → Options menu
}
```

#### Real-Time Updates
- **Event-Driven**: Custom events for relationship changes
- **UI Synchronization**: All buttons update simultaneously
- **Notification Integration**: Real-time notifications for relationship events
- **Count Updates**: Follower/friend counts update automatically

#### Privacy Integration
- **Message Permissions**: Only friends can send private messages
- **Content Visibility**: Friend-only posts and enhanced privacy
- **Relationship Discovery**: Mutual friend suggestions and connections

### Integration Points

#### Notification System
```javascript
// Notification types for relationships
enum NotificationType {
  FOLLOW              // User started following you
  FRIEND_REQUEST      // Someone sent friend request
  FRIEND_ACCEPTED     // Friend request was accepted
}
```

#### Privacy Controls
- **Messaging**: Only friends can initiate private conversations
- **Content**: Enhanced privacy options for friend-only content
- **Discovery**: Relationship-based content recommendations

#### Feed Algorithm Integration
- **Following Impact**: Following affects content visibility in feeds
- **Friend Priority**: Friend content gets higher priority
- **Suggestion Engine**: Mutual connections for friend/follow suggestions

### Files Implemented
- `backend/src/services/relationshipService.ts` (683 lines): Complete relationship logic
- `backend/src/routes/relationships.ts` (309 lines): All API endpoints
- `frontend/src/js/relationship-utils.js` (400+ lines): Core utilities
- `frontend/src/components/user-relationship-display.js` (250+ lines): Reusable UI

### Performance Optimizations
- **Bulk Operations**: Check status for up to 100 users simultaneously
- **Atomic Transactions**: Ensure data consistency during relationship changes
- **Event Delegation**: Efficient handling of dynamic relationship buttons
- **Caching**: Relationship status caching for improved performance

---

## 🔥 AI TRENDING TOPICS SYSTEM {#ai-trending-topics-system}

**Status**: ✅ **FULLY IMPLEMENTED** - AI-powered topic aggregation with dual-vector stance detection

### System Overview

**Revolutionary Advancement**: Transforms traditional post-based trending into intelligent topic discovery with opposing viewpoint analysis. Uses dual-vector clustering to capture nuanced political discourse across support and opposition stances.

### Dual-Vector Topic Clustering

#### Advanced AI Architecture
```javascript
// Dual-vector clustering process
1. Post Collection → Vector Embeddings → Initial Clustering (70% similarity)
2. Stance Analysis → AI Classification (support/oppose/neutral)
3. Dual Centroids → Support Vector + Opposition Vector per topic
4. Topic Synthesis → AI-generated titles and stance summaries
5. Geographic Filtering → National/State/Local scope awareness
```

#### Stance Detection Technology
- **Azure OpenAI Integration**: Analyzes each post to determine stance (support/oppose/neutral)
- **Separate Vector Centroids**: Creates distinct vectors for supporting vs opposing viewpoints
- **Nuanced Classification**: Captures complex political positions beyond simple keyword matching
- **Cross-Stance Clustering**: Posts about same topic but with different stances properly grouped

### Enhanced User Experience

#### Trending Window Transformation
```html
<!-- Before: Simple post list -->
<div>@username: "Some political post..." (❤️ 5 💬 2)</div>

<!-- After: Rich topic cards with stance analysis -->
<div class="topic-item">
  <h4>💭 Universal Healthcare</h4>
  <div class="sentiment-bar">73% | 27%</div>
  <div class="stance-summary">
    <div class="support">For: Healthcare as human right, cost savings</div>
    <div class="oppose">Against: Government control concerns, tax burden</div>
  </div>
  <div class="metadata">💬 47 posts • 📍 national</div>
</div>
```

#### Topic Mode Navigation
- **Click-to-Filter**: Topics are clickable to filter My Feed
- **Topic Mode Header**: Clear visual indicator with stance breakdown
- **Stance Indicators**: Individual posts show supporting/opposing badges
- **Easy Exit**: One-click return to algorithm-based feed
- **Preserved Functionality**: Infinite scroll, likes, comments work in topic mode

### Geographic Intelligence

#### Multi-Scope Aggregation
```javascript
// Geographic-aware topic discovery
const topics = await TopicAggregationService.aggregateTopics({
  geographicScope: 'national', // 'national' | 'state' | 'local'
  userState: 'CA',
  userCity: 'San Francisco',
  timeframeHours: 168 // 7 days lookback
});
```

#### Intelligent Geographic Filtering
- **National View**: Broad topics with local context injection
- **State View**: State-specific issues with national context
- **Local View**: Hyperlocal topics (city council, local measures)
- **User-Adaptive**: Topics adapt to user's current geographic setting

### Map Integration Synchronization

#### Real-Time Topic Rotation
- **15-Second Cycles**: Map displays 3 topics, rotating every 15 seconds
- **9-Topic Pool**: Backend provides 9 topics for continuous rotation
- **Synchronized Display**: Same topics appear in trending window and map bubbles
- **Geographic Distribution**: Topics distributed across major US cities

#### Enhanced Map Bubbles
```javascript
// AI topic bubbles on map
{
  text: "💭 Healthcare Reform (73% vs 27%) 🌎",
  coords: [40.7128, -74.0060], // NYC
  topicId: "topic_123",
  supportPercentage: 73,
  opposePercentage: 27,
  geographicScope: "national"
}
```

### Performance & Caching

#### Smart Caching Strategy
- **15-Minute Cache**: Balances freshness with computational efficiency
- **Geographic Cache Keys**: Separate caches for national/state/local views
- **Graceful Degradation**: Falls back to post-based trending if AI unavailable
- **Background Refresh**: Cache updates don't block user interactions

#### Computational Optimization
```javascript
// Efficient topic aggregation pipeline
1. Parallel Database Queries → Posts + User Geography
2. Vector Similarity Clustering → O(n²) optimized with thresholds
3. Batch AI Analysis → Multiple posts per API call
4. Cached Centroid Calculation → Reuse for similar topics
5. Geographic Scoring → Weighted relevance by user location
```

### API Endpoints

#### Core Topic Discovery
```javascript
// Get trending topics with stance analysis
GET /api/trending/topics?scope=national&limit=7
Response: {
  success: true,
  scope: "national",
  topics: [{
    id: "topic_abc123",
    title: "Medicare for All Debate",
    support: {
      percentage: 67,
      summary: "Healthcare as fundamental right, cost savings through efficiency",
      postCount: 34
    },
    oppose: {
      percentage: 33,
      summary: "Government overreach concerns, implementation costs",
      postCount: 16
    },
    totalPosts: 50,
    geographicScope: "national"
  }]
}
```

#### Topic Filtering
```javascript
// Get posts for specific topic with stance indicators
GET /api/trending/topics/:topicId/posts?stance=all&limit=20
Response: {
  topic: { id, title, supportSummary, opposeSummary, percentages },
  posts: [{ ...postData, stance: "support" | "oppose" | "neutral" }],
  pagination: { page, limit, total, hasMore }
}
```

#### Map Integration
```javascript
// Rotating topics for map display
GET /api/trending/map-topics?count=9
Response: {
  topics: [{ id, title, supportPercentage, opposePercentage, geographicScope }]
}
```

### Database Schema Enhancement

#### Topic Aggregation Models
```sql
-- Enhanced topic caching (conceptual - topics are computed, not stored)
interface AggregatedTopic {
  id: string,
  title: string,
  supportVector: { vector: number[], posts: Post[], summary: string, percentage: number },
  opposeVector: { vector: number[], posts: Post[], summary: string, percentage: number },
  totalPosts: number,
  score: number,
  geographicScope: 'national' | 'state' | 'local',
  createdAt: Date,
  expiresAt: Date
}
```

### Technical Implementation

#### Backend Services
- **`TopicAggregationService.ts`** (500+ lines): Dual-vector clustering engine
- **`trendingTopics.ts`** (200+ lines): RESTful API endpoints
- **Azure OpenAI Integration**: Stance analysis and topic summarization
- **Vector Similarity Engine**: Efficient post clustering algorithms

#### Frontend Integration
- **Enhanced Trending Window**: Rich topic cards with stance visualization
- **Topic Mode System**: Complete My Feed filtering with visual indicators
- **Map Synchronization**: Real-time topic rotation and geographic display
- **Responsive Design**: Optimized for mobile and desktop experiences

### User Flow Example

#### Complete Topic Discovery Journey
```
1. User sees trending topic: "💭 Climate Action (82% vs 18%)"
2. Clicks topic → My Feed filters to climate posts
3. Header shows: "📍 Viewing: Climate Action" with stance breakdown
4. Posts display with stance badges: "Supporting" | "Opposing" | "Neutral"
5. User can scroll through topic-filtered content with normal interactions
6. Click "✕ Exit Topic Mode" → Return to algorithm-based feed
```

#### Geographic Context Adaptation
```
User in National View → Shows national climate debate
User switches to State View → Shows California climate policies
User switches to Local View → Shows Bay Area environmental initiatives
```

### Advanced Features

#### Intelligent Content Classification
- **Stance Verification**: Cross-references post content with vector similarity
- **Nuanced Positioning**: Captures moderate and complex political positions
- **Dynamic Thresholds**: Adjusts similarity requirements based on topic complexity
- **Quality Filtering**: Ensures topics have substantial opposing viewpoints

#### Trending Algorithm Integration
- **Relevance Scoring**: Recency + Engagement + Geographic + Velocity
- **Democratic Balance**: Equal weight to majority and minority viewpoints
- **Topic Lifecycle**: Natural emergence and decline of trending topics
- **Anti-Gaming**: Resistant to artificial topic manipulation

### Future Enhancements (Roadmap)

#### Planned Improvements
- **Topic Bookmarking**: Save interesting topics for later viewing
- **Stance Filtering**: View only supporting or opposing posts for a topic
- **Historical Topics**: Track how topics and stances evolve over time
- **Personalized Topics**: AI-curated topics based on user interests
- **Cross-Platform Sync**: Topic preferences across devices

#### Technical Optimizations
- **Real-Time Clustering**: Live topic updates as new posts arrive
- **Advanced Stance Detection**: Multi-dimensional stance analysis
- **Predictive Topics**: Anticipate trending topics before they peak
- **Multi-Language Support**: Expand beyond English political discourse

### Files Implemented
- `backend/src/services/topicAggregationService.ts` (600+ lines) - Dual-vector clustering engine
- `backend/src/routes/trendingTopics.ts` (200+ lines) - Complete API endpoints
- `frontend/index.html` (Lines 2322-2980) - Enhanced trending display and topic mode
- Enhanced map integration for topic rotation and geographic distribution

### Performance Metrics
- **Topic Generation**: 15-minute cache refresh cycle
- **Stance Analysis**: <500ms per post classification
- **Vector Clustering**: Optimized for 1000+ posts efficiently
- **Geographic Filtering**: Sub-second response for scope changes
- **Map Rotation**: Seamless 15-second topic cycling

### Security & Privacy
- **Content Filtering**: Maintains existing content moderation standards
- **Geographic Privacy**: No precise location tracking required
- **Stance Neutrality**: AI analysis designed to avoid political bias
- **User Control**: Easy opt-out of geographic-based topic filtering

---

## 💳 STRIPE NONPROFIT PAYMENT SYSTEM {#stripe-nonprofit-payment-system}

**Status**: ✅ **FULLY IMPLEMENTED** - Complete nonprofit payment processing with tax-deductible donations and fee collection

### System Overview

**Revolutionary Advancement**: Integrated Stripe payment processing specifically optimized for 501(c)(3) nonprofit operations. Supports both tax-deductible donations and non-deductible fee payments with comprehensive receipt generation and tax reporting.

### Nonprofit-Optimized Features

#### Tax Classification System
```javascript
// Automatic tax status classification
PaymentType.DONATION → taxDeductible: true  (501c3 compliant)
PaymentType.FEE      → taxDeductible: false (service payments)
```

#### Dual Payment Infrastructure
- **Tax-Deductible Donations**: One-time and recurring gifts with 501(c)(3) receipts
- **Non-Deductible Fees**: Candidate registration, verification, premium features
- **Automatic Classification**: Smart routing based on payment type
- **Receipt Generation**: Tax-compliant documentation for all transactions

### Frontend Integration

#### Donation Button & Modal Interface
```html
<!-- Sidebar Integration -->
<div class="thumb" id="donationThumb" title="Support Our Mission">
  💝 <span class="label">Donate</span>
</div>
```

#### Professional Donation Modal
- **Preset Amounts**: $10, $25, $50, $100, $250, $500
- **Custom Amount Input**: User-defined donation amounts
- **Donation Types**: One-time, Monthly, Yearly recurring options
- **Test Mode Warning**: Clear instructions for Stripe test card usage
- **Tax Information**: 501(c)(3) status and EIN display
- **Mobile Responsive**: Optimized for all device sizes

#### Success & Cancel Pages
- `frontend/donation-success.html` - Thank you page with receipt details
- `frontend/donation-cancelled.html` - Cancellation page with retry option
- Automatic receipt generation and email delivery
- Tax-deductible messaging and nonprofit information

### Backend Architecture

#### Database Schema (Comprehensive Payment Models)
```sql
-- Core Payment Table
model Payment {
  id                  String           @id @default(cuid())
  userId              String
  amount              Int              // Amount in cents
  type                PaymentType      // DONATION or FEE
  status              PaymentStatus    @default(PENDING)
  
  // Stripe Integration
  stripePaymentIntentId String?        @unique
  stripeChargeId      String?          @unique
  stripeCustomerId    String?
  
  // Tax Classification
  taxDeductible       Boolean          @default(false)
  taxYear             Int?
  
  // Donations
  donationType        DonationType?    // ONE_TIME, MONTHLY, YEARLY
  isRecurring         Boolean          @default(false)
  recurringInterval   RecurringInterval?
  campaignId          String?
  
  // Fees
  feeType             FeeType?         // CANDIDATE_REGISTRATION, etc.
  candidateRegistrationId String?      @unique
  
  // Receipt System
  receiptUrl          String?
  receiptNumber       String?          @unique
  receiptSent         Boolean          @default(false)
  receiptSentAt       DateTime?
  
  // Timestamps
  createdAt           DateTime         @default(now())
  processedAt         DateTime?
  
  // Relationships
  user                User             @relation(fields: [userId], references: [id])
  refunds             Refund[]
  webhooks            PaymentWebhook[]
}

-- Stripe Customer Management
model StripeCustomer {
  id                  String           @id @default(cuid())
  userId              String           @unique
  stripeCustomerId    String           @unique
  email               String
  name                String?
  taxExempt           Boolean          @default(false)
}

-- Donation Campaigns
model DonationCampaign {
  id                  String           @id @default(cuid())
  name                String
  description         String?
  goal                Int?             // Goal in cents
  raised              Int              @default(0)
  taxDeductible       Boolean          @default(true)
  isActive            Boolean          @default(true)
  featured            Boolean          @default(false)
}

-- Webhook Processing
model PaymentWebhook {
  id                  String           @id @default(cuid())
  stripeEventId       String           @unique
  eventType           String
  processed           Boolean          @default(false)
  payload             Json
}
```

#### Stripe Service Architecture
```typescript
// Core service: backend/src/services/stripeService.ts
export class StripeService {
  // Customer Management
  static async getOrCreateCustomer(userId: string): Promise<string>
  
  // Donation Processing
  static async createDonation(params: {
    userId: string;
    amount: number;              // In cents
    donationType: DonationType;
    isRecurring?: boolean;
    recurringInterval?: string;
    campaignId?: string;
  })
  
  // Fee Processing
  static async createFeePayment(params: {
    userId: string;
    amount: number;
    feeType: FeeType;
    description: string;
    candidateRegistrationId?: string;
  })
  
  // Webhook Handling
  static async handleWebhook(signature: string, payload: Buffer)
  
  // Receipt Generation
  static async generateReceipt(paymentId: string)
}
```

### API Integration

#### Payment Endpoints
All payment endpoints documented in [Payment Endpoints](#payment-endpoints) section:
- `POST /api/payments/donation` - Create tax-deductible donations
- `POST /api/payments/fee` - Create non-deductible fee payments
- `GET /api/payments/campaigns` - List active donation campaigns
- `GET /api/payments/history` - User payment history
- `GET /api/payments/receipt/:paymentId` - Generate receipts
- `GET /api/payments/tax-summary/:year` - Annual tax summaries
- `POST /api/payments/webhook` - Stripe webhook processing

#### Cross-Referenced Systems
- **{#security-authentication}**: All payments require user authentication
- **{#api-reference}**: Complete endpoint documentation
- **{#database-schema}**: Payment model relationships

### Stripe Configuration

#### Environment Variables
```bash
# Stripe API Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_[YOUR_TEST_SECRET_KEY]
STRIPE_PUBLISHABLE_KEY=pk_test_[YOUR_TEST_PUBLISHABLE_KEY]
STRIPE_WEBHOOK_SECRET=whsec_[YOUR_WEBHOOK_SECRET]

# Redirect URLs
SUCCESS_URL=https://www.unitedwerise.org/donation-success.html
CANCEL_URL=https://www.unitedwerise.org/donation-cancelled.html

# Nonprofit Information
TAX_EIN=XX-XXXXXXX  # 501(c)(3) EIN number
```

#### Stripe Webhook Events
```javascript
// Supported webhook events
'checkout.session.completed'     → Payment completion
'payment_intent.succeeded'       → Payment success confirmation
'payment_intent.payment_failed'  → Payment failure handling
'customer.subscription.created'  → Recurring donation setup
'customer.subscription.updated'  → Subscription modifications
'customer.subscription.deleted'  → Cancellation handling
```

### Security & Compliance

#### 501(c)(3) Compliance
- **Tax-Deductible Receipts**: Automatic generation with proper 501(c)(3) language
- **EIN Display**: Organization tax ID prominently displayed
- **Receipt Tracking**: Comprehensive audit trail for all donations
- **Annual Summaries**: Automated tax-year donation summaries

#### PCI Compliance
- **No Card Storage**: All sensitive data handled by Stripe
- **Secure Redirect**: Checkout happens on Stripe's secure domain
- **Webhook Verification**: Cryptographic signature validation
- **Token-Based Auth**: Secure user authentication for all payments

#### Data Protection
- **Minimal Data Storage**: Only payment metadata stored locally
- **Encrypted Communication**: All API calls over HTTPS
- **Audit Logging**: Complete webhook and payment event logging
- **GDPR Compliant**: User data handling follows privacy regulations

### Testing & Development

#### Test Card Information
```javascript
// Stripe Test Cards (for development)
const testCards = {
  success: '4242 4242 4242 4242',  // Always succeeds
  decline: '4000 0000 0000 0002',  // Always declined
  insufficient: '4000 0000 0000 9995', // Insufficient funds
  expired: '4000 0000 0000 0069'   // Expired card
};

// Test amounts trigger specific behaviors
$25.00  → Normal processing
$100.00 → Requires authentication
$5.00   → International card
```

#### Development Workflow
1. **Frontend Testing**: Use test-donation-ui.html for rapid iteration
2. **API Testing**: Direct endpoint testing with valid auth tokens
3. **Webhook Testing**: Stripe CLI for local webhook development
4. **Receipt Testing**: Verify tax-compliant receipt generation

### Performance & Optimization

#### Caching Strategy
- **Campaign Data**: 15-minute cache for active campaigns
- **Payment History**: User-specific caching with 5-minute TTL
- **Receipt Generation**: One-time generation with permanent storage

#### Error Handling
```javascript
// Comprehensive error handling
try {
  const result = await StripeService.createDonation(params);
  return { success: true, data: result };
} catch (error) {
  // Log for debugging
  console.error('Donation creation error:', error);
  
  // Update payment status
  await prisma.payment.update({
    where: { id: paymentId },
    data: { 
      status: PaymentStatus.FAILED,
      failureReason: error.message 
    }
  });
  
  // Return user-friendly error
  return { success: false, error: 'Failed to create donation' };
}
```

### Files Modified/Created

#### Backend Files
- `backend/src/services/stripeService.ts` - Core Stripe integration service
- `backend/src/routes/payments.ts` - Payment API endpoints  
- `backend/prisma/schema.prisma` - Payment database models
- `backend/.env` - Stripe configuration variables

#### Frontend Files
- `frontend/src/js/donation-system.js` - Donation modal and UI system
- `frontend/index.html` - Added donation button to sidebar
- `frontend/donation-success.html` - Success page with receipt info
- `frontend/donation-cancelled.html` - Cancellation page with retry

#### Test Files
- `test-donation-ui.html` - Development testing interface
- `test-stripe-debug.js` - API endpoint testing script

### Deployment Status

#### Production Readiness
- ✅ **Backend Deployed**: All APIs operational with proper error handling
- ✅ **Frontend Deployed**: Donation button and modal fully functional
- ✅ **Database Migrations**: All payment tables created and indexed
- ✅ **Environment Variables**: Stripe keys and URLs configured
- ✅ **Success/Cancel Pages**: Complete user flow implemented

#### Testing Status
- ✅ **API Endpoints**: All payment endpoints return 200 status
- ✅ **Stripe Integration**: Checkout URLs generated successfully
- ✅ **Modal Interface**: Professional donation UI deployed
- ✅ **Error Handling**: Graceful degradation for all failure modes
- ✅ **Mobile Responsive**: Optimized for all device sizes

### Future Enhancements

#### Planned Features
- **Live Stripe Keys**: Transition from test to production environment
- **Enhanced Campaigns**: Advanced fundraising campaign management
- **Donor Analytics**: Comprehensive donation tracking and reporting
- **Recurring Management**: User dashboard for subscription management
- **Advanced Receipts**: PDF generation and email delivery automation

#### Integration Opportunities
- **{#civic-organizing-system}**: Fundraising for civic events and causes
- **{#election-tracking-system}**: Campaign contribution tracking
- **{#relationship-system}**: Social fundraising and peer-to-peer donations

---

## 🐛 KNOWN ISSUES & BUGS {#known-issues-bugs}

### 🚨 RECENTLY FIXED - August 17, 2025

#### CORS & Rate Limiting Production Issues (FIXED)
**Issue**: Frontend unable to connect to backend due to CORS blocking and 429 rate limiting errors
- **Problem**: Rate limits too restrictive (30 requests/min) for frontend initialization
- **Root Cause**: Burst rate limiter preventing normal user operations
- **Fix**: Increased burst limits from 30→80 requests/min for anonymous users
- **Fix**: Added health check endpoint exemptions from rate limiting
- **Files Modified**: `backend/src/middleware/rateLimiting.ts`
- **Status**: ✅ Fixed and deployed to production

#### API Error Handling Improvements (FIXED)
**Issue**: Multiple 500 internal server errors causing frontend crashes
- **Problem**: Friend-status and trending endpoints throwing unhandled exceptions
- **Root Cause**: Missing error handling and safe fallbacks
- **Fix**: Added try-catch blocks with graceful degradation
- **Fix**: Trending topics returns empty array instead of 500 error
- **Files Modified**: `backend/src/routes/users.ts`, `backend/src/routes/feed.ts`
- **Status**: ✅ Fixed and deployed to production

#### Civic Organizing Window Size (FIXED)
**Issue**: Civic Organizing window too large and not matching other windows
- **Problem**: Different CSS positioning from elections-main-view pattern
- **Root Cause**: Inconsistent window sizing across features
- **Fix**: Updated CSS to match elections window behavior (same size, z-index, sidebar awareness)
- **Fix**: Added proper window replacement and sidebar state monitoring
- **Files Modified**: `frontend/src/styles/search.css`, `frontend/index.html`
- **Status**: ✅ Fixed and ready for testing

### 🚨 PREVIOUSLY FIXED - August 15, 2025

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

### August 17, 2025 - Production Error Handling & UI Consistency

#### Backend Error Handling Fixes
**Critical Production Issues**: Frontend unable to connect due to CORS and rate limiting
**Root Cause**: Rate limiting too aggressive for normal frontend operations

**Fixes Implemented**:
- **Rate Limiting**: Increased burst limits from 30→80 requests/min for anonymous users
- **CORS Configuration**: Verified proper CORS headers and origin allowlist
- **Error Handling**: Added try-catch blocks with safe fallbacks for all failing endpoints
- **API Responses**: Trending topics returns empty array instead of 500 errors
- **Friend Status**: Safe default responses instead of crashes

**Technical Details**:
- Modified `backend/src/middleware/rateLimiting.ts` - burst limiter configuration
- Updated `backend/src/routes/users.ts` - friend-status endpoint error handling
- Updated `backend/src/routes/feed.ts` - trending feed error handling
- Deployed via Azure Container Apps with environment variable triggers

#### UI Window Consistency
**Issue**: Civic Organizing window didn't match elections-main-view behavior
**Fix**: Standardized window sizing and behavior across all main content areas

**Changes Made**:
- **CSS Positioning**: Updated to match elections window (same size, z-index, positioning)
- **Sidebar Awareness**: Added mutation observer for sidebar state changes
- **Window Replacement**: Proper closing of other windows when opened
- **Responsive Design**: Consistent left positioning with sidebar expansion

**Files Modified**:
- `frontend/src/styles/search.css` - CSS positioning updates
- `frontend/index.html` - JavaScript behavior and sidebar monitoring

#### Production Deployment
**Container Revision**: backend--0000043 deployed successfully
**Verification**: All endpoints returning proper responses
**Result**: ✅ CORS errors eliminated, rate limiting optimized, UI consistency achieved

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

#### 🚨 RECENTLY RESOLVED (August 17, 2025)

**Issue**: CORS policy blocking frontend requests
```javascript
// FIXED: Backend CORS configuration now includes all required origins
// Solution: Rate limiting adjusted from 30→80 requests/min
// Check if resolved:
fetch('https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health')
  .then(r => console.log('Status:', r.status, 'CORS:', r.headers.get('access-control-allow-origin')));
```

**Issue**: 429 "Too Many Requests" errors
```javascript
// FIXED: Burst rate limiter increased to 80 requests/min
// Solution: Health check endpoints exempted from rate limiting
// Check rate limits:
console.log('Rate limit headers:', 
  response.headers.get('ratelimit-remaining'),
  response.headers.get('ratelimit-reset'));
```

**Issue**: 500 Internal Server Error on friend-status
```javascript
// FIXED: Error handling added with safe fallbacks
// Solution: Returns default values instead of crashing
// Test endpoint:
fetch('/api/users/friend-status/test123', {
  headers: { 'Authorization': 'Bearer invalid' }
}).then(r => r.json()).then(console.log);
// Should return: {isFriend: false, isPending: false, status: 'none'}
```

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
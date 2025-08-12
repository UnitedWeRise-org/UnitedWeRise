# United We Rise API Documentation

## Overview

The United We Rise API is a comprehensive REST API for a political social media platform. It provides endpoints for user authentication, content management, political information, moderation, and administrative functions.

## 🆕 Latest Features

### Enhanced Frontend UI System (New!)
- **Space-optimized interfaces** - All panels now use main content area effectively
- **Candidate System** - AI-powered comparison, direct messaging, enhanced elections display
- **Officials Panel** - Federal/state/local representatives with contact options and voting records
- **Elections Management** - Dynamic calendar, voter guide, registration status, contest analytics
- **Trending System** - Multiple view modes, content filtering, analytics dashboard
- **Responsive Design** - 3-tier system (Desktop >1024px, Tablet 768-1024px, Mobile <768px)
- **Map Integration** - Smart overlay system preserving map functionality

### MapLibre GL Migration (Fully Complete!)
- **Modern Mapping** - Migrated from Leaflet to MapLibre GL for better responsive behavior
- **Responsive Maps** - Map maintains visible area (not zoom) when container resizes
- **Clean Interface** - Removed navigation clutter, north-locked orientation, mouse/touch-only zoom
- **Professional Controls** - Redesigned button layout: [National] [State] [Local] [Collapse] [×]
- **Perfect Collapse/Expand** - Toggle between full-screen and corner view (25% width, 30% height)
- **Complete Show/Hide** - Close map entirely, restore from sidebar with seamless state management
- **Smooth Loading** - Proper loading overlay prevents ugly initialization flash
- **Performance Boost** - Hardware-accelerated vector rendering with WebGL
- **Full Compatibility** - Seamless integration with existing codebase via compatibility layer
- **Local Development Ready** - CORS configured for localhost:8080 API access

### Multi-Tier Election System
- **Never fails** - Cache → API → Fallback architecture ensures election data is always available
- **Real-time integration** with Google Civic Info, Ballotpedia, and Vote Smart APIs
- **Smart fallback** generates typical election cycles when external data unavailable
- **State-by-state caching** with 6-hour refresh cycles for optimal performance

### AI-Powered Candidate Analysis
- **Qwen3 integration** for intelligent policy position analysis
- **Neutral comparison** without partisan bias - focuses on merit of ideas
- **Smart handling** of missing positions with candidate contact links
- **Confidence scoring** and stance classification (for/against/neutral/nuanced)
- **Graceful degradation** when AI services unavailable

### Professional Photo Management
- **Personal vs Campaign separation** - users can flag photos for different purposes
- **Automatic optimization** - WebP conversion, smart resizing, thumbnail generation
- **Type-specific processing** - Different dimensions for avatars, campaign headshots, etc.
- **Built-in moderation** - Campaign photos require approval
- **Storage efficient** - Automatic compression while maintaining quality

## Setup Requirements

### Required Environment Variables
```bash
# Core Database & Auth
DATABASE_URL="postgresql://username:password@host:port/database"
JWT_SECRET="your-super-secret-jwt-key"

# AI Services (Optional - system works without these)
HUGGINGFACE_API_KEY="your-huggingface-api-key"  # For Sentence Transformers
QWEN3_API_URL="http://localhost:8000"           # For advanced AI analysis
QWEN3_API_KEY="your-qwen3-api-key"

# External Election Data (Optional)
GOOGLE_CIVIC_API_KEY="your-google-civic-api-key"
GEOCODIO_API_KEY="your-geocodio-api-key"

# Vector Database (Optional - falls back to PostgreSQL)
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""
```

### Features by Configuration
- **Basic**: Database + JWT (core platform functionality)
- **Enhanced**: + HuggingFace API (topic analysis, basic AI)
- **Advanced**: + Qwen3 (intelligent candidate comparison)  
- **Full**: + External APIs (real election data) + Qdrant (performance)

## Base URL

- **Production**: `https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api`
- **Development**: `http://localhost:3001`

## Interactive Documentation

Visit `/api/docs` for interactive Swagger documentation where you can test endpoints directly.

## Authentication

### JWT Bearer Token
Most endpoints require authentication using JWT tokens in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Session ID (Optional)
For additional security, include session ID:
```
X-Session-ID: <session-id>
```

### Rate Limiting
- **Authentication endpoints**: 5 requests per 15 minutes
- **Post creation**: 10 requests per 15 minutes
- **Photo uploads**: 10 uploads per 15 minutes  
- **General API**: 100 requests per 15 minutes

### Anti-Bot Protection (New!)
Device fingerprinting system automatically detects and prevents bot registrations:
- **Device fingerprinting**: Collects browser characteristics, canvas/WebGL signatures
- **Risk scoring**: Calculates risk based on suspicious patterns (0-100 scale)
- **Automatic blocking**: High-risk registrations (score > 70) are rejected
- **Zero cost**: No external SMS or captcha services required beyond hCaptcha

## Core Endpoints

### Authentication (`/api/auth`)

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username123",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "hcaptchaToken": "captcha-token-here",
  "deviceFingerprint": {
    "fingerprint": "abc123...",
    "components": {
      "screen": "1920x1080",
      "timezone": "America/New_York",
      "language": "en-US",
      "userAgent": "Mozilla/5.0...",
      "canvas": "canvas_hash_123",
      "webgl": "webgl_hash_456"
    },
    "riskScore": 15
  }
}
```

**Response (201)**:
```json
{
  "message": "Account created successfully. Please check your email to verify your account.",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username123",
    "emailVerified": false,
    "requiresEmailVerification": true,
    "requiresPhoneVerification": true
  },
  "token": "jwt-token-here"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### User Management (`/api/users`)

#### Get Public User Profile (No Auth Required)
```http
GET /api/users/{userId}
```

**Returns:** Public profile information only:
- Basic info (name, username, bio, avatar)
- Social metrics (followers, following counts)  
- Political profile (if candidate/official)
- Excludes private data (email, address, etc.)

#### Get Current User Profile (Authenticated)
```http
GET /api/users/profile
Authorization: Bearer <token>
```

**Returns:** Full profile including private information (email, address, etc.)

#### Update Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Political enthusiast and community advocate",
  "website": "https://johndoe.com",
  "location": "Springfield, IL"
}
```

#### Follow/Unfollow User
```http
POST /api/users/{userId}/follow
Authorization: Bearer <token>
```

#### Get User's Followers/Following
```http
GET /api/users/{userId}/followers
GET /api/users/{userId}/following
```

### Posts (`/api/posts`)

#### Create Post
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "This is my political opinion about...",
  "imageUrl": "https://example.com/image.jpg"
}
```

#### Get Posts
```http
GET /api/posts/user/{userId}
GET /api/posts/me
```

#### Like/Unlike Post
```http
POST /api/posts/{postId}/like
Authorization: Bearer <token>
```

#### Add Comment
```http
POST /api/posts/{postId}/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great point! I agree that..."
}
```

#### Get Comments
```http
GET /api/posts/{postId}/comments?page=1&limit=20
```

### Feed System (`/api/feed`)

#### Get Personalized Feed (Advanced Algorithm)
```http
GET /api/feed
Authorization: Bearer <token>

# Optional query parameters:
# ?limit=50                                                    # Number of posts (default: 50)
# ?weights={"recency":0.4,"similarity":0.3,"social":0.2,"trending":0.1}  # Custom algorithm weights for A/B testing
```

**Response (200)**:
```json
{
  "posts": [
    {
      "id": "post-id",
      "content": "Post content...",
      "author": {
        "username": "user123",
        "firstName": "John",
        "lastName": "Doe",
        "avatar": "https://...",
        "verified": true
      },
      "likesCount": 15,
      "commentsCount": 3,
      "isLiked": false,
      "createdAt": "2025-08-10T12:00:00Z"
    }
  ],
  "algorithm": "probability-cloud",
  "weights": {
    "recency": 0.35,
    "similarity": 0.25, 
    "social": 0.25,
    "trending": 0.15
  },
  "stats": {
    "candidateCount": 150,
    "avgRecencyScore": 0.73,
    "avgSimilarityScore": 0.42,
    "avgSocialScore": 0.31,
    "avgTrendingScore": 0.18
  },
  "pagination": {
    "limit": 50,
    "count": 47
  }
}
```

**Algorithm Details**:
- **Probability Cloud Sampling**: Posts selected from weighted probability distribution (not just top scores)
- **4-Factor Scoring System**: 
  - **Recency (35%)**: Exponential decay with 24-hour half-life
  - **Similarity (25%)**: Cosine similarity using AI embeddings from user interaction history  
  - **Social (25%)**: Boost for posts from followed users
  - **Trending (15%)**: Engagement velocity (likes + comments per hour)
- **Intelligent Discovery**: 30-day content pool balanced for freshness vs variety
- **Tunable Weights**: Custom weights via query parameter for A/B testing and personalization

#### Get Trending Posts
```http
GET /api/feed/trending?limit=20
```

**Response**: Same format as personalized feed, sorted by engagement in last 24 hours.

### Political Information (`/api/political`)

#### Get User's Representatives (Authenticated)
```http
GET /api/political/representatives
Authorization: Bearer <token>
Query: ?forceRefresh=true (optional - bypasses cache)
```

**Note:** Uses user's saved address. Returns comprehensive merged data from multiple sources.

#### Get Representatives by Address (Public - No Auth Required)
```http
GET /api/political/representatives/lookup?address=123+Main+St+Springfield+IL
Query: ?forceRefresh=true (optional - bypasses cache)
```

**Features:**
- Works for anonymous users
- Google Civic Information API (primary - using nonprofit credits)
- Geocodio API (enhanced data - school districts, state legislative info)
- Returns comprehensive representative data with all available information

#### Search Representatives by Address
```http
POST /api/political/representatives/search
Content-Type: application/json

{
  "address": "123 Main St, Springfield, IL 62701"
}
```

### Google Civic Information (`/api/google-civic`)

#### Get Representatives via Google Civic API
```http
GET /api/google-civic/representatives?address=123+Main+St+Springfield+IL
Authorization: Bearer <token>
```

**Response includes:**
- Federal, state, and local officials
- Contact information and social media
- Office addresses and photos

#### Get Election Information
```http
GET /api/google-civic/elections?address=123+Main+St+Springfield+IL
Authorization: Bearer <token>
```

**Response includes:**
- Upcoming elections
- Polling locations
- Voter registration information
- Candidate lists for elections

#### Update Political Profile
```http
PUT /api/political/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "streetAddress": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zipCode": "62701",
  "politicalParty": "Independent",
  "office": "Mayor of Springfield",
  "campaignWebsite": "https://campaign.com"
}
```

### Elections (`/api/elections`)

#### Get Elections by Location
```http
GET /api/elections?state=CA&level=FEDERAL&includeUpcoming=true
```

**Query Parameters:**
- `state` (optional): Two-letter state code
- `level` (optional): Election level (FEDERAL, STATE, LOCAL, MUNICIPAL)
- `zipCode` (optional): ZIP code for precise location matching
- `includeUpcoming` (optional): Include only upcoming elections (default: true)

**Response:**
```json
{
  "elections": [
    {
      "id": "election-id",
      "name": "2024 General Election",
      "type": "GENERAL",
      "level": "FEDERAL",
      "date": "2024-11-05T00:00:00.000Z",
      "state": "CA",
      "offices": [
        {
          "id": "office-id",
          "title": "President",
          "level": "FEDERAL",
          "candidates": [
            {
              "id": "candidate-id",
              "name": "John Smith",
              "party": "Democratic",
              "isIncumbent": false,
              "platformSummary": "Fighting for working families...",
              "keyIssues": ["healthcare", "economy", "environment"]
            }
          ]
        }
      ],
      "ballotMeasures": []
    }
  ],
  "count": 1
}
```

#### Get Election Details
```http
GET /api/elections/{id}
```

#### Get Candidates for Election
```http
GET /api/elections/{id}/candidates?party=Democratic&office=office-id
```

#### Register as Candidate
```http
POST /api/elections/{id}/register-candidate
Authorization: Bearer <token>
Content-Type: application/json

{
  "officeId": "office-id",
  "name": "Jane Doe",
  "party": "Democratic",
  "platformSummary": "Building a better future for all...",
  "keyIssues": ["education", "healthcare", "jobs"],
  "campaignWebsite": "https://janedoe2024.com",
  "campaignEmail": "contact@janedoe2024.com"
}
```

#### Compare Candidates
```http
POST /api/elections/candidates/compare
Content-Type: application/json

{
  "candidateIds": ["candidate-id-1", "candidate-id-2"]
}
```

### Candidates (`/api/candidates`)

#### Search Candidates
```http
GET /api/candidates?party=Democratic&state=CA&incumbent=false&search=john
```

**Query Parameters:**
- `party` (optional): Filter by political party
- `office` (optional): Filter by office type
- `state` (optional): Filter by state
- `incumbent` (optional): Filter by incumbent status
- `search` (optional): Search candidate names

#### Get Candidate Profile
```http
GET /api/candidates/{id}
```

**Response:**
```json
{
  "id": "candidate-id",
  "name": "John Smith",
  "party": "Democratic",
  "isIncumbent": false,
  "platformSummary": "Fighting for working families...",
  "keyIssues": ["healthcare", "economy", "environment"],
  "campaignWebsite": "https://johnsmith2024.com",
  "office": {
    "id": "office-id",
    "title": "Governor",
    "level": "STATE",
    "election": {
      "id": "election-id",
      "name": "2024 General Election",
      "date": "2024-11-05T00:00:00.000Z"
    }
  },
  "user": {
    "id": "user-id",
    "username": "johnsmith",
    "firstName": "John",
    "lastName": "Smith",
    "verified": true
  },
  "financialData": {
    "totalRaised": 150000.00,
    "totalSpent": 75000.00,
    "cashOnHand": 75000.00
  },
  "endorsements": [
    {
      "id": "endorsement-id",
      "reason": "Strong advocate for healthcare reform",
      "isPublic": true,
      "user": {
        "username": "supporter1",
        "firstName": "Jane",
        "lastName": "Doe"
      }
    }
  ]
}
```

#### Endorse Candidate
```http
POST /api/candidates/{id}/endorse
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Strong record on environmental issues",
  "isPublic": true
}
```

#### Remove Endorsement
```http
DELETE /api/candidates/{id}/endorse
Authorization: Bearer <token>
```

#### Get My Candidate Profiles
```http
GET /api/candidates/my-candidacy
Authorization: Bearer <token>
```

#### Update Candidate Platform
```http
PUT /api/candidates/{id}/update-platform
Authorization: Bearer <token>
Content-Type: application/json

{
  "platformSummary": "Updated platform summary...",
  "keyIssues": ["healthcare", "education", "climate"],
  "campaignWebsite": "https://updated-website.com"
}
```

#### Withdraw Candidacy
```http
POST /api/candidates/{id}/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Personal reasons"
}
```

### Topics (`/api/topics`)

The AI-powered topic analysis system that clusters related posts into trending discussions with neutral argument summaries.

#### Get Trending Topics
```http
GET /api/topics/trending?limit=10&category=healthcare&timeframe=24
```

**Query Parameters:**
- `limit` (optional): Maximum topics to return (1-50, default: 10)
- `category` (optional): Filter by topic category  
- `timeframe` (optional): Hours for trending calculation (default: 24)

**Response:**
```json
{
  "topics": [
    {
      "id": "topic-id",
      "title": "Healthcare Reform & Policy",
      "description": "Discussion about healthcare policy changes",
      "category": "healthcare",
      "argumentsFor": [
        "Universal healthcare would reduce costs...",
        "Evidence from other countries shows..."
      ],
      "argumentsAgainst": [
        "Implementation costs are too high...",
        "Market-based solutions work better..."
      ],
      "neutralSummary": "The debate centers on cost vs access...",
      "postCount": 25,
      "participantCount": 18,
      "viewCount": 342,
      "trendingScore": 8.5,
      "controversyScore": 0.7,
      "lastActivityAt": "2024-08-07T15:30:00.000Z",
      "posts": [
        {
          "post": {
            "id": "post-id",
            "content": "Healthcare reform is crucial...",
            "author": {
              "username": "citizen_jane",
              "firstName": "Jane",
              "lastName": "Smith"
            }
          },
          "relevanceScore": 0.95
        }
      ],
      "subTopics": [
        {
          "id": "subtopic-id",
          "title": "Funding Mechanisms",
          "summary": "Discussion of how to fund healthcare reforms",
          "commentCount": 8
        }
      ]
    }
  ],
  "count": 1
}
```

#### Get Topic Details
```http
GET /api/topics/{id}
```

**Response includes:**
- Full topic information with all posts
- Sub-topics with threaded comments
- Direct topic comments with replies
- AI-generated argument analysis

#### Add Comment to Topic
```http
POST /api/topics/{id}/comment
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "I think this perspective overlooks...",
  "parentId": "comment-id-for-reply"
}
```

#### Add Comment to Sub-Topic
```http
POST /api/topics/{id}/subtopics/{subTopicId}/comment
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Regarding funding mechanisms...",
  "parentId": "parent-comment-id"
}
```

#### Search Topics
```http
GET /api/topics/search?q=climate&category=environment&limit=20
```

**Query Parameters:**
- `q` (optional): Search query for title/description
- `category` (optional): Filter by category
- `limit` (optional): Maximum results (default: 20)

#### Trigger Topic Analysis (Admin/Moderator Only)
```http
POST /api/topics/analyze/recent
Authorization: Bearer <token>
Content-Type: application/json

{
  "timeframe": 24,
  "maxPosts": 500
}
```

**Response:**
```json
{
  "message": "Topic analysis completed successfully",
  "topicsCreated": 5,
  "postsAnalyzed": 147
}
```

### Verification (`/api/verification`)

#### Send Email Verification
```http
POST /api/verification/email/send
Authorization: Bearer <token>
```

#### Verify Email
```http
POST /api/verification/email/verify
Content-Type: application/json

{
  "token": "verification-token"
}
```

#### Send Phone Verification
```http
POST /api/verification/phone/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "hcaptchaToken": "captcha-token"
}
```

#### Verify Phone
```http
POST /api/verification/phone/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "code": "123456"
}
```

#### Get Verification Status
```http
GET /api/verification/status
Authorization: Bearer <token>
```

### Moderation (`/api/moderation`)

#### Submit Report
```http
POST /api/moderation/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetType": "POST",
  "targetId": "post-id",
  "reason": "SPAM",
  "description": "This post appears to be spam content..."
}
```

**Report Reasons**:
- `SPAM` - Spam content
- `HARASSMENT` - Harassment or bullying
- `HATE_SPEECH` - Hate speech or discrimination
- `MISINFORMATION` - False or misleading information
- `INAPPROPRIATE_CONTENT` - Inappropriate content
- `FAKE_ACCOUNT` - Fake or impersonated account
- `VIOLENCE_THREATS` - Threats of violence
- `SELF_HARM` - Self-harm content
- `ILLEGAL_CONTENT` - Illegal content

#### Get My Reports
```http
GET /api/moderation/reports/my?page=1&limit=20
Authorization: Bearer <token>
```

### Admin Functions (`/api/admin`) - Admin Only

#### Dashboard Overview
```http
GET /api/admin/dashboard
Authorization: Bearer <admin-token>
```

#### User Management
```http
GET /api/admin/users?search=username&status=active&role=user&page=1&limit=50
GET /api/admin/users/{userId}
POST /api/admin/users/{userId}/suspend
POST /api/admin/users/{userId}/role
```

#### Content Moderation
```http
GET /api/admin/reports?status=PENDING&priority=HIGH&page=1
POST /api/admin/reports/{reportId}/action
GET /api/admin/content/flagged
```

### Appeals (`/api/appeals`)

#### Submit Appeal
```http
POST /api/appeals
Authorization: Bearer <token>
Content-Type: application/json

{
  "suspensionId": "suspension-id",
  "reason": "I believe this suspension was issued in error because...",
  "additionalInfo": "Additional context or evidence..."
}
```

#### Get My Appeals
```http
GET /api/appeals/my?page=1&limit=10
Authorization: Bearer <token>
```

#### Get Appeal Status
```http
GET /api/appeals/{appealId}
Authorization: Bearer <token>
```

## Response Formats

### Success Response
```json
{
  "message": "Operation completed successfully",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response
```json
{
  "error": "Validation failed",
  "message": "The request contains invalid data",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

## HTTP Status Codes

### Success Codes
- `200 OK` - Request successful, resource retrieved
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content to return

### Client Error Codes
- `400 Bad Request` - Invalid request syntax or validation failure
- `401 Unauthorized` - Authentication required or token invalid/expired
- `403 Forbidden` - Valid authentication but insufficient permissions
- `404 Not Found` - Requested resource does not exist
- `409 Conflict` - Resource already exists or state conflict
- `422 Unprocessable Entity` - Valid syntax but semantic errors
- `429 Too Many Requests` - Rate limit exceeded

### Server Error Codes
- `500 Internal Server Error` - Unexpected server error
- `502 Bad Gateway` - Upstream service error
- `503 Service Unavailable` - Server temporarily unavailable

### Endpoint-Specific Status Codes

#### Topics Endpoints
- **GET /api/topics/trending**
  - `200` - Topics retrieved successfully
  - `500` - Failed to retrieve trending topics

- **GET /api/topics/{id}**
  - `200` - Topic details retrieved
  - `404` - Topic not found
  - `500` - Failed to retrieve topic details

- **POST /api/topics/{id}/comment**
  - `201` - Comment created successfully
  - `400` - Invalid content (empty, too long, or inactive topic)
  - `401` - Authentication required
  - `404` - Topic not found or invalid parent comment
  - `500` - Failed to add comment

- **POST /api/topics/analyze/recent**
  - `200` - Analysis completed successfully
  - `401` - Authentication required
  - `403` - Admin/moderator access required
  - `500` - Topic analysis failed

### Enhanced Elections (`/api/elections` - Updated)

The election system now uses a **multi-tier data architecture** that ensures election information is always available.

#### Enhanced Election Data Retrieval
```http
GET /api/elections?state=CA
```

**Enhanced Response with Data Source Information:**
```json
{
  "elections": [
    {
      "id": "election-id",
      "name": "2026 Congressional Election",
      "type": "GENERAL",
      "level": "FEDERAL",
      "date": "2026-11-03T00:00:00.000Z",
      "state": "CA",
      "source": "fallback",
      "description": "Typical election cycle data. Real election data will be updated when available."
    }
  ],
  "count": 1,
  "source": "fallback",
  "lastUpdated": "2025-08-07T16:00:00.000Z",
  "message": "Showing typical election cycles. Real election data will be updated when available."
}
```

**Data Source Hierarchy:**
1. **Cache** - Recently fetched data (6-hour refresh cycle)
2. **API** - Real-time data from election APIs (Google Civic, Ballotpedia, Vote Smart)
3. **Fallback** - Typical election cycles that never fail

#### Refresh Election Cache (Admin)
```http
POST /api/elections/cache/refresh
Authorization: Bearer <token>
Content-Type: application/json

{
  "state": "CA"
}
```

### Enhanced Candidates (`/api/candidates` - Updated)

Enhanced candidate system with **AI-powered policy analysis** and **professional photo management**.

#### Get Enhanced Candidate Profile
```http
GET /api/candidates/{id}/enhanced
```

**Enhanced Response with AI Analysis:**
```json
{
  "candidate": {
    "id": "candidate-id",
    "name": "Jane Smith",
    "party": "Democratic",
    "isIncumbent": false,
    "campaignWebsite": "https://janesmith2026.com",
    "platformSummary": "Fighting for healthcare access and economic opportunity...",
    "keyIssues": ["healthcare", "economy", "education"],
    "photos": {
      "avatar": {
        "id": "photo-id",
        "url": "/uploads/photos/avatar.webp",
        "thumbnailUrl": "/uploads/thumbnails/avatar-thumb.webp"
      },
      "campaignHeadshot": {
        "id": "campaign-photo-id",
        "url": "/uploads/photos/campaign-headshot.webp",
        "thumbnailUrl": "/uploads/thumbnails/campaign-headshot-thumb.webp"
      },
      "gallery": []
    },
    "policyPositions": [
      {
        "issue": "healthcare",
        "position": "Supports universal healthcare coverage with public option",
        "stance": "for",
        "confidence": 0.85
      }
    ],
    "office": {
      "title": "U.S. House of Representatives",
      "level": "FEDERAL"
    }
  },
  "aiAnalysisEnabled": true,
  "photoCount": 2
}
```

#### AI-Powered Candidate Comparison
```http
POST /api/candidates/compare
Content-Type: application/json

{
  "candidateIds": ["candidate-1-id", "candidate-2-id", "candidate-3-id"],
  "officeId": "office-id"
}
```

**AI Comparison Response:**
```json
{
  "comparison": {
    "sharedIssues": [
      {
        "issue": "healthcare",
        "positions": [
          {
            "candidateId": "candidate-1-id",
            "candidateName": "Jane Smith",
            "position": "Supports universal healthcare coverage",
            "stance": "for",
            "confidence": 0.85
          },
          {
            "candidateId": "candidate-2-id",
            "candidateName": "John Doe",
            "position": "Opposes government-run healthcare",
            "stance": "against",
            "confidence": 0.90
          }
        ],
        "agreement": "disagree",
        "summary": "Candidates have opposing views on healthcare policy. Smith supports expanding government involvement while Doe favors private sector solutions."
      }
    ],
    "uniqueIssues": [
      {
        "candidateId": "candidate-1-id",
        "candidateName": "Jane Smith",
        "issues": [
          {
            "issue": "climate change",
            "position": "Supports aggressive climate action",
            "defaultMessage": "John Doe has not yet published a detailed position on climate change. To inquire about their position, <a href='/messages/compose?to=candidate-2-id&subject=Position on climate change'>click here to send a message</a>."
          }
        ]
      }
    ],
    "overallSummary": "Candidates show clear differences on healthcare policy with mixed agreement on economic issues.",
    "generatedAt": "2025-08-07T16:00:00.000Z"
  },
  "aiEnabled": true,
  "candidateCount": 3
}
```

#### Get Enhanced Candidates by Office
```http
GET /api/candidates/office/{officeId}/enhanced?includeAnalysis=true
```

#### Check AI System Health
```http
GET /api/candidates/ai/health
```

**Response:**
```json
{
  "qwen3": {
    "status": "healthy",
    "model": "Qwen2.5-72B-Instruct",
    "details": {
      "responseLength": 450,
      "tokensUsed": 125
    }
  },
  "capabilities": [
    "Policy position analysis",
    "Multi-candidate comparison", 
    "Neutral summary generation",
    "Missing position handling",
    "Stance classification (for/against/neutral/nuanced)",
    "Confidence scoring",
    "Evidence extraction"
  ]
}
```

### Photo Management (`/api/photos`)

Comprehensive photo upload and management system with **automatic optimization** and **personal vs campaign photo separation**.

#### Upload Photos
```http
POST /api/photos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "photos": [file1, file2],
  "photoType": "CAMPAIGN",
  "purpose": "CAMPAIGN",
  "candidateId": "candidate-id"
}
```

**Photo Types:**
- `AVATAR` - Profile pictures (400x400, optimized for circular display)
- `COVER` - Cover/banner photos (1200x400) 
- `CAMPAIGN` - Campaign headshots (800x1000, professional portraits)
- `VERIFICATION` - Identity verification (1024x1024)
- `EVENT` - Event photos (1200x800)
- `GALLERY` - General gallery photos (1024x1024)

**Photo Purposes:**
- `PERSONAL` - Shows on user's personal profile
- `CAMPAIGN` - Shows on candidate's campaign profile  
- `BOTH` - Can be used for both personal and campaign

**Response:**
```json
{
  "message": "Successfully uploaded 2 photo(s)",
  "photos": [
    {
      "id": "photo-id",
      "url": "/uploads/photos/campaign-headshot.webp",
      "thumbnailUrl": "/uploads/thumbnails/campaign-headshot-thumb.webp", 
      "originalSize": 2048576,
      "compressedSize": 245760,
      "width": 800,
      "height": 1000
    }
  ],
  "pendingModeration": true
}
```

#### Get User Photos
```http
GET /api/photos/my?photoType=CAMPAIGN&purpose=CAMPAIGN
Authorization: Bearer <token>
```

#### Get Candidate Campaign Photos
```http
GET /api/photos/candidate/{candidateId}
```

#### Update Photo Purpose (Personal ↔ Campaign)
```http
PUT /api/photos/{photoId}/purpose
Authorization: Bearer <token>
Content-Type: application/json

{
  "purpose": "BOTH",
  "candidateId": "candidate-id"
}
```

#### Photo Moderation (Moderators)
```http
GET /api/photos/moderation/pending
Authorization: Bearer <token>
```

```http
POST /api/photos/{photoId}/approve
Authorization: Bearer <token>
```

#### Flag Inappropriate Photo
```http
POST /api/photos/{photoId}/flag
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Inappropriate content for campaign use"
}
```

**Photo Processing Features:**
- **Automatic optimization** - All uploads converted to WebP for efficiency
- **Smart resizing** - Type-specific dimensions (avatars, campaign headshots, etc.)
- **Thumbnail generation** - Automatic creation of optimized thumbnails
- **File compression** - Reduces storage usage while maintaining quality
- **Moderation system** - Campaign photos require approval
- **Rate limiting** - 10 uploads per 15 minutes per user

## HTTP Status Codes and Responses

### Success Responses
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no response body

### Error Responses
- `400 Bad Request` - Invalid request data or parameters
- `401 Unauthorized` - Authentication required or invalid
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (duplicate, etc.)
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Authentication Endpoints (`/api/auth`)
- **POST /api/auth/register**
  - `201` - User registered successfully
  - `400` - Invalid registration data
  - `409` - Email or username already exists
  - `422` - Validation failed
  - `429` - Registration rate limit exceeded
  - `500` - Registration failed

- **POST /api/auth/login**
  - `200` - Login successful
  - `400` - Missing email or password
  - `401` - Invalid credentials
  - `403` - Account suspended
  - `429` - Login rate limit exceeded
  - `500` - Login failed

- **GET /api/auth/me**
  - `200` - User profile retrieved
  - `401` - Invalid or expired token
  - `500` - Profile retrieval failed

- **POST /api/auth/logout**
  - `200` - Logout successful
  - `401` - Invalid token
  - `500` - Logout failed

### User Endpoints (`/api/users`)
- **GET /api/users/{username}**
  - `200` - User profile retrieved
  - `404` - User not found
  - `500` - Profile retrieval failed

- **PUT /api/users/profile**
  - `200` - Profile updated successfully
  - `400` - Invalid profile data
  - `401` - Authentication required
  - `422` - Validation failed
  - `500` - Profile update failed

- **POST /api/users/{userId}/follow**
  - `201` - User followed successfully
  - `400` - Cannot follow yourself
  - `401` - Authentication required
  - `404` - User not found
  - `409` - Already following user
  - `500` - Follow action failed

### Post Endpoints (`/api/posts`)
- **GET /api/posts**
  - `200` - Posts retrieved successfully
  - `400` - Invalid query parameters
  - `500` - Failed to retrieve posts

- **POST /api/posts**
  - `201` - Post created successfully
  - `400` - Invalid post data
  - `401` - Authentication required
  - `403` - Account restricted from posting
  - `422` - Content validation failed
  - `429` - Post creation rate limit exceeded
  - `500` - Post creation failed

- **GET /api/posts/{id}**
  - `200` - Post retrieved successfully
  - `404` - Post not found
  - `500` - Failed to retrieve post

- **DELETE /api/posts/{id}**
  - `204` - Post deleted successfully
  - `401` - Authentication required
  - `403` - Not authorized to delete post
  - `404` - Post not found
  - `500` - Post deletion failed

- **POST /api/posts/{id}/like**
  - `201` - Post liked successfully
  - `400` - Post already liked
  - `401` - Authentication required
  - `404` - Post not found
  - `500` - Like action failed

- **POST /api/posts/{id}/comments**
  - `201` - Comment created successfully
  - `400` - Invalid comment data
  - `401` - Authentication required
  - `404` - Post not found
  - `422` - Comment validation failed
  - `500` - Comment creation failed

### Topic Endpoints (`/api/topics`)
- **GET /api/topics/trending**
  - `200` - Trending topics retrieved successfully
  - `400` - Invalid query parameters
  - `500` - Failed to retrieve trending topics

- **GET /api/topics/search**
  - `200` - Topic search results retrieved
  - `400` - Invalid search parameters
  - `422` - Search query validation failed
  - `500` - Search failed

- **GET /api/topics/{id}**
  - `200` - Topic details retrieved successfully
  - `404` - Topic not found
  - `500` - Failed to retrieve topic

- **POST /api/topics/{id}/comments**
  - `201` - Topic comment created successfully
  - `400` - Invalid comment data
  - `401` - Authentication required
  - `404` - Topic not found
  - `422` - Comment validation failed
  - `500` - Comment creation failed

- **POST /api/topics/analyze/recent** (Admin/Moderator)
  - `200` - Topic analysis completed
  - `400` - Invalid analysis parameters
  - `401` - Authentication required
  - `403` - Insufficient permissions
  - `422` - Analysis parameters validation failed
  - `500` - Analysis failed

### Election Endpoints (`/api/elections`)
- **GET /api/elections**
  - `200` - Elections retrieved successfully
  - `400` - Invalid query parameters
  - `422` - Location parameter validation failed
  - `500` - Failed to retrieve elections

- **GET /api/elections/{id}**
  - `200` - Election details retrieved
  - `404` - Election not found
  - `500` - Failed to retrieve election

- **POST /api/elections/{id}/register-candidate**
  - `201` - Candidate registered successfully
  - `400` - Invalid candidate data or election inactive
  - `401` - Authentication required
  - `403` - User not eligible to register as candidate
  - `404` - Election not found
  - `409` - User already registered as candidate
  - `422` - Candidate data validation failed
  - `500` - Registration failed

- **GET /api/elections/{id}/compare-candidates**
  - `200` - Candidate comparison data retrieved
  - `400` - Invalid comparison parameters
  - `404` - Election not found
  - `500` - Comparison failed

### Candidate Endpoints (`/api/candidates`)
- **GET /api/candidates**
  - `200` - Candidate search results retrieved
  - `400` - Invalid search parameters
  - `500` - Search failed

- **GET /api/candidates/{id}**
  - `200` - Candidate profile retrieved
  - `404` - Candidate not found
  - `500` - Failed to retrieve candidate

- **PUT /api/candidates/{id}** (Own profile)
  - `200` - Candidate profile updated
  - `400` - Invalid profile data
  - `401` - Authentication required
  - `403` - Not authorized to edit profile
  - `404` - Candidate not found
  - `422` - Profile validation failed
  - `500` - Profile update failed

- **POST /api/candidates/{id}/endorse**
  - `201` - Endorsement created successfully
  - `400` - Invalid endorsement data
  - `401` - Authentication required
  - `404` - Candidate not found
  - `409` - User already endorsed this candidate
  - `422` - Endorsement validation failed
  - `500` - Endorsement failed

- **DELETE /api/candidates/{id}/endorse**
  - `204` - Endorsement removed successfully
  - `401` - Authentication required
  - `404` - Candidate or endorsement not found
  - `500` - Endorsement removal failed

- **GET /api/candidates/{id}/endorsements**
  - `200` - Candidate endorsements retrieved
  - `404` - Candidate not found
  - `500` - Failed to retrieve endorsements

- **GET /api/candidates/{id}/financial-data**
  - `200` - Financial data retrieved
  - `404` - Candidate not found
  - `500` - Failed to retrieve financial data

### Verification Endpoints (`/api/verification`)
- **POST /api/verification/email/send**
  - `200` - Verification email sent
  - `401` - Authentication required
  - `429` - Too many verification attempts
  - `500` - Failed to send verification email

- **POST /api/verification/email/verify**
  - `200` - Email verified successfully
  - `400` - Invalid verification token
  - `404` - Verification token not found
  - `410` - Verification token expired
  - `500` - Email verification failed

- **POST /api/verification/phone/send**
  - `200` - Verification code sent
  - `400` - Invalid phone number
  - `401` - Authentication required
  - `422` - Phone number validation failed
  - `429` - Too many verification attempts
  - `500` - Failed to send verification code

- **POST /api/verification/phone/verify**
  - `200` - Phone verified successfully
  - `400` - Invalid verification code
  - `401` - Authentication required
  - `410` - Verification code expired
  - `429` - Too many verification attempts
  - `500` - Phone verification failed

- **GET /api/verification/status**
  - `200` - Verification status retrieved
  - `401` - Authentication required
  - `500` - Failed to retrieve status

### Moderation Endpoints (`/api/moderation`)
- **POST /api/moderation/reports**
  - `201` - Report submitted successfully
  - `400` - Invalid report data
  - `401` - Authentication required
  - `404` - Target content not found
  - `409` - Already reported this content
  - `422` - Report validation failed
  - `500` - Report submission failed

- **GET /api/moderation/reports** (Moderator)
  - `200` - Reports retrieved successfully
  - `401` - Authentication required
  - `403` - Insufficient permissions
  - `400` - Invalid query parameters
  - `500` - Failed to retrieve reports

- **PUT /api/moderation/reports/{id}** (Moderator)
  - `200` - Report updated successfully
  - `400` - Invalid update data
  - `401` - Authentication required
  - `403` - Insufficient permissions
  - `404` - Report not found
  - `422` - Update validation failed
  - `500` - Report update failed

### Admin Endpoints (`/api/admin`) (Admin Only)
- **GET /api/admin/users**
  - `200` - User list retrieved
  - `401` - Authentication required
  - `403` - Insufficient permissions
  - `400` - Invalid query parameters
  - `500` - Failed to retrieve users

- **PUT /api/admin/users/{id}/suspend**
  - `200` - User suspended successfully
  - `400` - Invalid suspension data
  - `401` - Authentication required
  - `403` - Insufficient permissions
  - `404` - User not found
  - `422` - Suspension validation failed
  - `500` - Suspension failed

- **PUT /api/admin/users/{id}/unsuspend**
  - `200` - User unsuspended successfully
  - `401` - Authentication required
  - `403` - Insufficient permissions
  - `404` - User not found
  - `500` - Unsuspension failed

### Appeals Endpoints (`/api/appeals`)
- **POST /api/appeals**
  - `201` - Appeal submitted successfully
  - `400` - Invalid appeal data
  - `401` - Authentication required
  - `403` - User not suspended or appeal limit exceeded
  - `409` - Active appeal already exists
  - `422` - Appeal validation failed
  - `500` - Appeal submission failed

- **GET /api/appeals/my**
  - `200` - User appeals retrieved
  - `401` - Authentication required
  - `500` - Failed to retrieve appeals

### Onboarding Endpoints (`/api/onboarding`)
- **GET /api/onboarding/progress**
  - `200` - Onboarding progress retrieved
  - `401` - Authentication required
  - `500` - Failed to retrieve progress

- **POST /api/onboarding/complete-step**
  - `200` - Onboarding step completed
  - `400` - Invalid step data
  - `401` - Authentication required
  - `422` - Step validation failed
  - `500` - Step completion failed

### Future Enhancements

1. **Advanced AI Integration**
   - Qwen3 for complex reasoning and argument evaluation
   - Multi-language support for global discussions
   - Real-time debate facilitation and fact-checking
   - Automated civility coaching for users

2. **Performance Optimization**
   - GPU-accelerated embedding generation
   - Distributed processing for large-scale analysis
   - Real-time streaming analysis for live discussions
   - Edge computing for reduced latency

## Error Codes and Messages

### Authentication Errors
- `INVALID_CREDENTIALS` - Invalid email or password
- `TOKEN_EXPIRED` - JWT token has expired
- `TOKEN_INVALID` - JWT token is invalid
- `ACCOUNT_SUSPENDED` - User account is suspended
- `EMAIL_NOT_VERIFIED` - Email verification required

### Validation Errors
- `VALIDATION_FAILED` - Request validation failed
- `MISSING_REQUIRED_FIELD` - Required field is missing
- `INVALID_FORMAT` - Field format is invalid
- `VALUE_TOO_LONG` - Field value exceeds maximum length

### Rate Limiting
- `RATE_LIMIT_EXCEEDED` - Too many requests from this IP
- `AUTH_RATE_LIMIT` - Authentication rate limit exceeded

### Content Moderation
- `CONTENT_FLAGGED` - Content has been flagged for review
- `ACCOUNT_RESTRICTED` - Account has posting restrictions
- `INAPPROPRIATE_CONTENT` - Content violates community guidelines

### AI System Errors
- `EMBEDDING_GENERATION_FAILED` - Failed to generate content embedding
- `TOPIC_ANALYSIS_UNAVAILABLE` - AI topic analysis temporarily unavailable
- `SIMILARITY_SEARCH_FAILED` - Vector similarity search failed
- `AI_SERVICE_TIMEOUT` - AI processing timeout (fallback activated)
- `QWEN3_UNAVAILABLE` - Advanced reasoning service unavailable

## Security Features

### Content Security
- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: Prevents spam and abuse
- **Content Filtering**: Automatic detection of inappropriate content
- **User Reporting**: Community-driven content moderation

### Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable salt rounds
- **Session Management**: Optional session tracking
- **Multi-factor Verification**: Email and SMS verification

### Platform Security
- **CORS Protection**: Restricted cross-origin requests
- **Helmet Security**: Comprehensive security headers
- **Request Logging**: Detailed request monitoring
- **Error Handling**: Secure error responses without sensitive data exposure

## Data Models

### User
```json
{
  "id": "string",
  "email": "string",
  "username": "string",
  "firstName": "string",
  "lastName": "string",
  "avatar": "string",
  "bio": "string",
  "website": "string",
  "location": "string",
  "verified": "boolean",
  "emailVerified": "boolean",
  "phoneVerified": "boolean",
  "politicalProfileType": "CITIZEN|CANDIDATE|ELECTED_OFFICIAL|POLITICAL_ORG",
  "followersCount": "number",
  "followingCount": "number",
  "createdAt": "string"
}
```

### Post
```json
{
  "id": "string",
  "content": "string",
  "imageUrl": "string",
  "isPolitical": "boolean",
  "tags": ["string"],
  "authorId": "string",
  "author": "User",
  "likesCount": "number",
  "commentsCount": "number",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Comment
```json
{
  "id": "string",
  "content": "string",
  "userId": "string",
  "postId": "string",
  "user": "User",
  "createdAt": "string"
}
```

## Validation Rules and Constraints

### Common Field Validations
- **User ID, Post ID, Topic ID, etc.** - Must be valid CUID format
- **Email** - Must be valid email format, max 255 characters
- **Username** - 3-30 characters, alphanumeric and underscores only
- **Password** - Minimum 8 characters, must include uppercase, lowercase, and number
- **Phone Number** - Must be valid E.164 format (e.g., +1234567890)

### Content Validations
- **Post Content** - 1-2000 characters, HTML sanitized
- **Comment Content** - 1-500 characters for post comments, 1-2000 for topic comments
- **Topic Comment** - 1-2000 characters, supports threading
- **Bio** - Maximum 500 characters
- **Candidate Platform Summary** - Maximum 2000 characters

### Topic System Validations
- **Topic Title** - Maximum 200 characters, auto-generated by AI
- **Topic Category** - Maximum 50 characters, must match predefined categories
- **Arguments For/Against** - Each argument maximum 500 characters
- **Neutral Summary** - Maximum 2000 characters
- **Complexity Score** - Float between 0.0 (simple) and 1.0 (highly nuanced)
- **Evidence Quality** - Float between 0.0 (unsupported) and 1.0 (well-sourced)
- **Controversy Score** - Float between 0.0 (consensus) and 1.0 (highly contentious)
- **Hostility Score** - Float between 0.0 (civil) and 1.0 (hostile)
- **Relevance Score** - Float between 0.0 and 1.0 for post-topic associations

### Election System Validations
- **Election Name** - 1-200 characters
- **State Code** - Must be valid 2-letter US state code
- **ZIP Code** - Valid 5 or 9-digit US ZIP code format
- **Office Title** - 1-200 characters
- **Candidate Name** - 1-200 characters, as it appears on ballot
- **Political Party** - 1-100 characters
- **Campaign Website** - Valid URL format
- **Key Issues** - Array of strings, each 1-50 characters
- **Financial Amounts** - Non-negative decimal values with 2 decimal places

### Geographic Validations
- **Address Fields** - Street address max 200 chars, city max 100 chars
- **H3 Index** - Valid H3 geospatial index format
- **District** - 1-50 characters for legislative districts

### Query Parameter Validations
- **Pagination** - Page ≥ 1, Limit 1-100 (default 20)
- **Timeframe** - 1-168 hours (1 week maximum)
- **Search Query** - 1-100 characters
- **Category Filter** - Must match existing topic categories

## Validation Rules and Constraints

### User Registration
- **Email**: Valid email format, unique across platform
- **Username**: 3-30 characters, alphanumeric + underscores, unique
- **Password**: Minimum 8 characters, must contain uppercase, lowercase, number, special character
- **First/Last Name**: Maximum 50 characters each
- **Phone Number**: Valid E.164 format (e.g., +1234567890)
- **hCaptcha Token**: Required for registration

### Post Creation
- **Content**: 1-2000 characters, required
- **Image URL**: Valid URL format if provided
- **Tags**: Array of strings, maximum 10 tags, each tag 1-30 characters
- **Political Flag**: Boolean, defaults to false

### Topic Comments
- **Content**: 1-2000 characters, required
- **Parent ID**: Valid comment ID for replies
- **Topic/SubTopic ID**: Must reference existing topic or sub-topic

### Candidate Registration
- **Office ID**: Must reference valid office in active election
- **Platform Summary**: Maximum 2000 characters
- **Key Issues**: Array of strings, maximum 10 issues
- **Campaign Website**: Valid URL format if provided
- **Campaign Email**: Valid email format if provided
- **Campaign Phone**: Valid phone format if provided

### Election Data
- **State**: Two-letter state code (e.g., CA, NY)
- **ZIP Code**: 5-digit or 9-digit format (12345 or 12345-6789)
- **District**: Alphanumeric, maximum 50 characters
- **Date Range**: Election date must be future date for active elections

### Report Submission
- **Target Type**: Must be POST, COMMENT, USER, or MESSAGE
- **Target ID**: Must reference existing content
- **Reason**: Must be valid predefined reason from enum
- **Description**: Maximum 1000 characters

### Search Parameters
- **Query (q)**: 1-100 characters for text search
- **Limit**: 1-100 items per page
- **Page**: Minimum 1
- **Category**: Must match existing categories
- **State**: Two-letter state code
- **Timeframe**: 1-168 hours for trending analysis

### Rate Limiting Rules
- **Authentication**: 5 requests per 15 minutes per IP
- **Post Creation**: 10 posts per 15 minutes per user
- **General API**: 100 requests per 15 minutes per IP
- **Email Verification**: 3 attempts per hour per user
- **Phone Verification**: 5 attempts per hour per user
- **Report Submission**: 20 reports per day per user

## AI System Methodology

### Idea-Focused Analysis Philosophy

The United We Rise platform employs advanced AI systems to promote civil discourse by focusing on the **merit of ideas** rather than political tribal affiliations. Our approach intentionally avoids political lean scoring or partisan classification.

The United We Rise AI system is designed to **transcend political labels** and focus on the **merit of ideas themselves**. Instead of analyzing whether content is "liberal" or "conservative," the system evaluates:

- **Logical coherence** - How well-reasoned is the argument?
- **Evidence quality** - What supporting data or sources are provided?
- **Constructive engagement** - Does this advance meaningful discussion?
- **Complexity recognition** - Does this acknowledge nuance and trade-offs?

This approach encourages users to engage with **ideas on their merit** rather than dismissing them based on perceived political alignment, fostering more productive civil discourse.

### Hybrid AI Architecture
The system uses a **two-tier approach** optimized for both speed and quality:

#### Tier 1: Real-time Analysis (Sentence Transformers)
For immediate processing of all posts:
- **Model**: sentence-transformers/all-MiniLM-L6-v2
- **Speed**: ~50ms per post
- **Capabilities**: Semantic embeddings, basic categorization, similarity matching

#### Tier 2: Deep Analysis (Qwen3)
For complex reasoning tasks:
- **Model**: Qwen/Qwen2.5-3B 
- **Speed**: 2-5 seconds per analysis
- **Capabilities**: Argument summarization, neutral framing, complex reasoning

### Core AI Components

#### 1. Sentence Transformers (Embedding Generation)
- **Model**: sentence-transformers/all-MiniLM-L6-v2
- **Output**: 384-dimensional semantic vectors
- **Purpose**: Convert text to numerical representations for similarity analysis
- **Performance**: ~100ms per text analysis
- **Fallback**: Deterministic hash-based vectors if API unavailable

#### 2. Topic Clustering Algorithm
- **Method**: Semantic similarity clustering using cosine distance
- **Threshold**: 0.75 similarity score for topic grouping
- **Process**:
  1. Generate embeddings for all recent posts (24-hour window)
  2. Calculate pairwise similarities between posts
  3. Group posts with similarity > threshold into topics
  4. Generate neutral topic titles using content analysis
  5. Extract balanced arguments from clustered posts

#### 3. Argument Analysis System
- **Evidence Quality Scoring** (0-1 scale):
  - Source citations: +0.6 points
  - Statistical data: +0.3 points
  - Personal anecdotes: +0.2 points
  - External links: +0.1 points
- **Argument Strength Assessment** (0-1 scale):
  - Logical connectors ("because", "therefore"): +0.2 points
  - Question asking (complexity acknowledgment): +0.1 points
  - Absolute statements ("always", "never"): -0.2 points
- **Hostility Detection** (0-1 scale):
  - Inflammatory language: +0.3 points
  - Personal attacks: +0.5 points
  - ALL CAPS usage > 30%: +0.2 points
  - Excessive punctuation: +0.1 points

### Text Preprocessing Pipeline

1. **Content Sanitization**
   - Remove special characters except punctuation
   - Normalize whitespace and line breaks
   - Truncate to 2000 characters maximum
   - Filter out spam indicators

2. **Semantic Analysis**
   - Extract key phrases and topics
   - Identify argument structure
   - Classify argument types (evidence-based, ethical, economic, etc.)
   - Detect personal experience vs. general claims

3. **Quality Assessment**
   - Measure coherence and logical flow
   - Evaluate evidence quality and sourcing
   - Assess relevance to discussion topic
   - Score constructive engagement potential

### Embedding Storage and Retrieval

#### PostgreSQL Implementation (Current)
- **Storage**: Array columns with 384 float values
- **Similarity Search**: Cosine distance calculation in SQL
- **Performance**: ~500ms for 1000+ post comparisons
- **Indexing**: GiST indexes on embedding columns

#### Qdrant Integration (Planned)
- **Storage**: Native vector database with HNSW indexing
- **Similarity Search**: Optimized approximate nearest neighbor
- **Performance**: <50ms for millions of vectors
- **Scalability**: Horizontal clustering support

### Topic Generation Process

1. **Content Aggregation** (Every hour)
   - Collect posts from last 24 hours
   - Generate embeddings for new content
   - Filter by minimum engagement threshold

2. **Similarity Clustering**
   - Calculate all pairwise similarities
   - Identify clusters above similarity threshold
   - Merge similar existing topics
   - Create new topics for unique clusters

3. **Neutral Summary Generation**
   - Extract key arguments from cluster posts
   - Identify supporting and opposing viewpoints
   - Generate balanced, non-partisan summaries
   - Calculate complexity and controversy scores

4. **Quality Control**
   - Validate topic coherence
   - Filter out low-quality clusters
   - Merge duplicate or overlapping topics
   - Update trending scores based on engagement

### Performance Metrics

- **Embedding Generation**: 384-dimensional vectors using Sentence Transformers
- **Topic Analysis Speed**: 2-5 seconds for 500 posts
- **Similarity Search**: <1 second for 10,000 comparisons
- **Storage Efficiency**: ~1.5KB per post embedding
- **Accuracy**: 85% topic relevance based on user feedback
- **Scalability**: Designed for 100,000+ daily posts
   - Batch processing support for existing content

3. **Similarity Calculation**
   - Cosine similarity for semantic comparison
   - Configurable similarity thresholds (default 0.7)
   - **Qdrant optimization**: ~1000 vectors/second search performance

### Topic Clustering Algorithm

1. **Post Collection**
   - Recent posts within specified timeframe (default 24 hours)
   - Only posts with valid embeddings
   - Maximum 500 posts per analysis

2. **Clustering Process**
   - Semantic similarity clustering using embedding vectors
   - Minimum 3 posts per topic cluster
   - Centroid calculation for topic representation
   - Maximum 20 topics per analysis run

3. **Topic Summarization**
   - AI-generated titles from key phrase extraction
   - Argument classification (for/against analysis)
   - Neutral summary generation
   - Category assignment based on content

### Content Analysis Features

1. **Sentiment Analysis**
   - Score range: -1.0 (negative) to +1.0 (positive)
   - Keyword-based analysis with AI enhancement
   - Real-time scoring for new content

2. **Argument Quality Assessment**
   - **Argument Strength**: 0.0 (poor logic) to 1.0 (strong reasoning)
   - **Evidence Level**: 0.0 (no evidence) to 1.0 (strong evidence)
   - **Topic Relevance**: 0.0 (off-topic) to 1.0 (highly relevant)
   - Focus on logical coherence rather than political alignment

3. **Hostility Assessment**
   - Score range: 0.0 (civil) to 1.0 (hostile)
   - Harmful language detection
   - Capitalization and punctuation analysis
   - Automated moderation triggers

4. **Idea Quality Metrics**
   - **Argument Strength**: Logical coherence and reasoning quality
   - **Evidence Level**: Quality and presence of supporting data/sources
   - **Topic Relevance**: Direct relevance to core discussion topic
   - **Complexity Score**: Recognition of nuance and multiple perspectives

5. **Controversy Scoring**
   - Measures topic contentiousness based on argument diversity
   - Used for trending score calculation
   - **No political bias** - focuses on idea merit rather than partisan alignment

### Trending Algorithm

Topic trending scores are calculated using:

```
Base Score = (post_count × 0.1) + (participant_count × 0.2)

Time Multipliers:
- Last hour: ×2.0
- Last 6 hours: ×1.5  
- Last 24 hours: ×1.2
- Older: exponential decay over 48 hours

Controversy Boost = 1 + (controversy_score × 0.5)

Final Score = Base Score × Time Multiplier × Controversy Boost
```

### Data Privacy and Ethics

1. **Privacy Protection**
   - Embeddings cannot be reverse-engineered to original text
   - User data never shared with external AI services
   - All analysis performed on anonymized content
   - Full compliance with GDPR and CCPA requirements

2. **Bias Prevention**
   - No political lean detection or scoring
   - Balanced argument extraction from all viewpoints
   - Regular algorithm auditing for fairness
   - Transparent methodology documentation

3. **Content Integrity**
   - Original post content never modified
   - AI summaries clearly labeled as generated
   - User control over AI feature participation
   - Human moderator oversight for sensitive topics

### API Integration Examples

#### Getting AI Analysis for a Post
```javascript
// When creating a post, AI analysis is automatic
const response = await fetch('/api/posts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Healthcare reform requires evidence-based policy...'
  })
});

// Response includes AI analysis
const post = await response.json();
console.log(post.analysis.argumentStrength); // 0.8
console.log(post.analysis.evidenceLevel); // 0.9
console.log(post.analysis.hostilityScore); // 0.1
```

#### Finding Similar Content
```javascript
// Search for posts similar to current topic
const similarPosts = await fetch(`/api/topics/${topicId}/similar?limit=5`);
const posts = await similarPosts.json();

// Each post includes similarity score
posts.forEach(post => {
  console.log(`${post.content.slice(0, 50)}... (${post.similarity.toFixed(2)} similarity)`);
});
```

### Fallback Mechanisms

1. **Service Degradation**
   - Platform functions fully without AI features
   - Manual topic creation when clustering fails
   - Basic keyword matching as embedding fallback
   - Human moderation when AI analysis unavailable

2. **Error Recovery**
   - Retry failed analyses with exponential backoff
   - Queue background processing for failed embeddings
   - Alert administrators to persistent AI failures
   - Maintain service availability during AI downtime

2. **Analysis Frequency**
   - Manual trigger for topic analysis
   - Configurable timeframes and post limits
   - Trending score updates separate from clustering

3. **Fallback Mechanisms**
   - Graceful degradation when AI services fail
   - Zero vectors as embedding fallbacks
   - Basic keyword analysis when advanced AI unavailable

## Webhooks

### Content Moderation Events
When content is automatically flagged or moderated, webhooks can be triggered:

```json
{
  "event": "content.flagged",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "contentId": "content-id",
    "contentType": "POST",
    "flagType": "SPAM",
    "confidence": 0.85,
    "action": "hidden"
  }
}
```

### Topic Analysis Events
```json
{
  "event": "topic.analysis.completed",
  "timestamp": "2024-08-07T16:30:00Z",
  "data": {
    "topicsCreated": 5,
    "postsAnalyzed": 147,
    "timeframe": 24,
    "triggeredBy": "admin-user-id"
  }
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.unitedwerise.com',
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});

// Create a post
const createPost = async (content) => {
  const response = await api.post('/api/posts', {
    content,
    isPolitical: true
  });
  return response.data;
};

// Get user's representatives
const getRepresentatives = async () => {
  const response = await api.get('/api/political/representatives');
  return response.data;
};
```

### Python
```python
import requests

class UnitedWeRiseAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def create_post(self, content, is_political=False):
        response = requests.post(
            f'{self.base_url}/api/posts',
            json={'content': content, 'isPolitical': is_political},
            headers=self.headers
        )
        return response.json()
    
    def get_representatives(self):
        response = requests.get(
            f'{self.base_url}/api/political/representatives',
            headers=self.headers
        )
        return response.json()

# Usage
api = UnitedWeRiseAPI('https://api.unitedwerise.com', 'your-jwt-token')
post = api.create_post('My political opinion...', True)
```

## Candidate Messaging System

The candidate messaging system provides a dedicated political communication platform separate from general user messaging. It enables direct citizen-candidate communication, staff delegation, and public Q&A functionality.

### Key Features

- **Separate Political Messaging**: Dedicated system for candidate communication
- **Staff Delegation**: Multi-role campaign team management
- **Anonymous Inquiries**: Citizens can contact candidates without accounts
- **Public Q&A**: Convert inquiries to public questions with community voting
- **Policy Categories**: 20+ predefined categories for organizing inquiries
- **Priority System**: Automatic priority detection and manual adjustment
- **Response Types**: Direct responses, public Q&A, policy statements, referrals

### Submit Inquiry to Candidate

Submit a message or question to a candidate's inbox.

```http
POST /api/candidate-messages/{candidateId}/inquiry
```

**Parameters:**
- `candidateId` (path) - Candidate ID

**Request Body:**
```json
{
  "subject": "Question about Healthcare Policy",
  "content": "What is your position on universal healthcare?",
  "category": "HEALTHCARE",
  "isAnonymous": false,
  "contactEmail": "citizen@example.com",
  "contactName": "John Citizen",
  "policyTopic": "Universal Healthcare",
  "specificQuestion": "Do you support a single-payer system?"
}
```

**Categories Available:**
- `GENERAL`, `HEALTHCARE`, `EDUCATION`, `ECONOMY`, `ENVIRONMENT`
- `IMMIGRATION`, `FOREIGN_POLICY`, `CRIMINAL_JUSTICE`, `INFRASTRUCTURE`
- `HOUSING`, `LABOR`, `TECHNOLOGY`, `CIVIL_RIGHTS`, `BUDGET_TAXES`
- `ENERGY`, `AGRICULTURE`, `VETERANS`, `SENIORS`, `YOUTH`, `FAMILY_VALUES`, `OTHER`

**Response:**
```json
{
  "message": "Inquiry submitted successfully",
  "inquiry": {
    "id": "inquiry_123",
    "subject": "Question about Healthcare Policy",
    "category": "HEALTHCARE",
    "status": "OPEN",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get Candidate Inbox (Staff/Candidate Only)

Retrieve candidate's message inbox with filtering options.

```http
GET /api/candidate-messages/{candidateId}/inbox?status=OPEN&category=HEALTHCARE&limit=20&offset=0
```

**Authentication:** Required
**Authorization:** Candidate or staff member with `READ_INQUIRIES` permission

**Query Parameters:**
- `status` - Filter by inquiry status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, etc.)
- `category` - Filter by policy category
- `priority` - Filter by priority level (`LOW`, `NORMAL`, `HIGH`, `URGENT`)
- `limit` - Number of results (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "inbox": {
    "id": "inbox_123",
    "candidateId": "candidate_456",
    "isActive": true,
    "allowPublicQ": true,
    "staffMembers": [...],
    "candidate": {
      "id": "candidate_456",
      "name": "Jane Smith",
      "party": "Independent"
    }
  },
  "inquiries": [
    {
      "id": "inquiry_789",
      "subject": "Healthcare Question",
      "content": "...",
      "category": "HEALTHCARE",
      "priority": "NORMAL",
      "status": "OPEN",
      "isPublic": false,
      "isAnonymous": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "inquirer": {
        "id": "user_101",
        "firstName": "John",
        "lastName": "Citizen",
        "username": "johncitizen"
      },
      "responses": [],
      "assignedStaff": null
    }
  ],
  "totalCount": 45,
  "hasMore": true,
  "stats": {
    "total": 45,
    "open": 12,
    "inProgress": 8,
    "resolved": 25,
    "responseRate": 78
  }
}
```

### Respond to Inquiry (Staff/Candidate Only)

Send a response to a candidate inquiry.

```http
POST /api/candidate-messages/inquiry/{inquiryId}/respond
```

**Authentication:** Required
**Authorization:** Candidate or staff member with `RESPOND_INQUIRIES` permission

**Request Body:**
```json
{
  "content": "Thank you for your question about healthcare. My position is...",
  "responseType": "DIRECT",
  "isPublic": false,
  "isFromCandidate": true
}
```

**Response Types:**
- `DIRECT` - Direct response to inquirer
- `PUBLIC_QA` - Convert to public Q&A
- `POLICY_STATEMENT` - Official policy statement
- `REFERRAL` - Refer to existing content/website

**Response:**
```json
{
  "message": "Response sent successfully",
  "response": {
    "id": "response_123",
    "content": "Thank you for your question...",
    "responseType": "DIRECT",
    "isPublic": false,
    "createdAt": "2024-01-15T14:30:00Z"
  }
}
```

### Get Public Q&A for Candidate

Retrieve public questions and answers for a candidate.

```http
GET /api/candidate-messages/{candidateId}/public-qa?category=HEALTHCARE&limit=20
```

**Query Parameters:**
- `category` - Filter by policy category
- `pinned` - Filter by pinned status (true/false)
- `limit` - Number of results (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "qas": [
    {
      "id": "qa_123",
      "question": "What is your position on universal healthcare?",
      "answer": "I support a public option that works alongside private insurance...",
      "category": "HEALTHCARE",
      "isPinned": false,
      "upvotes": 15,
      "views": 234,
      "createdAt": "2024-01-15T12:00:00Z",
      "candidate": {
        "id": "candidate_456",
        "name": "Jane Smith",
        "party": "Independent"
      }
    }
  ],
  "totalCount": 28,
  "hasMore": true
}
```

### Vote on Public Q&A

Upvote or downvote a public Q&A entry.

```http
POST /api/candidate-messages/{candidateId}/public-qa/{qaId}/vote
```

**Authentication:** Required

**Request Body:**
```json
{
  "voteType": "UPVOTE"
}
```

**Vote Types:**
- `UPVOTE` - Upvote the Q&A
- `DOWNVOTE` - Downvote the Q&A

**Response:**
```json
{
  "message": "Vote recorded successfully",
  "voteType": "UPVOTE",
  "netUpvotes": 16
}
```

### Staff Management

#### Add Staff Member (Candidate/Manager Only)

Add a staff member to candidate's messaging team.

```http
POST /api/candidate-messages/{candidateId}/staff
```

**Authentication:** Required
**Authorization:** Candidate or staff member with `MANAGE_STAFF` permission

**Request Body:**
```json
{
  "userId": "user_789",
  "role": "COMMUNICATIONS_DIRECTOR",
  "permissions": [
    "READ_INQUIRIES",
    "RESPOND_INQUIRIES",
    "ASSIGN_INQUIRIES",
    "PUBLISH_QA"
  ]
}
```

**Staff Roles:**
- `CAMPAIGN_MANAGER` - Full access to all functions
- `COMMUNICATIONS_DIRECTOR` - Messaging and public relations
- `POLICY_ADVISOR` - Policy-focused responses
- `VOLUNTEER_COORDINATOR` - Community engagement
- `VOLUNTEER` - Basic response capabilities
- `INTERN` - Limited access

**Staff Permissions:**
- `READ_INQUIRIES` - View inquiries and responses
- `RESPOND_INQUIRIES` - Send responses to inquiries
- `ASSIGN_INQUIRIES` - Assign inquiries to other staff
- `MANAGE_STAFF` - Add/remove staff members and manage permissions
- `MANAGE_SETTINGS` - Change inbox configuration
- `PUBLISH_QA` - Convert inquiries to public Q&A
- `MODERATE_QA` - Moderate public Q&A section

#### Get Staff Members

Get list of staff members for candidate's messaging team.

```http
GET /api/candidate-messages/{candidateId}/staff
```

**Authentication:** Required
**Authorization:** Candidate or staff member with `MANAGE_STAFF` permission

**Response:**
```json
{
  "staffMembers": [
    {
      "id": "staff_123",
      "role": "COMMUNICATIONS_DIRECTOR",
      "permissions": ["READ_INQUIRIES", "RESPOND_INQUIRIES", "PUBLISH_QA"],
      "isActive": true,
      "createdAt": "2024-01-10T09:00:00Z",
      "user": {
        "id": "user_789",
        "firstName": "Sarah",
        "lastName": "Johnson",
        "username": "sarahj",
        "email": "sarah@campaign.com"
      }
    }
  ],
  "count": 4
}
```

### Integration with AI Candidate Comparison

The messaging system integrates seamlessly with the AI candidate comparison feature. When the AI analysis shows a candidate has no position on a topic, it provides a direct link to contact the candidate:

```json
{
  "issue": "Climate Policy",
  "positions": [
    {
      "candidateId": "candidate_123",
      "candidateName": "John Doe",
      "position": "No public position available on Climate Policy. To ask John Doe directly about this issue, send an inquiry using the contact form.",
      "stance": "unknown",
      "confidence": 0.0,
      "contactUrl": "/candidate-messages/candidate_123/inquiry?topic=Climate Policy"
    }
  ]
}
```

### Error Handling

The candidate messaging system provides comprehensive error handling:

```json
{
  "error": "Missing required fields",
  "message": "Subject and content are required"
}
```

**Common Error Codes:**
- `400` - Invalid request data or missing required fields
- `401` - Authentication required
- `403` - Permission denied (insufficient permissions)
- `404` - Candidate, inquiry, or resource not found
- `500` - Internal server error

### Rate Limiting

Candidate messaging endpoints have specific rate limits:
- **Public inquiries**: 5 per hour per IP
- **Authenticated inquiries**: 10 per hour per user
- **Staff responses**: 50 per hour per staff member
- **Q&A voting**: 100 votes per hour per user

### Usage Examples

#### Anonymous Citizen Inquiry
```javascript
// Submit anonymous healthcare question
const inquiry = await fetch('/api/candidate-messages/candidate_123/inquiry', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subject: 'Question about Medicare for All',
    content: 'Do you support expanding Medicare to cover all Americans?',
    category: 'HEALTHCARE',
    isAnonymous: true,
    contactEmail: 'concerned.citizen@email.com',
    contactName: 'Concerned Citizen',
    policyTopic: 'Medicare for All'
  })
});
```

#### Staff Dashboard - View Inbox
```javascript
// Get candidate inbox for staff dashboard
const inbox = await fetch('/api/candidate-messages/candidate_123/inbox?status=OPEN', {
  headers: { 'Authorization': 'Bearer ' + staffToken }
});

const data = await inbox.json();
console.log(`${data.stats.open} open inquiries`);
```

#### Convert Inquiry to Public Q&A
```javascript
// Respond and make public
const response = await fetch('/api/candidate-messages/inquiry/inquiry_456/respond', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + staffToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Great question! My position on healthcare is...',
    responseType: 'PUBLIC_QA',
    isPublic: true,
    isFromCandidate: true
  })
});
```

## Testing

### Health Check
```http
GET /health
```

Returns server health status and database connectivity.

### API Status
```http
GET /api/health
```

Returns API-specific health information including:
- Database status
- WebSocket status
- Service uptime

## Support

- **Documentation**: This API documentation
- **Interactive Docs**: `/api/docs` endpoint
- **Status Page**: Check service status and uptime
- **Rate Limits**: Monitor your API usage

For technical support, please refer to the troubleshooting section in the deployment documentation.
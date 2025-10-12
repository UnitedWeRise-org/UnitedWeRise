# Backend Codebase Audit - October 8, 2025

## Executive Summary

- **TypeScript Compilation Status**: ⚠️ **61 compilation errors** - Critical issue requiring immediate attention
- **Route Files**: 41 route files with 300+ API endpoints documented
- **Service Files**: 48 service files identified with various business logic implementations
- **Database Schema**: 100+ models with recent migrations for Quest/Badge system, Saved Posts, and Feed Filters
- **Key Concerns**: Schema-code mismatches after recent migrations, missing Prisma regeneration, Azure SDK dependency issue

---

## 1. Routes Audit

### Route Files Inventory (41 Total)

#### Core Authentication & User Management
1. **`/src/routes/auth.ts`** - Authentication & Authorization
   - Registration, login, logout, password reset
   - TOTP integration, email/username availability checks
   - OAuth provider linking
   - **Endpoints**: 12 total

2. **`/src/routes/oauth.ts`** - OAuth Integration
   - Google, Microsoft, Apple OAuth flows
   - Provider linking/unlinking
   - **Endpoints**: 7 total

3. **`/src/routes/totp.ts`** - Two-Factor Authentication
   - TOTP setup, verification, disable
   - Backup codes regeneration
   - **Endpoints**: 6 total

4. **`/src/routes/users.ts`** - User Profile Management
   - Profile CRUD, privacy settings, notification preferences
   - Follow/unfollow functionality
   - Activity tracking and user search
   - **Endpoints**: 21 total

5. **`/src/routes/verification.ts`** - Email/Phone Verification
   - Email and phone verification flows
   - Verification status checks
   - **Endpoints**: 5 total

#### Content & Feed Management
6. **`/src/routes/posts.ts`** - Post Management
   - Post CRUD, likes, reactions, shares, comments
   - Map data, trending comments
   - Post history and archives
   - **Saved posts functionality** (NEW)
   - **Endpoints**: 21+ total

7. **`/src/routes/feed.ts`** - Feed System
   - Discover and following feeds
   - **Feed filters** (NEW - custom user filters)
   - Trending content
   - **Endpoints**: 5 total

8. **`/src/routes/topics.ts`** - Topic Discussion
   - Trending topics, topic comments
   - Topic analysis and search
   - **Endpoints**: 6 total

9. **`/src/routes/topicNavigation.ts`** - Topic Navigation
   - Topic entry/exit tracking
   - Topic-specific posts
   - **Endpoints**: 6 total

10. **`/src/routes/trendingTopics.ts`** - Trending Analysis
    - Topic trending algorithms
    - Map-based topic visualization
    - **Endpoints**: 2 total

#### Social Features
11. **`/src/routes/relationships.ts`** - Social Relationships
    - Follow, subscribe, friend request flows
    - Relationship status checks
    - Bulk operations
    - **Endpoints**: 20 total

12. **`/src/routes/messages.ts`** - Direct Messaging
    - Conversation management
    - Message sending/receiving
    - **Endpoints**: 4 total

13. **`/src/routes/unifiedMessages.ts`** - Unified Messaging System
    - Admin-candidate, user-candidate messaging
    - Conversation threads
    - Unread counts
    - **Endpoints**: 8 total

14. **`/src/routes/notifications.ts`** - Notifications
    - Notification retrieval
    - Mark as read (single/batch/all)
    - **Endpoints**: 4 total

#### Political & Civic Features
15. **`/src/routes/candidates.ts`** - Candidate Profiles
    - Candidate CRUD, endorsements
    - Registration and payment flows
    - Platform updates, withdrawal
    - Enhanced candidate data, AI health checks
    - **Endpoints**: 19 total

16. **`/src/routes/candidatePolicyPlatform.ts`** - Policy Positions
    - Policy position CRUD
    - Category management
    - Race comparisons
    - **Endpoints**: 10 total

17. **`/src/routes/candidateMessages.ts`** - Candidate Communication
    - Public inquiry system
    - Staff management
    - Public Q&A voting
    - **Endpoints**: 7 total

18. **`/src/routes/candidateAdminMessages.ts`** - Admin-Candidate Messaging
    - Admin message threads
    - Unread counts
    - **Endpoints**: 3 total

19. **`/src/routes/candidateVerification.ts`** - Candidate Verification
    - Document upload and verification
    - Admin verification workflows
    - **Endpoints**: 6 total

20. **`/src/routes/elections.ts`** - Election Data
    - Election listings, candidate comparisons
    - Candidate registration
    - Cache refresh
    - **Endpoints**: 6 total

21. **`/src/routes/externalCandidates.ts`** - External Data Import
    - Google Civic API integration
    - Bulk import, claim functionality
    - **Endpoints**: 8 total

22. **`/src/routes/googleCivic.ts`** - Google Civic Integration
    - Representative lookup
    - Election data
    - **Endpoints**: 2 total

23. **`/src/routes/political.ts`** - Political Profile Management
    - Political profile updates
    - Official lookups
    - Representative data
    - **Endpoints**: 6 total

24. **`/src/routes/legislative.ts`** - Legislative Data
    - Voting records, bills, news
    - Federal and state sync
    - Trending news
    - **Endpoints**: 10 total

25. **`/src/routes/civic.ts`** - Civic Engagement
    - Petitions, events
    - User participation tracking
    - **Endpoints**: 14 total

26. **`/src/routes/crowdsourcing.ts`** - Crowdsourced Data
    - District lookups
    - Office and official submissions
    - Voting and conflict reporting
    - **Endpoints**: 9 total

#### Admin & Moderation
27. **`/src/routes/admin.ts`** - Admin Dashboard
    - User management (suspend, unsuspend, role changes)
    - Content flagging and resolution
    - Analytics and security events
    - Enhanced dashboard with AI insights
    - Schema inspection (Super Admin only)
    - **Endpoints**: 20+ total

28. **`/src/routes/moderation.ts`** - Content Moderation
    - Report submission and review
    - Moderation actions
    - Moderator statistics
    - **Endpoints**: 7 total

29. **`/src/routes/appeals.ts`** - Appeals System
    - Appeal submission
    - Appeal review (moderators)
    - **Endpoints**: 5 total

30. **`/src/routes/feedback.ts`** - User Feedback (Admin)
    - Feedback analysis with AI
    - Batch processing
    - **Endpoints**: 5 total

31. **`/src/routes/reputation.ts`** - Reputation System
    - User reputation tracking
    - Reputation history and analysis
    - Admin awards and statistics
    - **Endpoints**: 10 total

#### Gamification & Engagement
32. **`/src/routes/quests.ts`** - Quest System (NEW)
    - Daily quests, progress tracking
    - Streak management
    - Admin quest creation and analytics
    - **Endpoints**: 9 total
    - **⚠️ Schema Mismatch**: Quest/UserQuestProgress/UserQuestStreak models not in Prisma client

33. **`/src/routes/badges.ts`** - Badge System (NEW)
    - User badge vault
    - Badge display settings
    - Admin badge creation/management
    - **Endpoints**: 10 total
    - **⚠️ Schema Mismatch**: Badge/UserBadge models not in Prisma client

#### Media & Photos
34. **`/src/routes/photos/index.ts`** - Photo Upload System
    - Photo upload with moderation
    - Health check
    - **Endpoints**: 2 total
    - **⚠️ Schema Issue**: PhotoType enum mismatch

35. **`/src/routes/galleries.ts`** - Photo Galleries
    - Gallery management
    - Profile picture setting
    - **Endpoints**: 4 total
    - **⚠️ Schema Issue**: Missing Photo fields (uploadedAt, deletedAt)

#### Payments & Donations
36. **`/src/routes/payments.ts`** - Payment Processing
    - Donation and fee processing
    - Payment history, receipts
    - Tax summaries
    - Stripe webhook handling
    - **Endpoints**: 7 total

#### Search & Discovery
37. **`/src/routes/search.ts`** - Unified Search
    - Cross-entity search (users, posts, officials, topics)
    - **Endpoints**: 5 total

#### System & Utilities
38. **`/src/routes/health.ts`** - Health Checks
    - System health, version, deployment info
    - Database, reputation, batch system checks
    - **Endpoints**: 7 total

39. **`/src/routes/batch.ts`** - Batch Operations
    - App initialization
    - Auth status checks
    - **Endpoints**: 3 total

40. **`/src/routes/onboarding.ts`** - User Onboarding
    - Onboarding steps and progress
    - Location validation
    - Analytics
    - **Endpoints**: 8 total

41. **`/src/routes/motd.ts`** - Message of the Day
    - Current MOTD display
    - Admin MOTD management
    - Analytics and dismissals
    - **Endpoints**: 8 total

### Authentication & Authorization Patterns

#### Middleware Usage Analysis
- **`requireAuth`**: Used in ~200+ endpoints (authenticated users only)
- **`requireAdmin`**: Used in ~40 endpoints (admin-only operations)
- **`requireModerator`**: Used in ~10 endpoints (moderator operations)
- **`requireSuperAdmin`**: Used in 1 endpoint (schema inspection)
- **`requireTOTPForAdmin`**: Used in all admin endpoints (admin 2FA requirement)
- **`requireCandidate`**: Used in candidate verification endpoints

#### Rate Limiting
- **`authLimiter`**: Authentication endpoints (login, register, OAuth)
- **`apiLimiter`**: General API rate limiting (appeals, reports, external data)
- **`messageLimiter`**: Message sending rate limits
- **`postLimiter`**: Post creation rate limits
- **`verificationLimiter`**: Verification code sending

#### Content Moderation Middleware
- **`contentFilter`**: Applied to posts and comments
- **`moderateContent('POST')`**: Automated post moderation
- **`moderateContent('COMMENT')`**: Automated comment moderation
- **`addContentWarnings`**: Adds warnings to flagged content
- **`checkUserSuspension`**: Prevents suspended users from posting

### Error Handling Patterns

#### ✅ Good Patterns Found
```typescript
// Standard error handling with logging
try {
  const result = await operation();
  res.json({ success: true, data: result });
} catch (error) {
  console.error('Operation error:', error);
  res.status(500).json({ error: 'Internal server error' });
}
```

#### ⚠️ Concerns Found
1. **Inconsistent response formats**: Some endpoints use `{success: true, data: ...}`, others use direct data objects
2. **Generic error messages**: Many endpoints return "Internal server error" without specifics
3. **Missing input validation**: Some endpoints lack validation middleware
4. **No error tracking service**: Errors logged to console only, no centralized tracking

---

## 2. Services Audit

### Service Files Inventory (48 Total)

#### Core Services
1. **`activityTracker.ts`** - User activity tracking (posts, comments, likes, etc.)
2. **`sessionManager.ts`** - User session and token management
3. **`securityService.ts`** - Security event logging, account locking, failed login tracking
4. **`metricsService.ts`** - Application metrics and monitoring
5. **`apiCache.ts`** - API response caching layer

#### Authentication & Security
6. **`oauthService.ts`** - OAuth provider integration (Google, Microsoft, Apple)
7. **`captchaService.ts`** - hCaptcha verification
8. **`emailService.ts`** - Email sending (verification, notifications)
9. **`smsService.ts`** - SMS verification codes

#### Content & Moderation
10. **`moderationService.ts`** - Content moderation workflows
11. **`imageContentModerationService.ts`** - Azure AI Content Safety integration
    - **⚠️ Issue**: Missing Azure SDK dependency `@azure-rest/ai-content-safety`
12. **`feedbackAnalysisService.ts`** - User feedback AI analysis
13. **`postManagementService.ts`** - Post lifecycle management
14. **`postGeographicService.ts`** - Geographic post filtering (H3 indexing)

#### AI & Machine Learning
15. **`azureOpenAIService.ts`** - Azure OpenAI integration
16. **`embeddingService.ts`** - Text embedding generation
17. **`qwenService.ts`** - Qwen AI model integration
18. **`sentenceTransformersService.ts`** - Sentence embedding service
19. **`qdrantService.ts`** - Vector database service
20. **`semanticSearchService.ts`** - Semantic search functionality

#### Political & Civic Data
21. **`googleCivic.ts`** - Google Civic Information API
22. **`googleCivicService.ts`** - Enhanced Google Civic integration
23. **`electionService.ts`** - Election data management
24. **`enhancedElectionService.ts`** - Advanced election features
25. **`enhancedCandidateService.ts`** - Advanced candidate features
26. **`externalCandidateService.ts`** - External candidate data import
27. **`legislativeDataService.ts`** - Legislative data aggregation
28. **`representativeService.ts`** - Representative lookup
29. **`districtIdentificationService.ts`** - District identification logic
30. **`civicOrganizingService.ts`** - Civic engagement features

#### News & Content Aggregation
31. **`newsAggregationService.ts`** - News article aggregation
32. **`newsApiRateLimiter.ts`** - News API rate limiting

#### Topic & Discussion
33. **`topicDiscoveryService.ts`** - Topic discovery algorithms
34. **`topicAggregationService.ts`** - Topic aggregation logic
35. **`topicService.ts`** - Core topic functionality

#### Social Features
36. **`relationshipService.ts`** - Follow/friend relationships
37. **`candidateInboxService.ts`** - Candidate inbox management
38. **`candidateReportService.ts`** - Candidate reporting

#### Media & Storage
39. **`azureBlobService.ts`** - Azure Blob Storage integration
40. **`PhotoPipeline.ts`** - Photo upload pipeline with moderation
    - **⚠️ Issue**: PhotoType enum mismatch

#### Payments
41. **`stripeService.ts`** - Stripe payment processing

#### Gamification (NEW)
42. **`quest.service.ts`** - Quest system logic
    - **⚠️ Issue**: Quest models not in Prisma client
43. **`badge.service.ts`** - Badge awarding logic
    - **⚠️ Issue**: Badge models not in Prisma client

#### Feed & Discovery
44. **`probabilityFeedService.ts`** - Algorithmic feed generation
45. **`engagementScoringService.ts`** - Content engagement scoring

#### Business Logic
46. **`onboardingService.ts`** - User onboarding workflows
47. **`reputationService.ts`** - Reputation calculation
48. **`WebSocketService.ts`** - Real-time WebSocket communication

### Service Dependencies & Interactions

#### High Coupling Areas
1. **AI Services Cluster**: azureOpenAIService → embeddingService → qdrantService → semanticSearchService
2. **Political Data Cluster**: googleCivicService → electionService → candidateService → districtService
3. **Content Pipeline**: postManagementService → moderationService → imageContentModerationService → feedbackAnalysisService

#### Low Coupling Services (Good Design)
- `activityTracker.ts` - Independent tracking
- `sessionManager.ts` - Self-contained session logic
- `apiCache.ts` - Generic caching layer
- `metricsService.ts` - Independent monitoring

### Error Handling in Services

#### ✅ Good Patterns
- Most services wrap operations in try-catch blocks
- Services return `{success: boolean, data?, error?}` objects
- Logging with context-specific messages

#### ⚠️ Concerns
- No centralized error handling service
- Inconsistent error object structures
- Limited error recovery mechanisms
- No retry logic for external API failures

---

## 3. Types and Interfaces Audit

### Type Definition Files
1. **`/src/types/messaging.ts`** - Messaging-related types
2. **`/src/types/moderation.ts`** - Moderation-related types

### TypeScript Compilation Errors (61 Total)

#### Critical Issues by Category

**1. Schema-Code Mismatch (Quest & Badge System)** - 40 errors
- **Root Cause**: Recent migration `20251003_add_photo_quest_badge_tables` added models, but Prisma Client not regenerated
- **Affected Files**:
  - `src/services/quest.service.ts` (28 errors)
  - `src/services/badge.service.ts` (12 errors)
- **Missing Models**: Quest, UserQuestProgress, UserQuestStreak, Badge, UserBadge
- **Missing Enums**: QuestType, QuestCategory, QuestTimeframe

**2. SavedPost Feature** - 5 errors
- **Root Cause**: Recent migration `20251007_add_saved_posts` added SavedPost model, Prisma not regenerated
- **Affected File**: `src/routes/posts.ts`
- **Error**: `Property 'savedPost' does not exist on type 'PrismaClient'`

**3. Photo System Issues** - 3 errors
- **Root Cause**: Migration `20251002_nuclear_photo_removal` and `20251003_add_photo_quest_badge_tables` schema changes
- **Affected Files**:
  - `src/routes/galleries.ts` (uploadedAt, deletedAt fields missing)
  - `src/services/PhotoPipeline.ts` (PhotoType enum mismatch)

**4. Feed Filter System** - 2 errors
- **Root Cause**: Recent migration `20251008_add_feed_filter_system`, userBadges field referenced
- **Affected Files**: `src/routes/feed.ts`, `src/services/probabilityFeedService.ts`

**5. Comment Reactions** - 2 errors
- **Root Cause**: Schema change for Comment model reactions
- **Affected File**: `src/routes/posts.ts`
- **Error**: `Property 'reactions' does not exist on type Comment`

**6. Azure SDK Dependency** - 1 error
- **Root Cause**: Missing npm package
- **Affected File**: `src/services/imageContentModerationService.ts`
- **Error**: `Cannot find module '@azure-rest/ai-content-safety'`

**7. Post Count Issues** - 2 errors
- **Root Cause**: _count property access on Post without include
- **Affected File**: `src/routes/feed.ts`

#### Immediate Fix Required
```bash
# 1. Regenerate Prisma Client after recent migrations
cd backend
npx prisma generate

# 2. Install missing Azure SDK
npm install @azure-rest/ai-content-safety

# 3. Fix PhotoType enum usage in PhotoPipeline.ts
# 4. Fix _count access in feed.ts (add include clause)
# 5. Fix Comment reactions access (verify schema)
```

### Type Safety Concerns
- **Implicit `any` usage**: Some services use `any` for error objects
- **Missing request body types**: Not all endpoints have typed request bodies
- **Response type inconsistency**: Mix of `{success, data}` and direct objects
- **Partial Prisma selects**: Many queries use partial selects without explicit types

---

## 4. Database Schema Audit

### Models Overview (100+ Models)

#### Core Models
1. **User** (153 fields, 47 relations)
   - Authentication: email, password, TOTP fields
   - Profile: firstName, lastName, avatar, bio, location
   - Address: streetAddress, city, state, zipCode, h3Index
   - Political: politicalProfileType, verificationStatus, office
   - Privacy: profilePrivacySettings, notificationPreferences
   - Security: deviceFingerprint, riskScore, loginAttempts, lockedUntil
   - **New**: photoTaggingEnabled, requireTagApproval, allowTagsByFriendsOnly

2. **Post** (47 fields)
   - Content: content, extendedContent, imageUrl
   - Engagement: likesCount, commentsCount, sharesCount, viewsCount
   - Reactions: agreesCount, disagreesCount
   - Moderation: isDeleted, deletedReason, searchable, feedVisible
   - **Geographic**: h3Index, latitude, longitude, privacyDisplaced
   - **Feedback**: containsFeedback, feedbackCategory, feedbackPriority
   - **Versioning**: editCount, editHistory, originalContent

3. **Candidate** (46 fields)
   - Profile: name, party, office, platformSummary
   - Verification: isVerified, verificationStatus, thirdPartyVerification
   - Status: status, statusChangedAt, suspendedUntil, appealDeadline
   - External: googleCivicId, fecCandidateId, ballotpediaId
   - **Claiming**: isClaimed, claimedBy, claimedAt

#### New Models (Recent Migrations)

**Quest System** (Migration: 20251003)
4. **Quest** - Gamification quests
5. **UserQuestProgress** - User quest completion tracking
6. **UserQuestStreak** - Daily/weekly streak tracking

**Badge System** (Migration: 20251003)
7. **Badge** - Achievement badges
8. **UserBadge** - User-earned badges with display settings

**Saved Posts** (Migration: 20251007)
9. **SavedPost** - User-saved posts for later reading

**Feed Filters** (Migration: 20251008)
10. **FeedFilter** - Custom user feed filters with advanced options
    - Geographic filtering (H3 resolution, radius)
    - Content filtering (isPolitical, tags, categories)
    - Author filtering (types, specific users)
    - Engagement filtering (minLikes, minComments)
    - Time filtering (timeframe, custom dates)
    - Sort options (relevance, recent, popular, trending)

**Photo System** (Migration: 20251002, 20251003)
11. **Photo** - Photo upload and moderation
    - Moderation: moderationStatus, moderationReason, moderationConfidence
    - Metadata: mimeType, width, height, exifStripped
    - Organization: photoType, gallery, caption

#### Political & Civic Models (30+)
- **Election, Office, BallotMeasure**
- **ElectoralDistrict, DistrictOffice, DistrictConflict**
- **CrowdsourcedOfficial, AddressDistrictMapping**
- **Legislature, LegislativeMembership, Bill, Vote**
- **NewsArticle, OfficialMention**
- **PolicyCategory, PolicyPosition, PolicyComparison**

#### Messaging Models (10+)
- **Conversation, ConversationParticipant, Message**
- **UnifiedMessage, ConversationMeta**
- **CandidateAdminMessage**
- **PoliticalInquiry, InquiryResponse, PublicQA**

#### Moderation Models (10+)
- **Report, ContentFlag, ModerationLog**
- **UserWarning, UserSuspension, Appeal**

#### Engagement Models (15+)
- **Like, Reaction, Share, Comment**
- **Follow, Subscription, Friendship**
- **Notification**
- **Endorsement**

#### Civic Engagement (5+)
- **Petition, PetitionSignature**
- **CivicEvent, EventRSVP**

#### Payment Models (7+)
- **Payment, StripeCustomer, Refund, PaymentWebhook**
- **DonationCampaign**
- **CandidateRegistration**

#### Topic Models (5)
- **Topic, SubTopic, TopicPost, TopicComment**

#### Supporting Models (15+)
- **UserActivity, SecurityEvent, ReputationEvent**
- **ApiCache, ElectionCache, ExternalOfficial**
- **MessageOfTheDay, MOTDDismissal, MOTDView, MOTDLog**
- **UserOAuthProvider**
- **VotingRecordSummary**

### Schema Issues & Concerns

#### 1. Schema Complexity
- **User model**: 153 fields with 47 relations - **high coupling risk**
- **Candidate model**: 46 fields - consider splitting into sub-models
- **Post model**: 47 fields - feedback fields could be separate table

#### 2. Missing Indexes
- `Photo.uploadedAt` - frequently used for sorting, not indexed
- `Post.feedVisible` - used in feed queries, not indexed
- `FeedFilter.userId + isDefault` - composite index needed

#### 3. Data Type Concerns
- **Float arrays for embeddings**: Large storage overhead (User.embedding, Post.embedding)
- **Json fields**: Type safety issues (User.onboardingData, Post.editHistory)
- **String arrays**: No size limits (User.interests, Candidate.keyIssues)

#### 4. Cascade Delete Risks
- **User deletion**: Cascades to 47+ related tables - **data loss risk**
- **Post deletion**: Cascades to Comments, Likes, Reactions - **orphan prevention needed**
- **Candidate deletion**: Cascades to PolicyPositions, Inquiries - **consider soft delete**

#### 5. Recent Migration Issues
- **Quest/Badge tables added but Prisma not regenerated** - compilation errors
- **SavedPost table added but not in Prisma client** - runtime errors
- **Photo fields changed but types not updated** - schema drift

### Database Constraints & Validation

#### Good Constraints
- ✅ Unique constraints on user email, username, oauth providers
- ✅ Composite unique keys (Follow, Like, Friendship)
- ✅ Enum validation for status fields

#### Missing Constraints
- ⚠️ No max length on text fields (Post.content, Comment.content)
- ⚠️ No check constraints on numeric ranges (reputationScore, riskScore)
- ⚠️ No validation on array sizes (User.interests, Candidate.keyIssues)

---

## 5. API Endpoint Inventory

### Complete API Endpoint List (300+ endpoints)

#### Authentication (25 endpoints)
**Auth Routes**
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login with TOTP support
- GET `/api/auth/me` - Get current user
- POST `/api/auth/logout` - Logout and blacklist token
- POST `/api/auth/refresh` - Refresh JWT token
- POST `/api/auth/forgot-password` - Request password reset
- POST `/api/auth/reset-password` - Reset password with token
- POST `/api/auth/verify-password` - Verify password for sensitive operations
- POST `/api/auth/check-username` - Check username availability
- POST `/api/auth/check-email` - Check email availability
- GET `/api/auth/debug-test-user` - Debug test user (dev only)
- POST `/api/auth/create-test-user` - Create test user (dev only)

**OAuth Routes**
- GET `/api/oauth/config` - OAuth provider config
- POST `/api/oauth/google` - Google OAuth
- POST `/api/oauth/microsoft` - Microsoft OAuth
- POST `/api/oauth/apple` - Apple OAuth
- POST `/api/oauth/link/:provider` - Link OAuth provider
- DELETE `/api/oauth/unlink/:provider` - Unlink OAuth provider
- GET `/api/oauth/linked` - Get linked providers

**TOTP Routes**
- POST `/api/totp/setup` - Setup TOTP
- POST `/api/totp/verify-setup` - Verify TOTP setup
- POST `/api/totp/verify` - Verify TOTP token
- POST `/api/totp/disable` - Disable TOTP
- GET `/api/totp/status` - TOTP status
- POST `/api/totp/regenerate-backup-codes` - Regenerate backup codes

**Verification Routes**
- POST `/api/verification/email/send` - Send email verification
- POST `/api/verification/email/verify` - Verify email token
- POST `/api/verification/phone/send` - Send phone verification
- POST `/api/verification/phone/verify` - Verify phone code
- GET `/api/verification/status` - Verification status

#### User Management (21 endpoints)
- GET `/api/users/profile` - Get own profile (AUTH)
- PUT `/api/users/profile` - Update profile (AUTH)
- GET `/api/users/:userId` - Get user profile with privacy filtering
- GET `/api/users/:userId/complete` - Get complete user profile (batched)
- GET `/api/users/by-username/:username` - Get user by username
- GET `/api/users/search` - Search users (AUTH)
- GET `/api/users/:userId/followers` - Get followers list
- GET `/api/users/:userId/following` - Get following list
- POST `/api/users/follow/:userId` - Follow user (AUTH)
- DELETE `/api/users/follow/:userId` - Unfollow user (AUTH)
- GET `/api/users/follow-status/:userId` - Check follow status (AUTH)
- GET `/api/users/friend-status/:userId` - Check friend status (AUTH)
- DELETE `/api/users/background-image` - Remove background image (AUTH)
- POST `/api/users/activity` - Track activity (AUTH)
- GET `/api/users/profile-privacy` - Get privacy settings (AUTH)
- PUT `/api/users/profile-privacy` - Update privacy settings (AUTH)
- GET `/api/users/notification-preferences` - Get notification preferences (AUTH)
- PUT `/api/users/notification-preferences` - Update notification preferences (AUTH)
- GET `/api/users/activity/me` - Get own activity log (AUTH)
- GET `/api/users/activity/:userId` - Get public activity log

#### Relationships (20 endpoints)
- POST `/api/relationships/follow/:userId` - Follow user (AUTH)
- DELETE `/api/relationships/follow/:userId` - Unfollow user (AUTH)
- GET `/api/relationships/follow-status/:userId` - Follow status (AUTH)
- GET `/api/relationships/:userId/followers` - Get followers
- GET `/api/relationships/:userId/following` - Get following
- POST `/api/relationships/subscribe/:userId` - Subscribe (AUTH)
- DELETE `/api/relationships/subscribe/:userId` - Unsubscribe (AUTH)
- GET `/api/relationships/subscription-status/:userId` - Subscription status (AUTH)
- GET `/api/relationships/:userId/subscribers` - Get subscribers
- GET `/api/relationships/:userId/subscriptions` - Get subscriptions
- POST `/api/relationships/friend-request/:userId` - Send friend request (AUTH)
- POST `/api/relationships/friend-request/:userId/accept` - Accept friend request (AUTH)
- POST `/api/relationships/friend-request/:userId/reject` - Reject friend request (AUTH)
- DELETE `/api/relationships/friend/:userId` - Remove friend (AUTH)
- GET `/api/relationships/friend-status/:userId` - Friend status (AUTH)
- GET `/api/relationships/:userId/friends` - Get friends list
- GET `/api/relationships/friend-requests/pending` - Pending requests (AUTH)
- GET `/api/relationships/status/:userId` - Complete relationship status (AUTH)
- GET `/api/relationships/suggestions/:type` - Relationship suggestions (AUTH)
- POST `/api/relationships/bulk/follow-status` - Bulk follow status (AUTH)

#### Posts & Content (21+ endpoints)
- POST `/api/posts` - Create post (AUTH, RATE LIMITED)
- GET `/api/posts/me` - Get own posts (AUTH)
- GET `/api/posts/:postId` - Get post details
- GET `/api/posts/user/:userId` - Get user's posts
- PUT `/api/posts/:postId` - Update post (AUTH)
- DELETE `/api/posts/:postId` - Delete post (AUTH)
- POST `/api/posts/:postId/like` - Like post (AUTH)
- POST `/api/posts/:postId/reaction` - React to post (AUTH)
- POST `/api/posts/:postId/share` - Share post (AUTH)
- POST `/api/posts/:postId/comments` - Add comment (AUTH, RATE LIMITED)
- GET `/api/posts/:postId/comments` - Get comments
- POST `/api/posts/comments/:commentId/reaction` - React to comment (AUTH)
- POST `/api/posts/:postId/comments/summarize` - AI comment summary (AUTH)
- GET `/api/posts/:postId/history` - Get edit history (AUTH)
- GET `/api/posts/:postId/archive` - Get archived post (AUTH)
- GET `/api/posts/:postId/trending-comments` - Get trending comments
- POST `/api/posts/:postId/save` - Save post (AUTH) **[NEW]**
- DELETE `/api/posts/:postId/save` - Unsave post (AUTH) **[NEW]**
- GET `/api/posts/saved` - Get saved posts (AUTH) **[NEW]**
- GET `/api/posts/map-data` - Get posts for map view (AUTH)
- PUT `/api/posts/config/management` - Update post management config (AUTH)
- GET `/api/posts/config/management` - Get post management config (AUTH)

#### Feed (5 endpoints)
- GET `/api/feed` - Get main feed (AUTH)
- GET `/api/feed/following` - Get following feed (AUTH)
- GET `/api/feed/trending` - Get trending posts
- GET `/api/feed/filters` - Get user's feed filters (AUTH) **[NEW]**
- POST `/api/feed/filters` - Create feed filter (AUTH) **[NEW]**

#### Topics (12 endpoints)
**Topics Routes**
- GET `/api/topics/trending` - Get trending topics
- GET `/api/topics/:id` - Get topic details
- POST `/api/topics/:id/comment` - Comment on topic (AUTH)
- POST `/api/topics/:id/subtopics/:subTopicId/comment` - Comment on subtopic (AUTH)
- POST `/api/topics/analyze/recent` - Analyze recent posts (AUTH)
- GET `/api/topics/search` - Search topics

**Topic Navigation Routes**
- GET `/api/topic-navigation/trending` - Trending topics
- POST `/api/topic-navigation/enter/:topicId` - Enter topic (AUTH)
- POST `/api/topic-navigation/exit` - Exit topic (AUTH)
- GET `/api/topic-navigation/:topicId/posts` - Get topic posts
- GET `/api/topic-navigation/current` - Get current topic (AUTH)
- POST `/api/topic-navigation/:topicId/post` - Post to topic (AUTH)

**Trending Topics Routes**
- GET `/api/trending-topics/topics` - Get trending topics
- GET `/api/trending-topics/map-topics` - Get map-based topics

#### Messaging (12 endpoints)
**Direct Messages**
- GET `/api/messages/conversations` - Get conversations (AUTH)
- POST `/api/messages/conversations` - Create conversation (AUTH)
- GET `/api/messages/conversations/:conversationId/messages` - Get messages (AUTH)
- POST `/api/messages/conversations/:conversationId/messages` - Send message (AUTH, RATE LIMITED)

**Unified Messages**
- GET `/api/unified-messages/conversations` - Get all conversations (AUTH)
- GET `/api/unified-messages/conversations/:conversationId/messages` - Get messages (AUTH)
- POST `/api/unified-messages/send` - Send message (AUTH)
- POST `/api/unified-messages/mark-read` - Mark as read (AUTH)
- GET `/api/unified-messages/unread-count` - Get unread count (AUTH)
- GET `/api/unified-messages/admin/candidate/:candidateId` - Admin-candidate messages (AUTH)
- GET `/api/unified-messages/candidate/admin-messages` - Candidate's admin messages (AUTH)
- GET `/api/unified-messages/candidate/user-messages` - Candidate's user messages (AUTH)

#### Notifications (4 endpoints)
- GET `/api/notifications` - Get notifications (AUTH)
- PUT `/api/notifications/:notificationId/read` - Mark as read (AUTH)
- PUT `/api/notifications/mark-read-batch` - Batch mark as read (AUTH)
- PUT `/api/notifications/read-all` - Mark all as read (AUTH)

#### Candidates (19 endpoints)
- GET `/api/candidates` - List candidates
- GET `/api/candidates/pricing` - Get pricing info
- GET `/api/candidates/:id` - Get candidate details
- GET `/api/candidates/:id/enhanced` - Get enhanced candidate data
- GET `/api/candidates/office/:officeId/enhanced` - Enhanced candidates by office
- GET `/api/candidates/my-candidacy` - Get own candidacy (AUTH)
- GET `/api/candidates/my-registrations` - Get own registrations (AUTH)
- POST `/api/candidates/:id/endorse` - Endorse candidate (AUTH)
- DELETE `/api/candidates/:id/endorse` - Remove endorsement (AUTH)
- PUT `/api/candidates/:id/update-platform` - Update platform (AUTH)
- POST `/api/candidates/:id/withdraw` - Withdraw candidacy (AUTH)
- POST `/api/candidates/compare` - Compare candidates
- POST `/api/candidates/register` - Register as candidate (AUTH)
- POST `/api/candidates/registration/:id/verify-idme` - ID.me verification (AUTH)
- POST `/api/candidates/registration/:id/payment` - Process payment (AUTH)
- POST `/api/candidates/registration/:id/withdraw` - Withdraw registration (AUTH)
- POST `/api/candidates/request-waiver` - Request fee waiver (AUTH)
- GET `/api/candidates/ai/health` - AI service health

#### Candidate Policy Platform (10 endpoints)
- GET `/api/candidate-policy/candidate/status` - Get candidate status (AUTH)
- GET `/api/candidate-policy/candidate/my-positions` - Get own positions (AUTH)
- GET `/api/candidate-policy/categories` - Get policy categories
- GET `/api/candidate-policy/candidate/:candidateId/positions` - Get candidate positions
- GET `/api/candidate-policy/race/:officeId/comparison` - Compare race positions
- POST `/api/candidate-policy/positions` - Create position (AUTH)
- GET `/api/candidate-policy/positions/:positionId` - Get position (AUTH)
- PUT `/api/candidate-policy/positions/:positionId` - Update position (AUTH)
- PATCH `/api/candidate-policy/positions/:positionId/publish` - Publish position (AUTH)
- DELETE `/api/candidate-policy/positions/:positionId` - Delete position (AUTH)

#### Candidate Messaging (10 endpoints)
**Candidate Messages Routes**
- POST `/api/candidate-messages/:candidateId/inquiry` - Submit inquiry
- GET `/api/candidate-messages/:candidateId/inbox` - Get inbox (AUTH)
- POST `/api/candidate-messages/inquiry/:inquiryId/respond` - Respond to inquiry (AUTH)
- GET `/api/candidate-messages/:candidateId/public-qa` - Get public Q&A
- POST `/api/candidate-messages/:candidateId/public-qa/:qaId/vote` - Vote on Q&A (AUTH)
- POST `/api/candidate-messages/:candidateId/staff` - Add staff (AUTH)
- GET `/api/candidate-messages/:candidateId/staff` - Get staff (AUTH)

**Candidate Admin Messages Routes**
- GET `/api/candidate-admin-messages/admin-messages` - Get admin messages (AUTH)
- POST `/api/candidate-admin-messages/admin-messages` - Send admin message (AUTH)
- GET `/api/candidate-admin-messages/admin-messages/unread-count` - Unread count (AUTH)

#### Candidate Verification (6 endpoints)
- GET `/api/candidate-verification/status` - Verification status (AUTH, CANDIDATE)
- POST `/api/candidate-verification/documents` - Upload document (AUTH, CANDIDATE)
- GET `/api/candidate-verification/requested-documents` - Get requested docs (AUTH, CANDIDATE)
- GET `/api/candidate-verification/admin/due-verification` - Due for verification (AUTH, ADMIN)
- POST `/api/candidate-verification/admin/request-documents` - Request docs (AUTH, ADMIN)
- POST `/api/candidate-verification/admin/verify-document` - Verify document (AUTH, ADMIN)

#### Elections (6 endpoints)
- GET `/api/elections` - List elections
- GET `/api/elections/:id` - Get election details
- GET `/api/elections/:id/candidates` - Get election candidates
- POST `/api/elections/:id/register-candidate` - Register for election (AUTH)
- POST `/api/elections/candidates/compare` - Compare candidates
- POST `/api/elections/cache/refresh` - Refresh cache (AUTH)

#### External Candidates (8 endpoints)
- POST `/api/external-candidates/import-address` - Import by address (AUTH, RATE LIMITED)
- POST `/api/external-candidates/bulk-import` - Bulk import (AUTH, RATE LIMITED)
- GET `/api/external-candidates/for-address` - Get candidates for address (AUTH)
- GET `/api/external-candidates/claimable` - Get claimable profiles (AUTH)
- POST `/api/external-candidates/:id/claim` - Claim profile (AUTH)
- GET `/api/external-candidates/search` - Search external candidates
- GET `/api/external-candidates/health` - Service health
- POST `/api/external-candidates/cache/clear` - Clear cache (AUTH)

#### Political (6 endpoints)
- PUT `/api/political/profile` - Update political profile (AUTH)
- GET `/api/political/officials` - Get officials (AUTH)
- GET `/api/political/representatives` - Get representatives (AUTH)
- GET `/api/political/representatives/lookup` - Lookup representatives
- POST `/api/political/officials/refresh` - Refresh officials (AUTH)
- GET `/api/political/officials/:zipCode/:state` - Get officials by zip

#### Google Civic (2 endpoints)
- GET `/api/google-civic/representatives` - Get representatives (AUTH)
- GET `/api/google-civic/elections` - Get elections (AUTH)

#### Legislative (10 endpoints)
- GET `/api/legislative/voting-records/:bioguideId` - Get voting records
- GET `/api/legislative/bills/:bioguideId` - Get bills
- GET `/api/legislative/news/:officialName` - Get official news
- GET `/api/legislative/news/trending` - Get trending news
- GET `/api/legislative/news/stored` - Get stored news
- POST `/api/legislative/voting-statistics` - Calculate voting stats
- POST `/api/legislative/sync/federal` - Sync federal data (AUTH)
- POST `/api/legislative/sync/state/:stateCode` - Sync state data (AUTH)
- GET `/api/legislative/health` - Service health
- GET `/api/legislative/news-api-status` - News API status

#### Civic Engagement (14 endpoints)
- POST `/api/civic/petitions` - Create petition (AUTH)
- GET `/api/civic/petitions` - List petitions
- GET `/api/civic/petitions/:id` - Get petition
- POST `/api/civic/petitions/:id/sign` - Sign petition (AUTH)
- POST `/api/civic/events` - Create event (AUTH)
- GET `/api/civic/events` - List events
- GET `/api/civic/events/:id` - Get event
- POST `/api/civic/events/:id/rsvp` - RSVP to event (AUTH)
- GET `/api/civic/search` - Search civic content
- GET `/api/civic/user/petitions` - User's petitions (AUTH)
- GET `/api/civic/user/events` - User's events (AUTH)
- GET `/api/civic/user/signatures` - User's signatures (AUTH)
- GET `/api/civic/user/rsvps` - User's RSVPs (AUTH)
- GET `/api/civic/health` - Service health

#### Crowdsourcing (9 endpoints)
- GET `/api/crowdsourcing/districts/lookup` - Lookup districts
- POST `/api/crowdsourcing/districts/missing-offices` - Report missing offices
- POST `/api/crowdsourcing/districts` - Submit district (AUTH)
- POST `/api/crowdsourcing/districts/:districtId/offices` - Add office (AUTH)
- POST `/api/crowdsourcing/offices/:officeId/officials` - Add official (AUTH)
- POST `/api/crowdsourcing/officials/:officialId/vote` - Vote on official (AUTH)
- POST `/api/crowdsourcing/districts/:districtId/conflicts` - Report conflict (AUTH)
- GET `/api/crowdsourcing/my-contributions` - Get contributions (AUTH)
- GET `/api/crowdsourcing/leaderboard` - Get leaderboard

#### Admin (20+ endpoints)
- GET `/api/admin/dashboard` - Dashboard data (AUTH, ADMIN, TOTP)
- GET `/api/admin/dashboard/enhanced` - Enhanced dashboard (AUTH, ADMIN, TOTP)
- GET `/api/admin/users` - List users (AUTH, ADMIN, TOTP)
- GET `/api/admin/users/:userId` - Get user details (AUTH, ADMIN, TOTP)
- POST `/api/admin/users/:userId/suspend` - Suspend user (AUTH, ADMIN, TOTP)
- POST `/api/admin/users/:userId/unsuspend` - Unsuspend user (AUTH, ADMIN, TOTP)
- POST `/api/admin/users/:userId/role` - Change user role (AUTH, ADMIN, TOTP)
- DELETE `/api/admin/users/:userId` - Delete user (AUTH, ADMIN, TOTP)
- GET `/api/admin/content/flagged` - Get flagged content (AUTH, ADMIN, TOTP)
- POST `/api/admin/content/flags/:flagId/resolve` - Resolve flag (AUTH, ADMIN, TOTP)
- GET `/api/admin/analytics` - Get analytics (AUTH, ADMIN, TOTP)
- GET `/api/admin/settings` - Get settings (AUTH, ADMIN, TOTP)
- GET `/api/admin/security/events` - Security events (AUTH, ADMIN, TOTP)
- GET `/api/admin/security/stats` - Security stats (AUTH, ADMIN, TOTP)
- GET `/api/admin/errors` - Error logs (AUTH, ADMIN, TOTP)
- GET `/api/admin/ai-insights/suggestions` - AI suggestions (AUTH, ADMIN, TOTP)
- GET `/api/admin/ai-insights/analysis` - AI analysis (AUTH, ADMIN, TOTP)
- GET `/api/admin/schema` - Database schema (AUTH, ADMIN, TOTP, SUPER ADMIN)
- GET `/api/admin/candidates` - List candidates (AUTH, ADMIN, TOTP)
- GET `/api/admin/candidates/profiles` - Candidate profiles (AUTH, ADMIN, TOTP)

#### Moderation (7 endpoints)
- POST `/api/moderation/reports` - Submit report (AUTH, RATE LIMITED)
- GET `/api/moderation/reports/my` - My reports (AUTH)
- GET `/api/moderation/reports` - All reports (AUTH, MODERATOR)
- POST `/api/moderation/reports/:reportId/action` - Take action (AUTH, MODERATOR)
- GET `/api/moderation/stats` - Moderation stats (AUTH, MODERATOR)
- POST `/api/moderation/users/:userId/promote` - Promote to moderator (AUTH, ADMIN)
- GET `/api/moderation/health` - Service health (AUTH, MODERATOR)

#### Appeals (5 endpoints)
- POST `/api/appeals` - Submit appeal (AUTH, RATE LIMITED)
- GET `/api/appeals/my` - My appeals (AUTH)
- GET `/api/appeals/:appealId` - Get appeal (AUTH)
- GET `/api/appeals/queue/all` - Appeal queue (AUTH, MODERATOR)
- POST `/api/appeals/:appealId/review` - Review appeal (AUTH, MODERATOR)

#### Feedback (5 endpoints - Admin only)
- GET `/api/feedback` - List feedback (AUTH, ADMIN)
- GET `/api/feedback/stats` - Feedback stats (AUTH, ADMIN)
- PUT `/api/feedback/:id/status` - Update status (AUTH, ADMIN)
- POST `/api/feedback/analyze` - Analyze feedback (AUTH, ADMIN)
- POST `/api/feedback/batch-analyze` - Batch analyze (AUTH, ADMIN)

#### Reputation (10 endpoints)
- GET `/api/reputation/user/:userId` - Get user reputation
- GET `/api/reputation/me` - Get own reputation (AUTH)
- GET `/api/reputation/history` - Reputation history (AUTH)
- POST `/api/reputation/analyze` - Analyze reputation (AUTH)
- POST `/api/reputation/report` - Report reputation issue (AUTH)
- POST `/api/reputation/appeal` - Appeal reputation (AUTH)
- POST `/api/reputation/award` - Award reputation (AUTH, ADMIN)
- GET `/api/reputation/stats` - Reputation stats (AUTH, ADMIN)
- GET `/api/reputation/low-reputation` - Low reputation users (AUTH, ADMIN)
- GET `/api/reputation/health` - Service health

#### Quests (9 endpoints - NEW)
- GET `/api/quests/daily` - Daily quests (AUTH)
- GET `/api/quests/progress` - Quest progress (AUTH)
- GET `/api/quests/streaks` - Quest streaks (AUTH)
- POST `/api/quests/update-progress` - Update progress (AUTH)
- POST `/api/quests/create` - Create quest (AUTH, ADMIN)
- POST `/api/quests/create-weekly` - Create weekly quest (AUTH, ADMIN)
- GET `/api/quests/all` - All quests (AUTH, ADMIN)
- PUT `/api/quests/:questId` - Update quest (AUTH, ADMIN)
- GET `/api/quests/analytics` - Quest analytics (AUTH, ADMIN)

#### Badges (10 endpoints - NEW)
- GET `/api/badges/vault` - User's badge vault (AUTH)
- GET `/api/badges/user/:userId` - User's badges (AUTH)
- GET `/api/badges/available` - Available badges (AUTH)
- GET `/api/badges/all` - All badges (AUTH)
- PUT `/api/badges/display` - Update display settings (AUTH)
- POST `/api/badges/create` - Create badge (AUTH, ADMIN)
- PUT `/api/badges/:badgeId` - Update badge (AUTH, ADMIN)
- POST `/api/badges/award` - Award badge (AUTH, ADMIN)
- DELETE `/api/badges/:badgeId` - Delete badge (AUTH, ADMIN)
- POST `/api/badges/check-qualifications` - Check qualifications (AUTH, ADMIN)

#### Photos (6 endpoints)
- POST `/api/photos/upload` - Upload photo (AUTH)
- GET `/api/photos/health` - Photo service health

**Galleries Routes**
- GET `/api/galleries` - Get user galleries (AUTH)
- PUT `/api/galleries/:photoId/gallery` - Update photo gallery (AUTH)
- DELETE `/api/galleries/:photoId` - Delete photo (AUTH)
- POST `/api/galleries/:photoId/set-profile` - Set as profile picture (AUTH)

#### Payments (7 endpoints)
- POST `/api/payments/donation` - Process donation (AUTH)
- POST `/api/payments/fee` - Process fee (AUTH)
- GET `/api/payments/history` - Payment history (AUTH)
- GET `/api/payments/campaigns` - Active campaigns
- GET `/api/payments/receipt/:paymentId` - Get receipt (AUTH)
- GET `/api/payments/tax-summary/:year` - Tax summary (AUTH)
- POST `/api/payments/webhook` - Stripe webhook

#### Search (5 endpoints)
- GET `/api/search/unified` - Unified search (AUTH)
- GET `/api/search/users` - Search users (AUTH)
- GET `/api/search/posts` - Search posts (AUTH)
- GET `/api/search/officials` - Search officials (AUTH)
- GET `/api/search/topics` - Search topics (AUTH)

#### System & Utilities (18 endpoints)
**Health Routes**
- GET `/api/health` - System health
- GET `/api/health/version` - Version info
- GET `/api/health/deployment` - Deployment info
- GET `/api/health/database` - Database health
- GET `/api/health/reputation` - Reputation health
- GET `/api/health/batch` - Batch system health
- POST `/api/health/deployment/update` - Update deployment info

**Batch Routes**
- GET `/api/batch/initialize` - Initialize app (AUTH)
- GET `/api/batch/auth-status` - Auth status (AUTH)
- GET `/api/batch/health-check` - Health check

**Onboarding Routes**
- GET `/api/onboarding/steps` - Onboarding steps (AUTH)
- GET `/api/onboarding/progress` - Onboarding progress (AUTH)
- POST `/api/onboarding/complete-step` - Complete step (AUTH)
- POST `/api/onboarding/skip-step` - Skip step (AUTH)
- GET `/api/onboarding/interests` - Available interests
- POST `/api/onboarding/location/validate` - Validate location
- POST `/api/onboarding/welcome` - Complete welcome (AUTH)
- GET `/api/onboarding/analytics` - Onboarding analytics (AUTH)
- GET `/api/onboarding/search-preview` - Search preview

**MOTD Routes**
- GET `/api/motd/current` - Current MOTD
- POST `/api/motd/dismiss/:id` - Dismiss MOTD
- GET `/api/motd/admin/list` - List MOTDs (AUTH, ADMIN)
- POST `/api/motd/admin/create` - Create MOTD (AUTH, ADMIN)
- PUT `/api/motd/admin/update/:id` - Update MOTD (AUTH, ADMIN)
- POST `/api/motd/admin/toggle/:id` - Toggle MOTD (AUTH, ADMIN)
- DELETE `/api/motd/admin/delete/:id` - Delete MOTD (AUTH, ADMIN)
- GET `/api/motd/admin/analytics/:id` - MOTD analytics (AUTH, ADMIN)

### Endpoint Documentation Status

#### ✅ Well-Documented Endpoints (Swagger/OpenAPI)
- `/api/auth/register` - Full Swagger documentation with request/response schemas
- Authentication endpoints have detailed documentation

#### ⚠️ Undocumented Endpoints
- **~90% of endpoints lack API documentation**
- No centralized API documentation (Swagger UI not deployed)
- No request/response examples
- No error code documentation

#### 📝 Recommended Documentation Approach
1. Generate OpenAPI spec from route files
2. Deploy Swagger UI at `/api/docs`
3. Add JSDoc comments to all endpoints
4. Document error responses and status codes
5. Provide request/response examples

---

## 6. Issues & Concerns Summary

### Critical Issues (Immediate Action Required)

#### 1. TypeScript Compilation Failures (61 errors)
**Impact**: Code cannot be deployed, runtime errors likely
**Root Cause**: Prisma Client out of sync with schema after migrations
**Fix**:
```bash
cd backend
npx prisma generate
npm install @azure-rest/ai-content-safety
npm run build
```

#### 2. Schema-Code Drift
**Affected Features**:
- Quest system (40 errors)
- Badge system (12 errors)
- Saved posts (5 errors)
- Photo system (3 errors)
- Feed filters (2 errors)

**Impact**: Features non-functional, runtime errors
**Fix**: Regenerate Prisma Client after each migration

#### 3. Missing Dependencies
**Missing Package**: `@azure-rest/ai-content-safety`
**Impact**: Image moderation service broken
**Fix**: `npm install @azure-rest/ai-content-safety`

### High Priority Issues

#### 4. Inconsistent Error Handling
- No centralized error handling service
- Mix of error response formats
- Generic error messages
- No error tracking/monitoring integration

#### 5. API Documentation Gap
- 90% of endpoints lack documentation
- No Swagger UI deployment
- No request/response examples
- Difficult for frontend developers

#### 6. Schema Complexity
- User model: 153 fields, 47 relations (too coupled)
- Cascade delete risks (47+ tables from User)
- Large embedding arrays (storage overhead)
- No constraints on array/text sizes

### Medium Priority Issues

#### 7. Missing Indexes
- `Photo.uploadedAt` (sorting)
- `Post.feedVisible` (feed queries)
- `FeedFilter.userId + isDefault` (composite)

#### 8. Type Safety Gaps
- Implicit `any` usage in services
- Missing request body types
- Partial Prisma selects without types
- Json fields with no type guards

#### 9. Service Coupling
- AI services tightly coupled
- Political data cluster interdependent
- No clear service boundaries

### Low Priority Issues

#### 10. Code Duplication
- Multiple follow/unfollow implementations
- Duplicate follow status checks in different routes
- Similar error handling patterns repeated

#### 11. Unused Services
- Multiple Google Civic services (`googleCivic.ts`, `googleCivicService.ts`)
- Potential for consolidation

---

## 7. Recommendations for Improvements

### Immediate Actions (Week 1)

1. **Fix TypeScript Compilation**
   ```bash
   cd backend
   npx prisma generate
   npm install @azure-rest/ai-content-safety
   npm run build
   ```

2. **Establish Migration Protocol**
   - Always run `npx prisma generate` after schema changes
   - Add pre-commit hook to verify Prisma client sync
   - Document migration workflow in `CONTRIBUTING.md`

3. **Add Centralized Error Handling**
   ```typescript
   // src/middleware/errorHandler.ts
   export const errorHandler = (err, req, res, next) => {
     logger.error('API Error:', { error: err, path: req.path, user: req.user?.id });
     res.status(err.status || 500).json({
       success: false,
       error: err.message || 'Internal server error',
       code: err.code
     });
   };
   ```

### Short-Term Improvements (Month 1)

4. **Deploy API Documentation**
   - Generate OpenAPI spec from routes
   - Deploy Swagger UI at `/api/docs`
   - Add JSDoc to all endpoints

5. **Add Missing Indexes**
   ```prisma
   model Photo {
     @@index([uploadedAt])
   }
   model Post {
     @@index([feedVisible])
   }
   model FeedFilter {
     @@index([userId, isDefault])
   }
   ```

6. **Implement Error Tracking**
   - Integrate Sentry or similar service
   - Add request ID tracking
   - Implement structured logging

7. **Standardize Response Format**
   ```typescript
   interface ApiResponse<T> {
     success: boolean;
     data?: T;
     error?: string;
     code?: string;
   }
   ```

### Medium-Term Improvements (Quarter 1)

8. **Refactor User Model**
   - Split into UserProfile, UserSettings, UserSecurity tables
   - Reduce cascade delete risk
   - Improve query performance

9. **Service Layer Refactoring**
   - Define clear service boundaries
   - Reduce coupling between AI services
   - Extract common patterns to utilities

10. **Add Request Validation**
    - Use Zod or Joi for all endpoints
    - Centralize validation schemas
    - Add request size limits

11. **Implement Soft Deletes**
    - Add `deletedAt` to critical tables (User, Candidate, Post)
    - Preserve audit trail
    - Enable data recovery

### Long-Term Strategic Improvements (Year 1)

12. **Microservices Consideration**
    - Evaluate splitting AI services to separate service
    - Consider splitting political data services
    - Evaluate message queue for background jobs

13. **Performance Optimization**
    - Implement database query optimization
    - Add Redis caching layer
    - Optimize embedding storage (consider separate vector DB)

14. **Enhanced Monitoring**
    - APM integration (DataDog, New Relic)
    - Real-time alerting
    - Performance metrics dashboard

---

## 8. Complete API Endpoint Inventory

### Authentication & User (46 endpoints)
- **Auth**: 12 endpoints (register, login, logout, password reset, etc.)
- **OAuth**: 7 endpoints (Google, Microsoft, Apple)
- **TOTP**: 6 endpoints (setup, verify, disable, backup codes)
- **Verification**: 5 endpoints (email, phone verification)
- **Users**: 21 endpoints (profile, follow, privacy, activity)

### Content & Feed (47 endpoints)
- **Posts**: 21 endpoints (CRUD, reactions, comments, saved posts)
- **Feed**: 5 endpoints (discover, following, trending, filters)
- **Topics**: 12 endpoints (trending, navigation, comments)
- **Trending**: 2 endpoints (topics, map topics)

### Social (52 endpoints)
- **Relationships**: 20 endpoints (follow, subscribe, friends)
- **Messages**: 4 endpoints (conversations, send)
- **Unified Messages**: 8 endpoints (admin-candidate, user-candidate)
- **Notifications**: 4 endpoints (get, mark read)

### Political & Civic (88 endpoints)
- **Candidates**: 19 endpoints (CRUD, registration, endorsements)
- **Candidate Policy**: 10 endpoints (positions, comparisons)
- **Candidate Messages**: 7 endpoints (inquiry, Q&A)
- **Candidate Admin Messages**: 3 endpoints (admin communication)
- **Candidate Verification**: 6 endpoints (documents, verification)
- **Elections**: 6 endpoints (listings, registration)
- **External Candidates**: 8 endpoints (import, claim)
- **Political**: 6 endpoints (profile, officials, representatives)
- **Google Civic**: 2 endpoints (representatives, elections)
- **Legislative**: 10 endpoints (voting records, bills, news)
- **Civic**: 14 endpoints (petitions, events)
- **Crowdsourcing**: 9 endpoints (districts, offices, officials)

### Admin & Moderation (37 endpoints)
- **Admin**: 20 endpoints (users, content, analytics, AI insights)
- **Moderation**: 7 endpoints (reports, actions, stats)
- **Appeals**: 5 endpoints (submit, review)
- **Feedback**: 5 endpoints (analysis, stats)

### Gamification (19 endpoints - NEW)
- **Quests**: 9 endpoints (daily, progress, streaks, admin)
- **Badges**: 10 endpoints (vault, display, award, admin)

### Reputation (10 endpoints)
- **Reputation**: 10 endpoints (get, analyze, appeal, admin)

### Media (6 endpoints)
- **Photos**: 2 endpoints (upload, health)
- **Galleries**: 4 endpoints (manage, set profile)

### Payments (7 endpoints)
- **Payments**: 7 endpoints (donation, fee, history, receipts)

### Search (5 endpoints)
- **Search**: 5 endpoints (unified, users, posts, officials, topics)

### System (18 endpoints)
- **Health**: 7 endpoints (system, version, database)
- **Batch**: 3 endpoints (initialize, auth status)
- **Onboarding**: 8 endpoints (steps, progress, analytics)
- **MOTD**: 8 endpoints (current, dismiss, admin)

### **Total: 335+ API Endpoints**

---

## 9. Testing & Quality Assurance Status

### Test Coverage
- **Unit Tests**: ❌ Not found
- **Integration Tests**: ❌ Not found
- **E2E Tests**: ❌ Not found
- **Test Framework**: Unknown (no test files in audit)

### Recommended Testing Strategy
1. **Unit Tests**: Jest for services and utilities
2. **Integration Tests**: Supertest for API endpoints
3. **E2E Tests**: Playwright for critical user flows
4. **Target Coverage**: 80% for services, 60% for routes

---

## 10. Security Considerations

### Current Security Measures
✅ **Good Practices**:
- TOTP 2FA for admin operations
- JWT token authentication
- Cookie-based auth with httpOnly flags
- Rate limiting on sensitive endpoints
- CAPTCHA for registration (production)
- Device fingerprinting for anti-bot
- Security event logging
- Account locking after failed logins

⚠️ **Areas for Improvement**:
- No SQL injection prevention documentation
- No CSRF token validation on state-changing endpoints
- No input sanitization middleware
- No XSS prevention headers documented
- No content security policy (CSP)
- Secrets in env vars (consider vault)

### Recommended Security Enhancements
1. Add Helmet.js for security headers
2. Implement CSRF token validation
3. Add input sanitization (DOMPurify)
4. Implement rate limiting on all endpoints
5. Add SQL injection prevention (Prisma handles this, but verify)
6. Implement API key rotation
7. Add security audit logging

---

## Conclusion

The UnitedWeRise backend is a **complex, feature-rich political engagement platform** with **335+ API endpoints** across **41 route files** and **48 service files**. The codebase demonstrates sophisticated functionality including AI-powered content moderation, semantic search, gamification systems, and comprehensive political data aggregation.

**However, critical issues must be addressed immediately**:
1. **61 TypeScript compilation errors** preventing deployment
2. **Schema-code drift** after recent migrations (Quest, Badge, SavedPost, FeedFilter)
3. **Missing dependencies** breaking image moderation
4. **Lack of API documentation** (90% of endpoints undocumented)
5. **Inconsistent error handling** and response formats

**The backend is currently in a non-functional state due to compilation errors.** Regenerating the Prisma Client and installing missing dependencies will resolve most issues, but ongoing process improvements are needed to prevent similar issues in the future.

**Strengths**:
- Comprehensive feature set
- Good use of middleware patterns
- Robust authentication and security
- Advanced AI integration
- Well-structured route organization

**Weaknesses**:
- Schema complexity (User model too large)
- Service coupling (AI cluster, political cluster)
- Missing indexes for performance
- No automated testing
- Deployment process issues (schema drift)

**Next Steps**: Execute immediate fixes, establish migration protocols, deploy API documentation, and implement centralized error handling and monitoring.

---

**BACKEND AUDIT COMPLETE**

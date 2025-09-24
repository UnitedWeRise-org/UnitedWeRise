# UnitedWeRise Platform - Comprehensive API Documentation

## Executive Summary

This document provides a complete audit and documentation of all API endpoints in the UnitedWeRise platform. The analysis reveals:

- **Total API Endpoints**: 340 endpoints across 39 route files
- **Currently Documented**: ~40 endpoints in MASTER_DOCUMENTATION.md (12%)
- **Missing Documentation**: ~300 endpoints (88%)
- **Priority Areas**: Admin endpoints, candidate systems, messaging, and advanced features

## Audit Results

### Documentation Coverage Analysis

**Well Documented Endpoints** (Found in MASTER_DOCUMENTATION.md):
- Authentication endpoints (POST /api/auth/register, /login, /verify-email)
- Basic user management (GET/PUT /api/users/profile)
- Core posting system (POST /api/posts, GET /api/posts/:postId)
- Feed system (GET /api/feed/, /api/feed/trending)
- Basic relationships (POST /api/relationships/follow/:userId)
- Payment system (POST /api/payments/donation, /fee)
- Health endpoints (GET /health, /health/deployment)

**Critical Missing Documentation** (300+ undocumented endpoints):
- 28 Admin dashboard endpoints (/api/admin/*)
- 23 Candidate-related endpoints (/api/candidates/*)
- 19 Photo and tagging endpoints (/api/photos/*)
- 17 Message system endpoints (/api/messages/*)
- 15 Election system endpoints (/api/elections/*)
- And many more across 34+ functional areas

## Complete API Endpoint Reference

### 1. AUTHENTICATION ENDPOINTS (`/api/auth/*`) - 12 endpoints
**Status**: ✅ Well documented

- `POST /api/auth/register` - Register new user account with hCaptcha
- `POST /api/auth/login` - Login with TOTP support and session management
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/logout` - Logout and blacklist token
- `POST /api/auth/refresh` - Refresh authentication token
- `POST /api/auth/verify-password` - Verify password for sensitive operations
- `POST /api/auth/check-username` - Check username availability
- `POST /api/auth/check-email` - Check email availability
- `GET /api/auth/debug-test-user` - Debug endpoint (development only)
- `POST /api/auth/create-test-user` - Create test user (development only)

### 2. ADMIN DASHBOARD ENDPOINTS (`/api/admin/*`) - 28 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Core Admin Dashboard:**
- `GET /api/admin/dashboard` - Main dashboard overview with metrics
- `GET /api/admin/dashboard/enhanced` - Enhanced dashboard with detailed analytics
- `GET /api/admin/analytics` - Platform analytics and performance metrics
- `GET /api/admin/settings` - Platform configuration settings
- `GET /api/admin/errors` - System error reports and logs

**User Management:**
- `GET /api/admin/users` - List all users with filtering
- `GET /api/admin/users/:userId` - Get detailed user information
- `POST /api/admin/users/:userId/suspend` - Suspend user account
- `POST /api/admin/users/:userId/unsuspend` - Unsuspend user account
- `POST /api/admin/users/:userId/role` - Modify user roles
- `DELETE /api/admin/users/:userId` - Delete user account
- `POST /api/admin/merge-accounts` - Merge duplicate user accounts
- `GET /api/admin/volunteers` - Manage volunteer users

**Content Moderation:**
- `GET /api/admin/content/flagged` - View flagged content
- `POST /api/admin/content/flags/:flagId/resolve` - Resolve content flags

**Security Management:**
- `GET /api/admin/security/events` - Security event logs
- `GET /api/admin/security/stats` - Security statistics

**Candidate Administration:**
- `GET /api/admin/candidates` - Manage candidate registrations
- `GET /api/admin/candidates/profiles` - Candidate profile management
- `GET /api/admin/candidates/:id` - Individual candidate details
- `POST /api/admin/candidates/:id/approve` - Approve candidate registration
- `POST /api/admin/candidates/:id/reject` - Reject candidate registration
- `POST /api/admin/candidates/:id/waiver` - Grant fee waiver
- `PUT /api/admin/candidates/profiles/:id/status` - Update candidate status
- `POST /api/admin/candidates/profiles/:registrationId/create` - Create candidate profile

**Messaging Administration:**
- `GET /api/admin/candidates/:candidateId/messages` - View candidate messages
- `POST /api/admin/candidates/:candidateId/messages` - Send admin message to candidate
- `GET /api/admin/messages/overview` - Message system overview

**AI and Analytics:**
- `GET /api/admin/ai-insights/suggestions` - AI-generated platform suggestions
- `GET /api/admin/ai-insights/analysis` - AI platform analysis
- `GET /api/admin/schema` - Database schema information (Super Admin only)

### 3. USER MANAGEMENT ENDPOINTS (`/api/users/*`) - 18 endpoints
**Status**: ⚠️ Partially documented (4/18 documented)

**Profile Management** (Documented):
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/:userId` - Get public user profile
- `GET /api/users/search` - Search users

**Missing Documentation** (14 undocumented endpoints):
- `GET /api/users/:userId/complete` - Get complete user profile with relationships
- `GET /api/users/by-username/:username` - Get user by username
- `GET /api/users/:userId/followers` - Get user's followers
- `GET /api/users/:userId/following` - Get users being followed
- `GET /api/users/follow-status/:userId` - Check follow relationship status
- `POST /api/users/follow/:userId` - Follow a user (duplicate in relationships)
- `DELETE /api/users/follow/:userId` - Unfollow a user
- `POST /api/users/background-image` - Upload profile background image
- `DELETE /api/users/background-image` - Remove profile background
- `GET /api/users/friend-status/:userId` - Check friendship status
- `POST /api/users/activity` - Track user activity
- `GET /api/users/profile-privacy` - Get privacy settings
- `PUT /api/users/profile-privacy` - Update privacy settings
- `GET /api/users/notification-preferences` - Get notification preferences
- `PUT /api/users/notification-preferences` - Update notification preferences

### 4. POST MANAGEMENT ENDPOINTS (`/api/posts/*`) - 21 endpoints
**Status**: ⚠️ Partially documented (3/21 documented)

**Basic Post Operations** (Documented):
- `POST /api/posts` - Create new post
- `GET /api/posts/:postId` - Get single post
- `GET /api/posts/map-data` - Get posts with geographic data

**Missing Documentation** (18 undocumented endpoints):
- `GET /api/posts/me` - Get current user's posts
- `POST /api/posts/:postId/like` - Like/unlike a post
- `POST /api/posts/:postId/reaction` - Add emoji reaction to post
- `POST /api/posts/:postId/share` - Share a post
- `POST /api/posts/comments/:commentId/reaction` - React to comment
- `POST /api/posts/:postId/comments` - Add comment to post
- `GET /api/posts/:postId/comments` - Get post comments with warnings
- `GET /api/posts/user/:userId` - Get posts by specific user
- `POST /api/posts/:postId/comments/summarize` - AI summarize comments
- `PUT /api/posts/:postId` - Edit existing post
- `DELETE /api/posts/:postId` - Delete post
- `GET /api/posts/:postId/history` - Get post edit history
- `GET /api/posts/:postId/archive` - Archive post
- `PUT /api/posts/config/management` - Update post management config
- `GET /api/posts/config/management` - Get post management settings
- `GET /api/posts/:postId/trending-comments` - Get trending comments on post

### 5. CANDIDATE SYSTEM ENDPOINTS (`/api/candidates/*`) - 23 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Public Candidate Information:**
- `GET /api/candidates/` - List all candidates with filtering
- `GET /api/candidates/pricing` - Get candidate registration pricing
- `GET /api/candidates/:id` - Get individual candidate details
- `GET /api/candidates/:id/enhanced` - Get enhanced candidate profile
- `GET /api/candidates/office/:officeId/enhanced` - Get candidates for office
- `POST /api/candidates/compare` - Compare multiple candidates

**Candidate Registration System:**
- `POST /api/candidates/register` - Register as candidate (payment-driven flow)
- `POST /api/candidates/registration/:id/verify-idme` - ID.me verification
- `POST /api/candidates/registration/:id/payment` - Process registration payment
- `POST /api/candidates/registration/:id/withdraw` - Withdraw registration
- `POST /api/candidates/request-waiver` - Request fee waiver
- `GET /api/candidates/my-registrations` - Get user's candidate registrations

**Candidate Profile Management:**
- `GET /api/candidates/my-candidacy` - Get current user's candidate status
- `PUT /api/candidates/:id/update-platform` - Update candidate platform
- `POST /api/candidates/:id/withdraw` - Withdraw candidacy
- `POST /api/candidates/:id/endorse` - Endorse a candidate
- `DELETE /api/candidates/:id/endorse` - Remove endorsement

**AI Integration:**
- `GET /api/candidates/ai/health` - AI system health for candidates

### 6. CANDIDATE POLICY PLATFORM ENDPOINTS (`/api/candidatePolicyPlatform/*`) - 11 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Policy Position Management:**
- `GET /api/candidatePolicyPlatform/candidate/status` - Get candidate policy status
- `GET /api/candidatePolicyPlatform/candidate/my-positions` - Get candidate's policy positions
- `GET /api/candidatePolicyPlatform/categories` - Get policy categories
- `POST /api/candidatePolicyPlatform/positions` - Create policy position
- `GET /api/candidatePolicyPlatform/positions/:positionId` - Get specific position
- `PUT /api/candidatePolicyPlatform/positions/:positionId` - Update position
- `PATCH /api/candidatePolicyPlatform/positions/:positionId/publish` - Publish position
- `DELETE /api/candidatePolicyPlatform/positions/:positionId` - Delete position

**Public Policy Views:**
- `GET /api/candidatePolicyPlatform/candidate/:candidateId/positions` - Get candidate positions
- `GET /api/candidatePolicyPlatform/race/:officeId/comparison` - Compare candidates in race

### 7. ELECTION SYSTEM ENDPOINTS (`/api/elections/*`) - 8 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

- `GET /api/elections/` - Get upcoming elections
- `GET /api/elections/:id` - Get specific election details
- `GET /api/elections/:id/candidates` - Get candidates for election
- `POST /api/elections/:id/register-candidate` - Register as candidate for election
- `POST /api/elections/candidates/compare` - Compare election candidates
- `POST /api/elections/cache/refresh` - Refresh election cache

### 8. PHOTO AND MEDIA ENDPOINTS (`/api/photos/*`) - 19 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Photo Upload and Management:**
- `POST /api/photos/upload` - Upload photos (max 5)
- `GET /api/photos/my` - Get user's uploaded photos
- `GET /api/photos/candidate/:candidateId` - Get candidate photos
- `PUT /api/photos/:photoId/purpose` - Set photo purpose
- `DELETE /api/photos/:photoId` - Delete photo
- `POST /api/photos/:photoId/set-profile` - Set as profile photo

**Photo Moderation:**
- `POST /api/photos/:photoId/flag` - Flag photo for review
- `GET /api/photos/moderation/pending` - Get photos pending moderation
- `POST /api/photos/:photoId/approve` - Approve photo

**Photo Organization:**
- `GET /api/photos/galleries` - Get photo galleries
- `PUT /api/photos/:photoId/gallery` - Assign photo to gallery
- `GET /api/photos/stats` - Get photo statistics

### 9. PHOTO TAGGING ENDPOINTS (`/api/photoTags/*`) - 8 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Tagging System:**
- `POST /api/photoTags/` - Create photo tag
- `POST /api/photoTags/:tagId/respond` - Respond to tag request
- `DELETE /api/photoTags/:tagId` - Delete photo tag
- `GET /api/photoTags/photo/:photoId` - Get tags for photo
- `GET /api/photoTags/pending` - Get pending tag requests
- `GET /api/photoTags/search-users` - Search users for tagging

**Privacy Controls:**
- `POST /api/photoTags/privacy-request` - Request photo removal
- `PUT /api/photoTags/preferences` - Update tagging preferences

### 10. MESSAGE SYSTEM ENDPOINTS (`/api/messages/*`, `/api/unifiedMessages/*`) - 17 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Direct Messaging (`/api/messages/*`):**
- `GET /api/messages/conversations` - Get user conversations
- `POST /api/messages/conversations` - Create new conversation
- `GET /api/messages/conversations/:conversationId/messages` - Get conversation messages
- `POST /api/messages/conversations/:conversationId/messages` - Send message

**Unified Messaging System (`/api/unifiedMessages/*`):**
- `GET /api/unifiedMessages/conversations` - Get all conversation types
- `GET /api/unifiedMessages/conversations/:conversationId/messages` - Get unified messages
- `POST /api/unifiedMessages/send` - Send unified message
- `POST /api/unifiedMessages/mark-read` - Mark messages as read
- `GET /api/unifiedMessages/unread-count` - Get unread message count

**Admin-Candidate Messaging:**
- `GET /api/unifiedMessages/admin/candidate/:candidateId` - Admin view of candidate messages
- `GET /api/unifiedMessages/candidate/admin-messages` - Candidate's admin messages
- `GET /api/unifiedMessages/candidate/user-messages` - Candidate's user messages

### 11. CANDIDATE MESSAGING ENDPOINTS (`/api/candidateMessages/*`) - 8 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Citizen-Candidate Communication:**
- `POST /api/candidateMessages/:candidateId/inquiry` - Send inquiry to candidate
- `GET /api/candidateMessages/:candidateId/inbox` - Get candidate inbox
- `POST /api/candidateMessages/inquiry/:inquiryId/respond` - Respond to inquiry

**Public Q&A System:**
- `GET /api/candidateMessages/:candidateId/public-qa` - Get public Q&A
- `POST /api/candidateMessages/:candidateId/public-qa/:qaId/vote` - Vote on Q&A

**Campaign Staff Management:**
- `POST /api/candidateMessages/:candidateId/staff` - Add campaign staff
- `GET /api/candidateMessages/:candidateId/staff` - Get campaign staff list

### 12. RELATIONSHIP SYSTEM ENDPOINTS (`/api/relationships/*`) - 22 endpoints
**Status**: ⚠️ Partially documented (3/22 documented)

**Following System** (Partially documented):
- `POST /api/relationships/follow/:userId` - Follow user (documented)
- `DELETE /api/relationships/follow/:userId` - Unfollow user (documented)
- `GET /api/relationships/follow-status/:userId` - Check follow status (documented)

**Missing Documentation** (19 undocumented endpoints):

**Social Network Features:**
- `GET /api/relationships/:userId/followers` - Get user's followers
- `GET /api/relationships/:userId/following` - Get users being followed
- `POST /api/relationships/subscribe/:userId` - Subscribe to user updates
- `DELETE /api/relationships/subscribe/:userId` - Unsubscribe from user
- `GET /api/relationships/subscription-status/:userId` - Check subscription status
- `GET /api/relationships/:userId/subscribers` - Get user's subscribers
- `GET /api/relationships/:userId/subscriptions` - Get user's subscriptions

**Friend System:**
- `POST /api/relationships/friend-request/:userId` - Send friend request
- `POST /api/relationships/friend-request/:userId/accept` - Accept friend request
- `POST /api/relationships/friend-request/:userId/reject` - Reject friend request
- `DELETE /api/relationships/friend/:userId` - Remove friend
- `GET /api/relationships/friend-status/:userId` - Check friend status
- `GET /api/relationships/:userId/friends` - Get user's friends
- `GET /api/relationships/friend-requests/pending` - Get pending friend requests

**Relationship Analytics:**
- `GET /api/relationships/status/:userId` - Get combined relationship status
- `GET /api/relationships/suggestions/:type` - Get relationship suggestions
- `POST /api/relationships/bulk/follow-status` - Bulk check follow status
- `POST /api/relationships/bulk/friend-status` - Bulk check friend status
- `POST /api/relationships/bulk/subscription-status` - Bulk check subscription status

### 13. PAYMENT SYSTEM ENDPOINTS (`/api/payments/*`) - 9 endpoints
**Status**: ✅ Well documented

- `POST /api/payments/donation` - Create tax-deductible donation
- `POST /api/payments/fee` - Create non-tax-deductible fee payment
- `GET /api/payments/history` - Get user payment history
- `GET /api/payments/campaigns` - Get active donation campaigns
- `GET /api/payments/receipt/:paymentId` - Get payment receipt
- `GET /api/payments/tax-summary/:year` - Get annual tax summary
- `POST /api/payments/webhook` - Stripe webhook endpoint

### 14. NOTIFICATION SYSTEM ENDPOINTS (`/api/notifications/*`) - 4 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

- `GET /api/notifications/` - Get user notifications
- `PUT /api/notifications/:notificationId/read` - Mark notification as read
- `PUT /api/notifications/mark-read-batch` - Mark multiple notifications as read
- `PUT /api/notifications/read-all` - Mark all notifications as read

### 15. OAUTH INTEGRATION ENDPOINTS (`/api/oauth/*`) - 7 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**OAuth Configuration:**
- `GET /api/oauth/config` - Get OAuth configuration

**OAuth Authentication:**
- `POST /api/oauth/google` - Google OAuth login
- `POST /api/oauth/microsoft` - Microsoft OAuth login
- `POST /api/oauth/apple` - Apple OAuth login

**Account Linking:**
- `POST /api/oauth/link/:provider` - Link OAuth provider to account
- `DELETE /api/oauth/unlink/:provider` - Unlink OAuth provider
- `GET /api/oauth/linked` - Get linked OAuth providers

### 16. TOTP (TWO-FACTOR AUTH) ENDPOINTS (`/api/totp/*`) - 6 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

- `POST /api/totp/setup` - Set up TOTP authentication
- `POST /api/totp/verify-setup` - Verify TOTP setup
- `POST /api/totp/verify` - Verify TOTP token
- `POST /api/totp/disable` - Disable TOTP authentication
- `GET /api/totp/status` - Get TOTP status
- `POST /api/totp/regenerate-backup-codes` - Regenerate backup codes

### 17. SEARCH SYSTEM ENDPOINTS (`/api/search/*`) - 5 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

- `GET /api/search/unified` - Unified search across platform
- `GET /api/search/users` - Search users
- `GET /api/search/posts` - Search posts
- `GET /api/search/officials` - Search officials
- `GET /api/search/topics` - Search topics

### 18. TOPIC NAVIGATION ENDPOINTS (`/api/topicNavigation/*`, `/api/topics/*`) - 12 endpoints
**Status**: ⚠️ Partially documented (2/12 documented)

**Topic Discovery** (Partially documented):
- `GET /api/topicNavigation/trending` - Get trending topics (documented)
- `POST /api/topicNavigation/enter/:topicId` - Enter topic mode (documented)

**Missing Documentation** (10 undocumented endpoints):
- `POST /api/topicNavigation/exit` - Exit topic mode
- `GET /api/topicNavigation/:topicId/posts` - Get posts in topic
- `GET /api/topicNavigation/current` - Get current topic
- `POST /api/topicNavigation/:topicId/post` - Post in topic context
- `GET /api/topics/trending` - Get trending topics (different endpoint)
- `GET /api/topics/:id` - Get topic details
- `POST /api/topics/:id/comment` - Comment on topic
- `POST /api/topics/:id/subtopics/:subTopicId/comment` - Comment on subtopic
- `POST /api/topics/analyze/recent` - Analyze recent topics (admin)
- `GET /api/topics/search` - Search topics

### 19. TRENDING TOPICS ENDPOINTS (`/api/trendingTopics/*`) - 2 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

- `GET /api/trendingTopics/topics` - Get trending topics
- `GET /api/trendingTopics/map-topics` - Get trending topics for map display

### 20. FEED SYSTEM ENDPOINTS (`/api/feed/*`) - 2 endpoints
**Status**: ✅ Well documented

- `GET /api/feed/` - Get personalized feed
- `GET /api/feed/trending` - Get trending feed

### 21. POLITICAL INFORMATION ENDPOINTS (`/api/political/*`) - 6 endpoints
**Status**: ⚠️ Partially documented (2/6 documented)

**Political Profile** (Documented):
- `PUT /api/political/profile` - Update political profile
- `GET /api/political/representatives` - Get user's representatives

**Missing Documentation** (4 undocumented endpoints):
- `GET /api/political/officials` - Get political officials
- `POST /api/political/officials/refresh` - Refresh officials data
- `GET /api/political/representatives/lookup` - Lookup representatives
- `GET /api/political/officials/:zipCode/:state` - Get officials by location

### 22. GOOGLE CIVIC API ENDPOINTS (`/api/googleCivic/*`) - 2 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

- `GET /api/googleCivic/representatives` - Get representatives from Google Civic API
- `GET /api/googleCivic/elections` - Get elections from Google Civic API

### 23. LEGISLATIVE DATA ENDPOINTS (`/api/legislative/*`) - 11 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Voting Records:**
- `GET /api/legislative/voting-records/:bioguideId` - Get legislator voting records
- `GET /api/legislative/bills/:bioguideId` - Get bills by legislator

**News Integration:**
- `GET /api/legislative/news/:officialName` - Get news for official
- `GET /api/legislative/news/trending` - Get trending political news
- `GET /api/legislative/news/stored` - Get stored news articles

**Data Synchronization:**
- `POST /api/legislative/sync/federal` - Sync federal legislative data
- `POST /api/legislative/sync/state/:stateCode` - Sync state legislative data
- `POST /api/legislative/voting-statistics` - Update voting statistics

**System Health:**
- `GET /api/legislative/health` - Legislative system health
- `GET /api/legislative/news-api-status` - News API status

### 24. EXTERNAL CANDIDATES ENDPOINTS (`/api/externalCandidates/*`) - 8 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Data Import:**
- `POST /api/externalCandidates/import-address` - Import candidates for address
- `POST /api/externalCandidates/bulk-import` - Bulk import candidates
- `GET /api/externalCandidates/for-address` - Get candidates for address

**Candidate Claiming:**
- `GET /api/externalCandidates/claimable` - Get claimable candidate profiles
- `POST /api/externalCandidates/:id/claim` - Claim external candidate profile

**Search and Cache:**
- `GET /api/externalCandidates/search` - Search external candidates
- `GET /api/externalCandidates/health` - System health check
- `POST /api/externalCandidates/cache/clear` - Clear candidate cache

### 25. CROWDSOURCING ENDPOINTS (`/api/crowdsourcing/*`) - 9 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**District Data:**
- `GET /api/crowdsourcing/districts/lookup` - Lookup district information
- `POST /api/crowdsourcing/districts/missing-offices` - Report missing offices
- `POST /api/crowdsourcing/districts` - Add district information
- `POST /api/crowdsourcing/districts/:districtId/offices` - Add office to district

**Officials Data:**
- `POST /api/crowdsourcing/offices/:officeId/officials` - Add official to office
- `POST /api/crowdsourcing/officials/:officialId/vote` - Vote on official data

**Conflict Resolution:**
- `POST /api/crowdsourcing/districts/:districtId/conflicts` - Report data conflicts

**User Contributions:**
- `GET /api/crowdsourcing/my-contributions` - Get user's contributions
- `GET /api/crowdsourcing/leaderboard` - Get contribution leaderboard

### 26. CIVIC ENGAGEMENT ENDPOINTS (`/api/civic/*`) - 13 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Petitions:**
- `POST /api/civic/petitions` - Create petition
- `GET /api/civic/petitions` - Get petitions
- `GET /api/civic/petitions/:id` - Get specific petition
- `POST /api/civic/petitions/:id/sign` - Sign petition

**Events:**
- `POST /api/civic/events` - Create civic event
- `GET /api/civic/events` - Get civic events
- `GET /api/civic/events/:id` - Get specific event
- `POST /api/civic/events/:id/rsvp` - RSVP to event

**User Activity:**
- `GET /api/civic/search` - Search civic activities
- `GET /api/civic/user/petitions` - Get user's petitions
- `GET /api/civic/user/events` - Get user's events
- `GET /api/civic/user/signatures` - Get user's petition signatures
- `GET /api/civic/user/rsvps` - Get user's event RSVPs

### 27. MODERATION SYSTEM ENDPOINTS (`/api/moderation/*`, `/api/appeals/*`) - 13 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Content Moderation (`/api/moderation/*`):**
- `POST /api/moderation/reports` - Submit content report
- `GET /api/moderation/reports/my` - Get user's reports
- `GET /api/moderation/reports` - Get all reports (moderators)
- `POST /api/moderation/reports/:reportId/action` - Take moderation action
- `GET /api/moderation/stats` - Get moderation statistics
- `POST /api/moderation/users/:userId/promote` - Promote user to moderator
- `GET /api/moderation/health` - Moderation system health

**Appeals System (`/api/appeals/*`):**
- `POST /api/appeals/` - Submit moderation appeal
- `GET /api/appeals/my` - Get user's appeals
- `GET /api/appeals/:appealId` - Get specific appeal
- `GET /api/appeals/queue/all` - Get all appeals (moderators)
- `POST /api/appeals/:appealId/review` - Review appeal

### 28. REPUTATION SYSTEM ENDPOINTS (`/api/reputation/*`) - 10 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**User Reputation:**
- `GET /api/reputation/user/:userId` - Get user reputation
- `GET /api/reputation/me` - Get current user's reputation
- `GET /api/reputation/history` - Get reputation history

**Reputation Management:**
- `POST /api/reputation/analyze` - Analyze reputation factors
- `POST /api/reputation/report` - Report reputation issue
- `POST /api/reputation/appeal` - Appeal reputation penalty

**Admin Functions:**
- `POST /api/reputation/award` - Award reputation points (admin)
- `GET /api/reputation/stats` - Get reputation statistics (admin)
- `GET /api/reputation/low-reputation` - Get low reputation users (admin)
- `GET /api/reputation/health` - Reputation system health

### 29. ONBOARDING SYSTEM ENDPOINTS (`/api/onboarding/*`) - 9 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Onboarding Flow:**
- `GET /api/onboarding/steps` - Get onboarding steps
- `GET /api/onboarding/progress` - Get user's onboarding progress
- `POST /api/onboarding/complete-step` - Complete onboarding step
- `POST /api/onboarding/skip-step` - Skip onboarding step

**Setup Data:**
- `GET /api/onboarding/interests` - Get available interests
- `POST /api/onboarding/location/validate` - Validate location data
- `POST /api/onboarding/welcome` - Complete welcome process

**Analytics:**
- `GET /api/onboarding/analytics` - Get onboarding analytics
- `GET /api/onboarding/search-preview` - Preview search functionality

### 30. FEEDBACK SYSTEM ENDPOINTS (`/api/feedback/*`) - 5 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

- `GET /api/feedback/` - Get feedback submissions (admin)
- `GET /api/feedback/stats` - Get feedback statistics (admin)
- `PUT /api/feedback/:id/status` - Update feedback status (admin)
- `POST /api/feedback/analyze` - Analyze feedback (admin)
- `POST /api/feedback/batch-analyze` - Batch analyze feedback (admin)

### 31. MESSAGE OF THE DAY ENDPOINTS (`/api/motd/*`) - 7 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Public MOTD:**
- `GET /api/motd/current` - Get current message of the day
- `POST /api/motd/dismiss/:id` - Dismiss MOTD for user

**Admin MOTD Management:**
- `GET /api/motd/admin/list` - List all MOTDs (admin)
- `POST /api/motd/admin/create` - Create new MOTD (admin)
- `PUT /api/motd/admin/update/:id` - Update MOTD (admin)
- `POST /api/motd/admin/toggle/:id` - Toggle MOTD active status (admin)
- `DELETE /api/motd/admin/delete/:id` - Delete MOTD (admin)
- `GET /api/motd/admin/analytics/:id` - Get MOTD analytics (admin)

### 32. CANDIDATE VERIFICATION ENDPOINTS (`/api/candidateVerification/*`) - 7 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

**Candidate Self-Service:**
- `GET /api/candidateVerification/status` - Get verification status
- `POST /api/candidateVerification/documents` - Upload verification documents
- `GET /api/candidateVerification/requested-documents` - Get required documents

**Admin Verification:**
- `GET /api/candidateVerification/admin/due-verification` - Get candidates due for verification
- `POST /api/candidateVerification/admin/request-documents` - Request additional documents
- `POST /api/candidateVerification/admin/verify-document` - Verify submitted document

### 33. CANDIDATE ADMIN MESSAGES ENDPOINTS (`/api/candidateAdminMessages/*`) - 3 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

- `GET /api/candidateAdminMessages/admin-messages` - Get admin messages for candidate
- `POST /api/candidateAdminMessages/admin-messages` - Send admin message to candidate
- `GET /api/candidateAdminMessages/admin-messages/unread-count` - Get unread admin message count

### 34. BATCH OPERATIONS ENDPOINTS (`/api/batch/*`) - 3 endpoints
**Status**: ❌ COMPLETELY UNDOCUMENTED

- `GET /api/batch/initialize` - Initialize batch operations
- `GET /api/batch/auth-status` - Get authentication status for batch
- `GET /api/batch/health-check` - Batch system health check

### 35. HEALTH AND MONITORING ENDPOINTS (`/health*`) - 6 endpoints
**Status**: ✅ Partially documented (2/6 documented)

**Core Health** (Documented):
- `GET /health` - Basic health check
- `GET /health/deployment` - Deployment status

**Missing Documentation** (4 undocumented endpoints):
- `GET /health/version` - API version information
- `GET /health/database` - Database connectivity check
- `GET /health/reputation` - Reputation system health
- `GET /health/batch` - Batch operations health
- `POST /health/deployment/update` - Update deployment information

## Priority Recommendations for Documentation

### CRITICAL PRIORITY (Immediate Documentation Needed):

1. **Admin Dashboard Endpoints** (28 endpoints)
   - **Business Impact**: Core platform management functionality
   - **Current State**: 0% documented
   - **Risk**: Admin users cannot effectively use the platform management features
   - **Recommendation**: Document all 28 admin endpoints with full examples

2. **Candidate System Endpoints** (42 endpoints across multiple files)
   - **Business Impact**: Core political functionality - candidate registration, policies, messaging
   - **Current State**: 0% documented
   - **Risk**: Candidates cannot effectively use platform features
   - **Files**: `/candidates/*`, `/candidateMessages/*`, `/candidatePolicyPlatform/*`, `/candidateVerification/*`

3. **Authentication Advanced Features** (OAuth, TOTP)
   - **Business Impact**: Security and user experience
   - **Current State**: OAuth (0/7), TOTP (0/6) documented
   - **Risk**: Users cannot enable security features or link social accounts

### HIGH PRIORITY:

4. **Messaging Systems** (17 endpoints)
   - **Business Impact**: Core communication functionality
   - **Files**: `/messages/*`, `/unifiedMessages/*`, `/candidateMessages/*`

5. **Photo and Media Management** (27 endpoints)
   - **Business Impact**: Media functionality and user engagement
   - **Files**: `/photos/*`, `/photoTags/*`

6. **Relationship System** (19 undocumented endpoints)
   - **Business Impact**: Social networking features
   - **File**: `/relationships/*`

### MEDIUM PRIORITY:

7. **Search System** (5 endpoints) - Core discovery functionality
8. **Notification System** (4 endpoints) - User engagement
9. **Topic and Content Discovery** (14 endpoints) - AI-powered features
10. **Legislative Data Integration** (11 endpoints) - Political information

### DOCUMENTATION QUALITY IMPROVEMENTS:

**For Currently Documented Endpoints:**
- Add comprehensive request/response examples
- Document error codes and responses
- Include authentication requirements clearly
- Add usage examples and common patterns

## Implementation Recommendations

### Phase 1: Critical Business Functions (Week 1-2)
- Document all admin dashboard endpoints with complete examples
- Document candidate registration and management systems
- Add OAuth and TOTP security documentation

### Phase 2: User Experience Features (Week 3-4)
- Document messaging and communication systems
- Document photo and media management
- Complete relationship system documentation

### Phase 3: Advanced Features (Week 5-6)
- Document search and discovery systems
- Document legislative data and civic engagement
- Add comprehensive error handling documentation

### Phase 4: Documentation Polish (Week 7)
- Add comprehensive examples to existing documentation
- Create developer quick-start guides
- Add API testing and debugging guides

## Conclusion

The UnitedWeRise platform has an incredibly comprehensive API with 340 endpoints covering every aspect of civic engagement. However, with only 12% of endpoints currently documented, there is significant risk to developer productivity, platform adoption, and user experience.

The missing documentation represents a critical technical debt that impacts:
- **Developer Onboarding**: New developers cannot effectively work with the platform
- **Feature Adoption**: Users cannot discover and use advanced platform features
- **System Maintenance**: Difficult to maintain and debug undocumented systems
- **Platform Growth**: Limited ability to scale development team without comprehensive docs

**Immediate Action Required**: Begin with the 28 admin dashboard endpoints and 42 candidate system endpoints, as these represent core business functionality that is completely undocumented.

This comprehensive audit provides the foundation for a systematic documentation improvement project that will significantly enhance the platform's usability and maintainability.
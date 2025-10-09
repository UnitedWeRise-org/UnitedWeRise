# UnitedWeRise Database Schema Reference

**Status**: ✅ Production Ready
**Last Updated**: 2025-10-09
**Database**: PostgreSQL (Azure Flexible Server)
**ORM**: Prisma
**Total Models**: 94

## Overview

UnitedWeRise uses PostgreSQL with Prisma ORM for data management. The schema is designed to support a comprehensive civic engagement platform with social networking, electoral information, gamification, payment processing, and administrative tools.

## Database Statistics

- **Total Models**: 94
- **Core User & Authentication**: 9 models
- **Social & Content**: 12 models
- **Civic Engagement & Gamification**: 6 models
- **Electoral & Political**: 28 models
- **Messaging**: 6 models
- **Moderation & Safety**: 10 models
- **Payment & Transactions**: 6 models
- **Administrative**: 6 models
- **Geographic & Location**: 5 models
- **Media & Photos**: 3 models
- **Feed Customization**: 3 models
- **Total Enums**: 50+

## Model Categories

### Core User & Authentication Models
- `User` - Central user account and profile management
- `UserActivity` - User action tracking and analytics
- `UserOAuthProvider` - OAuth authentication providers (Google, Microsoft, Apple)
- `SecurityEvent` - Security event logging and risk tracking
- `Follow` - User follow relationships
- `Subscription` - User subscription relationships
- `Friendship` - Friend request and connection management
- `ReputationEvent` - User reputation score tracking
- `UserQuestStreak` - Quest streak tracking (daily/weekly)

### Content Models
- `Post` - User-generated posts (text, images, political/non-political)
- `Comment` - Threaded comments on posts
- `Like` - Post likes
- `Reaction` - Post/comment reactions (sentiment + stance)
- `Share` - Post shares (simple or quote shares)
- `Notification` - User notifications
- `SavedPost` - User's saved posts for later viewing
- `FeedFilter` - User-defined feed customization filters

### Social Relationship Models
- `Follow` - One-directional follow relationships
- `Friendship` - Mutual friend connections with status
- `Subscription` - Content subscription relationships
- `Endorsement` - User endorsements of candidates

### Civic Engagement & Gamification Models
- `Quest` - Civic engagement quests (daily, weekly, monthly)
- `UserQuestProgress` - Individual user progress on quests
- `UserQuestStreak` - Quest completion streak tracking
- `Badge` - Achievement badges
- `UserBadge` - User-earned badges
- `CivicEvent` - Civic events (town halls, rallies, voter registration)
- `EventRSVP` - Event attendance tracking
- `Petition` - Petitions and referendums
- `PetitionSignature` - Petition signature tracking

### Electoral & Political Models
- `Election` - Election information (primary, general, special)
- `Office` - Political offices up for election
- `Candidate` - Candidate profiles and verification
- `CandidateInbox` - Candidate public Q&A inbox
- `CandidateStaff` - Campaign staff management
- `CandidateRegistration` - Candidate registration workflow
- `CandidateVerificationDocument` - Verification document uploads
- `CandidateAdminMessage` - Admin-candidate messaging
- `FinancialData` - Campaign finance data
- `PolicyPosition` - Candidate policy positions
- `PolicyCategory` - Policy position categories
- `PolicyComparison` - AI-powered policy comparisons
- `PoliticalInquiry` - Citizen inquiries to candidates
- `InquiryResponse` - Staff responses to inquiries
- `PublicQA` - Published Q&A pairs
- `PublicQAVote` - Votes on public Q&A
- `ElectoralDistrict` - Electoral district boundaries
- `DistrictOffice` - Offices within districts
- `DistrictConflict` - Crowdsourced conflict reporting
- `AddressDistrictMapping` - Address-to-district mapping
- `CrowdsourcedOfficial` - Crowdsourced official information
- `CrowdsourceVote` - Votes on crowdsourced data
- `ExternalOfficial` - Cached external API official data

### Legislative & Governance Models
- `Legislature` - Legislative bodies (federal, state, local)
- `LegislativeMembership` - Legislator memberships
- `Bill` - Legislative bills and tracking
- `BillSponsorship` - Bill sponsorship relationships
- `Vote` - Legislative votes
- `LegislatorVote` - Individual legislator vote records
- `VotingRecordSummary` - Aggregated voting statistics
- `BallotMeasure` - Ballot measures and propositions
- `NewsArticle` - News articles about politics
- `OfficialMention` - Official mentions in news articles

### Topic & Discussion Models
- `Topic` - Political topics and issues
- `SubTopic` - Nested subtopics
- `TopicPost` - Post-to-topic associations
- `TopicComment` - Topic discussion comments

### Messaging Models
- `Conversation` - Private conversations
- `ConversationParticipant` - Conversation membership
- `Message` - Direct messages
- `UnifiedMessage` - Unified messaging system
- `ConversationMeta` - Conversation metadata
- `MessageOfTheDay` - System-wide announcements

### Moderation & Safety Models
- `Report` - User reports of content/users
- `ContentFlag` - Automated content flagging
- `ModerationLog` - Moderator action audit log
- `UserWarning` - Formal user warnings
- `UserSuspension` - User suspensions/bans
- `Appeal` - Suspension appeals
- `MOTDDismissal` - Message dismissal tracking
- `MOTDView` - Message view analytics
- `MOTDLog` - MOTD administration audit log

### Payment & Transaction Models
- `Payment` - All payment transactions
- `StripeCustomer` - Stripe customer records
- `Refund` - Payment refunds
- `PaymentWebhook` - Stripe webhook processing
- `DonationCampaign` - Donation campaign tracking

### Media & Photos Models
- `Photo` - Photo uploads with moderation
- `SavedPost` - Saved posts for bookmarking
- `FeedFilter` - Feed customization filters

### Geographic & Location Models
- `ElectoralDistrict` - District boundaries with H3 indexing
- `AddressDistrictMapping` - Address geocoding and district mapping
- `ExternalOfficial` - Cached official data with H3 indexing

### Cache & External Data Models
- `ApiCache` - External API response caching
- `ElectionCache` - State election data cache

---

## Detailed Model Schemas

### User Model

```prisma
model User {
  id                          String                    @id @default(cuid())
  email                       String                    @unique
  username                    String                    @unique
  password                    String?
  firstName                   String?
  lastName                    String?
  avatar                      String?
  bio                         String?
  website                     String?
  location                    String?
  verified                    Boolean                   @default(false)
  embedding                   Float[]                   @default([])
  createdAt                   DateTime                  @default(now())
  updatedAt                   DateTime                  @updatedAt

  // Address and Geographic
  streetAddress               String?
  streetAddress2              String?
  city                        String?
  state                       String?
  zipCode                     String?
  h3Index                     String?

  // Political Profile
  politicalProfileType        PoliticalProfileType      @default(CITIZEN)
  verificationStatus          VerificationStatus        @default(PENDING)
  verificationDocuments       String[]                  @default([])
  office                      String?
  campaignWebsite             String?
  officialTitle               String?
  termStart                   DateTime?
  termEnd                     DateTime?

  // Email/Phone Verification
  emailVerified               Boolean                   @default(false)
  emailVerifyToken            String?                   @unique
  emailVerifyExpiry           DateTime?
  phoneNumber                 String?
  phoneVerified               Boolean                   @default(false)
  phoneVerifyCode             String?
  phoneVerifyExpiry           DateTime?

  // Privacy & Settings
  maritalStatus               String?
  profilePrivacySettings      Json?
  resetToken                  String?
  resetExpiry                 DateTime?

  // Online Status
  isOnline                    Boolean                   @default(false)
  lastSeenAt                  DateTime                  @default(now())

  // Admin & Moderation
  isModerator                 Boolean                   @default(false)
  isAdmin                     Boolean                   @default(false)
  isSuperAdmin                Boolean                   @default(false)
  isSuspended                 Boolean                   @default(false)

  // Onboarding
  onboardingData              Json?
  onboardingCompleted         Boolean                   @default(false)
  interests                   String[]                  @default([])
  politicalExperience         String?
  notificationPreferences     Json?

  // Display & Social
  displayName                 String?
  followingCount              Int                       @default(0)
  followersCount              Int                       @default(0)

  // Security & Anti-Fraud
  deviceFingerprint           Json?
  lastLoginAt                 DateTime?
  lastLoginIp                 String?
  lockedUntil                 DateTime?
  loginAttempts               Int                       @default(0)
  passwordChangedAt           DateTime?
  riskScore                   Int                       @default(0)
  suspiciousActivityCount     Int                       @default(0)

  // Reputation System
  reputationScore             Int?                      @default(70)
  reputationUpdatedAt         DateTime?

  // Photo Tagging Preferences
  allowTagsByFriendsOnly      Boolean                   @default(false)
  photoTaggingEnabled         Boolean                   @default(true)
  requireTagApproval          Boolean                   @default(true)

  // Profile Customization
  backgroundImage             String?

  // Two-Factor Authentication (TOTP)
  totpBackupCodes             String[]                  @default([])
  totpEnabled                 Boolean                   @default(false)
  totpLastUsedAt              DateTime?
  totpSecret                  String?
  totpSetupAt                 DateTime?

  // Relations (94+ relationships)
  // [See complete list in schema.prisma]

  @@index([username])
  @@index([createdAt])
  @@index([h3Index])
  @@index([politicalProfileType])
  @@index([zipCode, state])
}
```

**Fields:**
- `id` (String, UUID): Primary key using cuid
- `email` (String, unique): User email address, required for authentication
- `username` (String, unique): Unique username for public profile
- `password` (String, optional): Hashed password (null for OAuth-only users)
- `firstName`, `lastName` (String, optional): User's legal name
- `avatar` (String, optional): Profile picture URL (Azure Blob Storage)
- `bio` (String, optional): User biography/description
- `website` (String, optional): Personal or campaign website
- `location` (String, optional): Free-form location description
- `verified` (Boolean): Email verification status
- `embedding` (Float[]): AI-generated embedding for semantic search
- `h3Index` (String, optional): H3 geospatial index for location-based features
- `politicalProfileType` (Enum): CITIZEN, CANDIDATE, ELECTED_OFFICIAL, POLITICAL_ORG
- `verificationStatus` (Enum): PENDING, APPROVED, DENIED, NOT_REQUIRED
- `profilePrivacySettings` (Json): Granular privacy controls for profile fields
- `reputationScore` (Int): Community reputation score (0-100, default 70)
- `totpEnabled` (Boolean): Two-factor authentication enabled
- `followingCount`, `followersCount` (Int): Cached social graph counts

**Relationships:**
- `posts`: One-to-many with Post (user's posts)
- `comments`: One-to-many with Comment (user's comments)
- `likes`: One-to-many with Like (user's likes)
- `reactions`: One-to-many with Reaction (user's reactions)
- `shares`: One-to-many with Share (user's shares)
- `followers`: Many-to-many via Follow (users following this user)
- `following`: Many-to-many via Follow (users this user follows)
- `sentFriendRequests`: One-to-many with Friendship (friend requests sent)
- `receivedFriendRequests`: One-to-many with Friendship (friend requests received)
- `candidateProfile`: One-to-one with Candidate (if user is a candidate)
- `questProgress`: One-to-many with UserQuestProgress (quest progress)
- `userBadges`: One-to-many with UserBadge (earned badges)
- `photos`: One-to-many with Photo (uploaded photos)
- `savedPosts`: One-to-many with SavedPost (saved posts)
- `feedFilters`: One-to-many with FeedFilter (custom feed filters)

**Indexes:**
- `username`: Fast username lookups
- `createdAt`: User registration date queries
- `h3Index`: Geographic proximity queries
- `politicalProfileType`: Filter users by profile type
- `zipCode, state`: Geographic queries

**Business Logic:**
- Email verification required before full platform access
- Privacy settings control visibility of profile fields (public, followers, friends, private)
- Reputation score impacts content visibility and privileges
- H3 geospatial indexing enables privacy-preserving location features
- TOTP provides optional 2FA security
- Soft delete not implemented (hard delete via CASCADE)

---

### Post Model

```prisma
model Post {
  id                 String            @id @default(cuid())
  content            String
  extendedContent    String?
  imageUrl           String?
  authorId           String
  embedding          Float[]           @default([])
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
  isPolitical        Boolean           @default(false)
  tags               String[]          @default([])

  // Engagement Metrics
  likesCount         Int               @default(0)
  dislikesCount      Int               @default(0)
  agreesCount        Int               @default(0)
  disagreesCount     Int               @default(0)
  commentsCount      Int               @default(0)
  sharesCount        Int               @default(0)
  viewsCount         Int               @default(0)

  // AI Feedback Detection
  containsFeedback   Boolean?          @default(false)
  feedbackCategory   String?
  feedbackConfidence Float?
  feedbackPriority   String?
  feedbackStatus     String?           @default("new")
  feedbackSummary    String?
  feedbackType       String?

  // Reputation & Moderation
  authorReputation   Int?
  isDeleted          Boolean           @default(false)
  deletedAt          DateTime?
  deletedReason      String?
  searchable         Boolean           @default(true)
  feedVisible        Boolean           @default(true)

  // Edit Tracking
  editCount          Int               @default(0)
  lastEditedAt       DateTime?
  editHistory        Json?
  originalContent    String?

  // Geographic (H3 Privacy-Preserving)
  h3Index            String?
  latitude           Float?
  longitude          Float?
  originalH3Index    String?
  privacyDisplaced   Boolean           @default(true)

  // Relations
  comments           Comment[]
  likes              Like[]
  author             User              @relation(fields: [authorId], references: [id], onDelete: Cascade)
  photos             Photo[]
  reactions          Reaction[]
  reputationEvents   ReputationEvent[]
  shares             Share[]
  topics             TopicPost[]
  savedBy            SavedPost[]

  @@index([authorId])
  @@index([createdAt])
  @@index([h3Index])
  @@index([h3Index, createdAt])
  @@index([originalH3Index, createdAt])
  @@index([likesCount])
  @@index([isPolitical])
  @@index([containsFeedback, feedbackType, feedbackPriority])
}
```

**Fields:**
- `id` (String, UUID): Primary key
- `content` (String, required): Post text content
- `extendedContent` (String, optional): Additional long-form content
- `imageUrl` (String, optional): DEPRECATED - now using Photo model
- `authorId` (String, FK): User who created the post
- `embedding` (Float[]): AI semantic embedding for content similarity
- `isPolitical` (Boolean): Whether post contains political content (AI-detected)
- `tags` (String[]): User-applied content tags
- `likesCount`, `commentsCount`, `sharesCount` (Int): Cached engagement metrics
- `containsFeedback` (Boolean): AI-detected constituent feedback
- `feedbackCategory`, `feedbackType` (String): Categorized feedback type
- `feedbackPriority` (String): Urgency level (low, medium, high, urgent)
- `isDeleted` (Boolean): Soft delete flag
- `editCount` (Int): Number of times post was edited
- `editHistory` (Json): Complete edit history with timestamps
- `originalContent` (String): Original post content before edits
- `h3Index` (String): Privacy-displaced geographic location (H3 hexagon)
- `originalH3Index` (String): Actual precise location (private)
- `privacyDisplaced` (Boolean): Whether location was displaced for privacy

**Relationships:**
- `author`: Many-to-one with User
- `comments`: One-to-many with Comment
- `likes`: One-to-many with Like
- `reactions`: One-to-many with Reaction
- `shares`: One-to-many with Share
- `photos`: One-to-many with Photo (attached images)
- `topics`: Many-to-many via TopicPost (associated political topics)
- `savedBy`: One-to-many with SavedPost (users who saved this post)

**Indexes:**
- `authorId`: Fast author queries
- `createdAt`: Chronological sorting
- `h3Index`: Geographic proximity queries
- `h3Index, createdAt`: Combined geographic + temporal queries
- `likesCount`: Popular posts ranking
- `isPolitical`: Filter political vs non-political content
- `containsFeedback, feedbackType, feedbackPriority`: Constituent feedback dashboard

**Business Logic:**
- Soft deletes preserve content for moderation review
- Edit history tracked to prevent abuse (max 10 edits)
- H3 geospatial indexing provides privacy-preserving location features
- Geographic displacement randomizes exact location within ~1km radius
- AI content moderation flags inappropriate content
- Engagement counts cached for performance (updated via transactions)
- Feedback detection enables elected officials to find constituent input

---

### Quest Model

```prisma
model Quest {
  id               String              @id @default(cuid())
  type             QuestType
  category         QuestCategory
  title            String
  description      String              @db.Text
  shortDescription String?
  requirements     Json
  rewards          Json
  timeframe        QuestTimeframe
  displayOrder     Int                 @default(0)
  isActive         Boolean             @default(true)
  startDate        DateTime?
  endDate          DateTime?
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
  createdBy        String?
  userProgress     UserQuestProgress[]

  @@index([type])
  @@index([isActive])
  @@index([startDate, endDate])
}
```

**Fields:**
- `id` (String, UUID): Primary key
- `type` (Enum): DAILY_HABIT, DAILY_CIVIC, WEEKLY_ENGAGEMENT, MONTHLY_CONSISTENCY, SPECIAL_EVENT, CIVIC_ACTION, EDUCATIONAL, SOCIAL_ENGAGEMENT
- `category` (Enum): INFORMATION, PARTICIPATION, COMMUNITY, ADVOCACY, EDUCATION, SOCIAL
- `title` (String): Quest display title
- `description` (String, Text): Full quest description
- `shortDescription` (String, optional): Brief description for lists
- `requirements` (Json): Flexible requirement structure (e.g., `{"action": "create_post", "count": 1}`)
- `rewards` (Json): Reward definition (e.g., `{"points": 10, "badges": ["daily_poster"]}`)
- `timeframe` (Enum): DAILY, WEEKLY, MONTHLY, ONGOING, LIMITED_TIME
- `displayOrder` (Int): Sort order in quest lists
- `isActive` (Boolean): Whether quest is currently available
- `startDate`, `endDate` (DateTime, optional): For limited-time quests
- `createdBy` (String, optional): Admin who created the quest

**Relationships:**
- `userProgress`: One-to-many with UserQuestProgress

**Indexes:**
- `type`: Filter quests by type
- `isActive`: Only show active quests
- `startDate, endDate`: Limited-time quest queries

**Business Logic:**
- Requirements defined in flexible JSON structure to support diverse quest types
- Rewards can include points, badges, reputation boosts
- Daily quests reset at midnight user's local time
- Weekly quests reset on Mondays
- Special event quests have explicit start/end dates
- Quest completion triggers badge evaluation

**Example Requirements JSON:**
```json
{
  "action": "create_post",
  "count": 1,
  "isPolitical": true,
  "minLength": 100
}
```

**Example Rewards JSON:**
```json
{
  "reputationPoints": 10,
  "badges": ["daily_civic_poster"],
  "streakBonus": true
}
```

---

### Badge Model

```prisma
model Badge {
  id                    String      @id @default(cuid())
  name                  String      @unique
  description           String      @db.Text
  imageUrl              String
  qualificationCriteria Json
  displayOrder          Int         @default(0)
  isActive              Boolean     @default(true)
  isAutoAwarded         Boolean     @default(true)
  maxAwards             Int?
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
  createdBy             String?
  userBadges            UserBadge[]

  @@index([isActive])
  @@index([name])
}
```

**Fields:**
- `id` (String, UUID): Primary key
- `name` (String, unique): Badge name (e.g., "Civic Champion")
- `description` (String, Text): Badge description
- `imageUrl` (String): Badge icon URL (Azure Blob Storage)
- `qualificationCriteria` (Json): Flexible criteria for earning badge
- `displayOrder` (Int): Display order in badge showcase
- `isActive` (Boolean): Whether badge can be awarded
- `isAutoAwarded` (Boolean): System auto-awards vs manual admin award only
- `maxAwards` (Int, optional): Maximum number of users who can earn (null = unlimited)
- `createdBy` (String, optional): Admin who created the badge

**Relationships:**
- `userBadges`: One-to-many with UserBadge

**Indexes:**
- `isActive`: Filter active badges
- `name`: Fast name lookups

**Business Logic:**
- Auto-awarded badges evaluated on quest completion, post creation, etc.
- Manual badges awarded by admins for exceptional contributions
- Max awards creates exclusivity (e.g., "Top 100 Contributors")
- Criteria evaluated by badge engine service

**Example Criteria JSON:**
```json
{
  "type": "quest_streak",
  "streak": 7,
  "streakType": "daily"
}
```

---

### Photo Model

```prisma
model Photo {
  id                String    @id @default(uuid())
  userId            String
  postId            String?
  url               String
  blobName          String
  mimeType          String
  originalMimeType  String
  originalSize      Int
  processedSize     Int
  width             Int?
  height            Int?
  moderationStatus  String
  moderationReason  String?
  moderationConfidence Float?
  moderationType    String?
  exifStripped      Boolean   @default(true)
  uploadedAt        DateTime  @default(now())
  deletedAt         DateTime?
  photoType         String?
  gallery           String?
  caption           String?
  thumbnailUrl      String?
  isActive          Boolean   @default(true)

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  post              Post?     @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([postId])
  @@index([uploadedAt])
  @@index([moderationStatus])
}
```

**Fields:**
- `id` (String, UUID): Primary key
- `userId` (String, FK): User who uploaded the photo
- `postId` (String, FK, optional): Associated post (null for profile/gallery photos)
- `url` (String): Full-size image URL (Azure Blob Storage)
- `blobName` (String): Azure blob storage container path
- `mimeType` (String): Processed MIME type (always image/jpeg or image/png)
- `originalMimeType` (String): Original upload MIME type
- `originalSize` (Int): Original file size in bytes
- `processedSize` (Int): Compressed file size in bytes
- `width`, `height` (Int, optional): Image dimensions
- `moderationStatus` (String): APPROVE, WARN, BLOCK (Azure Content Safety API)
- `moderationReason` (String, optional): Why content was flagged
- `moderationConfidence` (Float, optional): AI confidence score (0-1)
- `moderationType` (String, optional): Type of content detected (nudity, violence, etc.)
- `exifStripped` (Boolean): Whether EXIF metadata was removed (privacy)
- `photoType` (String, optional): AVATAR, GALLERY, POST_MEDIA
- `gallery` (String, optional): Gallery name for organization
- `caption` (String, optional): Photo description
- `thumbnailUrl` (String, optional): Optimized thumbnail URL
- `isActive` (Boolean): Soft delete flag

**Relationships:**
- `user`: Many-to-one with User
- `post`: Many-to-one with Post (optional)

**Indexes:**
- `userId`: User's photos
- `postId`: Post's attached photos
- `uploadedAt`: Recent uploads
- `moderationStatus`: Flagged content review

**Business Logic:**
- All uploads processed through Azure Content Safety API
- EXIF data stripped to protect user privacy (GPS, camera info)
- Images compressed and optimized (max 1920x1080, 85% quality JPEG)
- Thumbnails generated for feed performance (300x300)
- Photos with BLOCK status hidden from public view
- WARN status shows with content warning overlay
- Soft delete preserves evidence for moderation review

---

### Candidate Model

```prisma
model Candidate {
  id                     String                          @id @default(cuid())
  name                   String
  party                  String?
  isIncumbent            Boolean                         @default(false)
  campaignWebsite        String?
  campaignEmail          String?
  campaignPhone          String?
  platformSummary        String?
  keyIssues              String[]                        @default([])
  embedding              Float[]                         @default([])
  isVerified             Boolean                         @default(false)
  isWithdrawn            Boolean                         @default(false)
  withdrawnAt            DateTime?
  withdrawnReason        String?
  userId                 String?                         @unique
  officeId               String
  createdAt              DateTime                        @default(now())
  updatedAt              DateTime                        @updatedAt

  // Status Management
  status                 CandidateStatus?                @default(ACTIVE)
  statusChangedAt        DateTime?
  statusChangedBy        String?
  statusReason           String?
  suspendedUntil         DateTime?
  appealDeadline         DateTime?
  appealNotes            String?

  // Verification Tracking
  lastVerificationDate   DateTime?
  nextVerificationDue    DateTime?
  verificationStatus     String?                         @default("PENDING_INITIAL")
  thirdPartyVerification Boolean                         @default(false)

  // External Data Integration
  isExternallySourced    Boolean                         @default(false)
  externalSourceId       String?
  dataSource             String?
  lastExternalSync       DateTime?
  externalDataConfidence Float?
  isClaimed              Boolean                         @default(false)
  claimedBy              String?
  claimedAt              DateTime?
  googleCivicId          String?
  fecCandidateId         String?
  ballotpediaId          String?
  externalPhotoUrl       String?
  externalBiography      String?
  externalKeyIssues      String[]                        @default([])

  // Relations
  office                 Office                          @relation(fields: [officeId], references: [id], onDelete: Cascade)
  user                   User?                           @relation(fields: [userId], references: [id])
  adminMessages          CandidateAdminMessage[]
  inbox                  CandidateInbox?
  verificationDocuments  CandidateVerificationDocument[]
  endorsements           Endorsement[]
  financialData          FinancialData?
  policyPositions        PolicyPosition[]
  politicalInquiries     PoliticalInquiry[]
  publicQAs              PublicQA[]

  @@index([officeId])
  @@index([party])
  @@index([userId])
  @@index([statusChangedAt])
  @@index([status])
}
```

**Fields:**
- `id` (String, UUID): Primary key
- `name` (String): Candidate's full name
- `party` (String, optional): Political party affiliation
- `isIncumbent` (Boolean): Currently holds the office
- `userId` (String, FK, optional): Linked user account (if claimed)
- `officeId` (String, FK): Office being sought
- `status` (Enum): ACTIVE, SUSPENDED, ENDED, REVOKED, BANNED, WITHDRAWN
- `isExternallySourced` (Boolean): Data from Google Civic Info API or similar
- `isClaimed` (Boolean): Whether candidate claimed their profile
- `embedding` (Float[]): AI embedding for policy similarity matching

**Relationships:**
- `office`: Many-to-one with Office
- `user`: One-to-one with User (if claimed)
- `inbox`: One-to-one with CandidateInbox
- `policyPositions`: One-to-many with PolicyPosition
- `financialData`: One-to-one with FinancialData
- `verificationDocuments`: One-to-many with CandidateVerificationDocument
- `politicalInquiries`: One-to-many with PoliticalInquiry (citizen questions)
- `publicQAs`: One-to-many with PublicQA (published Q&A)

**Business Logic:**
- External candidates auto-created from Google Civic Info API
- Candidates can claim profiles by verifying identity
- Verification requires government ID and proof of candidacy
- Status changes tracked with audit trail
- Suspended candidates cannot access inbox or post content
- Withdrawn candidates archived but preserved for historical data

---

### FeedFilter Model

```prisma
model FeedFilter {
  id                String              @id @default(uuid())
  userId            String
  name              String
  filterType        FilterType          @default(CUSTOM)

  // Feed Source
  feedSource        FeedSource          @default(DISCOVER)

  // Content Filters
  isPolitical       Boolean?
  tags              String[]            @default([])

  // Geographic Filters
  geographicScope   GeographicScope?
  h3Resolution      Int?
  centerLat         Float?
  centerLng         Float?
  radiusMiles       Float?

  // Author Filters
  authorTypes       PoliticalProfileType[] @default([])
  authorIds         String[]            @default([])
  excludeAuthorIds  String[]            @default([])

  // Topic & Category Filters
  topicIds          String[]            @default([])
  categories        IssueCategory[]     @default([])

  // Engagement Filters
  minLikes          Int?
  minComments       Int?
  minShares         Int?

  // Time Filters
  timeframe         FilterTimeframe     @default(ALL_TIME)
  customStartDate   DateTime?
  customEndDate     DateTime?

  // Sort & Display
  sortBy            FilterSortBy        @default(RELEVANCE)
  sortOrder         SortOrder           @default(DESC)

  // User Preferences
  isDefault         Boolean             @default(false)
  isPinned          Boolean             @default(false)
  displayOrder      Int                 @default(0)

  // Metadata
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  lastUsedAt        DateTime?
  useCount          Int                 @default(0)

  // Relations
  user              User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, name])
  @@index([userId, isPinned])
  @@index([userId, isDefault])
  @@index([userId, lastUsedAt])
}
```

**Fields:**
- `id` (String, UUID): Primary key
- `userId` (String, FK): Owner of the filter
- `name` (String): User-defined filter name (e.g., "Local Politics")
- `filterType` (Enum): QUICK_FILTER, CUSTOM, SMART (AI-suggested)
- `feedSource` (Enum): DISCOVER, FOLLOWING, SAVED, COMBINED
- `isPolitical` (Boolean, optional): null = both, true = political only, false = non-political only
- `tags` (String[]): Filter by specific tags
- `geographicScope` (Enum): LOCAL, COUNTY, STATE, NATIONAL, REGIONAL
- `h3Resolution` (Int, optional): H3 resolution level for proximity (7-15)
- `centerLat`, `centerLng` (Float, optional): Custom geographic center point
- `radiusMiles` (Float, optional): Proximity radius in miles
- `authorTypes` (Enum[]): Filter by author type (CITIZEN, CANDIDATE, ELECTED_OFFICIAL)
- `authorIds` (String[]): Specific users to include
- `excludeAuthorIds` (String[]): Specific users to exclude
- `topicIds` (String[]): Filter by political topics
- `categories` (Enum[]): Issue categories (HEALTHCARE, EDUCATION, etc.)
- `minLikes`, `minComments`, `minShares` (Int, optional): Engagement thresholds
- `timeframe` (Enum): LAST_HOUR, TODAY, THIS_WEEK, THIS_MONTH, THIS_YEAR, ALL_TIME, CUSTOM
- `sortBy` (Enum): RELEVANCE, RECENT, POPULAR, TRENDING, PROXIMITY
- `isDefault` (Boolean): User's default feed view
- `isPinned` (Boolean): Show in quick access bar
- `useCount` (Int): Usage tracking for analytics

**Relationships:**
- `user`: Many-to-one with User

**Indexes:**
- `userId, name`: Unique filter names per user
- `userId, isPinned`: Quick access filters
- `userId, isDefault`: Default filter lookup
- `userId, lastUsedAt`: Recently used filters

**Business Logic:**
- Each user can have one default filter (replaces global feed)
- Pinned filters show in quick access (max 5 recommended)
- Smart filters auto-created based on user behavior (AI-suggested)
- Geographic filters use H3 hexagon resolution for privacy
- Engagement filters help surface high-quality content
- Filters saved and reusable across sessions

---

### ElectoralDistrict Model

```prisma
model ElectoralDistrict {
  id                String                   @id @default(cuid())
  name              String
  type              DistrictType
  level             DistrictLevel
  identifier        String
  state             String                   @db.Char(2)
  county            String?
  municipality      String?
  coordinates       Json?
  population        Int?
  isActive          Boolean                  @default(true)
  verificationLevel VerificationLevel        @default(UNVERIFIED)
  submittedBy       String?
  verifiedBy        String?
  verifiedAt        DateTime?
  conflictCount     Int                      @default(0)
  externalId        String?
  dataSource        String?
  parentDistrict    String?
  createdAt         DateTime                 @default(now())
  updatedAt         DateTime                 @updatedAt

  addressMappings   AddressDistrictMapping[]
  conflicts         DistrictConflict[]
  offices           DistrictOffice[]
  parent            ElectoralDistrict?       @relation("DistrictHierarchy", fields: [parentDistrict], references: [id])
  children          ElectoralDistrict[]      @relation("DistrictHierarchy")
  submitter         User?                    @relation("DistrictSubmissions", fields: [submittedBy], references: [id])
  verifier          User?                    @relation("DistrictVerifications", fields: [verifiedBy], references: [id])

  @@unique([identifier, state, type])
  @@index([state, type, level])
  @@index([verificationLevel])
  @@index([isActive, type])
}
```

**Fields:**
- `id` (String, UUID): Primary key
- `name` (String): District name (e.g., "California's 12th Congressional District")
- `type` (Enum): CONGRESSIONAL, STATE_SENATE, STATE_HOUSE, COUNTY, MUNICIPAL, SCHOOL, WATER, FIRE, etc.
- `level` (Enum): FEDERAL, STATE, COUNTY, MUNICIPAL, SPECIAL, LOCAL
- `identifier` (String): Unique identifier within state (e.g., "CA-12")
- `state` (String, Char(2)): Two-letter state code
- `coordinates` (Json): GeoJSON boundary polygon
- `verificationLevel` (Enum): UNVERIFIED, COMMUNITY_VERIFIED, MODERATOR_VERIFIED, OFFICIAL_VERIFIED, DISPUTED
- `parentDistrict` (String, FK, optional): Hierarchical parent (e.g., state senate district contains state house districts)

**Relationships:**
- `addressMappings`: One-to-many with AddressDistrictMapping
- `offices`: One-to-many with DistrictOffice
- `conflicts`: One-to-many with DistrictConflict
- `parent`, `children`: Self-referential hierarchy
- `submitter`, `verifier`: Many-to-one with User

**Indexes:**
- `identifier, state, type`: Unique constraint
- `state, type, level`: District queries
- `verificationLevel`: Trust filtering

**Business Logic:**
- Crowdsourced district data with verification levels
- Hierarchical structure (federal → state → county → municipal)
- Boundaries stored as GeoJSON for mapping
- Conflicts flagged and resolved by moderators
- Address-to-district mapping via geocoding + H3 indexing

---

### Payment Model

```prisma
model Payment {
  id                      String                 @id @default(cuid())
  userId                  String
  amount                  Int
  currency                String                 @default("USD")
  type                    PaymentType
  status                  PaymentStatus          @default(PENDING)
  stripePaymentIntentId   String?                @unique
  stripeChargeId          String?                @unique
  stripeCustomerId        String?
  paymentMethodType       String?
  taxDeductible           Boolean                @default(false)
  taxYear                 Int?
  description             String?
  metadata                Json?
  failureReason           String?
  feeType                 FeeType?
  candidateRegistrationId String?                @unique
  donationType            DonationType?
  campaignId              String?
  isRecurring             Boolean                @default(false)
  recurringInterval       RecurringInterval?
  receiptUrl              String?
  receiptNumber           String?                @unique
  receiptSent             Boolean                @default(false)
  receiptSentAt           DateTime?
  createdAt               DateTime               @default(now())
  updatedAt               DateTime               @updatedAt
  processedAt             DateTime?
  refundedAt              DateTime?

  candidateRegistration   CandidateRegistration? @relation(fields: [candidateRegistrationId], references: [id])
  user                    User                   @relation(fields: [userId], references: [id])
  refunds                 Refund[]

  @@index([userId])
  @@index([status])
  @@index([type])
  @@index([stripeCustomerId])
  @@index([createdAt])
}
```

**Fields:**
- `id` (String, UUID): Primary key
- `userId` (String, FK): User making the payment
- `amount` (Int): Amount in cents (USD)
- `type` (Enum): DONATION, FEE
- `status` (Enum): PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED, PARTIAL_REFUNDED
- `stripePaymentIntentId` (String, unique): Stripe Payment Intent ID
- `stripeChargeId` (String, unique): Stripe Charge ID
- `taxDeductible` (Boolean): Eligible for tax deduction
- `feeType` (Enum): CANDIDATE_REGISTRATION, VERIFICATION_FEE, PREMIUM_FEATURES, EVENT_HOSTING, ADVERTISING
- `donationType` (Enum): ONE_TIME, RECURRING, CAMPAIGN_SPECIFIC, GENERAL_SUPPORT
- `receiptNumber` (String, unique): Auto-generated receipt number
- `receiptUrl` (String): PDF receipt URL

**Relationships:**
- `user`: Many-to-one with User
- `candidateRegistration`: One-to-one with CandidateRegistration (for registration fees)
- `refunds`: One-to-many with Refund

**Indexes:**
- `userId`: User's payment history
- `status`: Payment status queries
- `type`: Donations vs fees
- `stripeCustomerId`: Stripe customer lookups
- `createdAt`: Recent payments

**Business Logic:**
- All payments processed through Stripe
- Candidate registration fees: $50-$500 based on office level
- Fee waivers available for financial hardship
- Recurring donations processed monthly/quarterly/yearly
- Tax-deductible donations generate IRS-compliant receipts
- Refunds processed for rejected registrations or user requests

---

### Report Model

```prisma
model Report {
  id                String            @id @default(cuid())
  reporterId        String
  targetType        ReportTargetType
  targetId          String
  reason            ReportReason
  description       String?
  status            ReportStatus      @default(PENDING)
  priority          ReportPriority    @default(LOW)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  moderatedAt       DateTime?
  moderatorId       String?
  moderatorNotes    String?
  actionTaken       ModerationAction?
  reporterDistrict  String?
  candidateDistrict String?
  geographicWeight  Float?            @default(1.0)
  aiAssessmentScore Float?
  aiUrgencyLevel    String?
  aiAnalysisNotes   String?
  aiAssessedAt      DateTime?

  moderator         User?             @relation("ModeratedReports", fields: [moderatorId], references: [id])
  reporter          User              @relation("UserReports", fields: [reporterId], references: [id], onDelete: Cascade)

  @@index([reporterId])
  @@index([targetType, targetId])
  @@index([status, priority])
  @@index([createdAt])
}
```

**Fields:**
- `id` (String, UUID): Primary key
- `reporterId` (String, FK): User submitting the report
- `targetType` (Enum): POST, COMMENT, USER, MESSAGE, CANDIDATE
- `targetId` (String): ID of reported content/user
- `reason` (Enum): SPAM, HARASSMENT, HATE_SPEECH, MISINFORMATION, FRAUDULENT_CANDIDACY, etc.
- `status` (Enum): PENDING, IN_REVIEW, RESOLVED, DISMISSED
- `priority` (Enum): LOW, MEDIUM, HIGH, URGENT
- `actionTaken` (Enum): NO_ACTION, WARNING_ISSUED, CONTENT_HIDDEN, CONTENT_DELETED, USER_SUSPENDED, USER_BANNED
- `aiAssessmentScore` (Float): AI-generated urgency score (0-1)
- `aiUrgencyLevel` (String): low, medium, high, urgent
- `geographicWeight` (Float): Boost priority for local reports (e.g., constituent reporting their representative)

**Relationships:**
- `reporter`: Many-to-one with User
- `moderator`: Many-to-one with User (who resolved the report)

**Indexes:**
- `reporterId`: User's report history
- `targetType, targetId`: Reports on specific content
- `status, priority`: Moderation queue
- `createdAt`: Recent reports

**Business Logic:**
- AI pre-assessment prioritizes reports (Azure OpenAI analysis)
- Geographic weighting boosts local reports (constituents reporting officials)
- Multiple reports on same content automatically escalate priority
- Moderators can bulk-resolve duplicate reports
- Action taken logged in ModerationLog for audit trail

---

## Critical Models Deep-Dive

### Quest System

The quest system gamifies civic engagement through daily, weekly, and monthly challenges.

**Quest Types:**
- `DAILY_HABIT`: Simple daily actions (e.g., "Post about a local issue")
- `DAILY_CIVIC`: Civic-specific daily quests (e.g., "Contact your representative")
- `WEEKLY_ENGAGEMENT`: Week-long challenges (e.g., "Comment on 5 political posts")
- `MONTHLY_CONSISTENCY`: Month-long consistency challenges
- `SPECIAL_EVENT`: Limited-time event quests
- `CIVIC_ACTION`: Real-world civic actions (e.g., "Attend a town hall")
- `EDUCATIONAL`: Learning quests (e.g., "Read 3 policy positions")
- `SOCIAL_ENGAGEMENT`: Social networking quests (e.g., "Follow 5 candidates")

**Quest Categories:**
- `INFORMATION`: Information-seeking behaviors
- `PARTICIPATION`: Active participation
- `COMMUNITY`: Community building
- `ADVOCACY`: Advocacy actions
- `EDUCATION`: Educational activities
- `SOCIAL`: Social networking

**Implementation Details:**
- Quest requirements stored in flexible JSON structure
- Progress tracked per user with JSON state object
- Streaks tracked separately (daily/weekly)
- Quest completion triggers badge evaluation
- Daily quests reset at midnight user's timezone
- Weekly quests reset Monday 00:00 UTC

**Example Daily Quest:**
```json
{
  "id": "cuid123",
  "type": "DAILY_CIVIC",
  "category": "PARTICIPATION",
  "title": "Share Your Voice",
  "description": "Create a post about a political issue that matters to you.",
  "requirements": {
    "action": "create_post",
    "count": 1,
    "isPolitical": true,
    "minLength": 50
  },
  "rewards": {
    "reputationPoints": 10,
    "badges": ["daily_civic_poster"],
    "streakBonus": true
  },
  "timeframe": "DAILY"
}
```

---

### Badge System

Badges recognize user achievements and civic engagement milestones.

**Badge Types:**
- **Streak Badges**: 7-day, 30-day, 100-day streaks
- **Contribution Badges**: Post count, comment count milestones
- **Civic Badges**: Voter registration, contacting officials
- **Social Badges**: Follower count, endorsement count
- **Quality Badges**: High reputation, helpful content
- **Event Badges**: Town hall attendance, rally participation
- **Exclusive Badges**: Limited quantity or admin-awarded

**Auto-Award vs Manual:**
- `isAutoAwarded: true` - System automatically awards when criteria met
- `isAutoAwarded: false` - Admin manual award only (special recognition)

**Qualification Criteria Examples:**

**Streak Badge:**
```json
{
  "type": "quest_streak",
  "streak": 7,
  "streakType": "daily"
}
```

**Contribution Badge:**
```json
{
  "type": "content_count",
  "contentType": "post",
  "count": 100,
  "isPolitical": true
}
```

**Civic Action Badge:**
```json
{
  "type": "civic_action",
  "action": "contact_official",
  "count": 5
}
```

**Exclusive Badge (Limited Supply):**
```json
{
  "type": "special_event",
  "eventId": "inauguration_2025",
  "maxAwards": 1000
}
```

**Display Behavior:**
- Users can select up to 5 badges to display on profile
- Display order customizable by user
- Badges shown in user cards, comments, posts
- Rare badges highlighted with special styling

---

### Photo Upload & Moderation System

The photo system handles image uploads with automated content moderation.

**Upload Pipeline:**
1. Client uploads to backend `/api/photos/upload`
2. Backend validates file type, size (max 10MB)
3. Image processed: resize, compress, optimize
4. EXIF metadata stripped (privacy protection)
5. Thumbnail generated (300x300)
6. Upload to Azure Blob Storage
7. Azure Content Safety API moderation
8. Database record created with moderation status

**Content Moderation:**
- **Azure Content Safety API** analyzes images
- **Moderation Statuses:**
  - `APPROVE`: Clean content, visible to all
  - `WARN`: Sensitive content (violence, gore), shown with warning
  - `BLOCK`: Prohibited content (nudity, hate symbols), hidden

**Privacy Protection:**
- EXIF data stripped (GPS coordinates, camera model, timestamps)
- Original high-resolution images stored separately
- Public URLs serve compressed versions
- Thumbnails used in feeds for performance

**Photo Types:**
- `AVATAR`: Profile pictures
- `GALLERY`: User photo galleries
- `POST_MEDIA`: Post attachments

**Storage Structure:**
```
Azure Blob Container: photos
├── avatars/
│   └── {userId}/{photoId}.jpg
├── post-media/
│   └── {userId}/{photoId}.jpg
├── thumbnails/
│   └── {photoId}_thumb.jpg
└── galleries/
    └── {userId}/{galleryName}/{photoId}.jpg
```

---

### Feed Filter System

The feed filter system enables users to customize their content feed with advanced filtering options.

**Filter Types:**
- `QUICK_FILTER`: Pre-defined system filters (Today, This Week, Trending)
- `CUSTOM`: User-created custom filters
- `SMART`: AI-suggested filters based on user behavior

**Feed Sources:**
- `DISCOVER`: Global discover feed (all public posts)
- `FOLLOWING`: Following feed only (users you follow)
- `SAVED`: Saved posts only
- `COMBINED`: Mix of multiple sources

**Geographic Filtering:**
- H3 hexagon-based proximity (privacy-preserving)
- `geographicScope`: LOCAL (10mi), COUNTY, STATE, NATIONAL, REGIONAL
- `h3Resolution`: 7 (city-level) to 15 (building-level)
- Custom center point + radius in miles
- Privacy displacement prevents exact location tracking

**Author Filtering:**
- `authorTypes`: Filter by CITIZEN, CANDIDATE, ELECTED_OFFICIAL
- `authorIds`: Include specific users
- `excludeAuthorIds`: Exclude specific users (mute)

**Engagement Filtering:**
- `minLikes`, `minComments`, `minShares`: Quality thresholds
- Surfaces high-quality, well-engaged content

**Time Filtering:**
- `LAST_HOUR`, `TODAY`, `THIS_WEEK`, `THIS_MONTH`, `THIS_YEAR`, `ALL_TIME`
- `CUSTOM`: Custom date range

**Sorting Options:**
- `RELEVANCE`: Algorithmic relevance (embedding similarity)
- `RECENT`: Chronological (newest first)
- `POPULAR`: Most engagement (likes + comments + shares)
- `TRENDING`: Trending score (engagement velocity)
- `PROXIMITY`: Closest geographically

**Example Filter: "Local Politics"**
```json
{
  "name": "Local Politics",
  "filterType": "CUSTOM",
  "feedSource": "DISCOVER",
  "isPolitical": true,
  "geographicScope": "LOCAL",
  "radiusMiles": 25,
  "authorTypes": ["CANDIDATE", "ELECTED_OFFICIAL", "CITIZEN"],
  "categories": ["INFRASTRUCTURE", "PUBLIC_SAFETY", "HOUSING"],
  "timeframe": "THIS_WEEK",
  "sortBy": "TRENDING",
  "isPinned": true
}
```

---

### Post Edit History System

Posts maintain complete edit history to prevent abuse and ensure transparency.

**Edit Tracking:**
- `editCount` (Int): Number of edits
- `lastEditedAt` (DateTime): Timestamp of last edit
- `editHistory` (Json): Complete edit history
- `originalContent` (String): Original post content

**Edit History JSON Structure:**
```json
{
  "edits": [
    {
      "timestamp": "2025-10-09T14:30:00Z",
      "content": "This is the edited content.",
      "reason": "Fixed typo"
    },
    {
      "timestamp": "2025-10-09T15:45:00Z",
      "content": "This is the second edit.",
      "reason": "Added more context"
    }
  ],
  "original": "This is the original content."
}
```

**Business Rules:**
- Max 10 edits per post (prevents abuse)
- Edits within 5 minutes don't increment edit count (grace period)
- Original content preserved forever
- Edit history visible to post author and moderators
- Public "Edited" indicator shown if editCount > 0

---

## Model Relationships Diagram

```
User
├── Posts (1:N)
│   ├── Comments (1:N)
│   │   └── Reactions (1:N)
│   ├── Likes (1:N)
│   ├── Reactions (1:N)
│   ├── Shares (1:N)
│   ├── Photos (1:N)
│   └── SavedPost (1:N)
├── Follow (1:N as follower)
├── Follow (1:N as following)
├── Friendship (1:N as requester)
├── Friendship (1:N as recipient)
├── Candidate (1:1)
│   ├── CandidateInbox (1:1)
│   ├── PolicyPosition (1:N)
│   ├── FinancialData (1:1)
│   ├── PoliticalInquiry (1:N)
│   │   └── InquiryResponse (1:N)
│   └── PublicQA (1:N)
├── UserQuestProgress (1:N)
│   └── Quest (N:1)
├── UserBadge (1:N)
│   └── Badge (N:1)
├── Photos (1:N)
├── FeedFilter (1:N)
├── Payment (1:N)
│   └── Refund (1:N)
└── SecurityEvent (1:N)

Election
├── Office (1:N)
│   └── Candidate (1:N)
└── BallotMeasure (1:N)

ElectoralDistrict
├── DistrictOffice (1:N)
│   └── CrowdsourcedOfficial (1:N)
├── AddressDistrictMapping (1:N)
└── DistrictConflict (1:N)

Legislature
├── Bill (1:N)
│   ├── BillSponsorship (1:N)
│   └── Vote (1:N)
│       └── LegislatorVote (1:N)
└── LegislativeMembership (1:N)

Topic
├── SubTopic (1:N)
├── TopicPost (N:M with Post)
└── TopicComment (1:N)

Conversation
├── ConversationParticipant (1:N)
└── Message (1:N)
```

---

## Migrations Reference

### Recent Migrations (2025)

**`20251008_add_feed_filter_system`** - Feed customization
- Added `FeedFilter` model
- Enums: FilterType, FeedSource, FilterTimeframe, FilterSortBy, SortOrder
- Enables user-defined feed customization with geographic, content, and engagement filters

**`20251007_add_saved_posts`** - Saved posts feature
- Added `SavedPost` model
- Enables users to bookmark posts for later viewing
- Indexed on userId, postId, savedAt

**`20251003_add_photo_quest_badge_tables`** - Major gamification + photo system
- Added `Photo` model with Azure Content Safety moderation
- Added `Quest`, `UserQuestProgress`, `UserQuestStreak` models
- Added `Badge`, `UserBadge` models
- Comprehensive civic engagement gamification system

**`20251002_nuclear_photo_removal`** - Photo system reset
- Removed deprecated photo-related fields from User model
- Preparation for new Photo model implementation

**`20250926_add_image_moderation_system`** - Content moderation
- Added Azure Content Safety API integration
- Moderation status tracking on images

**`20250922_add_post_geographic_fields`** - Geographic privacy
- Added H3 geospatial indexing to Post model
- Privacy-preserving location features with displacement
- Fields: h3Index, latitude, longitude, originalH3Index, privacyDisplaced

**`20250809234855_add_device_fingerprint_antibot`** - Security
- Added device fingerprinting to User model
- Anti-bot and fraud prevention measures

**`20250809004127_initial`** - Initial schema
- Complete database schema bootstrap
- All 94 models, relationships, indexes

---

## Database Best Practices

### Soft Deletes
Many models use soft deletes to preserve data for moderation and audit purposes:
- `Post`: `isDeleted`, `deletedAt`, `deletedReason`
- `Comment`: `isDeleted`, `deletedAt`
- `Photo`: `isActive`, `deletedAt`
- `Candidate`: `isWithdrawn`, `withdrawnAt`, `withdrawnReason`

**Why Soft Deletes:**
- Preserve evidence for moderation reviews
- Enable undelete functionality
- Maintain referential integrity
- Audit trail for compliance

### Timestamp Tracking
All models include:
- `createdAt` (DateTime): Record creation timestamp
- `updatedAt` (DateTime): Last modification timestamp (auto-updated by Prisma)

### Status Enums for State Machines
Models with lifecycle states use enums:
- `Payment.status`: PENDING → PROCESSING → COMPLETED/FAILED
- `Report.status`: PENDING → IN_REVIEW → RESOLVED/DISMISSED
- `Candidate.status`: ACTIVE → SUSPENDED/ENDED/REVOKED/BANNED
- `PetitionStatus`: ACTIVE → COMPLETED/EXPIRED/CLOSED

**Benefits:**
- Type safety (invalid states prevented at compile time)
- Clear state transitions
- Database-level constraints

### JSON Fields for Flexible Data
JSON fields used for:
- `Quest.requirements`: Flexible quest criteria
- `Badge.qualificationCriteria`: Dynamic badge requirements
- `Post.editHistory`: Complete edit audit trail
- `User.profilePrivacySettings`: Granular privacy controls
- `Policy.evidenceLinks`: Dynamic evidence collection

**When to Use JSON:**
- Schema varies per record (quest requirements differ)
- Frequent schema changes (avoid migrations for config)
- Complex nested structures
- Performance not critical for field access

### Float Arrays for AI Embeddings
Vector embeddings stored as `Float[]`:
- `User.embedding`: User profile semantic embedding
- `Post.embedding`: Post content embedding
- `Candidate.embedding`: Policy position embedding
- `Topic.embedding`: Topic description embedding

**Use Cases:**
- Semantic search (find similar content)
- Recommendation systems (suggest related content)
- AI-powered matching (candidate-voter alignment)

**Note:** Future migration to pgvector extension planned for production-scale vector search.

---

## Performance Considerations

### Indexing Strategy

**Single-Column Indexes:**
- Primary keys (automatic)
- Foreign keys (automatic)
- Unique constraints (`email`, `username`)
- High-cardinality fields (`createdAt`, `h3Index`)

**Composite Indexes:**
- `Post`: `[h3Index, createdAt]` - Geographic + temporal queries
- `Friendship`: `[requesterId, recipientId]` - Prevent duplicate friend requests
- `Follow`: `[followerId, followingId]` - Prevent duplicate follows
- `Report`: `[status, priority]` - Moderation queue sorting
- `FeedFilter`: `[userId, isPinned]` - Quick access filters

**H3 Geospatial Indexes:**
- `User.h3Index`: User location proximity
- `Post.h3Index`: Post location proximity
- `ExternalOfficial.h3Index`: Official district lookup
- `AddressDistrictMapping.h3Index`: Address geocoding

**Index Usage Patterns:**
```sql
-- Efficient: Uses h3Index + createdAt composite index
SELECT * FROM "Post"
WHERE h3Index = '8428309ffffffff'
ORDER BY createdAt DESC
LIMIT 20;

-- Inefficient: Requires full table scan
SELECT * FROM "Post"
WHERE LOWER(content) LIKE '%politics%'
ORDER BY createdAt DESC;
```

### Cached Counts
Engagement metrics cached on models to avoid expensive COUNT queries:
- `Post`: likesCount, commentsCount, sharesCount, viewsCount
- `User`: followingCount, followersCount
- `Topic`: postCount, participantCount, viewCount
- `CivicEvent`: currentRSVPs

**Update Strategy:**
- Updated transactionally with engagement actions
- Periodic reconciliation jobs verify accuracy
- Prevents N+1 queries in feed rendering

### Pagination Strategy
Large result sets use cursor-based pagination:
```typescript
// Cursor pagination (efficient)
const posts = await prisma.post.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastPostId },
  orderBy: { createdAt: 'desc' }
});

// Offset pagination (inefficient for large offsets)
const posts = await prisma.post.findMany({
  take: 20,
  skip: 1000, // Slow for large offsets
  orderBy: { createdAt: 'desc' }
});
```

### N+1 Query Prevention
Use Prisma `include` and `select` to eager load relationships:
```typescript
// Efficient: Single query with join
const posts = await prisma.post.findMany({
  include: {
    author: { select: { username: true, avatar: true } },
    photos: true,
  }
});

// Inefficient: N+1 queries (1 for posts + N for authors)
const posts = await prisma.post.findMany();
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } });
}
```

---

## Security Considerations

### Input Validation
All external input validated before database operations:
- Email format validation (RFC 5322)
- Username alphanumeric + underscores only
- Content length limits (Post max 5000 chars, Comment max 2000 chars)
- File upload MIME type validation
- Enum value validation (Prisma automatic)

### SQL Injection Prevention
Prisma ORM provides parameterized queries by default:
```typescript
// Safe: Prisma parameterizes automatically
const user = await prisma.user.findUnique({
  where: { email: userProvidedEmail }
});

// Unsafe: Raw SQL (only use with extreme caution)
const users = await prisma.$queryRaw`
  SELECT * FROM "User" WHERE email = ${userProvidedEmail}
`;
```

### Privacy Protection
Geographic privacy via H3 displacement:
- `Post.h3Index`: Privacy-displaced location (~1km displacement)
- `Post.originalH3Index`: Actual location (private, admin-only)
- `Post.privacyDisplaced`: Flag indicating displacement applied

EXIF stripping from photos:
- GPS coordinates removed
- Camera model removed
- Timestamp preserved (but controlled)

Privacy settings:
- `User.profilePrivacySettings`: Field-level privacy controls
- `User.photoTaggingEnabled`: Photo tagging preferences
- `User.requireTagApproval`: Photo tag approval workflow

### Authentication & Authorization
User roles and permissions:
- `User.isAdmin`: Admin panel access
- `User.isSuperAdmin`: Full system access
- `User.isModerator`: Moderation tools access
- `User.isSuspended`: Account suspension flag

Two-factor authentication:
- `User.totpSecret`: TOTP secret key (encrypted at rest)
- `User.totpBackupCodes`: Recovery codes (hashed)
- `User.totpEnabled`: 2FA status

### Rate Limiting & Anti-Abuse
Security event tracking:
- `SecurityEvent`: Login attempts, password changes, suspicious activity
- `User.riskScore`: Cumulative risk score (0-100)
- `User.loginAttempts`: Failed login counter
- `User.lockedUntil`: Account lockout expiration

Content flags:
- `ContentFlag`: Automated content flagging
- `Report`: User-reported content
- AI-powered moderation prioritization

---

## Appendix: Complete Enum Reference

### User & Authentication Enums
- `PoliticalProfileType`: CITIZEN, CANDIDATE, ELECTED_OFFICIAL, POLITICAL_ORG
- `VerificationStatus`: PENDING, APPROVED, DENIED, NOT_REQUIRED
- `OAuthProvider`: GOOGLE, MICROSOFT, APPLE
- `ActivityType`: POST_CREATED, POST_EDITED, POST_DELETED, COMMENT_CREATED, etc.

### Content & Engagement Enums
- `ReactionSentiment`: LIKE, DISLIKE
- `ReactionStance`: AGREE, DISAGREE
- `ShareType`: SIMPLE, QUOTE
- `NotificationType`: LIKE, COMMENT, FOLLOW, MENTION, VERIFICATION_APPROVED, etc.

### Social Relationship Enums
- `FriendshipStatus`: PENDING, ACCEPTED, REJECTED, BLOCKED

### Electoral & Political Enums
- `ElectionType`: PRIMARY, GENERAL, SPECIAL, LOCAL, RUNOFF
- `ElectionLevel`: FEDERAL, STATE, LOCAL, MUNICIPAL
- `OfficeLevel`: FEDERAL, STATE, LOCAL, MUNICIPAL
- `BallotMeasureType`: PROPOSITION, BOND_MEASURE, CONSTITUTIONAL_AMENDMENT, INITIATIVE, REFERENDUM
- `CandidateStatus`: ACTIVE, SUSPENDED, ENDED, REVOKED, BANNED, WITHDRAWN
- `CandidateRegistrationStatus`: PENDING_VERIFICATION, PENDING_PAYMENT, PENDING_APPROVAL, APPROVED, REJECTED, REFUNDED

### District & Geographic Enums
- `DistrictType`: CONGRESSIONAL, STATE_SENATE, STATE_HOUSE, COUNTY, MUNICIPAL, SCHOOL, WATER, FIRE, LIBRARY, HOSPITAL, TRANSIT, CONSERVATION, JUDICIAL, TOWNSHIP, PRECINCT, OTHER_SPECIAL
- `DistrictLevel`: FEDERAL, STATE, COUNTY, MUNICIPAL, SPECIAL, LOCAL
- `VerificationLevel`: UNVERIFIED, COMMUNITY_VERIFIED, MODERATOR_VERIFIED, OFFICIAL_VERIFIED, DISPUTED
- `ConflictType`: BOUNDARY_DISPUTE, OFFICE_HOLDER_DISPUTE, ELECTION_DATE_DISPUTE, CONTACT_INFO_DISPUTE, TERM_LENGTH_DISPUTE, DUPLICATE_ENTRY, OUTDATED_INFO
- `ConflictStatus`: OPEN, UNDER_REVIEW, RESOLVED, DISMISSED
- `ConflictPriority`: LOW, MEDIUM, HIGH, CRITICAL
- `GeographicScope`: LOCAL, COUNTY, STATE, NATIONAL, REGIONAL

### Legislative Enums
- `LegislatureLevel`: FEDERAL, STATE, LOCAL
- `Chamber`: HOUSE, SENATE, UNICAMERAL
- `VotePosition`: YEA, NAY, PRESENT, NOT_VOTING, ABSTAIN
- `BillStatus`: INTRODUCED, COMMITTEE, FLOOR_VOTE, PASSED_CHAMBER, SENT_TO_OTHER_CHAMBER, PASSED_BOTH, SENT_TO_EXECUTIVE, SIGNED, VETOED, BECAME_LAW, DIED

### Messaging Enums
- `MessageType`: TEXT, IMAGE, SYSTEM
- `UnifiedMessageType`: USER_USER, ADMIN_CANDIDATE, USER_CANDIDATE
- `AdminMessageType`: SUPPORT_REQUEST, STATUS_INQUIRY, TECHNICAL_ISSUE, POLICY_QUESTION, FEATURE_REQUEST, APPEAL_MESSAGE, GENERAL
- `AdminMessagePriority`: LOW, NORMAL, HIGH, URGENT

### Moderation Enums
- `ReportTargetType`: POST, COMMENT, USER, MESSAGE, CANDIDATE
- `ReportReason`: SPAM, HARASSMENT, HATE_SPEECH, MISINFORMATION, INAPPROPRIATE_CONTENT, FAKE_ACCOUNT, IMPERSONATION, COPYRIGHT_VIOLATION, VIOLENCE_THREATS, SELF_HARM, ILLEGAL_CONTENT, FRAUDULENT_CANDIDACY, EXTREMIST_POSITIONS, ELECTION_FRAUD, CAMPAIGN_VIOLATIONS, OTHER
- `ReportStatus`: PENDING, IN_REVIEW, RESOLVED, DISMISSED
- `ReportPriority`: LOW, MEDIUM, HIGH, URGENT
- `ModerationAction`: NO_ACTION, WARNING_ISSUED, CONTENT_HIDDEN, CONTENT_DELETED, USER_WARNED, USER_SUSPENDED, USER_BANNED, APPEAL_APPROVED, APPEAL_DENIED
- `ContentType`: POST, COMMENT, USER_PROFILE, MESSAGE, CANDIDATE
- `FlagType`: SPAM, TOXICITY, HATE_SPEECH, MISINFORMATION, INAPPROPRIATE_LANGUAGE, FAKE_ENGAGEMENT, DUPLICATE_CONTENT, SUSPICIOUS_ACTIVITY, POTENTIAL_BRIGADING
- `FlagSource`: AUTOMATED, USER_REPORT, MANUAL_REVIEW
- `WarningSeverity`: MINOR, MODERATE, MAJOR, FINAL
- `SuspensionType`: TEMPORARY, PERMANENT, POSTING_RESTRICTED, COMMENTING_RESTRICTED
- `AppealStatus`: PENDING, APPROVED, DENIED

### Campaign & Inquiry Enums
- `StaffRole`: CAMPAIGN_MANAGER, COMMUNICATIONS_DIRECTOR, POLICY_ADVISOR, VOLUNTEER_COORDINATOR, VOLUNTEER, INTERN
- `StaffPermission`: READ_INQUIRIES, RESPOND_INQUIRIES, ASSIGN_INQUIRIES, MANAGE_STAFF, MANAGE_SETTINGS, PUBLISH_QA, MODERATE_QA
- `InquiryCategory`: GENERAL, HEALTHCARE, EDUCATION, ECONOMY, ENVIRONMENT, IMMIGRATION, FOREIGN_POLICY, CRIMINAL_JUSTICE, INFRASTRUCTURE, HOUSING, LABOR, TECHNOLOGY, CIVIL_RIGHTS, BUDGET_TAXES, ENERGY, AGRICULTURE, VETERANS, SENIORS, YOUTH, FAMILY_VALUES, OTHER
- `InquiryPriority`: LOW, NORMAL, HIGH, URGENT
- `InquiryStatus`: OPEN, IN_PROGRESS, WAITING_FOR_CANDIDATE, RESOLVED, CLOSED, ARCHIVED
- `ResponseType`: DIRECT, PUBLIC_QA, POLICY_STATEMENT, REFERRAL
- `VoteType`: UPVOTE, DOWNVOTE, REPORT

### Payment Enums
- `PaymentType`: DONATION, FEE
- `PaymentStatus`: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED, PARTIAL_REFUNDED
- `FeeType`: CANDIDATE_REGISTRATION, VERIFICATION_FEE, PREMIUM_FEATURES, EVENT_HOSTING, ADVERTISING, OTHER
- `DonationType`: ONE_TIME, RECURRING, CAMPAIGN_SPECIFIC, GENERAL_SUPPORT, MEMORIAL, HONOR
- `RecurringInterval`: WEEKLY, MONTHLY, QUARTERLY, YEARLY
- `RefundReason`: DUPLICATE, FRAUDULENT, REQUESTED_BY_CUSTOMER, CAMPAIGN_CANCELLED, ERROR, OTHER
- `RefundStatus`: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED

### Civic Engagement Enums
- `PetitionType`: PETITION, REFERENDUM
- `PetitionStatus`: ACTIVE, COMPLETED, EXPIRED, CLOSED, UNDER_REVIEW
- `IssueCategory`: HEALTHCARE, EDUCATION, ENVIRONMENT, ECONOMY, INFRASTRUCTURE, PUBLIC_SAFETY, HOUSING, TRANSPORTATION, TECHNOLOGY, CIVIL_RIGHTS, IMMIGRATION, ENERGY, AGRICULTURE, VETERANS, SENIORS, YOUTH, LABOR, GOVERNMENT_REFORM, OTHER
- `EventType`: TOWN_HALL, CANDIDATE_FORUM, DEBATE, RALLY, PROTEST, MARCH, VOTER_REGISTRATION, ISSUE_FORUM, COMMUNITY_MEETING, WORKSHOP, EDUCATIONAL_SEMINAR, FUNDRAISER, VOLUNTEER_DRIVE, PETITION_DRIVE, PHONE_BANK, CANVASSING, OTHER
- `EventCategory`: ELECTORAL, CIVIC_ENGAGEMENT, ORGANIZING_ACTIVITIES, EDUCATIONAL, ADVOCACY, FUNDRAISING
- `EventStatus`: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, POSTPONED
- `RSVPStatus`: ATTENDING, MAYBE, NOT_ATTENDING

### Quest & Badge Enums
- `QuestType`: DAILY_HABIT, DAILY_CIVIC, WEEKLY_ENGAGEMENT, MONTHLY_CONSISTENCY, SPECIAL_EVENT, CIVIC_ACTION, EDUCATIONAL, SOCIAL_ENGAGEMENT
- `QuestCategory`: INFORMATION, PARTICIPATION, COMMUNITY, ADVOCACY, EDUCATION, SOCIAL
- `QuestTimeframe`: DAILY, WEEKLY, MONTHLY, ONGOING, LIMITED_TIME

### Feed Filter Enums
- `FilterType`: QUICK_FILTER, CUSTOM, SMART
- `FeedSource`: DISCOVER, FOLLOWING, SAVED, COMBINED
- `FilterTimeframe`: LAST_HOUR, TODAY, THIS_WEEK, THIS_MONTH, THIS_YEAR, ALL_TIME, CUSTOM
- `FilterSortBy`: RELEVANCE, RECENT, POPULAR, TRENDING, PROXIMITY
- `SortOrder`: ASC, DESC

### Policy Enums
- `PolicyStance`: SUPPORT, OPPOSE, NEUTRAL, CONDITIONAL
- `AgreementLevel`: AGREE, DISAGREE, PARTIAL, UNCLEAR

### News Enums
- `NewsSourceType`: NEWSPAPER, MAGAZINE, BLOG, PRESS_RELEASE, GOVERNMENT, SOCIAL_MEDIA, WIRE_SERVICE, BROADCAST
- `ArticleSentiment`: POSITIVE, NEGATIVE, NEUTRAL, MIXED

---

## Database Connection Details

**Production Database:**
- Host: `unitedwerise-db.postgres.database.azure.com`
- Database: `postgres`
- Schema: `public`
- Connection: `DATABASE_URL` environment variable
- SSL Mode: `require`

**Development Database:**
- Host: `unitedwerise-db-dev.postgres.database.azure.com`
- Database: `postgres`
- Schema: `public`
- Connection: `DATABASE_URL` environment variable
- SSL Mode: `require`

**Prisma Migration Commands:**
```bash
# Development: Create and apply migration
npx prisma migrate dev --name "description"

# Production: Apply pending migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Generate Prisma Client (after schema changes)
npx prisma generate

# Validate schema syntax
npx prisma validate
```

**Database Safety Protocol:**
Always verify correct database before migrations:
```bash
echo $DATABASE_URL | grep -o '@[^.]*'
# Must show: @unitedwerise-db-dev for safe development
```

---

## Conclusion

This database schema supports a comprehensive civic engagement platform with:
- **Social networking** (posts, comments, reactions, follows, friendships)
- **Electoral information** (candidates, elections, districts, officials)
- **Gamification** (quests, badges, streaks, reputation)
- **Payment processing** (donations, registration fees, refunds)
- **Content moderation** (AI-powered flags, reports, suspensions)
- **Privacy protection** (H3 geographic displacement, EXIF stripping)
- **Advanced filtering** (custom feeds, geographic proximity, engagement thresholds)

The schema is designed for scalability, maintainability, and extensibility with:
- Proper indexing for performance
- Soft deletes for audit trails
- Flexible JSON fields for dynamic data
- AI embeddings for semantic search
- Comprehensive enum types for type safety
- Relationship integrity via foreign keys

**Total Models**: 94
**Total Indexes**: 200+
**Total Enums**: 50+

For implementation details, see:
- `backend/prisma/schema.prisma` - Complete schema definition
- `backend/prisma/migrations/` - Migration history
- `docs/API_DOCUMENTATION.md` - API endpoint documentation
- `docs/SYSTEM-ARCHITECTURE-DESIGN.md` - System architecture overview

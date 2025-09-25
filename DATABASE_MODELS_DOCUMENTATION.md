# UnitedWeRise Database Models Documentation
**Last Updated:** September 25, 2025
**Schema Analysis:** Complete Prisma schema with 86+ models analyzed

## Executive Summary

This document provides comprehensive documentation for the 20 most critical undocumented database models in the UnitedWeRise platform. These models support core functionality including candidate management, payments, content moderation, civic engagement, and administrative operations.

**Schema Overview:**
- **Total Models**: 86+ database models
- **Critical Undocumented**: 20 high-impact models
- **Database Engine**: PostgreSQL with Prisma ORM
- **Environment**: Isolated dev/staging databases for safe development

## Critical Undocumented Models Analysis

### 1. CandidateInbox Model
**Purpose**: Manages candidate communication system and staff access control

```prisma
model CandidateInbox {
  id           String           @id @default(cuid())
  candidateId  String           @unique
  isActive     Boolean          @default(true)
  allowPublicQ Boolean          @default(true)
  autoResponse String?
  staffEmails  String[]         @default([])
  categories   String[]         @default([])
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  candidate    Candidate        @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  staffMembers CandidateStaff[]
}
```

**Business Logic:**
- **One-to-One**: Each Candidate has exactly one CandidateInbox
- **Staff Management**: Controls who can respond to public inquiries
- **Category System**: Organizes incoming inquiries by topic
- **Auto-Response**: Automated acknowledgment of received inquiries
- **Public Q&A Control**: Toggle for accepting public questions

**Key Relationships:**
- `candidateId` → `Candidate.id` (CASCADE DELETE - inbox deleted when candidate removed)
- `staffMembers` → `CandidateStaff[]` (manages who can access inbox)

**Performance Considerations:**
- Index on `candidateId` for fast candidate lookup
- `categories` array should use PostgreSQL array operations

**Data Flow:**
```
Public User → PoliticalInquiry → CandidateInbox → CandidateStaff → InquiryResponse → PublicQA
```

---

### 2. PaymentWebhook Model
**Purpose**: Tracks and processes Stripe webhook events for payment verification

```prisma
model PaymentWebhook {
  id            String    @id @default(cuid())
  stripeEventId String    @unique
  eventType     String
  processed     Boolean   @default(false)
  payload       Json
  error         String?
  createdAt     DateTime  @default(now())
  processedAt   DateTime?
}
```

**Business Logic:**
- **Idempotency**: `stripeEventId` unique constraint prevents duplicate processing
- **Event Types**: `payment_intent.succeeded`, `payment_intent.payment_failed`, etc.
- **Error Handling**: Tracks failed webhook processing attempts
- **Audit Trail**: Complete webhook payload stored for debugging

**Critical for:**
- **Payment Verification**: Ensuring all Stripe payments are properly recorded
- **Candidate Registration**: Processing registration fee payments
- **Donation Processing**: Handling nonprofit donation transactions
- **Refund Management**: Processing payment reversals

**Performance Considerations:**
- Index on `stripeEventId` for duplicate detection
- Index on `processed` for querying unprocessed events

**Webhook Processing Flow:**
```
Stripe → PaymentWebhook → Payment Model Update → CandidateRegistration Status → Email Notification
```

---

### 3. StripeCustomer Model
**Purpose**: Links UnitedWeRise users to Stripe customer records for payment management

```prisma
model StripeCustomer {
  id               String   @id @default(cuid())
  userId           String   @unique
  stripeCustomerId String   @unique
  email            String
  name             String?
  phone            String?
  address          Json?
  taxId            String?
  taxExempt        Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  user             User     @relation(fields: [userId], references: [id])
}
```

**Business Logic:**
- **One-to-One**: Each User can have one StripeCustomer record
- **Tax Management**: Stores tax ID and exemption status for nonprofit compliance
- **Address Storage**: JSON field for flexible address formats
- **Payment Methods**: Links to Stripe's payment method system

**Critical for:**
- **Recurring Donations**: Managing subscription-based donations
- **Tax Receipts**: Generating compliant donation receipts
- **Payment Method Management**: Storing cards, bank accounts
- **Compliance**: Meeting nonprofit financial regulations

**Data Integrity:**
- Both `userId` and `stripeCustomerId` have unique constraints
- Email field ensures communication capability

---

### 4. PublicQA Model
**Purpose**: Manages candidate public question-and-answer system with community voting

```prisma
model PublicQA {
  id              String            @id @default(cuid())
  candidateId     String
  question        String
  answer          String
  category        InquiryCategory   @default(GENERAL)
  isVisible       Boolean           @default(true)
  isPinned        Boolean           @default(false)
  upvotes         Int               @default(0)
  views           Int               @default(0)
  sourceInquiryId String?           @unique
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  candidate       Candidate         @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  sourceInquiry   PoliticalInquiry? @relation("PublicQASource", fields: [sourceInquiryId], references: [id])
  votes           PublicQAVote[]
}
```

**Business Logic:**
- **Community Engagement**: Users vote on most helpful Q&As
- **Content Moderation**: `isVisible` allows hiding inappropriate content
- **Prioritization**: `isPinned` highlights important responses
- **Traceability**: Optional link to original `PoliticalInquiry`

**Enum Values - InquiryCategory:**
```
GENERAL, HEALTHCARE, EDUCATION, ECONOMY, ENVIRONMENT, IMMIGRATION,
FOREIGN_POLICY, CRIMINAL_JUSTICE, INFRASTRUCTURE, HOUSING, LABOR,
TECHNOLOGY, CIVIL_RIGHTS, BUDGET_TAXES, ENERGY, AGRICULTURE,
VETERANS, SENIORS, YOUTH, FAMILY_VALUES, OTHER
```

**Performance Optimizations:**
- Index on `candidateId, isVisible` for public display queries
- Index on `isPinned, upvotes` for ranking algorithms
- Index on `category` for topic-based filtering

**Data Flow:**
```
PoliticalInquiry → InquiryResponse → PublicQA → PublicQAVote → Community Ranking
```

---

### 5. CandidateAdminMessage Model
**Purpose**: Manages communication between platform administrators and candidates

```prisma
model CandidateAdminMessage {
  id          String                  @id @default(cuid())
  candidateId String
  senderId    String?
  isFromAdmin Boolean                 @default(false)
  messageType AdminMessageType        @default(GENERAL)
  priority    AdminMessagePriority    @default(NORMAL)
  subject     String?
  content     String
  attachments String[]                @default([])
  isRead      Boolean                 @default(false)
  readAt      DateTime?
  readBy      String?
  threadId    String?
  replyToId   String?
  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @default(now()) @updatedAt
  candidate   Candidate               @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  readByUser  User?                   @relation("ReadAdminMessages", fields: [readBy], references: [id])
  replyTo     CandidateAdminMessage?  @relation("MessageReplies", fields: [replyToId], references: [id])
  replies     CandidateAdminMessage[] @relation("MessageReplies")
  sender      User?                   @relation("SentAdminMessages", fields: [senderId], references: [id])
}
```

**Enum Values:**
```
AdminMessageType: SUPPORT_REQUEST, STATUS_INQUIRY, TECHNICAL_ISSUE,
POLICY_QUESTION, FEATURE_REQUEST, APPEAL_MESSAGE, GENERAL

AdminMessagePriority: LOW, NORMAL, HIGH, URGENT
```

**Business Logic:**
- **Bidirectional Communication**: Both admins and candidates can send messages
- **Thread Support**: `replyToId` creates message threads
- **Priority System**: Urgent messages get administrative attention
- **Attachment Support**: File uploads for verification documents
- **Read Tracking**: Monitors message read status for follow-up

**Critical Use Cases:**
- **Verification Support**: Helping candidates with document verification
- **Appeal Communications**: Managing suspension/rejection appeals
- **Technical Support**: Resolving platform issues
- **Policy Clarification**: Explaining registration requirements

---

### 6. SecurityEvent Model
**Purpose**: Tracks security-related events for user accounts and platform monitoring

```prisma
model SecurityEvent {
  id        String   @id @default(cuid())
  userId    String?
  eventType String
  ipAddress String?
  userAgent String?
  details   Json?
  riskScore Int      @default(0)
  createdAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id])
}
```

**Business Logic:**
- **Event Types**: Login attempts, password changes, suspicious activity, TOTP usage
- **Risk Scoring**: Automated risk assessment (0-100 scale)
- **IP Tracking**: Geographic and historical IP analysis
- **Anonymous Events**: Some security events may not link to specific users

**Critical Security Events:**
- **Failed Login Attempts**: `FAILED_LOGIN` with attempt count
- **Password Changes**: `PASSWORD_CHANGED` with timestamp verification
- **TOTP Events**: `TOTP_ENABLED`, `TOTP_BACKUP_USED`, `TOTP_FAILED`
- **Suspicious Activity**: `MULTIPLE_IP_LOGIN`, `RAPID_ACTIONS`

**Performance Considerations:**
- Index on `userId` for user security history
- Index on `eventType` for security reporting
- Index on `riskScore` for high-risk event queries
- Time-based partitioning for large datasets

---

### 7. ReputationEvent Model
**Purpose**: Tracks reputation score changes and their underlying causes

```prisma
model ReputationEvent {
  id        String   @id @default(cuid())
  userId    String
  postId    String?
  eventType String
  impact    Float
  reason    String?
  details   Json?
  createdAt DateTime @default(now())
  post      Post?    @relation(fields: [postId], references: [id])
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Business Logic:**
- **Impact Calculation**: Positive/negative reputation changes
- **Event Types**: `POST_UPVOTED`, `POST_REPORTED`, `HELPFUL_RESPONSE`, `COMMUNITY_VIOLATION`
- **Transparency**: Users can see why their reputation changed
- **Post Attribution**: Links reputation changes to specific content

**Reputation Event Types:**
```
POSITIVE_IMPACT:
- POST_UPVOTED (+0.5 to +2.0)
- HELPFUL_QA_RESPONSE (+1.0 to +5.0)
- COMMUNITY_CONTRIBUTION (+0.5 to +3.0)

NEGATIVE_IMPACT:
- POST_REPORTED (-1.0 to -10.0)
- CONTENT_VIOLATION (-5.0 to -20.0)
- SPAM_DETECTION (-2.0 to -15.0)
```

**Data Flow:**
```
User Action → Content Analysis → ReputationEvent → User.reputationScore Update → User Privileges
```

---

### 8. FinancialData Model
**Purpose**: Stores candidate campaign finance information for transparency

```prisma
model FinancialData {
  id                  String    @id @default(cuid())
  candidateId         String    @unique
  totalRaised         Decimal   @default(0)
  totalSpent          Decimal   @default(0)
  cashOnHand          Decimal   @default(0)
  debts               Decimal   @default(0)
  individualDonations Decimal   @default(0)
  pacDonations        Decimal   @default(0)
  selfFunding         Decimal   @default(0)
  publicFunding       Decimal   @default(0)
  reportingPeriod     String?
  lastUpdated         DateTime  @default(now())
  sourceUrl           String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  candidate           Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
}
```

**Business Logic:**
- **Campaign Finance Transparency**: Required for election compliance
- **Data Sources**: FEC filings, state election boards, manual input
- **Reporting Periods**: Quarterly, pre-election, post-election reports
- **Financial Categories**: Breaks down funding sources per FEC requirements

**Critical Calculations:**
```
Cash on Hand = Total Raised - Total Spent - Debts
Total Raised = Individual + PAC + Self + Public Funding
Burn Rate = Total Spent / Days in Reporting Period
```

**Compliance Features:**
- **Decimal Precision**: Accurate to the cent for legal compliance
- **Source Documentation**: Links to official filing URLs
- **Historical Tracking**: `updatedAt` maintains change history

---

### 9. CandidateVerificationDocument Model
**Purpose**: Manages document uploads and verification for candidate registration

```prisma
model CandidateVerificationDocument {
  id                String    @id @default(cuid())
  candidateId       String
  documentType      String
  documentUrl       String
  documentName      String
  uploadedAt        DateTime  @default(now())
  verifiedAt        DateTime?
  verifiedBy        String?
  verificationNotes String?
  isValid           Boolean   @default(false)
  expiresAt         DateTime?
  requestedAt       DateTime?
  requestedBy       String?
  candidate         Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
}
```

**Document Types:**
```
IDENTITY_VERIFICATION:
- Driver's License
- Passport
- State ID

ELIGIBILITY_VERIFICATION:
- Proof of Residency
- Voter Registration
- Age Verification

CAMPAIGN_DOCUMENTATION:
- Statement of Candidacy
- Campaign Committee Registration
- Financial Disclosure Forms
```

**Verification Workflow:**
```
Document Upload → Admin Review → Verification Decision → Candidate Notification → Registration Status Update
```

**Security Features:**
- **Document Expiration**: Time-limited document validity
- **Verification Trail**: Tracks who verified and when
- **Status Tracking**: `isValid` boolean for quick filtering

---

### 10. MessageOfTheDay (MOTD) System Models
**Purpose**: Platform-wide announcement system with user tracking

```prisma
model MessageOfTheDay {
  id             String          @id @default(cuid())
  title          String?
  content        String
  isActive       Boolean         @default(false)
  startDate      DateTime?
  endDate        DateTime?
  showToNewUsers Boolean         @default(true)
  createdById    String
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  dismissals     MOTDDismissal[]
  views          MOTDView[]
  createdBy      User            @relation("CreatedMOTDs", fields: [createdById], references: [id])
}

model MOTDDismissal {
  id             String          @id @default(cuid())
  motdId         String
  userId         String?
  dismissalToken String?
  dismissedAt    DateTime        @default(now())
  motd           MessageOfTheDay @relation(fields: [motdId], references: [id], onDelete: Cascade)
  user           User?           @relation("DismissedMOTDs", fields: [userId], references: [id])
}

model MOTDView {
  id        String          @id @default(cuid())
  motdId    String
  userId    String?
  viewedAt  DateTime        @default(now())
  ipAddress String?
  userAgent String?
  motd      MessageOfTheDay @relation(fields: [motdId], references: [id], onDelete: Cascade)
  user      User?           @relation("ViewedMOTDs", fields: [userId], references: [id])
}
```

**Business Logic:**
- **Scheduled Messages**: `startDate`/`endDate` for time-based display
- **User Targeting**: `showToNewUsers` for onboarding messages
- **Dismissal Tracking**: Prevents showing dismissed messages
- **Anonymous Support**: Handles non-logged-in users via `dismissalToken`

**Use Cases:**
- **Platform Updates**: New feature announcements
- **Election Reminders**: Registration deadlines, voting dates
- **Maintenance Notices**: System downtime notifications
- **Emergency Alerts**: Critical platform issues

---

### 11. UserActivity Model
**Purpose**: Comprehensive user action tracking for analytics and content management

```prisma
model UserActivity {
  id           String       @id @default(cuid())
  userId       String
  activityType ActivityType
  targetType   String
  targetId     String
  metadata     Json?
  createdAt    DateTime     @default(now())
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**ActivityType Enum:**
```
POST_CREATED, POST_EDITED, POST_DELETED,
COMMENT_CREATED, COMMENT_EDITED, COMMENT_DELETED,
LIKE_ADDED, LIKE_REMOVED, REACTION_CHANGED,
SHARE_ADDED, SHARE_REMOVED, FOLLOW_ADDED, FOLLOW_REMOVED
```

**Data Analytics:**
- **User Engagement**: Track active user participation
- **Content Performance**: Popular posts, engagement rates
- **Platform Usage**: Feature adoption, user behavior patterns
- **Abuse Detection**: Unusual activity patterns

**Metadata Examples:**
```json
{
  "originalContent": "text before edit",
  "editReason": "typo correction",
  "moderationFlag": false,
  "geoLocation": "h3Index",
  "deviceType": "mobile"
}
```

---

### 12. ApiCache Model
**Purpose**: Caches external API responses to improve performance and reduce costs

```prisma
model ApiCache {
  id           String   @id @default(cuid())
  provider     String
  cacheKey     String
  responseData Json
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  hitCount     Int      @default(0)
}
```

**Supported Providers:**
- **Google Civic Information API**: Official information, election data
- **Ballotpedia API**: Candidate information, election details
- **FEC API**: Campaign finance data
- **Census API**: District boundary data
- **News APIs**: Article aggregation for official mentions

**Cache Strategies:**
- **TTL-based**: Automatic expiration via `expiresAt`
- **Hit Counting**: Track cache effectiveness via `hitCount`
- **Composite Keys**: `provider + cacheKey` for request identification

**Performance Benefits:**
- **API Rate Limiting**: Reduces external API calls
- **Cost Optimization**: Minimizes pay-per-request API costs
- **Improved Response Times**: Cached data serves faster

---

### 13. ExternalOfficial Model
**Purpose**: Stores information about elected officials from external data sources

```prisma
model ExternalOfficial {
  id          String   @id @default(cuid())
  externalId  String
  provider    String
  name        String
  office      String
  district    String?
  party       String?
  contactInfo Json?
  photoUrl    String?
  zipCode     String
  state       String
  h3Index     String?
  lastUpdated DateTime @default(now())
}
```

**Data Sources:**
- **Google Civic Information**: Federal and state officials
- **Ballotpedia**: Comprehensive political database
- **Vote Smart**: Congressional voting records
- **State Government APIs**: Local official information

**Business Logic:**
- **Geographic Indexing**: `h3Index` for location-based queries
- **Provider Deduplication**: `provider + externalId` prevents duplicates
- **Contact Information**: JSON storage for flexible contact data formats

**Integration Points:**
```
External API → ApiCache → ExternalOfficial → User Location → "My Representatives"
```

---

### 14. Content Moderation Models
**Purpose**: AI-powered and human content moderation system

```prisma
model ContentFlag {
  id          String      @id @default(cuid())
  contentType ContentType
  contentId   String
  flagType    FlagType
  confidence  Float
  source      FlagSource
  details     Json?
  resolved    Boolean     @default(false)
  resolvedBy  String?
  resolvedAt  DateTime?
  createdAt   DateTime    @default(now())
  resolver    User?       @relation("ResolvedFlags", fields: [resolvedBy], references: [id])
}

model ModerationLog {
  id          String           @id @default(cuid())
  moderatorId String
  targetType  ReportTargetType
  targetId    String
  action      ModerationAction
  reason      String
  notes       String?
  metadata    Json?
  createdAt   DateTime         @default(now())
  moderator   User             @relation("ModerationLogs", fields: [moderatorId], references: [id], onDelete: Cascade)
}
```

**FlagType Enum:**
```
SPAM, TOXICITY, HATE_SPEECH, MISINFORMATION,
INAPPROPRIATE_LANGUAGE, FAKE_ENGAGEMENT,
DUPLICATE_CONTENT, SUSPICIOUS_ACTIVITY,
POTENTIAL_BRIGADING
```

**ModerationAction Enum:**
```
NO_ACTION, WARNING_ISSUED, CONTENT_HIDDEN,
CONTENT_DELETED, USER_WARNED, USER_SUSPENDED,
USER_BANNED, APPEAL_APPROVED, APPEAL_DENIED
```

**AI Integration:**
- **Confidence Scoring**: 0.0-1.0 scale for AI predictions
- **Multi-model Analysis**: Toxicity, spam, misinformation detection
- **Human Review Queue**: Low-confidence flags require human review

---

### 15. User Warning and Suspension Models
**Purpose**: Progressive discipline system for community guidelines enforcement

```prisma
model UserWarning {
  id             String          @id @default(cuid())
  userId         String
  moderatorId    String
  reason         String
  severity       WarningSeverity
  notes          String?
  acknowledged   Boolean         @default(false)
  acknowledgedAt DateTime?
  expiresAt      DateTime?
  createdAt      DateTime        @default(now())
  moderator      User            @relation("IssuedWarnings", fields: [moderatorId], references: [id], onDelete: Cascade)
  user           User            @relation("ReceivedWarnings", fields: [userId], references: [id], onDelete: Cascade)
}

model UserSuspension {
  id          String         @id @default(cuid())
  userId      String
  moderatorId String
  reason      String
  type        SuspensionType
  startsAt    DateTime       @default(now())
  endsAt      DateTime?
  notes       String?
  appealed    Boolean        @default(false)
  appealedAt  DateTime?
  isActive    Boolean        @default(true)
  createdAt   DateTime       @default(now())
  appeal      Appeal?
  moderator   User           @relation("ModeratorSuspensions", fields: [moderatorId], references: [id], onDelete: Cascade)
  user        User           @relation("UserSuspensions", fields: [userId], references: [id], onDelete: Cascade)
}
```

**WarningSeverity:** `MINOR, MODERATE, MAJOR, FINAL`
**SuspensionType:** `TEMPORARY, PERMANENT, POSTING_RESTRICTED, COMMENTING_RESTRICTED`

**Progressive Discipline:**
```
1. MINOR Warning (expires in 30 days)
2. MODERATE Warning (expires in 60 days)
3. MAJOR Warning (expires in 90 days)
4. FINAL Warning (permanent record)
5. Temporary Suspension (1-30 days)
6. Permanent Suspension/Ban
```

---

### 16. Appeal Model
**Purpose**: Allows users to contest moderation decisions through formal appeal process

```prisma
model Appeal {
  id             String         @id @default(cuid())
  userId         String
  suspensionId   String         @unique
  reason         String
  additionalInfo String?
  status         AppealStatus   @default(PENDING)
  reviewNotes    String?
  reviewedBy     String?
  reviewedAt     DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  reviewedByUser User?          @relation("ReviewedAppeals", fields: [reviewedBy], references: [id])
  suspension     UserSuspension @relation(fields: [suspensionId], references: [id], onDelete: Cascade)
  user           User           @relation("UserAppeals", fields: [userId], references: [id], onDelete: Cascade)
}
```

**AppealStatus:** `PENDING, APPROVED, DENIED`

**Appeal Process:**
```
User Suspended → Appeal Filed → Admin Review → Decision → User Notified → Status Updated
```

**Transparency Features:**
- **Detailed Reasoning**: Users must explain why they believe suspension was incorrect
- **Additional Information**: Supporting evidence, context clarification
- **Review Notes**: Admin reasoning for appeal decision

---

### 17. Photo System Models
**Purpose**: Comprehensive photo management with tagging and privacy controls

```prisma
model Photo {
  id              String                @id @default(cuid())
  userId          String
  filename        String
  url             String
  thumbnailUrl    String?
  photoType       PhotoType
  purpose         PhotoPurpose          @default(PERSONAL)
  originalSize    Int
  compressedSize  Int
  width           Int
  height          Int
  mimeType        String
  isApproved      Boolean               @default(false)
  flaggedBy       String?
  flagReason      String?
  moderatedAt     DateTime?
  candidateId     String?
  isActive        Boolean               @default(true)
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
  caption         String?
  gallery         String?               @default("My Photos")
  postId          String?
  candidate       Candidate?            @relation(fields: [candidateId], references: [id])
  flaggedByUser   User?                 @relation("FlaggedPhotos", fields: [flaggedBy], references: [id])
  post            Post?                 @relation(fields: [postId], references: [id], onDelete: Cascade)
  user            User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  privacyRequests PhotoPrivacyRequest[]
  tags            PhotoTag[]
}

model PhotoTag {
  id         String         @id @default(cuid())
  photoId    String
  taggedById String
  taggedId   String
  x          Float
  y          Float
  status     PhotoTagStatus @default(PENDING)
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt
  photo      Photo          @relation(fields: [photoId], references: [id], onDelete: Cascade)
  taggedBy   User           @relation("PhotoTagsCreated", fields: [taggedById], references: [id])
  tagged     User           @relation("PhotoTagsReceived", fields: [taggedId], references: [id])
}

model PhotoPrivacyRequest {
  id        String                    @id @default(cuid())
  photoId   String
  userId    String
  type      PhotoPrivacyRequestType
  reason    String?
  status    PhotoPrivacyRequestStatus @default(PENDING)
  createdAt DateTime                  @default(now())
  updatedAt DateTime                  @updatedAt
  photo     Photo                     @relation(fields: [photoId], references: [id], onDelete: Cascade)
  user      User                      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**PhotoType Enum:**
```
AVATAR, COVER, CAMPAIGN, VERIFICATION, EVENT, GALLERY, POST_MEDIA
```

**PhotoTagStatus:** `PENDING, APPROVED, DECLINED, REMOVED`
**PhotoPrivacyRequestType:** `REMOVE_TAG, REMOVE_PHOTO, BLOCK_FUTURE`

**Privacy Features:**
- **Tag Approval**: Users must approve tags before they're public
- **Privacy Requests**: Formal process for photo/tag removal
- **Gallery Organization**: User-defined photo collections
- **Moderation Pipeline**: Admin approval for sensitive content

---

### 18. Policy Position System Models
**Purpose**: Manages candidate policy positions with AI analysis and comparison

```prisma
model PolicyCategory {
  id           String           @id @default(cuid())
  name         String
  description  String?
  icon         String?
  displayOrder Int              @default(0)
  isActive     Boolean          @default(true)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  positions    PolicyPosition[]
}

model PolicyPosition {
  id                  String             @id @default(cuid())
  candidateId         String
  categoryId          String
  title               String
  summary             String
  content             String
  stance              PolicyStance?
  priority            Int                @default(5)
  evidenceLinks       String[]           @default([])
  keyPoints           String[]           @default([])
  embedding           Float[]            @default([])
  isPublished         Boolean            @default(false)
  publishedAt         DateTime?
  version             Int                @default(1)
  previousVersionId   String?
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  aiExtractedKeywords String[]           @default([])
  aiExtractedCategory String?
  aiExtractedStance   String?
  aiGeneratedSummary  String?
  aiProcessedAt       DateTime?
  comparisons1        PolicyComparison[] @relation("Position1")
  comparisons2        PolicyComparison[] @relation("Position2")
  candidate           Candidate          @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  category            PolicyCategory     @relation(fields: [categoryId], references: [id])
  previousVersion     PolicyPosition?    @relation("PolicyVersions", fields: [previousVersionId], references: [id])
  versions            PolicyPosition[]   @relation("PolicyVersions")
}

model PolicyComparison {
  id              String          @id @default(cuid())
  position1Id     String
  position2Id     String
  similarityScore Float
  agreementLevel  AgreementLevel?
  keyDifferences  String[]        @default([])
  analysisNotes   String?
  lastAnalyzed    DateTime        @default(now())
  position1       PolicyPosition  @relation("Position1", fields: [position1Id], references: [id], onDelete: Cascade)
  position2       PolicyPosition  @relation("Position2", fields: [position2Id], references: [id], onDelete: Cascade)
}
```

**PolicyStance:** `SUPPORT, OPPOSE, NEUTRAL, CONDITIONAL`
**AgreementLevel:** `AGREE, DISAGREE, PARTIAL, UNCLEAR`

**AI Integration:**
- **Semantic Analysis**: Vector embeddings for policy similarity
- **Automatic Categorization**: AI assigns policy categories
- **Stance Detection**: AI determines support/oppose/neutral stance
- **Summary Generation**: AI creates concise position summaries

**Versioning System:**
- **Position History**: Track policy position changes over time
- **Comparison Analysis**: Compare positions across candidates
- **Evidence Links**: Support positions with source documentation

---

### 19. Unified Messaging System Models
**Purpose**: Consolidated messaging system supporting multiple communication types

```prisma
model UnifiedMessage {
  id             String             @id @default(cuid())
  type           UnifiedMessageType
  senderId       String
  recipientId    String
  content        String
  conversationId String?
  isRead         Boolean            @default(false)
  metadata       Json?
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
}

model ConversationMeta {
  id            String             @id @default(cuid())
  type          UnifiedMessageType
  participants  String[]
  lastMessageAt DateTime
  unreadCount   Int                @default(0)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
}
```

**UnifiedMessageType:**
```
USER_USER: Direct messages between platform users
ADMIN_CANDIDATE: Official admin communications with candidates
USER_CANDIDATE: Public inquiries from users to candidates
```

**Scalability Features:**
- **Message Routing**: Type-based message handling
- **Conversation Threading**: Groups related messages
- **Unread Counting**: Efficient notification system
- **Metadata Storage**: Flexible data for different message types

---

### 20. Payment and Donation Models
**Purpose**: Comprehensive financial transaction system with compliance features

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
}

model DonationCampaign {
  id            String    @id @default(cuid())
  name          String
  description   String?
  goal          Int?
  raised        Int       @default(0)
  startDate     DateTime
  endDate       DateTime?
  isActive      Boolean   @default(true)
  featured      Boolean   @default(false)
  taxDeductible Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Refund {
  id             String       @id @default(cuid())
  paymentId      String
  amount         Int
  reason         RefundReason
  status         RefundStatus @default(PENDING)
  stripeRefundId String?      @unique
  notes          String?
  processedBy    String?
  createdAt      DateTime     @default(now())
  processedAt    DateTime?
  payment        Payment      @relation(fields: [paymentId], references: [id])
}
```

**PaymentType:** `DONATION, FEE`
**DonationType:** `ONE_TIME, RECURRING, CAMPAIGN_SPECIFIC, GENERAL_SUPPORT, MEMORIAL, HONOR`
**RecurringInterval:** `WEEKLY, MONTHLY, QUARTERLY, YEARLY`

**Compliance Features:**
- **Tax Receipt Generation**: Automated receipt creation for deductible donations
- **FEC Compliance**: Campaign contribution tracking and reporting
- **Refund Management**: Complete refund processing workflow
- **Audit Trail**: Comprehensive payment history and status tracking

## Model Relationship Diagrams

### Core User-Candidate Flow
```
User (1) ←→ (1) CandidateRegistration ←→ (1) Payment
  ↓
Candidate (1) ←→ (1) CandidateInbox ←→ (*) CandidateStaff
  ↓
PoliticalInquiry (*) ←→ (*) InquiryResponse ←→ (1) PublicQA
  ↓
PublicQAVote (*) ←→ (1) User
```

### Payment and Financial System
```
User (1) ←→ (*) Payment ←→ (1) StripeCustomer
  ↓
PaymentWebhook (*) → Payment Status Updates
  ↓
Refund (*) ←→ (1) Payment
```

### Content Moderation Pipeline
```
Post/Comment → ContentFlag → ModerationLog → UserWarning → UserSuspension → Appeal
     ↓              ↓              ↓              ↓              ↓             ↓
SecurityEvent  ReputationEvent  Admin Action  User Notified  Status Change  Review
```

### Photo and Privacy System
```
User (1) ←→ (*) Photo ←→ (*) PhotoTag ←→ (*) PhotoPrivacyRequest
  ↓                        ↓                        ↓
Gallery Organization   Tag Approval Process    Privacy Controls
```

## Performance Optimization Guidelines

### Critical Indexes
```sql
-- High-frequency queries
CREATE INDEX idx_candidate_inbox_candidate ON CandidateInbox(candidateId);
CREATE INDEX idx_payment_webhook_stripe_event ON PaymentWebhook(stripeEventId);
CREATE INDEX idx_public_qa_candidate_visible ON PublicQA(candidateId, isVisible);
CREATE INDEX idx_security_event_user_type ON SecurityEvent(userId, eventType);
CREATE INDEX idx_reputation_event_user_created ON ReputationEvent(userId, createdAt);

-- Moderation system
CREATE INDEX idx_content_flag_unresolved ON ContentFlag(contentType, resolved);
CREATE INDEX idx_user_suspension_active ON UserSuspension(userId, isActive);
CREATE INDEX idx_appeal_status ON Appeal(status, createdAt);

-- Photo system
CREATE INDEX idx_photo_tag_status_user ON PhotoTag(taggedId, status);
CREATE INDEX idx_photo_privacy_request_status ON PhotoPrivacyRequest(status, createdAt);
```

### Query Optimization Patterns

**Pagination with Cursor:**
```typescript
// Efficient pagination for large datasets
const publicQAs = await prisma.publicQA.findMany({
  where: {
    candidateId: candidateId,
    isVisible: true,
    createdAt: { lt: cursor } // cursor-based pagination
  },
  orderBy: { createdAt: 'desc' },
  take: 20
});
```

**Batch Operations:**
```typescript
// Efficient batch reputation updates
await prisma.reputationEvent.createMany({
  data: reputationEvents,
  skipDuplicates: true
});
```

## Data Integrity Rules

### Foreign Key Constraints
- **CASCADE DELETE**: Child records deleted when parent removed
  - `CandidateInbox` → `Candidate`
  - `ReputationEvent` → `User`
  - `PhotoTag` → `Photo`

### Unique Constraints
- **Business Logic Enforcement**:
  - One `CandidateInbox` per `Candidate`
  - One `StripeCustomer` per `User`
  - Unique `stripeEventId` in `PaymentWebhook`

### Check Constraints (Application Level)
```typescript
// Reputation score bounds
if (user.reputationScore < 0 || user.reputationScore > 100) {
  throw new Error('Reputation score must be between 0 and 100');
}

// Photo tag coordinates
if (photoTag.x < 0 || photoTag.x > 1 || photoTag.y < 0 || photoTag.y > 1) {
  throw new Error('Photo tag coordinates must be between 0 and 1');
}
```

## Migration Considerations

### Backward Compatibility
- **Additive Changes**: New optional fields don't break existing code
- **Enum Extensions**: Add new enum values at end to maintain ordinal consistency
- **Index Creation**: Use `CONCURRENTLY` for large tables in production

### Data Migration Patterns
```typescript
// Safe enum migration
await prisma.$executeRaw`
  ALTER TYPE "AdminMessageType" ADD VALUE 'NEW_TYPE';
`;

// Backfill new columns
await prisma.user.updateMany({
  where: { reputationScore: null },
  data: { reputationScore: 70 } // default reputation
});
```

## Common Query Patterns

### Candidate Dashboard Queries
```typescript
// Get candidate inbox summary
const inboxSummary = await prisma.candidateInbox.findUnique({
  where: { candidateId },
  include: {
    staffMembers: {
      where: { isActive: true },
      include: { user: true }
    },
    candidate: {
      include: {
        politicalInquiries: {
          where: { status: 'OPEN' },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    }
  }
});
```

### Moderation Dashboard Queries
```typescript
// Get pending moderation queue
const pendingFlags = await prisma.contentFlag.findMany({
  where: {
    resolved: false,
    confidence: { lt: 0.8 } // Only low-confidence AI flags need human review
  },
  include: {
    // Dynamic include based on contentType
    ...(contentType === 'POST' && { post: true }),
    ...(contentType === 'COMMENT' && { comment: true })
  },
  orderBy: { createdAt: 'asc' }
});
```

### User Profile Queries
```typescript
// Get user activity summary
const userProfile = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    reputationEvents: {
      take: 10,
      orderBy: { createdAt: 'desc' }
    },
    photos: {
      where: { isActive: true },
      include: {
        tags: {
          where: { status: 'APPROVED' },
          include: { tagged: true }
        }
      }
    },
    warnings: {
      where: { expiresAt: { gt: new Date() } }
    }
  }
});
```

## Conclusion

This documentation covers the 20 most critical undocumented database models in the UnitedWeRise platform. These models support essential functionality including:

- **Candidate Management**: Registration, verification, communication
- **Financial Operations**: Payments, donations, compliance tracking
- **Content Moderation**: AI-powered flagging, human review, appeals
- **User Engagement**: Reputation, activity tracking, photo sharing
- **Platform Administration**: Security monitoring, system announcements

Each model includes comprehensive field explanations, business logic documentation, relationship mapping, and performance considerations to enable effective development and maintenance of the platform.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze complete schema to identify 86 models and their documentation status", "status": "completed", "activeForm": "Analyzing complete Prisma schema for model documentation gaps"}, {"content": "Research critical undocumented models including CandidateInbox, PaymentWebhook, StripeCustomer, PublicQA, etc.", "status": "completed", "activeForm": "Researching critical undocumented database models"}, {"content": "Map model relationships and foreign key dependencies across the entire schema", "status": "completed", "activeForm": "Mapping database model relationships and dependencies"}, {"content": "Document field purposes, business logic, and data flows for each critical model", "status": "completed", "activeForm": "Documenting field purposes and business logic"}, {"content": "Create comprehensive database documentation with relationship diagrams", "status": "completed", "activeForm": "Creating comprehensive database documentation"}]
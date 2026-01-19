# Organizations & Endorsements Feature - Planning Document

**Status**: Phase 3 (Frontend) COMPLETE
**Complexity**: High (16+) - Multi-model, cross-system, new domain

## Current Progress
- [x] Phase 1: Backend MVP (1a-1e complete)
- [ ] Phase 2: Hierarchy & Federation (deferred)
- [x] Phase 3: Frontend (3a-3i complete)
- [ ] Phase 4: Advanced Jurisdiction

---

## 1. Vision Summary

Build a comprehensive organization management system that enables:

1. **Hierarchical organizations** - Tree structure with single parent, arbitrary depth
2. **Flexible authority delegation** - Org-defined roles with predefined capabilities
3. **Organization federation** - Mergers and revocable affiliations
4. **Geospatial jurisdiction** - H3-based territory for discoverability and endorsement authority
5. **Endorsement workflows** - Questionnaires, candidate applications, org-defined voting thresholds
6. **Candidate integration** - Only verified candidates can seek endorsements
7. **Org-owned content** - Organizations can post as the org entity

### Core Principles
- Organizations are general-purpose (not endorsement-specific)
- Jurisdiction is optional for discoverability, required only for endorsements
- Users can HEAD only one organization (anti-spam)
- Authority flows from head downward via delegation
- All organizations are public and discoverable (no private/hidden orgs)

### Design Decisions (Confirmed)
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Voting thresholds | Org-defined | Each org sets own approval rules |
| Org-owned content | Yes | Orgs can post announcements/statements as org |
| Private orgs | No | All orgs public and discoverable |
| MVP scope | Core + Endorsements + Events | Hierarchy/mergers in Phase 2 |
| Events | Phase 1 | Basic event creation in MVP |
| Internal messaging | Full discussion | Internal threads/chat for members |
| Org verification | Yes | Verified badge for official orgs |

---

## 2. Existing System Audit

### What We Have

| System | Status | Key Files |
|--------|--------|-----------|
| User roles | Basic flags only (`isAdmin`, `isModerator`) | `schema.prisma:100-104` |
| Candidate registration | Full workflow with verification | `schema.prisma:1782-1844`, `candidates.ts` |
| H3 geospatial | Resolution 7, scope filtering | `geospatial.ts`, `postGeographicService.ts` |
| ElectoralDistrict | Parent/child hierarchy | `schema.prisma:1264-1298` |
| Notifications | Robust system, extensible types | `schema.prisma:725-741` |
| Request/approval | Friendship model pattern | `schema.prisma:414-428` |

### What We Need to Build

| Component | Description |
|-----------|-------------|
| Organization model | Core entity with hierarchy, jurisdiction |
| Membership system | Join requests, roles, status tracking |
| Role/capability system | Org-defined roles, predefined capabilities |
| Affiliation system | Non-hierarchical partnerships |
| Merger workflow | Request/approval for org absorption |
| Questionnaire builder | Org-defined endorsement forms |
| Endorsement workflow | Application, voting, publication |

---

## 3. Data Model Design

### 3.1 Core Organization Models

```prisma
model Organization {
  id                String   @id @default(cuid())
  name              String
  slug              String   @unique  // URL-friendly identifier
  description       String?
  avatar            String?
  website           String?

  // Hierarchy
  parentId          String?
  parent            Organization?  @relation("OrgHierarchy", fields: [parentId], references: [id])
  children          Organization[] @relation("OrgHierarchy")

  // Leadership (required, exactly one)
  headUserId        String
  head              User     @relation("OrgHead", fields: [headUserId], references: [id])

  // Jurisdiction (optional)
  jurisdictionType  JurisdictionType?  // NATIONAL, STATE, COUNTY, CITY, CUSTOM
  jurisdictionValue String?            // e.g., "TX", "Travis County, TX"
  h3Cells           String[]           // H3 indices covering jurisdiction

  // Endorsement settings
  endorsementsEnabled Boolean @default(false)

  // Org-defined voting thresholds (for endorsement decisions)
  votingThresholdType  VotingThresholdType @default(SIMPLE_MAJORITY)
  votingThresholdValue Int?  // For PERCENTAGE type (e.g., 66 = 66%)
  votingQuorumPercent  Int   @default(0)  // Minimum participation % (0 = no quorum)

  // Metadata
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  members           OrganizationMember[]
  roles             OrganizationRole[]
  affiliationsFrom  OrganizationAffiliation[] @relation("AffiliationFrom")
  affiliationsTo    OrganizationAffiliation[] @relation("AffiliationTo")
  mergeRequestsSent OrganizationMergeRequest[] @relation("MergeRequestFrom")
  mergeRequestsReceived OrganizationMergeRequest[] @relation("MergeRequestTo")
  questionnaires    Questionnaire[]
  endorsements      Endorsement[]

  @@index([parentId])
  @@index([headUserId])
  @@index([jurisdictionType, jurisdictionValue])
}

enum JurisdictionType {
  NATIONAL
  STATE
  COUNTY
  CITY
  CUSTOM
}

enum VotingThresholdType {
  SIMPLE_MAJORITY    // > 50% of votes
  TWO_THIRDS         // >= 66.67% of votes
  THREE_QUARTERS     // >= 75% of votes
  UNANIMOUS          // 100% of votes (no AGAINST)
  PERCENTAGE         // Custom percentage (use votingThresholdValue)
}
```

### 3.2 Membership & Roles

```prisma
model OrganizationMember {
  id             String   @id @default(cuid())

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  userId         String
  user           User     @relation(fields: [userId], references: [id])

  // Role assignment (nullable = regular member)
  roleId         String?
  role           OrganizationRole? @relation(fields: [roleId], references: [id])

  status         MembershipStatus @default(PENDING)
  joinedAt       DateTime?
  invitedBy      String?  // userId who invited

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([organizationId, userId])
  @@index([userId])
  @@index([organizationId, status])
}

enum MembershipStatus {
  PENDING    // Awaiting approval
  ACTIVE     // Full member
  SUSPENDED  // Temporarily restricted
  REMOVED    // No longer member
}

model OrganizationRole {
  id             String   @id @default(cuid())

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  name           String   // e.g., "Co-Chair", "Electoral Committee Lead"
  description    String?

  // Capabilities granted to this role
  capabilities   OrgCapability[]

  // Can this role be filled by multiple people?
  maxHolders     Int      @default(1)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  members        OrganizationMember[]

  @@unique([organizationId, name])
  @@index([organizationId])
}
```

### 3.3 Predefined Capabilities

```prisma
enum OrgCapability {
  // Structural
  CREATE_SUBORG
  MANAGE_ORG_SETTINGS
  DISSOLVE_ORG
  TRANSFER_HEADSHIP

  // Membership
  INVITE_MEMBERS
  REMOVE_MEMBERS
  APPROVE_APPLICATIONS

  // Roles & Delegation
  CREATE_ROLES
  ASSIGN_ROLES
  DELEGATE_CAPABILITIES  // Can grant capabilities to roles (up to own level)

  // Endorsements
  MANAGE_QUESTIONNAIRE
  REVIEW_APPLICATIONS
  VOTE_ENDORSEMENT
  PUBLISH_ENDORSEMENT

  // Affiliations & Mergers
  PROPOSE_AFFILIATION
  APPROVE_AFFILIATION
  REVOKE_AFFILIATION
  INITIATE_MERGE
  APPROVE_MERGE

  // Content
  POST_AS_ORG
  MODERATE_CONTENT

  // Events
  CREATE_EVENTS
  MANAGE_EVENTS
  VIEW_RSVPS

  // Discussions
  CREATE_DISCUSSION
  PIN_DISCUSSION
  MODERATE_DISCUSSION
  VIEW_LEADERSHIP_DISCUSSIONS  // Access LEADERSHIP visibility level
}
```

### 3.4 Affiliations & Mergers

```prisma
model OrganizationAffiliation {
  id              String   @id @default(cuid())

  fromOrgId       String
  fromOrg         Organization @relation("AffiliationFrom", fields: [fromOrgId], references: [id])

  toOrgId         String
  toOrg           Organization @relation("AffiliationTo", fields: [toOrgId], references: [id])

  status          AffiliationStatus @default(PENDING)

  proposedBy      String   // userId
  approvedBy      String?  // userId
  revokedBy       String?  // userId

  createdAt       DateTime @default(now())
  approvedAt      DateTime?
  revokedAt       DateTime?

  @@unique([fromOrgId, toOrgId])
  @@index([toOrgId, status])
}

enum AffiliationStatus {
  PENDING
  ACTIVE
  REVOKED
}

model OrganizationMergeRequest {
  id              String   @id @default(cuid())

  // Org being absorbed
  fromOrgId       String
  fromOrg         Organization @relation("MergeRequestFrom", fields: [fromOrgId], references: [id])

  // Org absorbing
  toOrgId         String
  toOrg           Organization @relation("MergeRequestTo", fields: [toOrgId], references: [id])

  // Where absorbed org will sit in hierarchy
  proposedParentId String?  // If null, becomes direct child of toOrg

  status          MergeRequestStatus @default(PENDING)

  // What capabilities the absorbed org will retain
  retainedCapabilities OrgCapability[]

  initiatedBy     String   // userId from toOrg
  acceptedBy      String?  // userId (head of fromOrg)

  createdAt       DateTime @default(now())
  acceptedAt      DateTime?
  completedAt     DateTime?

  @@index([fromOrgId])
  @@index([toOrgId, status])
}

enum MergeRequestStatus {
  PENDING     // Awaiting fromOrg acceptance
  ACCEPTED    // fromOrg accepted, awaiting processing
  COMPLETED   // Merge executed
  REJECTED    // fromOrg declined
  CANCELLED   // toOrg withdrew
}
```

### 3.5 Endorsement System

```prisma
model Questionnaire {
  id              String   @id @default(cuid())

  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])

  title           String   // e.g., "2024 Endorsement Questionnaire"
  description     String?
  isActive        Boolean  @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String   // userId

  questions       QuestionnaireQuestion[]
  applications    EndorsementApplication[]

  @@index([organizationId, isActive])
}

model QuestionnaireQuestion {
  id              String   @id @default(cuid())

  questionnaireId String
  questionnaire   Questionnaire @relation(fields: [questionnaireId], references: [id])

  text            String
  description     String?  // Help text
  type            QuestionType
  options         String[] // For MULTIPLE_CHOICE, CHECKBOX
  isRequired      Boolean  @default(true)
  displayOrder    Int

  // Should response be shown on candidate's public page?
  isPublic        Boolean  @default(true)

  responses       QuestionResponse[]

  @@index([questionnaireId, displayOrder])
}

enum QuestionType {
  SHORT_TEXT
  LONG_TEXT
  MULTIPLE_CHOICE
  CHECKBOX
  YES_NO
  SCALE        // 1-5 or 1-10
}

model EndorsementApplication {
  id              String   @id @default(cuid())

  questionnaireId String
  questionnaire   Questionnaire @relation(fields: [questionnaireId], references: [id])

  candidateId     String
  candidate       Candidate @relation(fields: [candidateId], references: [id])

  status          ApplicationStatus @default(SUBMITTED)

  submittedAt     DateTime @default(now())
  reviewedAt      DateTime?

  // Voting results (denormalized)
  votesFor        Int      @default(0)
  votesAgainst    Int      @default(0)
  votesAbstain    Int      @default(0)

  responses       QuestionResponse[]
  votes           EndorsementVote[]
  endorsement     Endorsement?

  @@unique([questionnaireId, candidateId])
  @@index([questionnaireId, status])
  @@index([candidateId])
}

enum ApplicationStatus {
  SUBMITTED      // Awaiting review
  UNDER_REVIEW   // Being discussed/voted on
  APPROVED       // Endorsed
  DENIED         // Not endorsed
  WITHDRAWN      // Candidate withdrew
}

model QuestionResponse {
  id              String   @id @default(cuid())

  applicationId   String
  application     EndorsementApplication @relation(fields: [applicationId], references: [id])

  questionId      String
  question        QuestionnaireQuestion @relation(fields: [questionId], references: [id])

  response        String   // JSON for complex types

  @@unique([applicationId, questionId])
}

model EndorsementVote {
  id              String   @id @default(cuid())

  applicationId   String
  application     EndorsementApplication @relation(fields: [applicationId], references: [id])

  memberId        String
  member          OrganizationMember @relation(fields: [memberId], references: [id])

  vote            VoteChoice
  comment         String?  // Internal note

  createdAt       DateTime @default(now())

  @@unique([applicationId, memberId])
  @@index([applicationId])
}

enum VoteChoice {
  FOR
  AGAINST
  ABSTAIN
}

model Endorsement {
  id              String   @id @default(cuid())

  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])

  candidateId     String
  candidate       Candidate @relation(fields: [candidateId], references: [id])

  applicationId   String   @unique
  application     EndorsementApplication @relation(fields: [applicationId], references: [id])

  // Public statement
  statement       String?

  // When it becomes public
  publishedAt     DateTime @default(now())
  publishedBy     String   // userId

  // Can be revoked
  isActive        Boolean  @default(true)
  revokedAt       DateTime?
  revokedBy       String?
  revocationReason String?

  @@index([organizationId, isActive])
  @@index([candidateId, isActive])
}
```

### 3.6 Org-Owned Posts

Extend existing Post model to support org authorship:

```prisma
// Add to existing Post model:
model Post {
  // ... existing fields ...

  // Organization authorship (optional - null = personal post)
  organizationId  String?
  organization    Organization? @relation(fields: [organizationId], references: [id])

  // Who actually created the post (for audit)
  // authorId remains the user who created it, but post displays as org
}
```

**Display logic:**
- If `organizationId` is set: Show org name/avatar as author, with "Posted by [username]" subtitle
- If `organizationId` is null: Normal user post

**Feed behavior:**
- Org posts appear in followers' feeds if they follow the org
- Org posts appear in local/topic feeds based on org's jurisdiction
- Users can follow orgs like they follow users

```prisma
// Add to Organization model:
model Organization {
  // ... existing fields ...
  posts           Post[]
  followers       OrganizationFollow[]
}

model OrganizationFollow {
  id              String   @id @default(cuid())

  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])

  userId          String
  user            User     @relation(fields: [userId], references: [id])

  createdAt       DateTime @default(now())

  @@unique([organizationId, userId])
  @@index([userId])
}
```

### 3.7 Event System (Integration with Existing CivicEvent)

**Existing System**: The codebase already has a comprehensive `CivicEvent` model with:
- 17 event types (TOWN_HALL, RALLY, VOTER_REGISTRATION, etc.)
- `EventRSVP` with capacity management
- Location (JSON), virtual event support, timezone
- Filtering by type/category/timeframe/proximity

**Integration Approach**: Extend existing `CivicEvent` rather than creating duplicate system.

```prisma
// Extend existing CivicEvent model:
model CivicEvent {
  // ... existing fields (title, description, eventType, category, etc.) ...

  // NEW: Optional organization ownership
  organizationId  String?
  organization    Organization? @relation(fields: [organizationId], references: [id])

  // Existing organizerInfo (Json) can still be used for display
  // organizationId provides the authoritative link
}

// Add to Organization model:
model Organization {
  // ... existing fields ...
  events          CivicEvent[]  // Events created by this org
}
```

**Display logic:**
- If `organizationId` is set: Event shows org branding, requires POST_AS_ORG or CREATE_EVENTS capability
- If `organizationId` is null: Personal event (existing behavior)

**Key files to modify:**
- `backend/prisma/schema.prisma` - Add organizationId to CivicEvent
- `backend/src/routes/civic.ts` - Add org context to event creation
- `backend/src/services/civicOrganizingService.ts` - Org capability checks

**Existing RSVP system is reused as-is** - no new EventRsvp model needed.

### 3.8 Internal Discussion System

```prisma
model OrganizationDiscussion {
  id              String   @id @default(cuid())

  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])

  title           String
  content         String   // Initial post content

  // Who can see this discussion?
  visibility      DiscussionVisibility @default(ALL_MEMBERS)

  // Pinned discussions appear at top
  isPinned        Boolean  @default(false)
  pinnedAt        DateTime?
  pinnedBy        String?  // userId

  // Metadata
  authorId        String
  author          User     @relation(fields: [authorId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  replies         DiscussionReply[]

  @@index([organizationId, isPinned, createdAt])
}

enum DiscussionVisibility {
  ALL_MEMBERS      // All org members can see
  ROLE_HOLDERS     // Only members with roles can see
  LEADERSHIP       // Only head + designated leadership roles
}

model DiscussionReply {
  id              String   @id @default(cuid())

  discussionId    String
  discussion      OrganizationDiscussion @relation(fields: [discussionId], references: [id])

  content         String

  // For threaded replies
  parentReplyId   String?
  parentReply     DiscussionReply?  @relation("ReplyThread", fields: [parentReplyId], references: [id])
  childReplies    DiscussionReply[] @relation("ReplyThread")

  authorId        String
  author          User     @relation(fields: [authorId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([discussionId, createdAt])
}
```

### 3.9 Organization Verification

```prisma
// Add to Organization model:
model Organization {
  // ... existing fields ...

  // Verification (similar to user verification)
  isVerified           Boolean  @default(false)
  verificationStatus   OrgVerificationStatus @default(NOT_REQUESTED)
  verificationDocuments String[]  // URLs to supporting docs
  verifiedAt           DateTime?
  verifiedBy           String?   // admin userId
}

enum OrgVerificationStatus {
  NOT_REQUESTED
  PENDING
  APPROVED
  DENIED
}

model OrganizationVerificationRequest {
  id              String   @id @default(cuid())

  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])

  // What type of org is this?
  orgType         OrgType

  // Supporting documentation
  documents       String[]
  statement       String   // Why should we verify this org?

  // Admin review
  status          OrgVerificationStatus @default(PENDING)
  reviewedBy      String?  // admin userId
  reviewedAt      DateTime?
  reviewNotes     String?
  denialReason    String?

  createdAt       DateTime @default(now())

  @@index([status])
}

enum OrgType {
  POLITICAL_PARTY
  ADVOCACY_ORG
  LABOR_UNION
  COMMUNITY_ORG
  GOVERNMENT_OFFICE
  CAMPAIGN
  PAC_SUPERPAC
  OTHER
}
```

---

## 4. Capability Taxonomy

### Category Breakdown

| Category | Capability | Description |
|----------|------------|-------------|
| **Structure** | CREATE_SUBORG | Create child organizations |
| | MANAGE_ORG_SETTINGS | Edit name, description, avatar, etc. |
| | DISSOLVE_ORG | Delete/archive the organization |
| | TRANSFER_HEADSHIP | Pass head role to another member |
| **Membership** | INVITE_MEMBERS | Send membership invitations |
| | REMOVE_MEMBERS | Remove members from org |
| | APPROVE_APPLICATIONS | Accept/reject join requests |
| **Delegation** | CREATE_ROLES | Define new roles |
| | ASSIGN_ROLES | Assign members to roles |
| | DELEGATE_CAPABILITIES | Grant capabilities to roles |
| **Endorsements** | MANAGE_QUESTIONNAIRE | Create/edit questionnaires |
| | REVIEW_APPLICATIONS | View endorsement applications |
| | VOTE_ENDORSEMENT | Cast vote on applications |
| | PUBLISH_ENDORSEMENT | Make endorsement public |
| **Affiliations** | PROPOSE_AFFILIATION | Initiate partnership |
| | APPROVE_AFFILIATION | Accept partnership requests |
| | REVOKE_AFFILIATION | End partnership |
| **Mergers** | INITIATE_MERGE | Propose absorbing another org |
| | APPROVE_MERGE | Accept being absorbed |
| **Content** | POST_AS_ORG | Create posts on behalf of org |
| | MANAGE_EVENTS | Create/edit org events |
| | MODERATE_CONTENT | Remove inappropriate content |

### Head Authority
The organization head implicitly has ALL capabilities and cannot have them revoked. Headship can only be transferred, not removed.

### Delegation Rules
- Can only delegate capabilities you possess
- DELEGATE_CAPABILITIES is required to grant capabilities to roles
- Recursive delegation is allowed (can delegate DELEGATE_CAPABILITIES itself)

---

## 5. Jurisdiction Design

### Phase 1 (MVP) - Administrative Boundaries

| Type | Value Format | Source |
|------|-------------|--------|
| NATIONAL | "US" | Hardcoded |
| STATE | "TX", "CA", etc. | Census Bureau |
| COUNTY | "Travis County, TX" | Census Bureau |
| CITY | "Austin, TX" | Census Bureau |

**Implementation:**
1. Store `jurisdictionType` and `jurisdictionValue` on Organization
2. Convert boundary to H3 cell set (resolution 7)
3. Store cells in `h3Cells` array
4. Query: candidate's H3 cell in org's h3Cells?

### Phase 2 - Political Boundaries
- Congressional districts
- State legislative districts

### Phase 3 - Custom Boundaries
- H3 cell selection via map UI
- Union of standard boundaries

---

## 6. API Endpoints (Draft)

### Organizations
```
POST   /api/organizations                    Create org (user becomes head)
GET    /api/organizations/:id                Get org details
PATCH  /api/organizations/:id                Update org settings
DELETE /api/organizations/:id                Dissolve org

GET    /api/organizations/:id/hierarchy      Get org tree
POST   /api/organizations/:id/suborg         Create child org
```

### Membership
```
POST   /api/organizations/:id/join           Request to join
POST   /api/organizations/:id/invite         Invite user
GET    /api/organizations/:id/members        List members
PATCH  /api/organizations/:id/members/:uid   Update member status
DELETE /api/organizations/:id/members/:uid   Remove member
```

### Roles
```
POST   /api/organizations/:id/roles          Create role
GET    /api/organizations/:id/roles          List roles
PATCH  /api/organizations/:id/roles/:rid     Update role
DELETE /api/organizations/:id/roles/:rid     Delete role
POST   /api/organizations/:id/roles/:rid/assign  Assign member to role
```

### Affiliations
```
POST   /api/organizations/:id/affiliations   Propose affiliation
GET    /api/organizations/:id/affiliations   List affiliations
PATCH  /api/affiliations/:aid                Accept/revoke
```

### Mergers
```
POST   /api/organizations/:id/merge-requests Initiate merge
GET    /api/organizations/:id/merge-requests List merge requests
PATCH  /api/merge-requests/:mid              Accept/reject/complete
```

### Endorsements
```
POST   /api/organizations/:id/questionnaires      Create questionnaire
GET    /api/organizations/:id/questionnaires      List questionnaires
PATCH  /api/questionnaires/:qid                   Update questionnaire
DELETE /api/questionnaires/:qid                   Delete questionnaire

POST   /api/questionnaires/:qid/apply             Candidate applies
GET    /api/questionnaires/:qid/applications      List applications
GET    /api/applications/:aid                     Get application detail
POST   /api/applications/:aid/vote                Cast vote
PATCH  /api/applications/:aid/status              Update status

POST   /api/organizations/:id/endorsements        Publish endorsement
GET    /api/organizations/:id/endorsements        List endorsements
DELETE /api/endorsements/:eid                     Revoke endorsement

GET    /api/candidates/:cid/endorsements          Candidate's endorsements
```

### Events (Extends Existing CivicEvent System)
```
# Existing endpoints (civic.ts) remain unchanged:
POST   /api/civic/events                          Create event (enhanced: accepts organizationId)
GET    /api/civic/events                          List events (enhanced: filter by organizationId)
GET    /api/civic/events/:id                      Get event details
POST   /api/civic/events/:id/rsvp                 RSVP to event

# New org-specific convenience endpoints:
GET    /api/organizations/:id/events              List events for this org
POST   /api/organizations/:id/events              Create event as org (sets organizationId)
```

### Discussions
```
POST   /api/organizations/:id/discussions         Create discussion
GET    /api/organizations/:id/discussions         List discussions
GET    /api/discussions/:did                      Get discussion + replies
PATCH  /api/discussions/:did                      Update discussion
DELETE /api/discussions/:did                      Delete discussion
POST   /api/discussions/:did/pin                  Pin/unpin discussion

POST   /api/discussions/:did/replies              Add reply
PATCH  /api/replies/:rid                          Edit reply
DELETE /api/replies/:rid                          Delete reply
```

### Verification
```
POST   /api/organizations/:id/verification        Request verification
GET    /api/admin/org-verifications               List pending (admin)
PATCH  /api/admin/org-verifications/:vid          Approve/deny (admin)
```

### Discovery
```
GET    /api/organizations/nearby?lat=X&lng=Y      Orgs in area
GET    /api/organizations/search?q=X              Search orgs
GET    /api/events/upcoming                       Upcoming public events
```

---

## 7. Implementation Phases

### Phase 1: Core + Endorsements + Events (MVP)
**Goal:** Organizations can form, manage members/roles, endorse candidates, host events, and discuss internally

**1a: Foundation**
1. Database schema (all new models)
2. Organization CRUD + membership workflows
3. Role model + capability assignment
4. Capability checking middleware

**1b: Jurisdiction & Discovery**
5. Jurisdiction (admin boundaries: nation/state/county/city)
6. Organization follow system
7. Org discovery endpoints

**1c: Content & Communication**
8. Org-owned posts
9. Internal discussions (threads, replies, visibility levels)
10. Event integration (extend existing CivicEvent with organizationId)

**1d: Endorsements**
11. Questionnaire builder
12. Endorsement application + voting
13. Endorsement publication + candidate page display

**1e: Verification & Polish**
14. Organization verification workflow
15. Notifications for all events
16. Backend API tests

### Phase 2: Hierarchy & Federation
**Goal:** Organizations can form hierarchies and merge

13. Parent/child organization relationships
14. Suborg creation with capability inheritance
15. Affiliation system (non-hierarchical partnerships)
16. Merger workflow (request -> accept -> execute)

### Phase 3: Frontend
**Goal:** Full UI for organization management

17. Org management dashboard
18. Questionnaire builder UI
19. Endorsement workflow UI (apply, review, vote)
20. Candidate endorsement display page
21. Org discovery (search, nearby)
22. Org profile pages
23. Org follow/unfollow UI

### Phase 4: Advanced Jurisdiction
**Goal:** Support political boundaries beyond admin units

24. Congressional district boundaries
25. State legislative district boundaries
26. Custom boundary definition (H3 cell selection UI)
27. Union of multiple standard boundaries

---

## 8. Notification Types to Add

```prisma
enum NotificationType {
  // ... existing types ...

  // Organization
  ORG_INVITE
  ORG_APPLICATION_RECEIVED    // Someone wants to join
  ORG_APPLICATION_APPROVED
  ORG_APPLICATION_DENIED
  ORG_ROLE_ASSIGNED
  ORG_ROLE_REMOVED

  // Affiliations
  ORG_AFFILIATION_PROPOSED
  ORG_AFFILIATION_APPROVED
  ORG_AFFILIATION_REVOKED

  // Mergers
  ORG_MERGE_PROPOSED
  ORG_MERGE_ACCEPTED
  ORG_MERGE_COMPLETED

  // Endorsements
  ENDORSEMENT_APPLICATION_RECEIVED
  ENDORSEMENT_VOTE_CAST
  ENDORSEMENT_APPROVED
  ENDORSEMENT_DENIED
  ENDORSEMENT_PUBLISHED
  ENDORSEMENT_REVOKED

  // Events
  ORG_EVENT_CREATED
  ORG_EVENT_UPDATED
  ORG_EVENT_CANCELLED
  ORG_EVENT_REMINDER      // 24h and 1h before

  // Discussions
  ORG_DISCUSSION_CREATED
  ORG_DISCUSSION_REPLY
  ORG_DISCUSSION_MENTION  // @mentioned in discussion

  // Verification
  ORG_VERIFICATION_APPROVED
  ORG_VERIFICATION_DENIED
}
```

---

## 9. Security Considerations

1. **Capability enforcement** - Every protected action must verify user has required capability
2. **Jurisdiction validation** - Endorsements only for candidates in org's jurisdiction
3. **Head protection** - Head cannot be removed, only transferred
4. **One-head rule** - User can only head one organization
5. **Candidate verification** - Only verified candidates can seek endorsements
6. **Audit logging** - Log all capability grants, role changes, endorsements

---

## 10. Resolved Questions

| Question | Decision |
|----------|----------|
| Voting thresholds | Org-defined (SIMPLE_MAJORITY, TWO_THIRDS, etc.) |
| Public vs private orgs | All orgs public - no hidden/invite-only |
| Org-owned content | Yes - orgs can post as org entity |
| MVP scope | Core + Endorsements (hierarchy in Phase 2) |

### All Questions Resolved
All major design questions have been answered. Implementation can proceed.

---

## 11. Files to Create/Modify

### New Backend Files
| File | Purpose |
|------|---------|
| `backend/prisma/migrations/YYYYMMDD_add_organizations/migration.sql` | Schema migration |
| `backend/src/routes/organizations.ts` | Org CRUD, membership, roles |
| `backend/src/routes/questionnaires.ts` | Questionnaire builder endpoints |
| `backend/src/routes/endorsements.ts` | Endorsement workflow endpoints |
| `backend/src/routes/discussions.ts` | Discussion threads, replies |
| `backend/src/routes/orgVerification.ts` | Verification request/review |
| `backend/src/services/organizationService.ts` | Org business logic |
| `backend/src/services/endorsementService.ts` | Endorsement business logic |
| `backend/src/services/jurisdictionService.ts` | H3 cell management for boundaries |
| `backend/src/services/discussionService.ts` | Discussion business logic |
| `backend/src/middleware/orgAuth.ts` | Capability checking middleware |
| `backend/src/utils/jurisdictionData.ts` | Admin boundary H3 cell data |

### Modified Backend Files
| File | Changes |
|------|---------|
| `backend/prisma/schema.prisma` | Add 15+ new models, enums; extend CivicEvent |
| `backend/src/server.ts` | Register new routes |
| `backend/src/routes/posts.ts` | Add organizationId support |
| `backend/src/routes/civic.ts` | Add organizationId to event creation/filtering |
| `backend/src/services/civicOrganizingService.ts` | Add org capability checks |
| `backend/src/routes/notifications.ts` | Handle new notification types |
| `backend/src/routes/candidates.ts` | Add endorsements endpoint |

### New Frontend Files (Phase 3)
| File | Purpose |
|------|---------|
| `frontend/src/js/components/organization-*.js` | Org UI components |
| `frontend/src/js/pages/organization.js` | Org profile page |
| `frontend/src/js/pages/endorsement-application.js` | Candidate application form |
| `frontend/src/handlers/organization-handlers.js` | Org event handlers |

### Modified Frontend Files (Phase 3)
| File | Changes |
|------|---------|
| `frontend/src/js/main.js` | Load org modules |
| `frontend/src/js/components/post-card.js` | Display org authorship |
| `frontend/src/js/pages/candidate.js` | Display endorsements |

---

## 12. Verification Plan

### Unit Tests
- Capability checking logic
- Jurisdiction H3 cell containment
- Voting tally calculations

### Integration Tests
- Full endorsement workflow (apply -> vote -> publish)
- Merger workflow (propose -> accept -> complete)
- Role delegation chains

### Manual Testing
- Create org -> create suborg -> merge orgs
- Create questionnaire -> candidate applies -> vote -> publish
- Verify candidate page shows endorsement

---

---

## 13. Estimation Notes

This is a major feature set. Phase 1 (MVP) includes:
- 15+ new database models (reusing existing CivicEvent/EventRSVP)
- 45+ new API endpoints
- New middleware for capability checking
- Jurisdiction boundary data integration
- Full endorsement workflow
- Event integration with existing CivicEvent system
- Internal discussion system
- Organization verification

**Recommended approach:** Implement in sub-phases within Phase 1:
1. **1a:** Schema + Organization CRUD + membership + roles + capabilities
2. **1b:** Jurisdiction + org follow + discovery
3. **1c:** Org posts + internal discussions
4. **1d:** CivicEvent integration (add organizationId)
5. **1e:** Questionnaire + endorsement workflow
6. **1f:** Verification + notifications + tests

---

*Document Status: Phase 3 (Frontend) COMPLETE - 3a-3i done*

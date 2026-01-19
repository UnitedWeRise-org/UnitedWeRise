-- Organizations & Endorsements Feature Migration
-- Creates the organization system with membership, roles, endorsements, and discussions

-- Create new enums for organizations
CREATE TYPE "JurisdictionType" AS ENUM ('NATIONAL', 'STATE', 'COUNTY', 'CITY', 'CUSTOM');
CREATE TYPE "VotingThresholdType" AS ENUM ('SIMPLE_MAJORITY', 'TWO_THIRDS', 'THREE_QUARTERS', 'UNANIMOUS', 'PERCENTAGE');
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REMOVED');
CREATE TYPE "AffiliationStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');
CREATE TYPE "MergeRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE "QuestionType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'MULTIPLE_CHOICE', 'CHECKBOX', 'YES_NO', 'SCALE');
CREATE TYPE "EndorsementApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'WITHDRAWN');
CREATE TYPE "EndorsementVoteChoice" AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');
CREATE TYPE "DiscussionVisibility" AS ENUM ('ALL_MEMBERS', 'ROLE_HOLDERS', 'LEADERSHIP');
CREATE TYPE "OrgVerificationStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'APPROVED', 'DENIED');
CREATE TYPE "OrgType" AS ENUM ('POLITICAL_PARTY', 'ADVOCACY_ORG', 'LABOR_UNION', 'COMMUNITY_ORG', 'GOVERNMENT_OFFICE', 'CAMPAIGN', 'PAC_SUPERPAC', 'OTHER');
CREATE TYPE "OrgCapability" AS ENUM ('CREATE_SUBORG', 'MANAGE_ORG_SETTINGS', 'DISSOLVE_ORG', 'TRANSFER_HEADSHIP', 'INVITE_MEMBERS', 'REMOVE_MEMBERS', 'APPROVE_APPLICATIONS', 'CREATE_ROLES', 'ASSIGN_ROLES', 'DELEGATE_CAPABILITIES', 'MANAGE_QUESTIONNAIRE', 'REVIEW_APPLICATIONS', 'VOTE_ENDORSEMENT', 'PUBLISH_ENDORSEMENT', 'PROPOSE_AFFILIATION', 'APPROVE_AFFILIATION', 'REVOKE_AFFILIATION', 'INITIATE_MERGE', 'APPROVE_MERGE', 'POST_AS_ORG', 'MODERATE_CONTENT', 'CREATE_EVENTS', 'MANAGE_EVENTS', 'VIEW_RSVPS', 'CREATE_DISCUSSION', 'PIN_DISCUSSION', 'MODERATE_DISCUSSION', 'VIEW_LEADERSHIP_DISCUSSIONS');

-- Create Organization table
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "website" TEXT,
    "parentId" TEXT,
    "headUserId" TEXT NOT NULL,
    "jurisdictionType" "JurisdictionType",
    "jurisdictionValue" TEXT,
    "h3Cells" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "endorsementsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "votingThresholdType" "VotingThresholdType" NOT NULL DEFAULT 'SIMPLE_MAJORITY',
    "votingThresholdValue" INTEGER,
    "votingQuorumPercent" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "OrgVerificationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "verificationDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- Create OrganizationMember table
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3),
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- Create OrganizationRole table
CREATE TABLE "OrganizationRole" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capabilities" "OrgCapability"[] DEFAULT ARRAY[]::"OrgCapability"[],
    "maxHolders" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationRole_pkey" PRIMARY KEY ("id")
);

-- Create OrganizationFollow table
CREATE TABLE "OrganizationFollow" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationFollow_pkey" PRIMARY KEY ("id")
);

-- Create OrganizationAffiliation table
CREATE TABLE "OrganizationAffiliation" (
    "id" TEXT NOT NULL,
    "fromOrgId" TEXT NOT NULL,
    "toOrgId" TEXT NOT NULL,
    "status" "AffiliationStatus" NOT NULL DEFAULT 'PENDING',
    "proposedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationAffiliation_pkey" PRIMARY KEY ("id")
);

-- Create OrganizationMergeRequest table
CREATE TABLE "OrganizationMergeRequest" (
    "id" TEXT NOT NULL,
    "fromOrgId" TEXT NOT NULL,
    "toOrgId" TEXT NOT NULL,
    "proposedParentId" TEXT,
    "status" "MergeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "retainedCapabilities" "OrgCapability"[] DEFAULT ARRAY[]::"OrgCapability"[],
    "initiatedBy" TEXT NOT NULL,
    "acceptedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationMergeRequest_pkey" PRIMARY KEY ("id")
);

-- Create EndorsementQuestionnaire table
CREATE TABLE "EndorsementQuestionnaire" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "EndorsementQuestionnaire_pkey" PRIMARY KEY ("id")
);

-- Create QuestionnaireQuestion table
CREATE TABLE "QuestionnaireQuestion" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "description" TEXT,
    "type" "QuestionType" NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "QuestionnaireQuestion_pkey" PRIMARY KEY ("id")
);

-- Create QuestionResponse table
CREATE TABLE "QuestionResponse" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "response" TEXT NOT NULL,

    CONSTRAINT "QuestionResponse_pkey" PRIMARY KEY ("id")
);

-- Create EndorsementApplication table
CREATE TABLE "EndorsementApplication" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "EndorsementApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "votesFor" INTEGER NOT NULL DEFAULT 0,
    "votesAgainst" INTEGER NOT NULL DEFAULT 0,
    "votesAbstain" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EndorsementApplication_pkey" PRIMARY KEY ("id")
);

-- Create EndorsementVote table
CREATE TABLE "EndorsementVote" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "vote" "EndorsementVoteChoice" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EndorsementVote_pkey" PRIMARY KEY ("id")
);

-- Create OrganizationEndorsement table (the published endorsement)
CREATE TABLE "OrganizationEndorsement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "statement" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revocationReason" TEXT,

    CONSTRAINT "OrganizationEndorsement_pkey" PRIMARY KEY ("id")
);

-- Create OrganizationDiscussion table
CREATE TABLE "OrganizationDiscussion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "visibility" "DiscussionVisibility" NOT NULL DEFAULT 'ALL_MEMBERS',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "pinnedBy" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationDiscussion_pkey" PRIMARY KEY ("id")
);

-- Create DiscussionReply table
CREATE TABLE "DiscussionReply" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentReplyId" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscussionReply_pkey" PRIMARY KEY ("id")
);

-- Create OrganizationVerificationRequest table
CREATE TABLE "OrganizationVerificationRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orgType" "OrgType" NOT NULL,
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "statement" TEXT NOT NULL,
    "status" "OrgVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "denialReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationVerificationRequest_pkey" PRIMARY KEY ("id")
);

-- Add organizationId to existing tables
ALTER TABLE "Post" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "CivicEvent" ADD COLUMN "organizationId" TEXT;

-- Create unique indexes
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE UNIQUE INDEX "OrganizationRole_organizationId_name_key" ON "OrganizationRole"("organizationId", "name");
CREATE UNIQUE INDEX "OrganizationFollow_organizationId_userId_key" ON "OrganizationFollow"("organizationId", "userId");
CREATE UNIQUE INDEX "OrganizationAffiliation_fromOrgId_toOrgId_key" ON "OrganizationAffiliation"("fromOrgId", "toOrgId");
CREATE UNIQUE INDEX "QuestionResponse_applicationId_questionId_key" ON "QuestionResponse"("applicationId", "questionId");
CREATE UNIQUE INDEX "EndorsementApplication_questionnaireId_candidateId_key" ON "EndorsementApplication"("questionnaireId", "candidateId");
CREATE UNIQUE INDEX "EndorsementVote_applicationId_memberId_key" ON "EndorsementVote"("applicationId", "memberId");
CREATE UNIQUE INDEX "OrganizationEndorsement_applicationId_key" ON "OrganizationEndorsement"("applicationId");

-- Create regular indexes
CREATE INDEX "Organization_parentId_idx" ON "Organization"("parentId");
CREATE INDEX "Organization_headUserId_idx" ON "Organization"("headUserId");
CREATE INDEX "Organization_jurisdictionType_jurisdictionValue_idx" ON "Organization"("jurisdictionType", "jurisdictionValue");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE INDEX "OrganizationMember_organizationId_status_idx" ON "OrganizationMember"("organizationId", "status");
CREATE INDEX "OrganizationRole_organizationId_idx" ON "OrganizationRole"("organizationId");
CREATE INDEX "OrganizationFollow_userId_idx" ON "OrganizationFollow"("userId");
CREATE INDEX "OrganizationAffiliation_toOrgId_status_idx" ON "OrganizationAffiliation"("toOrgId", "status");
CREATE INDEX "OrganizationMergeRequest_fromOrgId_idx" ON "OrganizationMergeRequest"("fromOrgId");
CREATE INDEX "OrganizationMergeRequest_toOrgId_status_idx" ON "OrganizationMergeRequest"("toOrgId", "status");
CREATE INDEX "EndorsementQuestionnaire_organizationId_isActive_idx" ON "EndorsementQuestionnaire"("organizationId", "isActive");
CREATE INDEX "QuestionnaireQuestion_questionnaireId_displayOrder_idx" ON "QuestionnaireQuestion"("questionnaireId", "displayOrder");
CREATE INDEX "EndorsementApplication_questionnaireId_status_idx" ON "EndorsementApplication"("questionnaireId", "status");
CREATE INDEX "EndorsementApplication_candidateId_idx" ON "EndorsementApplication"("candidateId");
CREATE INDEX "EndorsementVote_applicationId_idx" ON "EndorsementVote"("applicationId");
CREATE INDEX "OrganizationEndorsement_organizationId_isActive_idx" ON "OrganizationEndorsement"("organizationId", "isActive");
CREATE INDEX "OrganizationEndorsement_candidateId_isActive_idx" ON "OrganizationEndorsement"("candidateId", "isActive");
CREATE INDEX "OrganizationDiscussion_organizationId_isPinned_createdAt_idx" ON "OrganizationDiscussion"("organizationId", "isPinned", "createdAt");
CREATE INDEX "DiscussionReply_discussionId_createdAt_idx" ON "DiscussionReply"("discussionId", "createdAt");
CREATE INDEX "OrganizationVerificationRequest_status_idx" ON "OrganizationVerificationRequest"("status");
CREATE INDEX "Post_organizationId_idx" ON "Post"("organizationId");
CREATE INDEX "CivicEvent_organizationId_idx" ON "CivicEvent"("organizationId");

-- Add foreign keys
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_headUserId_fkey" FOREIGN KEY ("headUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "OrganizationRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationRole" ADD CONSTRAINT "OrganizationRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationFollow" ADD CONSTRAINT "OrganizationFollow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationFollow" ADD CONSTRAINT "OrganizationFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationAffiliation" ADD CONSTRAINT "OrganizationAffiliation_fromOrgId_fkey" FOREIGN KEY ("fromOrgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationAffiliation" ADD CONSTRAINT "OrganizationAffiliation_toOrgId_fkey" FOREIGN KEY ("toOrgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMergeRequest" ADD CONSTRAINT "OrganizationMergeRequest_fromOrgId_fkey" FOREIGN KEY ("fromOrgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMergeRequest" ADD CONSTRAINT "OrganizationMergeRequest_toOrgId_fkey" FOREIGN KEY ("toOrgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EndorsementQuestionnaire" ADD CONSTRAINT "EndorsementQuestionnaire_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionnaireQuestion" ADD CONSTRAINT "QuestionnaireQuestion_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "EndorsementQuestionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionResponse" ADD CONSTRAINT "QuestionResponse_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "EndorsementApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionResponse" ADD CONSTRAINT "QuestionResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuestionnaireQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EndorsementApplication" ADD CONSTRAINT "EndorsementApplication_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "EndorsementQuestionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EndorsementApplication" ADD CONSTRAINT "EndorsementApplication_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EndorsementVote" ADD CONSTRAINT "EndorsementVote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "EndorsementApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EndorsementVote" ADD CONSTRAINT "EndorsementVote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "OrganizationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationEndorsement" ADD CONSTRAINT "OrganizationEndorsement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationEndorsement" ADD CONSTRAINT "OrganizationEndorsement_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationEndorsement" ADD CONSTRAINT "OrganizationEndorsement_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "EndorsementApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationDiscussion" ADD CONSTRAINT "OrganizationDiscussion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationDiscussion" ADD CONSTRAINT "OrganizationDiscussion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionReply" ADD CONSTRAINT "DiscussionReply_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "OrganizationDiscussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionReply" ADD CONSTRAINT "DiscussionReply_parentReplyId_fkey" FOREIGN KEY ("parentReplyId") REFERENCES "DiscussionReply"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiscussionReply" ADD CONSTRAINT "DiscussionReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationVerificationRequest" ADD CONSTRAINT "OrganizationVerificationRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CivicEvent" ADD CONSTRAINT "CivicEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

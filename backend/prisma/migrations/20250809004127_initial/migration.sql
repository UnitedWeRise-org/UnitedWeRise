-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('LIKE', 'COMMENT', 'FOLLOW', 'MENTION', 'VERIFICATION_APPROVED', 'VERIFICATION_DENIED');

-- CreateEnum
CREATE TYPE "public"."PoliticalProfileType" AS ENUM ('CITIZEN', 'CANDIDATE', 'ELECTED_OFFICIAL', 'POLITICAL_ORG');

-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "public"."ElectionType" AS ENUM ('PRIMARY', 'GENERAL', 'SPECIAL', 'LOCAL', 'RUNOFF');

-- CreateEnum
CREATE TYPE "public"."ElectionLevel" AS ENUM ('FEDERAL', 'STATE', 'LOCAL', 'MUNICIPAL');

-- CreateEnum
CREATE TYPE "public"."OfficeLevel" AS ENUM ('FEDERAL', 'STATE', 'LOCAL', 'MUNICIPAL');

-- CreateEnum
CREATE TYPE "public"."BallotMeasureType" AS ENUM ('PROPOSITION', 'BOND_MEASURE', 'CONSTITUTIONAL_AMENDMENT', 'INITIATIVE', 'REFERENDUM');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."ReportTargetType" AS ENUM ('POST', 'COMMENT', 'USER', 'MESSAGE');

-- CreateEnum
CREATE TYPE "public"."ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'HATE_SPEECH', 'MISINFORMATION', 'INAPPROPRIATE_CONTENT', 'FAKE_ACCOUNT', 'IMPERSONATION', 'COPYRIGHT_VIOLATION', 'VIOLENCE_THREATS', 'SELF_HARM', 'ILLEGAL_CONTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."ReportPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."ModerationAction" AS ENUM ('NO_ACTION', 'WARNING_ISSUED', 'CONTENT_HIDDEN', 'CONTENT_DELETED', 'USER_WARNED', 'USER_SUSPENDED', 'USER_BANNED', 'APPEAL_APPROVED', 'APPEAL_DENIED');

-- CreateEnum
CREATE TYPE "public"."ContentType" AS ENUM ('POST', 'COMMENT', 'USER_PROFILE', 'MESSAGE');

-- CreateEnum
CREATE TYPE "public"."FlagType" AS ENUM ('SPAM', 'TOXICITY', 'HATE_SPEECH', 'MISINFORMATION', 'INAPPROPRIATE_LANGUAGE', 'FAKE_ENGAGEMENT', 'DUPLICATE_CONTENT', 'SUSPICIOUS_ACTIVITY');

-- CreateEnum
CREATE TYPE "public"."FlagSource" AS ENUM ('AUTOMATED', 'USER_REPORT', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "public"."WarningSeverity" AS ENUM ('MINOR', 'MODERATE', 'MAJOR', 'FINAL');

-- CreateEnum
CREATE TYPE "public"."SuspensionType" AS ENUM ('TEMPORARY', 'PERMANENT', 'POSTING_RESTRICTED', 'COMMENTING_RESTRICTED');

-- CreateEnum
CREATE TYPE "public"."AppealStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "public"."PhotoType" AS ENUM ('AVATAR', 'COVER', 'CAMPAIGN', 'VERIFICATION', 'EVENT', 'GALLERY');

-- CreateEnum
CREATE TYPE "public"."PhotoPurpose" AS ENUM ('PERSONAL', 'CAMPAIGN', 'BOTH');

-- CreateEnum
CREATE TYPE "public"."StaffRole" AS ENUM ('CAMPAIGN_MANAGER', 'COMMUNICATIONS_DIRECTOR', 'POLICY_ADVISOR', 'VOLUNTEER_COORDINATOR', 'VOLUNTEER', 'INTERN');

-- CreateEnum
CREATE TYPE "public"."StaffPermission" AS ENUM ('READ_INQUIRIES', 'RESPOND_INQUIRIES', 'ASSIGN_INQUIRIES', 'MANAGE_STAFF', 'MANAGE_SETTINGS', 'PUBLISH_QA', 'MODERATE_QA');

-- CreateEnum
CREATE TYPE "public"."InquiryCategory" AS ENUM ('GENERAL', 'HEALTHCARE', 'EDUCATION', 'ECONOMY', 'ENVIRONMENT', 'IMMIGRATION', 'FOREIGN_POLICY', 'CRIMINAL_JUSTICE', 'INFRASTRUCTURE', 'HOUSING', 'LABOR', 'TECHNOLOGY', 'CIVIL_RIGHTS', 'BUDGET_TAXES', 'ENERGY', 'AGRICULTURE', 'VETERANS', 'SENIORS', 'YOUTH', 'FAMILY_VALUES', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InquiryPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."InquiryStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_CANDIDATE', 'RESOLVED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."ResponseType" AS ENUM ('DIRECT', 'PUBLIC_QA', 'POLICY_STATEMENT', 'REFERRAL');

-- CreateEnum
CREATE TYPE "public"."VoteType" AS ENUM ('UPVOTE', 'DOWNVOTE');

-- CreateEnum
CREATE TYPE "public"."CandidateRegistrationStatus" AS ENUM ('PENDING_VERIFICATION', 'PENDING_PAYMENT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REFUNDED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "website" TEXT,
    "location" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "streetAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "h3Index" TEXT,
    "politicalProfileType" "public"."PoliticalProfileType" NOT NULL DEFAULT 'CITIZEN',
    "verificationStatus" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "politicalParty" TEXT,
    "office" TEXT,
    "campaignWebsite" TEXT,
    "officialTitle" TEXT,
    "termStart" TIMESTAMP(3),
    "termEnd" TIMESTAMP(3),
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "emailVerifyExpiry" TIMESTAMP(3),
    "phoneNumber" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerifyCode" TEXT,
    "phoneVerifyExpiry" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetExpiry" TIMESTAMP(3),
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isModerator" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "onboardingData" JSONB,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "politicalExperience" TEXT,
    "notificationPreferences" JSONB,
    "displayName" TEXT,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "followersCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Post" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPolitical" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "senderId" TEXT,
    "receiverId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Election" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ElectionType" NOT NULL,
    "level" "public"."ElectionLevel" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "registrationDeadline" TIMESTAMP(3),
    "state" TEXT NOT NULL,
    "county" TEXT,
    "city" TEXT,
    "district" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "officialUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Office" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" "public"."OfficeLevel" NOT NULL,
    "description" TEXT,
    "state" TEXT NOT NULL,
    "district" TEXT,
    "jurisdiction" TEXT,
    "termLength" INTEGER,
    "salary" DECIMAL(65,30),
    "electionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Candidate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "party" TEXT,
    "isIncumbent" BOOLEAN NOT NULL DEFAULT false,
    "campaignWebsite" TEXT,
    "campaignEmail" TEXT,
    "campaignPhone" TEXT,
    "platformSummary" TEXT,
    "keyIssues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isWithdrawn" BOOLEAN NOT NULL DEFAULT false,
    "withdrawnAt" TIMESTAMP(3),
    "withdrawnReason" TEXT,
    "userId" TEXT,
    "officeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BallotMeasure" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."BallotMeasureType" NOT NULL,
    "number" TEXT,
    "fullText" TEXT,
    "fiscalImpact" TEXT,
    "arguments" JSONB,
    "state" TEXT NOT NULL,
    "county" TEXT,
    "city" TEXT,
    "electionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BallotMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FinancialData" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "totalRaised" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cashOnHand" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "debts" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "individualDonations" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "pacDonations" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "selfFunding" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "publicFunding" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reportingPeriod" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Endorsement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "reason" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Endorsement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Topic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "argumentsFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "argumentsAgainst" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "neutralSummary" TEXT,
    "category" TEXT,
    "complexityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidenceQuality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "controversyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" TEXT,
    "district" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubTopic" (
    "id" TEXT NOT NULL,
    "parentTopicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TopicPost" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TopicComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "topicId" TEXT,
    "subTopicId" TEXT,
    "parentId" TEXT,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "sentiment" DOUBLE PRECISION,
    "hostilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "argumentStrength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidenceLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topicRelevance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "hideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessageContent" TEXT,
    "lastMessageSenderId" TEXT,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConversationParticipant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageType" "public"."MessageType" NOT NULL DEFAULT 'TEXT',
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApiCache" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "responseData" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApiCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExternalOfficial" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "office" TEXT NOT NULL,
    "district" TEXT,
    "party" TEXT,
    "contactInfo" JSONB,
    "photoUrl" TEXT,
    "zipCode" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "h3Index" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalOfficial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "public"."ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "public"."ReportReason" NOT NULL,
    "description" TEXT,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "public"."ReportPriority" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "moderatedAt" TIMESTAMP(3),
    "moderatorId" TEXT,
    "moderatorNotes" TEXT,
    "actionTaken" "public"."ModerationAction",

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContentFlag" (
    "id" TEXT NOT NULL,
    "contentType" "public"."ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "flagType" "public"."FlagType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "source" "public"."FlagSource" NOT NULL,
    "details" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ModerationLog" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "targetType" "public"."ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" "public"."ModerationAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserWarning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" "public"."WarningSeverity" NOT NULL,
    "notes" TEXT,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSuspension" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "type" "public"."SuspensionType" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "notes" TEXT,
    "appealed" BOOLEAN NOT NULL DEFAULT false,
    "appealedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSuspension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Appeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "suspensionId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "additionalInfo" TEXT,
    "status" "public"."AppealStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ElectionCache" (
    "id" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectionCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Photo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "photoType" "public"."PhotoType" NOT NULL,
    "purpose" "public"."PhotoPurpose" NOT NULL DEFAULT 'PERSONAL',
    "originalSize" INTEGER NOT NULL,
    "compressedSize" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "flaggedBy" TEXT,
    "flagReason" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "candidateId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CandidateInbox" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowPublicQ" BOOLEAN NOT NULL DEFAULT true,
    "autoResponse" TEXT,
    "staffEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateInbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CandidateStaff" (
    "id" TEXT NOT NULL,
    "inboxId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."StaffRole" NOT NULL DEFAULT 'VOLUNTEER',
    "permissions" "public"."StaffPermission"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PoliticalInquiry" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "inquirerId" TEXT,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "public"."InquiryCategory" NOT NULL DEFAULT 'GENERAL',
    "priority" "public"."InquiryPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "public"."InquiryStatus" NOT NULL DEFAULT 'OPEN',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "contactEmail" TEXT,
    "contactName" TEXT,
    "policyTopic" TEXT,
    "specificQuestion" TEXT,
    "respondedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoliticalInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InquiryResponse" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "responseType" "public"."ResponseType" NOT NULL DEFAULT 'DIRECT',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFromCandidate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InquiryResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PublicQA" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" "public"."InquiryCategory" NOT NULL DEFAULT 'GENERAL',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "sourceInquiryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicQA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PublicQAVote" (
    "id" TEXT NOT NULL,
    "qaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voteType" "public"."VoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicQAVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CandidateRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "district" TEXT,
    "positionTitle" TEXT NOT NULL,
    "positionLevel" TEXT NOT NULL,
    "positionDistrict" TEXT,
    "electionDate" TIMESTAMP(3) NOT NULL,
    "campaignName" TEXT NOT NULL,
    "campaignWebsite" TEXT,
    "campaignSlogan" TEXT,
    "campaignDescription" TEXT,
    "status" "public"."CandidateRegistrationStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "officeLevel" TEXT NOT NULL,
    "registrationFee" DOUBLE PRECISION NOT NULL,
    "originalFee" DOUBLE PRECISION NOT NULL,
    "feeWaiverStatus" TEXT NOT NULL DEFAULT 'none',
    "hasFinancialHardship" BOOLEAN NOT NULL DEFAULT false,
    "hardshipReason" TEXT,
    "communityEndorsementCount" INTEGER NOT NULL DEFAULT 0,
    "idmeVerified" BOOLEAN NOT NULL DEFAULT false,
    "idmeUserId" TEXT,
    "idmeVerifiedAt" TIMESTAMP(3),
    "verifiedFirstName" TEXT,
    "verifiedLastName" TEXT,
    "verifiedEmail" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentIntentId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verificationNotes" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "refundIssued" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "withdrawnAt" TIMESTAMP(3),
    "withdrawalReason" TEXT,
    "refundProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerifyToken_key" ON "public"."User"("emailVerifyToken");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "public"."User"("username");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE INDEX "User_h3Index_idx" ON "public"."User"("h3Index");

-- CreateIndex
CREATE INDEX "User_politicalProfileType_idx" ON "public"."User"("politicalProfileType");

-- CreateIndex
CREATE INDEX "User_zipCode_state_idx" ON "public"."User"("zipCode", "state");

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "public"."Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "public"."Follow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "public"."Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "public"."Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "public"."Post"("createdAt");

-- CreateIndex
CREATE INDEX "Post_likesCount_idx" ON "public"."Post"("likesCount");

-- CreateIndex
CREATE INDEX "Post_isPolitical_idx" ON "public"."Post"("isPolitical");

-- CreateIndex
CREATE INDEX "Like_postId_idx" ON "public"."Like"("postId");

-- CreateIndex
CREATE INDEX "Like_userId_idx" ON "public"."Like"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_postId_key" ON "public"."Like"("userId", "postId");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "public"."Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "public"."Comment"("userId");

-- CreateIndex
CREATE INDEX "Notification_receiverId_read_idx" ON "public"."Notification"("receiverId", "read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "public"."Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Election_state_date_idx" ON "public"."Election"("state", "date");

-- CreateIndex
CREATE INDEX "Election_level_date_idx" ON "public"."Election"("level", "date");

-- CreateIndex
CREATE INDEX "Office_electionId_idx" ON "public"."Office"("electionId");

-- CreateIndex
CREATE INDEX "Office_state_level_idx" ON "public"."Office"("state", "level");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_userId_key" ON "public"."Candidate"("userId");

-- CreateIndex
CREATE INDEX "Candidate_officeId_idx" ON "public"."Candidate"("officeId");

-- CreateIndex
CREATE INDEX "Candidate_party_idx" ON "public"."Candidate"("party");

-- CreateIndex
CREATE INDEX "Candidate_userId_idx" ON "public"."Candidate"("userId");

-- CreateIndex
CREATE INDEX "BallotMeasure_electionId_idx" ON "public"."BallotMeasure"("electionId");

-- CreateIndex
CREATE INDEX "BallotMeasure_state_type_idx" ON "public"."BallotMeasure"("state", "type");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialData_candidateId_key" ON "public"."FinancialData"("candidateId");

-- CreateIndex
CREATE INDEX "Endorsement_candidateId_idx" ON "public"."Endorsement"("candidateId");

-- CreateIndex
CREATE INDEX "Endorsement_userId_idx" ON "public"."Endorsement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Endorsement_userId_candidateId_key" ON "public"."Endorsement"("userId", "candidateId");

-- CreateIndex
CREATE INDEX "Topic_trendingScore_lastActivityAt_idx" ON "public"."Topic"("trendingScore", "lastActivityAt");

-- CreateIndex
CREATE INDEX "Topic_category_isActive_idx" ON "public"."Topic"("category", "isActive");

-- CreateIndex
CREATE INDEX "Topic_controversyScore_idx" ON "public"."Topic"("controversyScore");

-- CreateIndex
CREATE INDEX "Topic_state_district_idx" ON "public"."Topic"("state", "district");

-- CreateIndex
CREATE INDEX "SubTopic_parentTopicId_idx" ON "public"."SubTopic"("parentTopicId");

-- CreateIndex
CREATE INDEX "TopicPost_topicId_relevanceScore_idx" ON "public"."TopicPost"("topicId", "relevanceScore");

-- CreateIndex
CREATE UNIQUE INDEX "TopicPost_topicId_postId_key" ON "public"."TopicPost"("topicId", "postId");

-- CreateIndex
CREATE INDEX "TopicComment_topicId_createdAt_idx" ON "public"."TopicComment"("topicId", "createdAt");

-- CreateIndex
CREATE INDEX "TopicComment_subTopicId_createdAt_idx" ON "public"."TopicComment"("subTopicId", "createdAt");

-- CreateIndex
CREATE INDEX "TopicComment_authorId_idx" ON "public"."TopicComment"("authorId");

-- CreateIndex
CREATE INDEX "TopicComment_parentId_idx" ON "public"."TopicComment"("parentId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "public"."ConversationParticipant"("userId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "public"."ConversationParticipant"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_userId_conversationId_key" ON "public"."ConversationParticipant"("userId", "conversationId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "public"."Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "public"."Message"("senderId");

-- CreateIndex
CREATE INDEX "ApiCache_provider_cacheKey_idx" ON "public"."ApiCache"("provider", "cacheKey");

-- CreateIndex
CREATE INDEX "ApiCache_expiresAt_idx" ON "public"."ApiCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiCache_provider_cacheKey_key" ON "public"."ApiCache"("provider", "cacheKey");

-- CreateIndex
CREATE INDEX "ExternalOfficial_zipCode_state_idx" ON "public"."ExternalOfficial"("zipCode", "state");

-- CreateIndex
CREATE INDEX "ExternalOfficial_h3Index_idx" ON "public"."ExternalOfficial"("h3Index");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalOfficial_provider_externalId_key" ON "public"."ExternalOfficial"("provider", "externalId");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "public"."Report"("reporterId");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "public"."Report"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Report_status_priority_idx" ON "public"."Report"("status", "priority");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "public"."Report"("createdAt");

-- CreateIndex
CREATE INDEX "ContentFlag_contentType_contentId_idx" ON "public"."ContentFlag"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "ContentFlag_flagType_resolved_idx" ON "public"."ContentFlag"("flagType", "resolved");

-- CreateIndex
CREATE INDEX "ContentFlag_confidence_idx" ON "public"."ContentFlag"("confidence");

-- CreateIndex
CREATE INDEX "ContentFlag_createdAt_idx" ON "public"."ContentFlag"("createdAt");

-- CreateIndex
CREATE INDEX "ModerationLog_moderatorId_idx" ON "public"."ModerationLog"("moderatorId");

-- CreateIndex
CREATE INDEX "ModerationLog_targetType_targetId_idx" ON "public"."ModerationLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ModerationLog_action_idx" ON "public"."ModerationLog"("action");

-- CreateIndex
CREATE INDEX "ModerationLog_createdAt_idx" ON "public"."ModerationLog"("createdAt");

-- CreateIndex
CREATE INDEX "UserWarning_userId_idx" ON "public"."UserWarning"("userId");

-- CreateIndex
CREATE INDEX "UserWarning_severity_expiresAt_idx" ON "public"."UserWarning"("severity", "expiresAt");

-- CreateIndex
CREATE INDEX "UserWarning_createdAt_idx" ON "public"."UserWarning"("createdAt");

-- CreateIndex
CREATE INDEX "UserSuspension_userId_isActive_idx" ON "public"."UserSuspension"("userId", "isActive");

-- CreateIndex
CREATE INDEX "UserSuspension_endsAt_idx" ON "public"."UserSuspension"("endsAt");

-- CreateIndex
CREATE INDEX "UserSuspension_createdAt_idx" ON "public"."UserSuspension"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appeal_suspensionId_key" ON "public"."Appeal"("suspensionId");

-- CreateIndex
CREATE INDEX "Appeal_userId_idx" ON "public"."Appeal"("userId");

-- CreateIndex
CREATE INDEX "Appeal_status_idx" ON "public"."Appeal"("status");

-- CreateIndex
CREATE INDEX "Appeal_createdAt_idx" ON "public"."Appeal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionCache_stateCode_key" ON "public"."ElectionCache"("stateCode");

-- CreateIndex
CREATE INDEX "ElectionCache_stateCode_idx" ON "public"."ElectionCache"("stateCode");

-- CreateIndex
CREATE INDEX "ElectionCache_lastUpdated_idx" ON "public"."ElectionCache"("lastUpdated");

-- CreateIndex
CREATE INDEX "Photo_userId_idx" ON "public"."Photo"("userId");

-- CreateIndex
CREATE INDEX "Photo_candidateId_idx" ON "public"."Photo"("candidateId");

-- CreateIndex
CREATE INDEX "Photo_photoType_purpose_idx" ON "public"."Photo"("photoType", "purpose");

-- CreateIndex
CREATE INDEX "Photo_isApproved_isActive_idx" ON "public"."Photo"("isApproved", "isActive");

-- CreateIndex
CREATE INDEX "Photo_createdAt_idx" ON "public"."Photo"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateInbox_candidateId_key" ON "public"."CandidateInbox"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateInbox_candidateId_idx" ON "public"."CandidateInbox"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateStaff_userId_idx" ON "public"."CandidateStaff"("userId");

-- CreateIndex
CREATE INDEX "CandidateStaff_inboxId_isActive_idx" ON "public"."CandidateStaff"("inboxId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateStaff_inboxId_userId_key" ON "public"."CandidateStaff"("inboxId", "userId");

-- CreateIndex
CREATE INDEX "PoliticalInquiry_candidateId_status_idx" ON "public"."PoliticalInquiry"("candidateId", "status");

-- CreateIndex
CREATE INDEX "PoliticalInquiry_inquirerId_idx" ON "public"."PoliticalInquiry"("inquirerId");

-- CreateIndex
CREATE INDEX "PoliticalInquiry_category_priority_idx" ON "public"."PoliticalInquiry"("category", "priority");

-- CreateIndex
CREATE INDEX "PoliticalInquiry_isPublic_idx" ON "public"."PoliticalInquiry"("isPublic");

-- CreateIndex
CREATE INDEX "PoliticalInquiry_createdAt_idx" ON "public"."PoliticalInquiry"("createdAt");

-- CreateIndex
CREATE INDEX "InquiryResponse_inquiryId_idx" ON "public"."InquiryResponse"("inquiryId");

-- CreateIndex
CREATE INDEX "InquiryResponse_responderId_idx" ON "public"."InquiryResponse"("responderId");

-- CreateIndex
CREATE INDEX "InquiryResponse_isPublic_idx" ON "public"."InquiryResponse"("isPublic");

-- CreateIndex
CREATE INDEX "InquiryResponse_createdAt_idx" ON "public"."InquiryResponse"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PublicQA_sourceInquiryId_key" ON "public"."PublicQA"("sourceInquiryId");

-- CreateIndex
CREATE INDEX "PublicQA_candidateId_isVisible_idx" ON "public"."PublicQA"("candidateId", "isVisible");

-- CreateIndex
CREATE INDEX "PublicQA_category_idx" ON "public"."PublicQA"("category");

-- CreateIndex
CREATE INDEX "PublicQA_isPinned_upvotes_idx" ON "public"."PublicQA"("isPinned", "upvotes");

-- CreateIndex
CREATE INDEX "PublicQA_createdAt_idx" ON "public"."PublicQA"("createdAt");

-- CreateIndex
CREATE INDEX "PublicQAVote_qaId_idx" ON "public"."PublicQAVote"("qaId");

-- CreateIndex
CREATE INDEX "PublicQAVote_userId_idx" ON "public"."PublicQAVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicQAVote_qaId_userId_key" ON "public"."PublicQAVote"("qaId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateRegistration_registrationId_key" ON "public"."CandidateRegistration"("registrationId");

-- CreateIndex
CREATE INDEX "CandidateRegistration_userId_idx" ON "public"."CandidateRegistration"("userId");

-- CreateIndex
CREATE INDEX "CandidateRegistration_registrationId_idx" ON "public"."CandidateRegistration"("registrationId");

-- CreateIndex
CREATE INDEX "CandidateRegistration_status_idx" ON "public"."CandidateRegistration"("status");

-- CreateIndex
CREATE INDEX "CandidateRegistration_officeLevel_state_idx" ON "public"."CandidateRegistration"("officeLevel", "state");

-- CreateIndex
CREATE INDEX "CandidateRegistration_electionDate_idx" ON "public"."CandidateRegistration"("electionDate");

-- CreateIndex
CREATE INDEX "CandidateRegistration_feeWaiverStatus_idx" ON "public"."CandidateRegistration"("feeWaiverStatus");

-- CreateIndex
CREATE INDEX "CandidateRegistration_hasFinancialHardship_idx" ON "public"."CandidateRegistration"("hasFinancialHardship");

-- CreateIndex
CREATE INDEX "CandidateRegistration_createdAt_idx" ON "public"."CandidateRegistration"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Office" ADD CONSTRAINT "Office_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "public"."Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Candidate" ADD CONSTRAINT "Candidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Candidate" ADD CONSTRAINT "Candidate_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "public"."Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BallotMeasure" ADD CONSTRAINT "BallotMeasure_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "public"."Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinancialData" ADD CONSTRAINT "FinancialData_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Endorsement" ADD CONSTRAINT "Endorsement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Endorsement" ADD CONSTRAINT "Endorsement_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubTopic" ADD CONSTRAINT "SubTopic_parentTopicId_fkey" FOREIGN KEY ("parentTopicId") REFERENCES "public"."Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TopicPost" ADD CONSTRAINT "TopicPost_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TopicPost" ADD CONSTRAINT "TopicPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TopicComment" ADD CONSTRAINT "TopicComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TopicComment" ADD CONSTRAINT "TopicComment_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TopicComment" ADD CONSTRAINT "TopicComment_subTopicId_fkey" FOREIGN KEY ("subTopicId") REFERENCES "public"."SubTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TopicComment" ADD CONSTRAINT "TopicComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."TopicComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContentFlag" ADD CONSTRAINT "ContentFlag_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModerationLog" ADD CONSTRAINT "ModerationLog_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserWarning" ADD CONSTRAINT "UserWarning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserWarning" ADD CONSTRAINT "UserWarning_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSuspension" ADD CONSTRAINT "UserSuspension_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSuspension" ADD CONSTRAINT "UserSuspension_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appeal" ADD CONSTRAINT "Appeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appeal" ADD CONSTRAINT "Appeal_suspensionId_fkey" FOREIGN KEY ("suspensionId") REFERENCES "public"."UserSuspension"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appeal" ADD CONSTRAINT "Appeal_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Photo" ADD CONSTRAINT "Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Photo" ADD CONSTRAINT "Photo_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Photo" ADD CONSTRAINT "Photo_flaggedBy_fkey" FOREIGN KEY ("flaggedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CandidateInbox" ADD CONSTRAINT "CandidateInbox_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CandidateStaff" ADD CONSTRAINT "CandidateStaff_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "public"."CandidateInbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CandidateStaff" ADD CONSTRAINT "CandidateStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PoliticalInquiry" ADD CONSTRAINT "PoliticalInquiry_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PoliticalInquiry" ADD CONSTRAINT "PoliticalInquiry_inquirerId_fkey" FOREIGN KEY ("inquirerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PoliticalInquiry" ADD CONSTRAINT "PoliticalInquiry_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."CandidateStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InquiryResponse" ADD CONSTRAINT "InquiryResponse_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "public"."PoliticalInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InquiryResponse" ADD CONSTRAINT "InquiryResponse_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "public"."CandidateStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublicQA" ADD CONSTRAINT "PublicQA_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublicQA" ADD CONSTRAINT "PublicQA_sourceInquiryId_fkey" FOREIGN KEY ("sourceInquiryId") REFERENCES "public"."PoliticalInquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublicQAVote" ADD CONSTRAINT "PublicQAVote_qaId_fkey" FOREIGN KEY ("qaId") REFERENCES "public"."PublicQA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublicQAVote" ADD CONSTRAINT "PublicQAVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CandidateRegistration" ADD CONSTRAINT "CandidateRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

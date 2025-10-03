-- Migration: Add Photo, Quest, and Badge Tables
-- Created: 2025-10-03
-- Purpose: Create tables that were added via db push but have no migration

BEGIN;

-- ============================================================================
-- STEP 1: Create Quest/Badge Enums (IF NOT EXISTS)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "QuestType" AS ENUM (
    'DAILY_HABIT',
    'DAILY_CIVIC',
    'WEEKLY_ENGAGEMENT',
    'MONTHLY_CONSISTENCY',
    'SPECIAL_EVENT',
    'CIVIC_ACTION',
    'EDUCATIONAL',
    'SOCIAL_ENGAGEMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "QuestCategory" AS ENUM (
    'INFORMATION',
    'PARTICIPATION',
    'COMMUNITY',
    'ADVOCACY',
    'EDUCATION',
    'SOCIAL'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "QuestTimeframe" AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'ONGOING',
    'LIMITED_TIME'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: Create Photo Table (IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Photo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "url" TEXT NOT NULL,
    "blobName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalMimeType" TEXT NOT NULL,
    "originalSize" INTEGER NOT NULL,
    "processedSize" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "moderationStatus" TEXT NOT NULL,
    "moderationReason" TEXT,
    "moderationConfidence" DOUBLE PRECISION,
    "moderationType" TEXT,
    "exifStripped" BOOLEAN NOT NULL DEFAULT true,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "photoType" TEXT,
    "gallery" TEXT,
    "caption" TEXT,
    "thumbnailUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 3: Create Quest Tables (IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Quest" (
    "id" TEXT NOT NULL,
    "type" "QuestType" NOT NULL,
    "category" "QuestCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "requirements" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "timeframe" "QuestTimeframe" NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserQuestProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "progress" JSONB NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuestProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserQuestStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentDailyStreak" INTEGER NOT NULL DEFAULT 0,
    "longestDailyStreak" INTEGER NOT NULL DEFAULT 0,
    "currentWeeklyStreak" INTEGER NOT NULL DEFAULT 0,
    "longestWeeklyStreak" INTEGER NOT NULL DEFAULT 0,
    "lastCompletedDate" TIMESTAMP(3),
    "totalQuestsCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuestStreak_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 4: Create Badge Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "qualificationCriteria" JSONB NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAutoAwarded" BOOLEAN NOT NULL DEFAULT true,
    "maxAwards" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDisplayed" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER,
    "awardedBy" TEXT,
    "awardReason" TEXT,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- STEP 5: Create Unique Constraints
-- ============================================================================

ALTER TABLE "Badge" ADD CONSTRAINT "Badge_name_key" UNIQUE ("name");
ALTER TABLE "UserQuestStreak" ADD CONSTRAINT "UserQuestStreak_userId_key" UNIQUE ("userId");
ALTER TABLE "UserQuestProgress" ADD CONSTRAINT "UserQuestProgress_userId_questId_key" UNIQUE ("userId", "questId");
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_badgeId_key" UNIQUE ("userId", "badgeId");

-- ============================================================================
-- STEP 6: Create Indexes
-- ============================================================================

-- Photo indexes
CREATE INDEX "Photo_userId_idx" ON "Photo"("userId");
CREATE INDEX "Photo_postId_idx" ON "Photo"("postId");
CREATE INDEX "Photo_uploadedAt_idx" ON "Photo"("uploadedAt");
CREATE INDEX "Photo_moderationStatus_idx" ON "Photo"("moderationStatus");

-- Quest indexes
CREATE INDEX "Quest_type_idx" ON "Quest"("type");
CREATE INDEX "Quest_isActive_idx" ON "Quest"("isActive");
CREATE INDEX "Quest_startDate_endDate_idx" ON "Quest"("startDate", "endDate");

-- UserQuestProgress indexes
CREATE INDEX "UserQuestProgress_userId_idx" ON "UserQuestProgress"("userId");
CREATE INDEX "UserQuestProgress_questId_idx" ON "UserQuestProgress"("questId");
CREATE INDEX "UserQuestProgress_completed_idx" ON "UserQuestProgress"("completed");

-- UserQuestStreak indexes
CREATE INDEX "UserQuestStreak_userId_idx" ON "UserQuestStreak"("userId");

-- Badge indexes
CREATE INDEX "Badge_isActive_idx" ON "Badge"("isActive");
CREATE INDEX "Badge_name_idx" ON "Badge"("name");

-- UserBadge indexes
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");
CREATE INDEX "UserBadge_isDisplayed_idx" ON "UserBadge"("isDisplayed");

-- ============================================================================
-- STEP 7: Create Foreign Keys
-- ============================================================================

-- Photo foreign keys
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Photo" ADD CONSTRAINT "Photo_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserQuestProgress foreign keys
ALTER TABLE "UserQuestProgress" ADD CONSTRAINT "UserQuestProgress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserQuestProgress" ADD CONSTRAINT "UserQuestProgress_questId_fkey"
  FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserQuestStreak foreign keys
ALTER TABLE "UserQuestStreak" ADD CONSTRAINT "UserQuestStreak_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserBadge foreign keys
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey"
  FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Enums Created:
--   1. QuestType (8 values)
--   2. QuestCategory (6 values)
--   3. QuestTimeframe (5 values)
--
-- Tables Created:
--   1. Photo (photo upload system)
--   2. Quest (quest definitions)
--   3. UserQuestProgress (user quest tracking)
--   4. UserQuestStreak (streak tracking)
--   5. Badge (badge definitions)
--   6. UserBadge (user badge awards)
--
-- Note: This migration creates tables that were previously added via db push
-- Note: All tables are empty and ready for data population
-- ============================================================================

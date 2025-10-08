-- CreateEnum
CREATE TYPE "public"."FilterType" AS ENUM ('QUICK_FILTER', 'CUSTOM', 'SMART');

-- CreateEnum
CREATE TYPE "public"."FeedSource" AS ENUM ('DISCOVER', 'FOLLOWING', 'SAVED', 'COMBINED');

-- CreateEnum
CREATE TYPE "public"."FilterTimeframe" AS ENUM ('LAST_HOUR', 'TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_YEAR', 'ALL_TIME', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."FilterSortBy" AS ENUM ('RELEVANCE', 'RECENT', 'POPULAR', 'TRENDING', 'PROXIMITY');

-- CreateEnum
CREATE TYPE "public"."SortOrder" AS ENUM ('ASC', 'DESC');

-- CreateTable
CREATE TABLE "public"."FeedFilter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filterType" "public"."FilterType" NOT NULL DEFAULT 'CUSTOM',
    "feedSource" "public"."FeedSource" NOT NULL DEFAULT 'DISCOVER',
    "isPolitical" BOOLEAN,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "geographicScope" "public"."GeographicScope",
    "h3Resolution" INTEGER,
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "radiusMiles" DOUBLE PRECISION,
    "authorTypes" "public"."PoliticalProfileType"[] DEFAULT ARRAY[]::"public"."PoliticalProfileType"[],
    "authorIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludeAuthorIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topicIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categories" "public"."IssueCategory"[] DEFAULT ARRAY[]::"public"."IssueCategory"[],
    "minLikes" INTEGER,
    "minComments" INTEGER,
    "minShares" INTEGER,
    "timeframe" "public"."FilterTimeframe" NOT NULL DEFAULT 'ALL_TIME',
    "customStartDate" TIMESTAMP(3),
    "customEndDate" TIMESTAMP(3),
    "sortBy" "public"."FilterSortBy" NOT NULL DEFAULT 'RELEVANCE',
    "sortOrder" "public"."SortOrder" NOT NULL DEFAULT 'DESC',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "useCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FeedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedFilter_userId_isPinned_idx" ON "public"."FeedFilter"("userId", "isPinned");

-- CreateIndex
CREATE INDEX "FeedFilter_userId_isDefault_idx" ON "public"."FeedFilter"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "FeedFilter_userId_lastUsedAt_idx" ON "public"."FeedFilter"("userId", "lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeedFilter_userId_name_key" ON "public"."FeedFilter"("userId", "name");

-- AddForeignKey
ALTER TABLE "public"."FeedFilter" ADD CONSTRAINT "FeedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

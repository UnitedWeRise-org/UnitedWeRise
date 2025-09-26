-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "ModerationCategory" AS ENUM ('SAFE', 'INAPPROPRIATE', 'ADULT_CONTENT', 'VIOLENCE', 'HATE_SPEECH', 'SPAM', 'COPYRIGHT', 'POLITICAL_DISINFORMATION', 'PERSONAL_INFORMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ModerationDecision" AS ENUM ('APPROVE', 'REJECT', 'FLAG_FOR_REVIEW', 'REQUIRE_BLUR', 'REQUIRE_WARNING');

-- CreateTable
CREATE TABLE "ImageModerationResult" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "moderationType" TEXT NOT NULL DEFAULT 'AI_ANALYSIS',
    "aiAnalysisResults" JSONB,
    "overallConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "categories" "ModerationCategory"[] DEFAULT ARRAY[]::"ModerationCategory"[],
    "primaryCategory" "ModerationCategory",
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isSafe" BOOLEAN NOT NULL DEFAULT true,
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "detectedObjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "detectedText" TEXT,
    "textAnalysis" JSONB,
    "faceCount" INTEGER DEFAULT 0,
    "adultContentScore" DOUBLE PRECISION DEFAULT 0.0,
    "violenceScore" DOUBLE PRECISION DEFAULT 0.0,
    "racyScore" DOUBLE PRECISION DEFAULT 0.0,
    "hateSpeechScore" DOUBLE PRECISION DEFAULT 0.0,
    "spamScore" DOUBLE PRECISION DEFAULT 0.0,
    "qualityScore" DOUBLE PRECISION DEFAULT 0.0,
    "technicalMetadata" JSONB,
    "processingTime" INTEGER,
    "aiModel" TEXT,
    "modelVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageModerationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageModerationReview" (
    "id" TEXT NOT NULL,
    "moderationResultId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ModerationDecision" NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "confidenceOverride" DOUBLE PRECISION,
    "categoryOverride" "ModerationCategory",
    "isAppeal" BOOLEAN NOT NULL DEFAULT false,
    "originalDecision" "ModerationDecision",
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageModerationReview_pkey" PRIMARY KEY ("id")
);

-- Add new columns to Photo table
ALTER TABLE "Photo" ADD COLUMN "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Photo" ADD COLUMN "moderationScore" DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE "Photo" ADD COLUMN "requiresReview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Photo" ADD COLUMN "autoModerationPassed" BOOLEAN DEFAULT false;
ALTER TABLE "Photo" ADD COLUMN "humanReviewRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Photo" ADD COLUMN "lastModerationAt" TIMESTAMP(3);
ALTER TABLE "Photo" ADD COLUMN "moderationMetadata" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "ImageModerationResult_photoId_key" ON "ImageModerationResult"("photoId");

-- CreateIndex
CREATE INDEX "ImageModerationResult_moderationType_idx" ON "ImageModerationResult"("moderationType");

-- CreateIndex
CREATE INDEX "ImageModerationResult_primaryCategory_idx" ON "ImageModerationResult"("primaryCategory");

-- CreateIndex
CREATE INDEX "ImageModerationResult_riskScore_idx" ON "ImageModerationResult"("riskScore");

-- CreateIndex
CREATE INDEX "ImageModerationResult_isSafe_requiresHumanReview_idx" ON "ImageModerationResult"("isSafe", "requiresHumanReview");

-- CreateIndex
CREATE INDEX "ImageModerationResult_createdAt_idx" ON "ImageModerationResult"("createdAt");

-- CreateIndex
CREATE INDEX "ImageModerationResult_aiModel_modelVersion_idx" ON "ImageModerationResult"("aiModel", "modelVersion");

-- CreateIndex
CREATE INDEX "ImageModerationReview_moderationResultId_idx" ON "ImageModerationReview"("moderationResultId");

-- CreateIndex
CREATE INDEX "ImageModerationReview_reviewerId_idx" ON "ImageModerationReview"("reviewerId");

-- CreateIndex
CREATE INDEX "ImageModerationReview_decision_idx" ON "ImageModerationReview"("decision");

-- CreateIndex
CREATE INDEX "ImageModerationReview_isAppeal_idx" ON "ImageModerationReview"("isAppeal");

-- CreateIndex
CREATE INDEX "ImageModerationReview_reviewedAt_idx" ON "ImageModerationReview"("reviewedAt");

-- CreateIndex on Photo table for new moderation fields
CREATE INDEX "Photo_moderationStatus_idx" ON "Photo"("moderationStatus");

-- CreateIndex
CREATE INDEX "Photo_moderationScore_idx" ON "Photo"("moderationScore");

-- CreateIndex
CREATE INDEX "Photo_requiresReview_humanReviewRequired_idx" ON "Photo"("requiresReview", "humanReviewRequired");

-- CreateIndex
CREATE INDEX "Photo_lastModerationAt_idx" ON "Photo"("lastModerationAt");

-- CreateIndex
CREATE INDEX "Photo_moderationStatus_createdAt_idx" ON "Photo"("moderationStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "ImageModerationResult" ADD CONSTRAINT "ImageModerationResult_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageModerationReview" ADD CONSTRAINT "ImageModerationReview_moderationResultId_fkey" FOREIGN KEY ("moderationResultId") REFERENCES "ImageModerationResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageModerationReview" ADD CONSTRAINT "ImageModerationReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
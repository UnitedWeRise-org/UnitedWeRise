-- RiseAI & Community Notes System Migration
-- Generated: 2025-12-10

-- CreateTable: FactClaim - Factual assertions with confidence scores
CREATE TABLE "FactClaim" (
    "id" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "sourcePostId" TEXT,
    "sourceUserId" TEXT,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "confidenceHistory" JSONB NOT NULL DEFAULT '[]',
    "citationCount" INTEGER NOT NULL DEFAULT 0,
    "challengeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CommunityNote - User corrections with reputation-weighted voting
CREATE TABLE "CommunityNote" (
    "id" TEXT NOT NULL,
    "factClaimId" TEXT,
    "postId" TEXT,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "noteType" TEXT NOT NULL,
    "helpfulScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notHelpfulScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "isDisplayed" BOOLEAN NOT NULL DEFAULT false,
    "displayThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "isAppealed" BOOLEAN NOT NULL DEFAULT false,
    "appealResolved" BOOLEAN NOT NULL DEFAULT false,
    "appealOutcome" TEXT,
    "confidenceImpact" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CommunityNoteVote - Individual votes with voter reputation snapshot
CREATE TABLE "CommunityNoteVote" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL,
    "voterReputation" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityNoteVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ArgumentFactLink - Links arguments to underlying facts
CREATE TABLE "ArgumentFactLink" (
    "id" TEXT NOT NULL,
    "argumentId" TEXT NOT NULL,
    "factClaimId" TEXT NOT NULL,
    "dependencyStrength" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "ArgumentFactLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ArgumentEntry - Dynamic arguments with confidence scores
CREATE TABLE "ArgumentEntry" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "sourcePostId" TEXT NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "confidenceHistory" JSONB NOT NULL DEFAULT '[]',
    "logicalValidity" DOUBLE PRECISION,
    "evidenceQuality" DOUBLE PRECISION,
    "coherence" DOUBLE PRECISION,
    "entropyScore" DOUBLE PRECISION,
    "supportCount" INTEGER NOT NULL DEFAULT 0,
    "refuteCount" INTEGER NOT NULL DEFAULT 0,
    "citationCount" INTEGER NOT NULL DEFAULT 0,
    "clusterId" TEXT,
    "isClusterHead" BOOLEAN NOT NULL DEFAULT false,
    "effectiveConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArgumentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RiseAIInteraction - Tracks each @RiseAI analysis session
CREATE TABLE "RiseAIInteraction" (
    "id" TEXT NOT NULL,
    "triggerCommentId" TEXT,
    "triggerPostId" TEXT NOT NULL,
    "triggerUserId" TEXT NOT NULL,
    "targetContent" TEXT NOT NULL,
    "analysisResult" JSONB,
    "entropyScore" DOUBLE PRECISION,
    "fallaciesFound" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "argumentsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "argumentsReferenced" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responseCommentId" TEXT,
    "responseContent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "followUpCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiseAIInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ConfidenceUpdate - Audit log for confidence changes
CREATE TABLE "ConfidenceUpdate" (
    "id" TEXT NOT NULL,
    "argumentId" TEXT NOT NULL,
    "interactionId" TEXT,
    "oldConfidence" DOUBLE PRECISION NOT NULL,
    "newConfidence" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "propagatedFrom" TEXT,
    "cosineSimilarity" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfidenceUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RiseAISettings - Admin-configurable rate limits and thresholds
CREATE TABLE "RiseAISettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "dailyLimitNonAdmin" INTEGER NOT NULL DEFAULT 10,
    "dailyLimitAdmin" INTEGER NOT NULL DEFAULT -1,
    "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "RiseAISettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RiseAIUsage - Daily usage tracking per user
CREATE TABLE "RiseAIUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RiseAIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: FactClaim indexes
CREATE INDEX "FactClaim_embedding_idx" ON "FactClaim"("embedding");
CREATE INDEX "FactClaim_confidence_idx" ON "FactClaim"("confidence");
CREATE INDEX "FactClaim_createdAt_idx" ON "FactClaim"("createdAt");

-- CreateIndex: CommunityNote indexes
CREATE INDEX "CommunityNote_factClaimId_idx" ON "CommunityNote"("factClaimId");
CREATE INDEX "CommunityNote_postId_idx" ON "CommunityNote"("postId");
CREATE INDEX "CommunityNote_isDisplayed_idx" ON "CommunityNote"("isDisplayed");
CREATE INDEX "CommunityNote_authorId_idx" ON "CommunityNote"("authorId");

-- CreateIndex: CommunityNoteVote indexes
CREATE INDEX "CommunityNoteVote_noteId_idx" ON "CommunityNoteVote"("noteId");
CREATE INDEX "CommunityNoteVote_voterId_idx" ON "CommunityNoteVote"("voterId");
CREATE UNIQUE INDEX "CommunityNoteVote_noteId_voterId_key" ON "CommunityNoteVote"("noteId", "voterId");

-- CreateIndex: ArgumentFactLink indexes
CREATE INDEX "ArgumentFactLink_factClaimId_idx" ON "ArgumentFactLink"("factClaimId");
CREATE INDEX "ArgumentFactLink_argumentId_idx" ON "ArgumentFactLink"("argumentId");
CREATE UNIQUE INDEX "ArgumentFactLink_argumentId_factClaimId_key" ON "ArgumentFactLink"("argumentId", "factClaimId");

-- CreateIndex: ArgumentEntry indexes
CREATE INDEX "ArgumentEntry_embedding_idx" ON "ArgumentEntry"("embedding");
CREATE INDEX "ArgumentEntry_clusterId_idx" ON "ArgumentEntry"("clusterId");
CREATE INDEX "ArgumentEntry_confidence_idx" ON "ArgumentEntry"("confidence");
CREATE INDEX "ArgumentEntry_entropyScore_idx" ON "ArgumentEntry"("entropyScore");
CREATE INDEX "ArgumentEntry_sourcePostId_idx" ON "ArgumentEntry"("sourcePostId");
CREATE INDEX "ArgumentEntry_sourceUserId_idx" ON "ArgumentEntry"("sourceUserId");

-- CreateIndex: RiseAIInteraction indexes
CREATE INDEX "RiseAIInteraction_triggerPostId_idx" ON "RiseAIInteraction"("triggerPostId");
CREATE INDEX "RiseAIInteraction_triggerUserId_idx" ON "RiseAIInteraction"("triggerUserId");
CREATE INDEX "RiseAIInteraction_status_idx" ON "RiseAIInteraction"("status");
CREATE INDEX "RiseAIInteraction_createdAt_idx" ON "RiseAIInteraction"("createdAt");

-- CreateIndex: ConfidenceUpdate indexes
CREATE INDEX "ConfidenceUpdate_argumentId_idx" ON "ConfidenceUpdate"("argumentId");
CREATE INDEX "ConfidenceUpdate_interactionId_idx" ON "ConfidenceUpdate"("interactionId");
CREATE INDEX "ConfidenceUpdate_createdAt_idx" ON "ConfidenceUpdate"("createdAt");

-- CreateIndex: RiseAIUsage indexes
CREATE INDEX "RiseAIUsage_userId_idx" ON "RiseAIUsage"("userId");
CREATE INDEX "RiseAIUsage_date_idx" ON "RiseAIUsage"("date");
CREATE UNIQUE INDEX "RiseAIUsage_userId_date_key" ON "RiseAIUsage"("userId", "date");

-- AddForeignKey: CommunityNote relations
ALTER TABLE "CommunityNote" ADD CONSTRAINT "CommunityNote_factClaimId_fkey" FOREIGN KEY ("factClaimId") REFERENCES "FactClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityNote" ADD CONSTRAINT "CommunityNote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityNote" ADD CONSTRAINT "CommunityNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CommunityNoteVote relations
ALTER TABLE "CommunityNoteVote" ADD CONSTRAINT "CommunityNoteVote_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "CommunityNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityNoteVote" ADD CONSTRAINT "CommunityNoteVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ArgumentFactLink relations
ALTER TABLE "ArgumentFactLink" ADD CONSTRAINT "ArgumentFactLink_argumentId_fkey" FOREIGN KEY ("argumentId") REFERENCES "ArgumentEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArgumentFactLink" ADD CONSTRAINT "ArgumentFactLink_factClaimId_fkey" FOREIGN KEY ("factClaimId") REFERENCES "FactClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ArgumentEntry relations
ALTER TABLE "ArgumentEntry" ADD CONSTRAINT "ArgumentEntry_sourcePostId_fkey" FOREIGN KEY ("sourcePostId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArgumentEntry" ADD CONSTRAINT "ArgumentEntry_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: RiseAIInteraction relations
ALTER TABLE "RiseAIInteraction" ADD CONSTRAINT "RiseAIInteraction_triggerPostId_fkey" FOREIGN KEY ("triggerPostId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiseAIInteraction" ADD CONSTRAINT "RiseAIInteraction_triggerUserId_fkey" FOREIGN KEY ("triggerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: RiseAIUsage relations
ALTER TABLE "RiseAIUsage" ADD CONSTRAINT "RiseAIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add encoding tiers tracking, audio transcription, engagement scoring, and caption embedding to Video model
ALTER TABLE "Video" ADD COLUMN "encodingTiersStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Video" ADD COLUMN "audioTranscription" TEXT;
ALTER TABLE "Video" ADD COLUMN "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Video" ADD COLUMN "captionEmbedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[];

-- CreateIndex: encoding tiers status for filtering partial/failed encoding
CREATE INDEX "Video_encodingTiersStatus_idx" ON "Video"("encodingTiersStatus");

-- CreateIndex: engagement score for feed ranking
CREATE INDEX "Video_engagementScore_idx" ON "Video"("engagementScore");

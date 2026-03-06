-- Add missing indexes for deployment readiness

-- Candidate: index on statusChangedBy for admin audit trail queries
CREATE INDEX "Candidate_statusChangedBy_idx" ON "Candidate"("statusChangedBy");

-- Message: index on senderPublicKeyId for key rotation queries
CREATE INDEX "Message_senderPublicKeyId_idx" ON "Message"("senderPublicKeyId");

-- Photo: composite index for filtered gallery queries (active photos by user)
CREATE INDEX "Photo_userId_isActive_idx" ON "Photo"("userId", "isActive");

-- Add foreign key constraint for Candidate.statusChangedBy -> User.id
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_statusChangedBy_fkey" FOREIGN KEY ("statusChangedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete SET NULL for Report.moderator (preserves moderation history)
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_moderatorId_fkey";
ALTER TABLE "Report" ADD CONSTRAINT "Report_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add onDelete SET NULL for ContentFlag.resolver (preserves resolution history)
ALTER TABLE "ContentFlag" DROP CONSTRAINT IF EXISTS "ContentFlag_resolvedBy_fkey";
ALTER TABLE "ContentFlag" ADD CONSTRAINT "ContentFlag_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

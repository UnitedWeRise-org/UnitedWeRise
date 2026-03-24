-- CreateEnum
CREATE TYPE "PetitionCategory" AS ENUM ('BALLOT_ACCESS', 'CIVIC_ADVOCACY', 'COMMUNITY', 'POLICY');

-- CreateEnum
CREATE TYPE "SignatureVerificationStatus" AS ENUM ('UNVERIFIED', 'VOTER_VERIFIED', 'FLAGGED_DUPLICATE', 'REJECTED', 'WITHDRAWN');

-- AlterEnum (add new values to PetitionStatus - idempotent)
ALTER TYPE "PetitionStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "PetitionStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED_TO_STATE';
ALTER TYPE "PetitionStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- AlterTable: Petition - make existing fields nullable and add new fields
ALTER TABLE "Petition" ALTER COLUMN "category" DROP NOT NULL;
ALTER TABLE "Petition" ALTER COLUMN "geographicScope" DROP NOT NULL;
ALTER TABLE "Petition" ALTER COLUMN "signatureGoal" DROP NOT NULL;

ALTER TABLE "Petition" ADD COLUMN "shortCode" TEXT;
ALTER TABLE "Petition" ADD COLUMN "customSlug" TEXT;
ALTER TABLE "Petition" ADD COLUMN "petitionCategory" "PetitionCategory";
ALTER TABLE "Petition" ADD COLUMN "candidateId" TEXT;
ALTER TABLE "Petition" ADD COLUMN "requiredSignerFields" JSONB DEFAULT '[]';
ALTER TABLE "Petition" ADD COLUMN "declarationLanguage" TEXT;
ALTER TABLE "Petition" ADD COLUMN "voterVerificationEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Petition" ADD COLUMN "party" TEXT;
ALTER TABLE "Petition" ADD COLUMN "electionYear" INTEGER;
ALTER TABLE "Petition" ADD COLUMN "filingDeadline" TIMESTAMP(3);
ALTER TABLE "Petition" ADD COLUMN "circulatorName" TEXT;
ALTER TABLE "Petition" ADD COLUMN "circulatorAttestedAt" TIMESTAMP(3);
ALTER TABLE "Petition" ADD COLUMN "privacyConsentText" TEXT;

-- CreateIndex for Petition new fields
CREATE UNIQUE INDEX "Petition_shortCode_key" ON "Petition"("shortCode");
CREATE UNIQUE INDEX "Petition_customSlug_key" ON "Petition"("customSlug");
CREATE INDEX "Petition_shortCode_idx" ON "Petition"("shortCode");
CREATE INDEX "Petition_customSlug_idx" ON "Petition"("customSlug");
CREATE INDEX "Petition_candidateId_idx" ON "Petition"("candidateId");

-- AddForeignKey for Petition.candidateId
ALTER TABLE "Petition" ADD CONSTRAINT "Petition_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: PetitionSignature - make userId nullable and add new fields
-- Drop the existing unique constraint first
DROP INDEX IF EXISTS "PetitionSignature_petitionId_userId_key";

ALTER TABLE "PetitionSignature" ALTER COLUMN "userId" DROP NOT NULL;

-- Change onDelete behavior for userId FK (Cascade -> SetNull since nullable)
ALTER TABLE "PetitionSignature" DROP CONSTRAINT IF EXISTS "PetitionSignature_userId_fkey";
ALTER TABLE "PetitionSignature" ADD CONSTRAINT "PetitionSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PetitionSignature" ADD COLUMN "signerFirstName" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "signerLastName" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "signerAddress" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "signerCity" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "signerState" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "signerZip" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "signerCounty" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "signerDateOfBirth" TIMESTAMP(3);
ALTER TABLE "PetitionSignature" ADD COLUMN "signerEmail" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "signatureConfirmation" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "attestedAt" TIMESTAMP(3);
ALTER TABLE "PetitionSignature" ADD COLUMN "attestationLanguageShown" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "privacyConsented" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PetitionSignature" ADD COLUMN "signatureStatus" "SignatureVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "PetitionSignature" ADD COLUMN "voterFileMatchResult" JSONB;
ALTER TABLE "PetitionSignature" ADD COLUMN "voterFileId" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "deviceFingerprint" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "geolocation" JSONB;
ALTER TABLE "PetitionSignature" ADD COLUMN "captchaVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PetitionSignature" ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "PetitionSignature" ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- CreateIndex for PetitionSignature new fields
CREATE INDEX "PetitionSignature_petitionId_userId_idx" ON "PetitionSignature"("petitionId", "userId");
CREATE INDEX "PetitionSignature_signerLastName_signerFirstName_idx" ON "PetitionSignature"("signerLastName", "signerFirstName");
CREATE INDEX "PetitionSignature_signerEmail_idx" ON "PetitionSignature"("signerEmail");
CREATE INDEX "PetitionSignature_deviceFingerprint_idx" ON "PetitionSignature"("deviceFingerprint");
CREATE INDEX "PetitionSignature_signatureStatus_idx" ON "PetitionSignature"("signatureStatus");

-- CreateTable: PetitionAuditLog
CREATE TABLE "PetitionAuditLog" (
    "id" TEXT NOT NULL,
    "petitionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL,
    "ipAddress" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetitionAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for PetitionAuditLog
CREATE INDEX "PetitionAuditLog_petitionId_createdAt_idx" ON "PetitionAuditLog"("petitionId", "createdAt");
CREATE INDEX "PetitionAuditLog_action_idx" ON "PetitionAuditLog"("action");
CREATE INDEX "PetitionAuditLog_actorId_idx" ON "PetitionAuditLog"("actorId");

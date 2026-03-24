-- Retry migration: Applies petition system schema changes idempotently.
-- The previous migration (20260324160607) may have been auto-resolved as "applied"
-- after failing on enum value additions. This migration ensures all table/column
-- changes are applied regardless of previous migration state.

-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "PetitionCategory" AS ENUM ('BALLOT_ACCESS', 'CIVIC_ADVOCACY', 'COMMUNITY', 'POLICY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SignatureVerificationStatus" AS ENUM ('UNVERIFIED', 'VOTER_VERIFIED', 'FLAGGED_DUPLICATE', 'REJECTED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum (idempotent)
ALTER TYPE "PetitionStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "PetitionStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED_TO_STATE';
ALTER TYPE "PetitionStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- AlterTable: Petition - make existing fields nullable (idempotent)
ALTER TABLE "Petition" ALTER COLUMN "category" DROP NOT NULL;
ALTER TABLE "Petition" ALTER COLUMN "geographicScope" DROP NOT NULL;
ALTER TABLE "Petition" ALTER COLUMN "signatureGoal" DROP NOT NULL;

-- AlterTable: Petition - add new columns (idempotent via IF NOT EXISTS pattern)
DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "shortCode" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "customSlug" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "petitionCategory" "PetitionCategory";
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "candidateId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "requiredSignerFields" JSONB DEFAULT '[]';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "declarationLanguage" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "voterVerificationEnabled" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "party" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "electionYear" INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "filingDeadline" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "circulatorName" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "circulatorAttestedAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "privacyConsentText" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- CreateIndex for Petition new fields (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "Petition_shortCode_key" ON "Petition"("shortCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Petition_customSlug_key" ON "Petition"("customSlug");
CREATE INDEX IF NOT EXISTS "Petition_shortCode_idx" ON "Petition"("shortCode");
CREATE INDEX IF NOT EXISTS "Petition_customSlug_idx" ON "Petition"("customSlug");
CREATE INDEX IF NOT EXISTS "Petition_candidateId_idx" ON "Petition"("candidateId");

-- AddForeignKey for Petition.candidateId (idempotent)
DO $$ BEGIN
  ALTER TABLE "Petition" ADD CONSTRAINT "Petition_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: PetitionSignature - drop unique constraint and make userId nullable
DROP INDEX IF EXISTS "PetitionSignature_petitionId_userId_key";

ALTER TABLE "PetitionSignature" ALTER COLUMN "userId" DROP NOT NULL;

-- Change onDelete behavior for userId FK
ALTER TABLE "PetitionSignature" DROP CONSTRAINT IF EXISTS "PetitionSignature_userId_fkey";
ALTER TABLE "PetitionSignature" ADD CONSTRAINT "PetitionSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add new columns to PetitionSignature (idempotent)
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "signerFirstName" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "signerLastName" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "signerAddress" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "signerCity" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "signerState" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "signerZip" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "signerCounty" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "signerDateOfBirth" TIMESTAMP(3); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "signerEmail" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "signatureConfirmation" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "attestedAt" TIMESTAMP(3); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "attestationLanguageShown" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "privacyConsented" BOOLEAN NOT NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "signatureStatus" "SignatureVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "voterFileMatchResult" JSONB; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "voterFileId" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "userAgent" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "deviceFingerprint" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "geolocation" JSONB; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "captchaVerified" BOOLEAN NOT NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "reviewNote" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "reviewedBy" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetitionSignature" ADD COLUMN "reviewedAt" TIMESTAMP(3); EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- CreateIndex for PetitionSignature new fields (idempotent)
CREATE INDEX IF NOT EXISTS "PetitionSignature_petitionId_userId_idx" ON "PetitionSignature"("petitionId", "userId");
CREATE INDEX IF NOT EXISTS "PetitionSignature_signerLastName_signerFirstName_idx" ON "PetitionSignature"("signerLastName", "signerFirstName");
CREATE INDEX IF NOT EXISTS "PetitionSignature_signerEmail_idx" ON "PetitionSignature"("signerEmail");
CREATE INDEX IF NOT EXISTS "PetitionSignature_deviceFingerprint_idx" ON "PetitionSignature"("deviceFingerprint");
CREATE INDEX IF NOT EXISTS "PetitionSignature_signatureStatus_idx" ON "PetitionSignature"("signatureStatus");

-- CreateTable: PetitionAuditLog (idempotent)
CREATE TABLE IF NOT EXISTS "PetitionAuditLog" (
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

-- CreateIndex for PetitionAuditLog (idempotent)
CREATE INDEX IF NOT EXISTS "PetitionAuditLog_petitionId_createdAt_idx" ON "PetitionAuditLog"("petitionId", "createdAt");
CREATE INDEX IF NOT EXISTS "PetitionAuditLog_action_idx" ON "PetitionAuditLog"("action");
CREATE INDEX IF NOT EXISTS "PetitionAuditLog_actorId_idx" ON "PetitionAuditLog"("actorId");

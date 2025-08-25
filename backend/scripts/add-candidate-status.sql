-- Add candidate status management fields to existing Candidate table
-- This script can be run safely on production without losing data

-- Create the CandidateStatus enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CandidateStatus') THEN
        CREATE TYPE "CandidateStatus" AS ENUM (
            'ACTIVE',
            'SUSPENDED', 
            'ENDED',
            'REVOKED',
            'BANNED',
            'WITHDRAWN'
        );
    END IF;
END $$;

-- Add status management columns to Candidate table
ALTER TABLE "Candidate" 
ADD COLUMN IF NOT EXISTS "status" "CandidateStatus" DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "statusChangedBy" TEXT,
ADD COLUMN IF NOT EXISTS "statusReason" TEXT,
ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "appealDeadline" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "appealNotes" TEXT;

-- Set default status to ACTIVE for existing records
UPDATE "Candidate" 
SET "status" = 'ACTIVE' 
WHERE "status" IS NULL;

-- Set WITHDRAWN status for candidates where isWithdrawn = true
UPDATE "Candidate" 
SET "status" = 'WITHDRAWN',
    "statusChangedAt" = "withdrawnAt",
    "statusReason" = "withdrawnReason"
WHERE "isWithdrawn" = true;

-- Create index on status for efficient filtering
CREATE INDEX IF NOT EXISTS "Candidate_status_idx" ON "Candidate"("status");
CREATE INDEX IF NOT EXISTS "Candidate_statusChangedAt_idx" ON "Candidate"("statusChangedAt");
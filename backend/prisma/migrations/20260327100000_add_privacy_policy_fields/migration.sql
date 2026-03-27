-- Add contact consent to PetitionSignature (idempotent)
DO $$ BEGIN
  ALTER TABLE "PetitionSignature" ADD COLUMN "contactConsented" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add election date and legal hold fields to Petition (idempotent)
DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "electionDate" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "legalHold" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "legalHoldReason" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "legalHoldSetAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Petition" ADD COLUMN "legalHoldSetBy" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

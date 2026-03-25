-- Add signerPhone column to PetitionSignature (idempotent)
DO $$ BEGIN
  ALTER TABLE "PetitionSignature" ADD COLUMN "signerPhone" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add userId field to Candidate model to link candidates to user accounts
-- This fixes the broken candidate-user relationship

-- Add the userId column if it doesn't exist
ALTER TABLE "Candidate" 
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Add officeId column if it doesn't exist (also referenced in the code)
ALTER TABLE "Candidate"
ADD COLUMN IF NOT EXISTS "officeId" TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "Candidate_userId_idx" ON "Candidate"("userId");
CREATE INDEX IF NOT EXISTS "Candidate_officeId_idx" ON "Candidate"("officeId");

-- Add foreign key constraints
ALTER TABLE "Candidate"
ADD CONSTRAINT "Candidate_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Candidate"
ADD CONSTRAINT "Candidate_officeId_fkey"
FOREIGN KEY ("officeId") REFERENCES "Office"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Candidate' 
AND column_name IN ('userId', 'officeId');
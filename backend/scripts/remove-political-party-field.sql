-- Remove Political Party Field Migration
-- This aligns with UnitedWeRise's mission to focus on ideas over party politics

-- Remove politicalParty from existing privacy settings JSON
UPDATE "User"
SET "profilePrivacySettings" = "profilePrivacySettings" - 'politicalParty'
WHERE "profilePrivacySettings" IS NOT NULL;

-- Drop the politicalParty column
ALTER TABLE "User" DROP COLUMN IF EXISTS "politicalParty";

-- Verify the changes
SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN "profilePrivacySettings" ? 'politicalParty' THEN 1 END) as users_with_political_party_privacy
FROM "User";
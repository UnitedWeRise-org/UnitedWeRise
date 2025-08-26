-- First, ensure we have the registration
UPDATE "CandidateRegistration"
SET status = 'APPROVED'
WHERE "registrationId" = '839d2eea-2430-430b-b789-566efed56525';

-- Get Jeffrey's userId and update the existing candidate
WITH jeffrey_user AS (
    SELECT id, email, "firstName", "lastName"
    FROM "User"
    WHERE "isAdmin" = true
    ORDER BY "createdAt" ASC
    LIMIT 1
)
UPDATE "Candidate"
SET 
    name = jeffrey_user."firstName" || ' ' || COALESCE(jeffrey_user."lastName", ''),
    "campaignEmail" = jeffrey_user.email,
    "campaignWebsite" = 'https://www.unitedwerise.org',
    "platformSummary" = 'Platform founder and test candidate profile',
    "isVerified" = true,
    status = 'ACTIVE',
    "statusChangedAt" = NOW(),
    "updatedAt" = NOW()
FROM jeffrey_user
WHERE "Candidate"."userId" = jeffrey_user.id;

-- Verify the update
SELECT 
    c.id,
    c.name,
    c."userId",
    c.status,
    c."isVerified",
    c."campaignEmail",
    u.email as user_email,
    u."isAdmin"
FROM "Candidate" c
JOIN "User" u ON c."userId" = u.id
WHERE u."isAdmin" = true;
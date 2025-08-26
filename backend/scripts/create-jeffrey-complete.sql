-- Get Jeffrey's user ID (admin user)
WITH jeffrey_user AS (
    SELECT id, email, "firstName", "lastName"
    FROM "User"
    WHERE "isAdmin" = true
    ORDER BY "createdAt" ASC
    LIMIT 1
),
-- Get or create an office for testing
test_office AS (
    SELECT id FROM "Office" 
    WHERE level = 'FEDERAL'
    LIMIT 1
)
-- Create Jeffrey's candidate profile
INSERT INTO "Candidate" (
    id,
    name,
    "userId",
    "officeId",
    "campaignEmail",
    "campaignWebsite", 
    "platformSummary",
    "isVerified",
    status,
    "createdAt",
    "updatedAt"
)
SELECT
    'candidate-' || jeffrey_user.id,
    jeffrey_user."firstName" || ' ' || COALESCE(jeffrey_user."lastName", ''),
    jeffrey_user.id,
    COALESCE(test_office.id, 'office-placeholder'),
    jeffrey_user.email,
    'https://www.unitedwerise.org',
    'Platform founder and test candidate profile',
    true,
    'ACTIVE',
    NOW(),
    NOW()
FROM jeffrey_user
CROSS JOIN test_office
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    "updatedAt" = NOW();

-- Create the CandidateRegistration if it doesn't exist
INSERT INTO "CandidateRegistration" (
    id,
    "registrationId",
    "userId",
    "firstName",
    "lastName",
    email,
    phone,
    street,
    city,
    state,
    "zipCode",
    "positionTitle",
    "positionLevel",
    "electionDate",
    "campaignName",
    status,
    "createdAt",
    "updatedAt"
)
SELECT
    'reg-' || id,
    '839d2eea-2430-430b-b789-566efed56525',
    id,
    "firstName",
    COALESCE("lastName", ''),
    email,
    '555-0100',
    '123 Main St',
    'City',
    'State',
    '00000',
    'President',
    'FEDERAL',
    '2025-11-05',
    'United We Rise',
    'APPROVED',
    NOW(),
    NOW()
FROM jeffrey_user
ON CONFLICT ("registrationId") DO UPDATE SET
    status = 'APPROVED',
    "updatedAt" = NOW();

-- Verify the candidate was created
SELECT 
    c.id,
    c.name,
    c."userId",
    c.status,
    u.email
FROM "Candidate" c
JOIN "User" u ON c."userId" = u.id
WHERE u."isAdmin" = true;
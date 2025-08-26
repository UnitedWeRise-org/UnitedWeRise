-- Create Jeffrey's candidate profile
-- First, let's see what registration exists
SELECT * FROM "CandidateRegistration" WHERE "registrationId" = '839d2eea-2430-430b-b789-566efed56525';

-- Create a basic candidate profile for Jeffrey
INSERT INTO "Candidate" (
    id,
    name,
    "campaignEmail",
    "campaignWebsite", 
    "platformSummary",
    "isVerified",
    status,
    "createdAt",
    "updatedAt"
) VALUES (
    'candidate-jeffrey-test',
    'Jeffrey',
    'jeffrey@unitedwerise.org',
    'https://www.unitedwerise.org',
    'Testing candidate profile for United We Rise platform',
    true,
    'ACTIVE',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    "campaignEmail" = EXCLUDED."campaignEmail",
    "updatedAt" = NOW();

-- Verify the candidate was created
SELECT * FROM "Candidate" WHERE id = 'candidate-jeffrey-test';
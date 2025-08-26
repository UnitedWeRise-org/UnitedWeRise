-- First check if Jeffrey's registration exists
SELECT 
    cr.id,
    cr."registrationId",
    cr."firstName",
    cr."lastName", 
    cr.email,
    cr.status,
    cr."userId",
    u.email as user_email
FROM "CandidateRegistration" cr
LEFT JOIN "User" u ON cr."userId" = u.id
WHERE cr."registrationId" = '839d2eea-2430-430b-b789-566efed56525';

-- Check if any candidate profile exists for Jeffrey
SELECT 
    c.*,
    u.email as user_email
FROM "Candidate" c
LEFT JOIN "User" u ON c."userId" = u.id
WHERE u.email LIKE '%jeffrey%' OR c.name LIKE '%Jeffrey%';

-- Get Jeffrey's userId
SELECT id, email, "firstName", "lastName", "isAdmin"
FROM "User"
WHERE "isAdmin" = true
LIMIT 5;
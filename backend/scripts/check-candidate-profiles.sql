-- Check if any candidate profiles exist
SELECT 
    c.id,
    c.name,
    c.status,
    c."createdAt",
    c."isVerified"
FROM "Candidate" c
ORDER BY c."createdAt" DESC
LIMIT 10;

-- Also check candidate registrations
SELECT 
    cr.id,
    cr.registrationId,
    cr.firstName,
    cr.lastName,
    cr.email,
    cr.status,
    cr.createdAt
FROM "CandidateRegistration" cr
WHERE cr.email LIKE '%@%'
ORDER BY cr.createdAt DESC
LIMIT 10;
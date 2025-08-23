-- Check for candidate registrations in the database

-- Count total candidate registrations
SELECT COUNT(*) as total_candidates FROM "CandidateRegistration";

-- Show sample candidate registrations with details
SELECT 
  id,
  "userId",
  "firstName",
  "lastName",
  "positionTitle",
  status,
  "createdAt",
  "updatedAt"
FROM "CandidateRegistration"
ORDER BY "createdAt" DESC
LIMIT 5;

-- Check for any pending verifications
SELECT 
  status,
  COUNT(*) as count
FROM "CandidateRegistration"
GROUP BY status;

-- Check if there's a user-specific registration (replace with actual userId if known)
SELECT 
  cr.*,
  u.username,
  u.email
FROM "CandidateRegistration" cr
LEFT JOIN "User" u ON cr."userId" = u.id
ORDER BY cr."createdAt" DESC
LIMIT 5;
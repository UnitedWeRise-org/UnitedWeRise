-- Simple check for candidates
SELECT COUNT(*) as candidate_count FROM "Candidate";

-- Simple check for registrations  
SELECT COUNT(*) as registration_count FROM "CandidateRegistration";

-- Show any candidates that exist
SELECT * FROM "Candidate" LIMIT 5;
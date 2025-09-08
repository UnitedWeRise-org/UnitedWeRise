-- Fix existing comment depths that exceed our 3-layer limit
-- This script caps all comment depths at 2 for proper threading

-- First, let's see what we have
SELECT depth, COUNT(*) as count 
FROM "Comment" 
GROUP BY depth 
ORDER BY depth;

-- Update all comments with depth > 2 to depth = 2
UPDATE "Comment" 
SET depth = 2 
WHERE depth > 2;

-- Verify the fix
SELECT depth, COUNT(*) as count 
FROM "Comment" 
GROUP BY depth 
ORDER BY depth;
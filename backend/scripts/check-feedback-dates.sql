-- Check Post table for feedback data and dates
-- This script examines posts with containsFeedback=true to debug date issues

-- First, check if there are any feedback posts
SELECT 
  'Total Posts with Feedback' as description,
  COUNT(*) as count
FROM "Post" 
WHERE "containsFeedback" = true;

-- Check sample feedback posts with their actual dates
SELECT 
  id,
  "createdAt",
  "updatedAt", 
  "feedbackCategory",
  "feedbackType",
  "feedbackStatus",
  LEFT(content, 50) || '...' as content_preview
FROM "Post" 
WHERE "containsFeedback" = true 
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check if any feedback posts have today's date (potential issue)
SELECT 
  'Posts with today date' as description,
  COUNT(*) as count
FROM "Post" 
WHERE "containsFeedback" = true 
  AND DATE("createdAt") = CURRENT_DATE;

-- Check date range of feedback posts
SELECT 
  'Date Range Analysis' as description,
  MIN("createdAt") as earliest_post,
  MAX("createdAt") as latest_post,
  COUNT(*) as total_feedback_posts
FROM "Post" 
WHERE "containsFeedback" = true;
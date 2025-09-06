-- Migration: Tag existing posts as "Public Post"
-- Purpose: Add proper tags to existing posts for the unified tagging system
-- Date: September 6, 2025

-- First, let's see how many posts currently have no tags or empty tags
SELECT 
    'Before migration' as status,
    COUNT(*) as total_posts,
    SUM(CASE WHEN tags = '{}' OR tags IS NULL THEN 1 ELSE 0 END) as untagged_posts,
    SUM(CASE WHEN 'Public Post' = ANY(tags) THEN 1 ELSE 0 END) as public_posts,
    SUM(CASE WHEN 'Volunteer Post' = ANY(tags) THEN 1 ELSE 0 END) as volunteer_posts
FROM "Post";

-- Update existing posts with no tags to have "Public Post" tag
UPDATE "Post" 
SET tags = ARRAY['Public Post']::text[] 
WHERE tags = '{}' OR tags IS NULL;

-- Update existing posts with "Volunteer" tag to use "Volunteer Post" for consistency
UPDATE "Post" 
SET tags = ARRAY['Volunteer Post']::text[] 
WHERE 'Volunteer' = ANY(tags);

-- Show results after migration
SELECT 
    'After migration' as status,
    COUNT(*) as total_posts,
    SUM(CASE WHEN tags = '{}' OR tags IS NULL THEN 1 ELSE 0 END) as untagged_posts,
    SUM(CASE WHEN 'Public Post' = ANY(tags) THEN 1 ELSE 0 END) as public_posts,
    SUM(CASE WHEN 'Volunteer Post' = ANY(tags) THEN 1 ELSE 0 END) as volunteer_posts
FROM "Post";

-- Verify the migration worked correctly
SELECT 
    tags,
    COUNT(*) as post_count
FROM "Post"
GROUP BY tags
ORDER BY post_count DESC;
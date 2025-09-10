-- Add extendedContent field to Post table for extended post content
-- This replaces the comment-based continuation system with a proper database field

-- Add the new column
ALTER TABLE "Post" ADD COLUMN "extendedContent" TEXT;

-- Verify the addition
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Post' 
  AND column_name = 'extendedContent';

-- Check a few posts to confirm structure
SELECT 
    id, 
    LEFT(content, 50) || '...' as content_preview,
    "extendedContent" IS NOT NULL as has_extended,
    "createdAt"
FROM "Post" 
ORDER BY "createdAt" DESC 
LIMIT 5;
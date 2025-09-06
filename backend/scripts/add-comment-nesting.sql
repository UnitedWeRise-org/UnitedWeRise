-- Add comment nesting support (Reddit-style threading)
-- Created: September 6, 2025
-- Purpose: Enable nested comment replies with parent-child relationships

-- Add parentId field to Comment model for reply threading
ALTER TABLE "Comment" ADD COLUMN "parentId" TEXT;

-- Add foreign key constraint for parent-child comment relationships
ALTER TABLE "Comment" 
ADD CONSTRAINT "Comment_parentId_fkey" 
FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for efficient parent comment lookups
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- Add depth tracking for performance optimization (optional)
ALTER TABLE "Comment" ADD COLUMN "depth" INTEGER DEFAULT 0;
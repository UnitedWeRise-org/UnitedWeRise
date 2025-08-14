-- Production-Safe Friendship System Migration
-- This script adds the friendship system without affecting existing data

-- 1. Create FriendshipStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add new notification types to existing enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FRIEND_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FRIEND_ACCEPTED';

-- 3. Create Friendship table
CREATE TABLE IF NOT EXISTS "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- 4. Create unique constraint to prevent duplicate requests
CREATE UNIQUE INDEX IF NOT EXISTS "Friendship_requesterId_recipientId_key" 
ON "Friendship"("requesterId", "recipientId");

-- 5. Create performance indexes
CREATE INDEX IF NOT EXISTS "Friendship_requesterId_idx" ON "Friendship"("requesterId");
CREATE INDEX IF NOT EXISTS "Friendship_recipientId_idx" ON "Friendship"("recipientId");
CREATE INDEX IF NOT EXISTS "Friendship_status_idx" ON "Friendship"("status");

-- 6. Add foreign key constraints
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" 
FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_recipientId_fkey" 
FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Verify migration success
DO $$
DECLARE
    friendship_count INTEGER;
    enum_count INTEGER;
BEGIN
    -- Check if Friendship table exists and is accessible
    SELECT COUNT(*) INTO friendship_count FROM "Friendship";
    RAISE NOTICE 'Friendship table created successfully. Current count: %', friendship_count;
    
    -- Check if new notification types exist
    SELECT COUNT(*) INTO enum_count 
    FROM pg_enum 
    WHERE enumlabel IN ('FRIEND_REQUEST', 'FRIEND_ACCEPTED');
    RAISE NOTICE 'New notification types added. Count: %', enum_count;
    
    RAISE NOTICE 'Friendship system migration completed successfully!';
END $$;
-- Phase 3: Subscription Notification Toggle
-- Add notifyOnNewPosts column to Subscription table (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Subscription' AND column_name = 'notifyOnNewPosts'
    ) THEN
        ALTER TABLE "Subscription" ADD COLUMN "notifyOnNewPosts" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- NOTE: NEW_POST and MESSAGE_REQUEST enum values are added via pre-migration script
-- in the GitHub Actions workflow due to PostgreSQL transaction limitations.

-- Phase 4: DM Request System
-- Create MessageStatus enum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageStatus') THEN
        CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DELIVERED');
    END IF;
END $$;

-- Add status column to Message table (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Message' AND column_name = 'status'
    ) THEN
        ALTER TABLE "Message" ADD COLUMN "status" "MessageStatus" NOT NULL DEFAULT 'DELIVERED';
    END IF;
END $$;

-- Add index for efficient message request queries (idempotent)
CREATE INDEX IF NOT EXISTS "Message_status_idx" ON "Message"("status");

-- Phase 5: Post Audience Selection
-- Create PostAudience enum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PostAudience') THEN
        CREATE TYPE "PostAudience" AS ENUM ('PUBLIC', 'NON_FRIENDS', 'FRIENDS_ONLY');
    END IF;
END $$;

-- Add audience column to Post table (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Post' AND column_name = 'audience'
    ) THEN
        ALTER TABLE "Post" ADD COLUMN "audience" "PostAudience" NOT NULL DEFAULT 'PUBLIC';
    END IF;
END $$;

-- Phase 3: Subscription Notification Toggle
-- Add notifyOnNewPosts column to Subscription table
-- This enables opt-in notifications when subscribed users create posts
ALTER TABLE "Subscription" ADD COLUMN "notifyOnNewPosts" BOOLEAN NOT NULL DEFAULT false;

-- Add NEW_POST and MESSAGE_REQUEST to NotificationType enum
-- NEW_POST: For subscription notifications when subscribed user posts
-- MESSAGE_REQUEST: For DM requests from non-friends
ALTER TYPE "NotificationType" ADD VALUE 'NEW_POST';
ALTER TYPE "NotificationType" ADD VALUE 'MESSAGE_REQUEST';

-- Phase 4: DM Request System
-- Create MessageStatus enum for DM request tracking
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DELIVERED');

-- Add status column to Message table
-- DELIVERED is default to maintain backwards compatibility with existing messages
ALTER TABLE "Message" ADD COLUMN "status" "MessageStatus" NOT NULL DEFAULT 'DELIVERED';

-- Add index for efficient message request queries
CREATE INDEX "Message_status_idx" ON "Message"("status");

-- Phase 5: Post Audience Selection
-- Create PostAudience enum for post visibility control
CREATE TYPE "PostAudience" AS ENUM ('PUBLIC', 'NON_FRIENDS', 'FRIENDS_ONLY');

-- Add audience column to Post table
-- PUBLIC is default to maintain backwards compatibility with existing posts
ALTER TABLE "Post" ADD COLUMN "audience" "PostAudience" NOT NULL DEFAULT 'PUBLIC';

-- Phase 3: Subscription Notification Toggle
ALTER TABLE "Subscription" ADD COLUMN "notifyOnNewPosts" BOOLEAN NOT NULL DEFAULT false;

-- NOTE: NEW_POST and MESSAGE_REQUEST enum values are added via pre-migration script
-- in the GitHub Actions workflow due to PostgreSQL transaction limitations.

-- Phase 4: DM Request System
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DELIVERED');
ALTER TABLE "Message" ADD COLUMN "status" "MessageStatus" NOT NULL DEFAULT 'DELIVERED';
CREATE INDEX "Message_status_idx" ON "Message"("status");

-- Phase 5: Post Audience Selection
CREATE TYPE "PostAudience" AS ENUM ('PUBLIC', 'NON_FRIENDS', 'FRIENDS_ONLY');
ALTER TABLE "Post" ADD COLUMN "audience" "PostAudience" NOT NULL DEFAULT 'PUBLIC';

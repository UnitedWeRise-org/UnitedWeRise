-- Phase 3: Subscription Notification Toggle (conditionally - table may not exist in fresh deployments)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Subscription') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Subscription' AND column_name = 'notifyOnNewPosts') THEN
            ALTER TABLE "Subscription" ADD COLUMN "notifyOnNewPosts" BOOLEAN NOT NULL DEFAULT false;
        END IF;
    END IF;
END $$;

-- NOTE: NEW_POST and MESSAGE_REQUEST enum values are added via pre-migration script
-- in the GitHub Actions workflow due to PostgreSQL transaction limitations.

-- Phase 4: DM Request System
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageStatus') THEN
        CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DELIVERED');
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Message') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Message' AND column_name = 'status') THEN
            ALTER TABLE "Message" ADD COLUMN "status" "MessageStatus" NOT NULL DEFAULT 'DELIVERED';
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Message') THEN
        CREATE INDEX IF NOT EXISTS "Message_status_idx" ON "Message"("status");
    END IF;
END $$;

-- Phase 5: Post Audience Selection
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PostAudience') THEN
        CREATE TYPE "PostAudience" AS ENUM ('PUBLIC', 'NON_FRIENDS', 'FRIENDS_ONLY');
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Post') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Post' AND column_name = 'audience') THEN
            ALTER TABLE "Post" ADD COLUMN "audience" "PostAudience" NOT NULL DEFAULT 'PUBLIC';
        END IF;
    END IF;
END $$;

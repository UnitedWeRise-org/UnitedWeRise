-- CreateEnum for MOTD Priority (conditionally - may already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MOTDPriority') THEN
        CREATE TYPE "MOTDPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
    END IF;
END $$;

-- CreateEnum for MOTD Target Audience (conditionally - may already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MOTDTargetAudience') THEN
        CREATE TYPE "MOTDTargetAudience" AS ENUM ('ALL', 'NEW', 'ACTIVE', 'INACTIVE', 'ADMINS', 'MODERATORS', 'CANDIDATES');
    END IF;
END $$;

-- AlterTable: Add new fields to MessageOfTheDay (conditionally - table may not exist in fresh deployments)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'MessageOfTheDay') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'MessageOfTheDay' AND column_name = 'priority') THEN
            ALTER TABLE "MessageOfTheDay" ADD COLUMN "priority" "MOTDPriority" NOT NULL DEFAULT 'MEDIUM';
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'MessageOfTheDay' AND column_name = 'targetAudience') THEN
            ALTER TABLE "MessageOfTheDay" ADD COLUMN "targetAudience" "MOTDTargetAudience" NOT NULL DEFAULT 'ALL';
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'MessageOfTheDay' AND column_name = 'isDismissible') THEN
            ALTER TABLE "MessageOfTheDay" ADD COLUMN "isDismissible" BOOLEAN NOT NULL DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'MessageOfTheDay' AND column_name = 'showOnce') THEN
            ALTER TABLE "MessageOfTheDay" ADD COLUMN "showOnce" BOOLEAN NOT NULL DEFAULT false;
        END IF;
    END IF;
END $$;

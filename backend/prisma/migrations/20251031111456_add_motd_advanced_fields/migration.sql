-- CreateEnum for MOTD Priority
CREATE TYPE "MOTDPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum for MOTD Target Audience
CREATE TYPE "MOTDTargetAudience" AS ENUM ('ALL', 'NEW', 'ACTIVE', 'INACTIVE', 'ADMINS', 'MODERATORS', 'CANDIDATES');

-- AlterTable: Add new fields to MessageOfTheDay
ALTER TABLE "MessageOfTheDay" ADD COLUMN "priority" "MOTDPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "targetAudience" "MOTDTargetAudience" NOT NULL DEFAULT 'ALL',
ADD COLUMN "isDismissible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showOnce" BOOLEAN NOT NULL DEFAULT false;

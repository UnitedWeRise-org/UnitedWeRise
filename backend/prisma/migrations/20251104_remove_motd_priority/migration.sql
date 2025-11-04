-- AlterTable: Drop priority column from MessageOfTheDay
ALTER TABLE "public"."MessageOfTheDay" DROP COLUMN "priority";

-- DropEnum: Remove MOTDPriority enum type
DROP TYPE "public"."MOTDPriority";

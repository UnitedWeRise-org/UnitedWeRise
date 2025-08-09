-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "deviceFingerprint" JSONB,
ADD COLUMN     "riskScore" INTEGER NOT NULL DEFAULT 0;

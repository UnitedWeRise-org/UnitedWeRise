-- CreateEnum
CREATE TYPE "ClaimCodeType" AS ENUM ('SHARED', 'INDIVIDUAL');

-- CreateTable
CREATE TABLE "BadgeClaimCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "type" "ClaimCodeType" NOT NULL,
    "maxClaims" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "claimsUsed" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BadgeClaimCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeClaim" (
    "id" TEXT NOT NULL,
    "claimCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BadgeClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BadgeClaimCode_code_key" ON "BadgeClaimCode"("code");

-- CreateIndex
CREATE INDEX "BadgeClaimCode_code_idx" ON "BadgeClaimCode"("code");

-- CreateIndex
CREATE INDEX "BadgeClaimCode_badgeId_idx" ON "BadgeClaimCode"("badgeId");

-- CreateIndex
CREATE INDEX "BadgeClaimCode_isActive_idx" ON "BadgeClaimCode"("isActive");

-- CreateIndex
CREATE INDEX "BadgeClaim_userId_idx" ON "BadgeClaim"("userId");

-- CreateIndex
CREATE INDEX "BadgeClaim_claimCodeId_idx" ON "BadgeClaim"("claimCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeClaim_claimCodeId_userId_key" ON "BadgeClaim"("claimCodeId", "userId");

-- AddForeignKey
ALTER TABLE "BadgeClaimCode" ADD CONSTRAINT "BadgeClaimCode_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeClaim" ADD CONSTRAINT "BadgeClaim_claimCodeId_fkey" FOREIGN KEY ("claimCodeId") REFERENCES "BadgeClaimCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeClaim" ADD CONSTRAINT "BadgeClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

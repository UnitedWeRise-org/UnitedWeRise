-- CreateTable
CREATE TABLE "public"."Mute" (
    "id" TEXT NOT NULL,
    "muterId" TEXT NOT NULL,
    "mutedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "Mute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mute_muterId_idx" ON "public"."Mute"("muterId");

-- CreateIndex
CREATE INDEX "Mute_mutedId_idx" ON "public"."Mute"("mutedId");

-- CreateIndex
CREATE INDEX "Mute_expiresAt_idx" ON "public"."Mute"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Mute_muterId_mutedId_key" ON "public"."Mute"("muterId", "mutedId");

-- CreateIndex
CREATE INDEX "Block_blockerId_idx" ON "public"."Block"("blockerId");

-- CreateIndex
CREATE INDEX "Block_blockedId_idx" ON "public"."Block"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "public"."Block"("blockerId", "blockedId");

-- AddForeignKey
ALTER TABLE "public"."Mute" ADD CONSTRAINT "Mute_muterId_fkey" FOREIGN KEY ("muterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mute" ADD CONSTRAINT "Mute_mutedId_fkey" FOREIGN KEY ("mutedId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


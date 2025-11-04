-- AlterTable: Add viewToken field to MOTDView
ALTER TABLE "public"."MOTDView" ADD COLUMN "viewToken" TEXT;

-- CreateIndex: Add index on viewToken for efficient lookups
CREATE INDEX "MOTDView_viewToken_idx" ON "public"."MOTDView"("viewToken");

-- CreateIndex: Add unique constraint on (motdId, userId) to prevent duplicate authenticated views
CREATE UNIQUE INDEX "MOTDView_motdId_userId_key" ON "public"."MOTDView"("motdId", "userId");

-- CreateIndex: Add unique constraint on (motdId, viewToken) to prevent duplicate anonymous views
CREATE UNIQUE INDEX "MOTDView_motdId_viewToken_key" ON "public"."MOTDView"("motdId", "viewToken");

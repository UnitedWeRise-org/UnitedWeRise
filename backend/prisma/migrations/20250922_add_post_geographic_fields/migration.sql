-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "h3Index" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "originalH3Index" TEXT,
ADD COLUMN     "privacyDisplaced" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Post_h3Index_idx" ON "Post"("h3Index");

-- CreateIndex
CREATE INDEX "Post_h3Index_createdAt_idx" ON "Post"("h3Index", "createdAt");

-- CreateIndex
CREATE INDEX "Post_originalH3Index_createdAt_idx" ON "Post"("originalH3Index", "createdAt");
-- Migration: Add geographic fields to Post model
-- Date: 2025-09-22
-- Purpose: Enable location-based posts with privacy displacement

-- Add geographic fields to Post table
ALTER TABLE "Post" ADD COLUMN "h3Index" TEXT;
ALTER TABLE "Post" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Post" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "Post" ADD COLUMN "privacyDisplaced" BOOLEAN DEFAULT true;
ALTER TABLE "Post" ADD COLUMN "originalH3Index" TEXT; -- For jurisdiction filtering (real location)

-- Add performance indexes
CREATE INDEX "Post_h3Index_idx" ON "Post"("h3Index");
CREATE INDEX "Post_geographic_idx" ON "Post"("h3Index", "createdAt");
CREATE INDEX "Post_jurisdiction_idx" ON "Post"("originalH3Index", "createdAt");

-- Add comments for clarity
COMMENT ON COLUMN "Post"."h3Index" IS 'H3 index calculated from displaced coordinates (for map display)';
COMMENT ON COLUMN "Post"."latitude" IS 'Privacy-displaced latitude for map display';
COMMENT ON COLUMN "Post"."longitude" IS 'Privacy-displaced longitude for map display';
COMMENT ON COLUMN "Post"."originalH3Index" IS 'H3 index from real user address (for jurisdiction filtering)';
COMMENT ON COLUMN "Post"."privacyDisplaced" IS 'Flag indicating coordinates are privacy-displaced';
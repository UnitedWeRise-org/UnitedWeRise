-- Map privacy v2: store coarse areas + per-post seed instead of precise post coordinates.
-- Migration-first: this runs before the backend deploy.

-- AlterTable User: map visibility preference
ALTER TABLE "User" ADD COLUMN "geoOptIn" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable Post: area-level geography (no precise coordinates)
ALTER TABLE "Post"
ADD COLUMN "areaType" TEXT,
ADD COLUMN "areaId" TEXT,
ADD COLUMN "privacyAreaType" TEXT,
ADD COLUMN "privacyAreaId" TEXT,
ADD COLUMN "geoSeed" INTEGER,
ADD COLUMN "geoOptIn" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Post_areaType_areaId_createdAt_idx" ON "Post"("areaType", "areaId", "createdAt");
CREATE INDEX "Post_areaId_createdAt_idx" ON "Post"("areaId", "createdAt");
CREATE INDEX "Post_privacyAreaType_privacyAreaId_idx" ON "Post"("privacyAreaType", "privacyAreaId");

-- CreateTable: coarse areas with precomputed in-polygon sample points
CREATE TABLE "GeoArea" (
    "id" TEXT NOT NULL,
    "areaType" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "label" TEXT,
    "population" INTEGER,
    "centroidLat" DOUBLE PRECISION NOT NULL,
    "centroidLng" DOUBLE PRECISION NOT NULL,
    "minLat" DOUBLE PRECISION NOT NULL,
    "maxLat" DOUBLE PRECISION NOT NULL,
    "minLng" DOUBLE PRECISION NOT NULL,
    "maxLng" DOUBLE PRECISION NOT NULL,
    "samples" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeoArea_areaType_areaId_key" ON "GeoArea"("areaType", "areaId");
CREATE INDEX "GeoArea_centroidLat_centroidLng_idx" ON "GeoArea"("centroidLat", "centroidLng");

-- Backfill existing posts from their author's ZIP. Display areas start as the
-- same ZIP; low-population ZIPs are escalated lazily by GeoAreaService.
UPDATE "Post" p
SET
    "areaType" = 'zip',
    "areaId" = substring(u."zipCode" FROM 1 FOR 5),
    "privacyAreaType" = 'zip',
    "privacyAreaId" = substring(u."zipCode" FROM 1 FOR 5),
    "geoSeed" = floor(random() * 2147483647)::int,
    "geoOptIn" = u."geoOptIn"
FROM "User" u
WHERE p."authorId" = u.id
  AND u."zipCode" IS NOT NULL
  AND substring(u."zipCode" FROM 1 FOR 5) ~ '^[0-9]{5}$';

-- Privacy cleanup: remove all precise post locations that were previously stored.
UPDATE "Post"
SET
    "latitude" = NULL,
    "longitude" = NULL,
    "originalH3Index" = NULL,
    "h3Index" = NULL,
    "privacyDisplaced" = true
WHERE "latitude" IS NOT NULL
   OR "longitude" IS NOT NULL
   OR "originalH3Index" IS NOT NULL
   OR "h3Index" IS NOT NULL;

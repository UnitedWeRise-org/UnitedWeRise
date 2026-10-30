import { prisma } from '../lib/prisma';
import { GeoAreaService } from '../services/geoAreaService';
import { logger } from '../services/logger';

/**
 * One-off backfill for map privacy v2.
 *
 * Hydrates `GeoArea` rows for every ZIP already attached to a post, escalates
 * low-population ZIPs to their enclosing county, and ensures every post has a
 * random display seed. Safe to run more than once.
 *
 * Usage:
 *   npx ts-node src/scripts/backfillMapAreas.ts
 */

async function main() {
  const zipRows = await prisma.post.findMany({
    where: { areaType: 'zip', areaId: { not: null } },
    select: { areaId: true },
    distinct: ['areaId']
  });

  const zips = zipRows
    .map((row) => row.areaId)
    .filter((zip): zip is string => typeof zip === 'string' && /^\d{5}$/.test(zip));

  logger.info({ count: zips.length }, 'Backfilling map areas');

  let hydrated = 0;
  let escalated = 0;

  for (const zip of zips) {
    const area = await GeoAreaService.ensureZipArea(zip);
    if (area) hydrated++;

    const resolved = await GeoAreaService.resolvePostAreas(zip);
    if (!resolved) {
      logger.warn({ zip }, 'Unable to resolve post areas; leaving existing values');
      continue;
    }

    const update = {
      privacyAreaType: resolved.privacyAreaType,
      privacyAreaId: resolved.privacyAreaId
    };

    if (resolved.privacyAreaType !== 'zip') {
      escalated++;
    }

    await prisma.post.updateMany({
      where: {
        areaType: 'zip',
        areaId: zip,
        OR: [
          { privacyAreaType: null },
          { privacyAreaType: { not: resolved.privacyAreaType } },
          { privacyAreaId: null },
          { privacyAreaId: { not: resolved.privacyAreaId } },
          { geoSeed: null }
        ]
      },
      data: update
    });

    // Assign seeds separately so Prisma's updateMany does not reuse one value.
    const missingSeeds = await prisma.post.findMany({
      where: { areaType: 'zip', areaId: zip, geoSeed: null },
      select: { id: true }
    });
    for (const post of missingSeeds) {
      await prisma.post.update({
        where: { id: post.id },
        data: { geoSeed: Math.floor(Math.random() * 2147483647) }
      });
    }
  }

  logger.info({ hydrated, escalated, total: zips.length }, 'Map area backfill complete');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ error }, 'Map area backfill failed');
    process.exit(1);
  });

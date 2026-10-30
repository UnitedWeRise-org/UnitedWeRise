import { randomInt } from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from './logger';
import { GeoAreaService } from './geoAreaService';
import { ProbabilityFeedService } from './probabilityFeedService';

/**
 * Post geography for the map.
 *
 * Privacy model:
 * - The database stores only a coarse area (home ZIP + privacy area) and a
 *   random per-post seed. Precise coordinates and real H3 cells are never
 *   written.
 * - Display coordinates are chosen at read time from precomputed in-area sample
 *   points, varied per session by a client nonce.
 *
 * @module services/postGeographicService
 */

export interface PostGeographicData {
  areaType: string;
  areaId: string;
  privacyAreaType: string;
  privacyAreaId: string;
  geoSeed: number;
  geoOptIn: boolean;
}

export interface MapPost {
  id: string;
  coordinates: [number, number];
  content: string;
  author: string;
  engagement: number;
  createdAt: Date;
  areaLabel: string | null;
  isRealPost: true;
  tier: string;
}

export interface MapQueryOptions {
  lat: number;
  lng: number;
  zoom: number;
  userId: string;
  count?: number;
  sessionNonce?: number;
}

interface MapTier {
  name: 'national' | 'regional' | 'metro' | 'city';
  radiusKm: number | null;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CANDIDATES = 500;
const MAX_AREA_ESCALATIONS_PER_REQUEST = 20;

/**
 * Map zoom tiers. The query radius is based on the map center, never the pixel
 * viewport, so resizing the map does not trigger a refetch.
 *
 * @param zoom - MapLibre zoom level
 * @returns The tier and its fixed query radius
 */
export function getMapTier(zoom: number): MapTier {
  if (zoom < 5) return { name: 'national', radiusKm: null };
  if (zoom < 8) return { name: 'regional', radiusKm: 300 };
  if (zoom < 11) return { name: 'metro', radiusKm: 60 };
  return { name: 'city', radiusKm: 10 };
}

function mapPostInclude() {
  return {
    author: {
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        verified: true
      }
    },
    _count: {
      select: {
        likes: true,
        comments: true,
        shares: true,
        threadPosts: true
      }
    },
    comments: {
      select: {
        likesCount: true,
        dislikesCount: true,
        agreesCount: true,
        disagreesCount: true
      }
    }
  } as const;
}

function authorLabel(author: {
  displayName?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  if (author.displayName) return author.displayName;
  const fullName = [author.firstName, author.lastName].filter(Boolean).join(' ').trim();
  return fullName || author.username || 'Anonymous';
}

export class PostGeographicService {
  /**
   * Generate coarse geographic data for a new post.
   *
   * Uses the author's stored ZIP (no geocoding call), resolves the ZIP/county
   * privacy area, and generates a random seed. Returns null when the author has
   * no usable US ZIP or the area cannot be resolved; post creation then proceeds
   * without map geography.
   *
   * @param userId - Author user id
   * @returns Coarse area fields or null
   */
  static async generatePostGeographicData(userId: string): Promise<PostGeographicData | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          zipCode: true,
          country: true,
          geoOptIn: true
        }
      });

      if (!user?.zipCode) return null;
      if (user.country && user.country !== 'US') return null;

      const areas = await GeoAreaService.resolvePostAreas(user.zipCode);
      if (!areas) return null;

      return {
        ...areas,
        geoSeed: randomInt(0, 2147483647),
        geoOptIn: user.geoOptIn !== false
      };
    } catch (error) {
      logger.error({ error, userId }, 'Error generating post geographic data');
      return null;
    }
  }

  /**
   * Fetch and rank posts for the map's current view.
   *
   * The area is determined by `(center, zoom tier)`:
   * - national (<5): whole US
   * - regional (5–8): ~300 km
   * - metro (8–11): ~60 km
   * - city (>=11): ~10 km
   *
   * Candidates are ranked with the existing probability-feed signals (recency
   * with a 72-hour curve, engagement, similarity, social, reputation) and
   * sampled with weighted randomness. Display coordinates are derived from the
   * post's privacy-area samples using `geoSeed + sessionNonce`.
   *
   * @param options - Map center/zoom, viewer, count, and session nonce
   * @returns Ranked map posts plus tier metadata
   */
  static async getPostsForMapArea(options: MapQueryOptions): Promise<{
    posts: MapPost[];
    tier: MapTier;
    areaCount: number;
  }> {
    const { lat, lng, zoom, userId } = options;
    const count = Math.min(Math.max(options.count ?? 9, 1), 40);
    const sessionNonce =
      options.sessionNonce !== undefined && Number.isFinite(options.sessionNonce)
        ? options.sessionNonce
        : randomInt(0, 2147483647);
    const tier = getMapTier(zoom);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(zoom)) {
      return { posts: [], tier, areaCount: 0 };
    }

    try {
      const where: any = {
        areaType: { not: null },
        areaId: { not: null },
        privacyAreaType: { not: null },
        privacyAreaId: { not: null },
        geoSeed: { not: null },
        geoOptIn: true,
        isDeleted: false,
        feedVisible: true,
        threadHeadId: null,
        createdAt: { gte: new Date(Date.now() - THIRTY_DAYS_MS) }
      };

      let areaCount = 0;

      if (tier.radiusKm !== null) {
        const homeAreas = await GeoAreaService.findAreasNear(lat, lng, tier.radiusKm);
        areaCount = homeAreas.length;
        if (homeAreas.length === 0) {
          return { posts: [], tier, areaCount: 0 };
        }
        where.areaType = 'zip';
        where.areaId = { in: homeAreas.map((area) => area.areaId) };
      }

      const candidates = await prisma.post.findMany({
        where,
        include: mapPostInclude(),
        orderBy: { createdAt: 'desc' },
        take: MAX_CANDIDATES
      });

      if (candidates.length === 0) {
        return { posts: [], tier, areaCount };
      }

      const privacyKeys = new Map<string, { areaType: string; areaId: string }>();
      for (const post of candidates) {
        if (!post.privacyAreaType || !post.privacyAreaId) continue;
        privacyKeys.set(GeoAreaService.key(post.privacyAreaType, post.privacyAreaId), {
          areaType: post.privacyAreaType,
          areaId: post.privacyAreaId
        });
      }

      const areas = await GeoAreaService.getAreas([...privacyKeys.values()]);

      // Backfilled/legacy posts may reference areas not yet hydrated. Resolve a
      // bounded number per request; the rest will succeed on a later request.
      const missing = [...privacyKeys.entries()]
        .filter(([key]) => !areas.has(key))
        .slice(0, MAX_AREA_ESCALATIONS_PER_REQUEST);

      await Promise.all(
        missing.map(async ([key, area]) => {
          try {
            const record =
              area.areaType === 'county'
                ? await GeoAreaService.ensureCountyArea(area.areaId)
                : await GeoAreaService.ensureZipArea(area.areaId);
            if (record) areas.set(key, record);
          } catch (error) {
            logger.warn({ error, area }, 'Map area hydration failed');
          }
        })
      );

      const hydrated: { post: (typeof candidates)[number]; area: NonNullable<ReturnType<typeof areas.get>> }[] = [];
      for (const post of candidates) {
        if (!post.privacyAreaType || !post.privacyAreaId) continue;
        const area = areas.get(GeoAreaService.key(post.privacyAreaType, post.privacyAreaId));
        if (area) hydrated.push({ post, area });
      }

      if (hydrated.length === 0) {
        return { posts: [], tier, areaCount: areaCount || privacyKeys.size };
      }

      let ranked: any[];
      try {
        ranked = await ProbabilityFeedService.rankAreaPosts(
          hydrated.map((entry) => entry.post),
          userId,
          count
        );
      } catch (error) {
        logger.warn({ error, userId }, 'Map ranking failed; falling back to engagement order');
        ranked = hydrated
          .map((entry) => entry.post)
          .sort((a, b) => {
            if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
            return b.createdAt.getTime() - a.createdAt.getTime();
          })
          .slice(0, count);
      }

      const byId = new Map(hydrated.map((entry) => [entry.post.id, entry.area]));
      const posts: MapPost[] = [];

      for (const post of ranked) {
        const area = byId.get(post.id);
        if (!area || post.geoSeed === null || post.geoSeed === undefined) continue;
        const coordinates = GeoAreaService.deriveDisplayCoords(
          area,
          post.geoSeed,
          sessionNonce
        );
        if (!coordinates) continue;
        posts.push({
          id: post.id,
          coordinates,
          content: post.content,
          author: authorLabel({
            username: post.author?.username,
            firstName: post.author?.firstName,
            lastName: post.author?.lastName
          }),
          engagement: post.likesCount || 0,
          createdAt: post.createdAt,
          areaLabel: area.label,
          isRealPost: true,
          tier: tier.name
        });
      }

      return { posts, tier, areaCount: areaCount || privacyKeys.size };
    } catch (error) {
      logger.error({ error, options }, 'Error fetching posts for map area');
      return { posts: [], tier, areaCount: 0 };
    }
  }

  /**
   * Resolve a user's home ZIP area for the legacy national/state/local scope
   * parameter. Kept for backwards compatibility with older clients.
   *
   * @param userId - Viewer user id
   * @returns Home ZIP string or null
   */
  static async getUserHomeZip(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { zipCode: true, country: true }
    });
    if (!user?.zipCode) return null;
    if (user.country && user.country !== 'US') return null;
    return user.zipCode;
  }
}

export default PostGeographicService;

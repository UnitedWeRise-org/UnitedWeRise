import { prisma } from '../lib/prisma';
import { generatePrivacyDisplacedCoordinates, coordinatesToH3, formatFullAddress } from '../utils/geospatial';

export interface PostGeographicData {
  h3Index?: string;
  latitude?: number;
  longitude?: number;
  originalH3Index?: string;
  privacyDisplaced: boolean;
}

export class PostGeographicService {
  /**
   * Generate geographic data for a post based on user's address
   * Returns null if user has no complete address - graceful fallback
   */
  static async generatePostGeographicData(userId: string): Promise<PostGeographicData | null> {
    try {
      // Get user's address and cached H3 data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          streetAddress: true,
          streetAddress2: true,
          city: true,
          state: true,
          zipCode: true,
          h3Index: true
        }
      });

      // Graceful fallback: No complete address = no geographic data
      if (!user?.streetAddress || !user?.city || !user?.state || !user?.h3Index) {
        return null;
      }

      // Look up cached Geocodio coordinates from existing district mapping system
      const districtMapping = await prisma.addressDistrictMapping.findFirst({
        where: { h3Index: user.h3Index },
        select: { lat: true, lng: true, confidence: true }
      });

      if (!districtMapping) {
        // No cached coordinates available - graceful fallback
        return null;
      }

      // Generate privacy-displaced coordinates
      const realCoords = {
        lat: districtMapping.lat,
        lng: districtMapping.lng
      };

      const displacedCoords = generatePrivacyDisplacedCoordinates(realCoords, 'standard');

      // Calculate H3 indices
      const displacedH3Index = coordinatesToH3(displacedCoords);
      const originalH3Index = user.h3Index;

      return {
        h3Index: displacedH3Index,
        latitude: displacedCoords.lat,
        longitude: displacedCoords.lng,
        originalH3Index: originalH3Index,
        privacyDisplaced: true
      };

    } catch (error) {
      console.error('Error generating post geographic data:', error);
      return null; // Graceful fallback on any error
    }
  }

  /**
   * Get posts with geographic data for map display
   * Includes intelligent fallback to dummy data when insufficient real posts
   */
  static async getPostsForMap(scope: 'national' | 'state' | 'local', userH3Index?: string, count: number = 9) {
    try {
      let whereClause: any = {
        originalH3Index: { not: null },
        latitude: { not: null },
        longitude: { not: null },
        isDeleted: false,
        feedVisible: true,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      };

      // Add jurisdiction filtering based on scope
      if (scope === 'local' && userH3Index) {
        // Local: Same H3 hex + immediate neighbors
        const neighbors = await this.getH3Neighbors(userH3Index, 1);
        whereClause.originalH3Index = { in: [userH3Index, ...neighbors] };
      } else if (scope === 'state' && userH3Index) {
        // State: Larger radius for state-level content
        const neighbors = await this.getH3Neighbors(userH3Index, 3);
        whereClause.originalH3Index = { in: [userH3Index, ...neighbors] };
      }
      // National: No geographic filtering

      const posts = await prisma.post.findMany({
        where: whereClause,
        include: {
          author: { select: { displayName: true, id: true } }
        },
        orderBy: [
          { likesCount: 'desc' },
          { createdAt: 'desc' }
        ],
        take: count
      });

      return posts.map(post => ({
        id: post.id,
        coordinates: [post.longitude!, post.latitude!], // Privacy-displaced coordinates
        content: post.content,
        author: post.author.displayName || 'Anonymous',
        engagement: post.likesCount,
        createdAt: post.createdAt,
        isRealPost: true,
        jurisdiction: scope
      }));

    } catch (error) {
      console.error('Error fetching posts for map:', error);
      return []; // Return empty array for graceful fallback to dummy data
    }
  }

  /**
   * Get H3 neighbors for geographic filtering
   */
  private static async getH3Neighbors(h3Index: string, ringSize: number): Promise<string[]> {
    try {
      // Import h3-js dynamically to avoid issues
      const { gridRingUnsafe } = await import('h3-js');
      return gridRingUnsafe(h3Index, ringSize);
    } catch (error) {
      console.error('Error getting H3 neighbors:', error);
      return [];
    }
  }

  /**
   * Check if we have sufficient real posts for map display
   */
  static async hasRealPostsForMap(scope: 'national' | 'state' | 'local', userH3Index?: string): Promise<boolean> {
    const posts = await this.getPostsForMap(scope, userH3Index, 3);
    return posts.length >= 2; // Need at least 2 real posts to show meaningful content
  }
}
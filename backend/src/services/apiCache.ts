import { prisma } from '../lib/prisma';
;

// Using singleton prisma from lib/prisma.ts

export interface CacheOptions {
  ttlMinutes?: number;
  forceRefresh?: boolean;
}

export class ApiCacheService {
  /**
   * Get cached data or return null if not found/expired
   */
  static async get(provider: string, cacheKey: string): Promise<any | null> {
    try {
      const cached = await prisma.apiCache.findUnique({
        where: {
          provider_cacheKey: {
            provider,
            cacheKey
          }
        }
      });

      if (!cached) {
        return null;
      }

      // Check if expired
      if (new Date() > cached.expiresAt) {
        // Clean up expired cache in background
        this.delete(provider, cacheKey).catch(console.error);
        return null;
      }

      // Increment hit count
      await prisma.apiCache.update({
        where: { id: cached.id },
        data: { hitCount: { increment: 1 } }
      });

      return cached.responseData;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Store data in cache with TTL
   */
  static async set(
    provider: string, 
    cacheKey: string, 
    data: any, 
    ttlMinutes: number = 60
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      await prisma.apiCache.upsert({
        where: {
          provider_cacheKey: {
            provider,
            cacheKey
          }
        },
        create: {
          provider,
          cacheKey,
          responseData: data,
          expiresAt,
          hitCount: 0
        },
        update: {
          responseData: data,
          expiresAt,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Cache set error:', error);
      // Don't throw - caching should fail gracefully
    }
  }

  /**
   * Delete specific cache entry
   */
  static async delete(provider: string, cacheKey: string): Promise<void> {
    try {
      await prisma.apiCache.delete({
        where: {
          provider_cacheKey: {
            provider,
            cacheKey
          }
        }
      });
    } catch (error) {
      // Ignore delete errors (might not exist)
    }
  }

  /**
   * Clear all expired cache entries
   */
  static async clearExpired(): Promise<number> {
    try {
      const result = await prisma.apiCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });
      return result.count;
    } catch (error) {
      console.error('Clear expired cache error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(provider?: string) {
    try {
      const where = provider ? { provider } : {};
      
      const total = await prisma.apiCache.count({ where });
      const expired = await prisma.apiCache.count({
        where: {
          ...where,
          expiresAt: { lt: new Date() }
        }
      });

      const hitStats = await prisma.apiCache.aggregate({
        where,
        _sum: { hitCount: true },
        _avg: { hitCount: true }
      });

      return {
        total,
        active: total - expired,
        expired,
        totalHits: hitStats._sum.hitCount || 0,
        avgHits: hitStats._avg.hitCount || 0
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { total: 0, active: 0, expired: 0, totalHits: 0, avgHits: 0 };
    }
  }

  /**
   * Generate cache key for geographic lookups
   */
  static generateGeoKey(zipCode: string, state: string, type: string = 'officials'): string {
    return `${type}_${zipCode}_${state}`;
  }

  /**
   * Generate cache key for coordinate-based lookups
   */
  static generateCoordKey(lat: number, lng: number, type: string = 'district'): string {
    // Round to 4 decimal places for reasonable geographic grouping
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;
    return `${type}_${roundedLat}_${roundedLng}`;
  }
}
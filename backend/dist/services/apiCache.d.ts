export interface CacheOptions {
    ttlMinutes?: number;
    forceRefresh?: boolean;
}
export declare class ApiCacheService {
    /**
     * Get cached data or return null if not found/expired
     */
    static get(provider: string, cacheKey: string): Promise<any | null>;
    /**
     * Store data in cache with TTL
     */
    static set(provider: string, cacheKey: string, data: any, ttlMinutes?: number): Promise<void>;
    /**
     * Delete specific cache entry
     */
    static delete(provider: string, cacheKey: string): Promise<void>;
    /**
     * Clear all expired cache entries
     */
    static clearExpired(): Promise<number>;
    /**
     * Get cache statistics
     */
    static getStats(provider?: string): Promise<{
        total: number;
        active: number;
        expired: number;
        totalHits: number;
        avgHits: number;
    }>;
    /**
     * Generate cache key for geographic lookups
     */
    static generateGeoKey(zipCode: string, state: string, type?: string): string;
    /**
     * Generate cache key for coordinate-based lookups
     */
    static generateCoordKey(lat: number, lng: number, type?: string): string;
}
//# sourceMappingURL=apiCache.d.ts.map
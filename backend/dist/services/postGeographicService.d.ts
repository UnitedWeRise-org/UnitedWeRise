export interface PostGeographicData {
    h3Index?: string;
    latitude?: number;
    longitude?: number;
    originalH3Index?: string;
    privacyDisplaced: boolean;
}
export declare class PostGeographicService {
    /**
     * Generate geographic data for a post based on user's address
     * Returns null if user has no complete address - graceful fallback
     */
    static generatePostGeographicData(userId: string): Promise<PostGeographicData | null>;
    /**
     * Get posts with geographic data for map display
     * Includes intelligent fallback to dummy data when insufficient real posts
     */
    static getPostsForMap(scope: 'national' | 'state' | 'local', userH3Index?: string, count?: number): Promise<{
        id: string;
        coordinates: number[];
        content: string;
        author: string;
        engagement: number;
        createdAt: Date;
        isRealPost: boolean;
        jurisdiction: "state" | "local" | "national";
    }[]>;
    /**
     * Get H3 neighbors for geographic filtering
     */
    private static getH3Neighbors;
    /**
     * Check if we have sufficient real posts for map display
     */
    static hasRealPostsForMap(scope: 'national' | 'state' | 'local', userH3Index?: string): Promise<boolean>;
}
//# sourceMappingURL=postGeographicService.d.ts.map
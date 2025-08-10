export declare class EnhancedElectionService {
    private static readonly CACHE_DURATION_HOURS;
    private static readonly API_TIMEOUT_MS;
    private static readonly CACHE_KEY;
    private static readonly EXTERNAL_APIS;
    /**
     * Main entry point - get election data using multi-tier strategy
     */
    static getElectionData(state: string, zipCode?: string): Promise<{
        elections: any[];
        source: 'cache' | 'api' | 'fallback';
        lastUpdated: Date;
        message?: string;
    }>;
    /**
     * Get election data from our internal database first (existing system)
     */
    static getInternalElectionData(state: string): Promise<any[]>;
    /**
     * Tier 1: Cache management
     */
    private static getCachedData;
    private static setCachedData;
    private static isCacheValid;
    /**
     * Tier 2: External API integration
     */
    private static fetchFromExternalAPIs;
    private static fetchFromAPI;
    private static fetchFromGoogleCivic;
    /**
     * Tier 3: Fallback system with typical election cycles
     */
    private static generateFallbackData;
    private static getTypicalElectionCycles;
    /**
     * Last resort fallback
     */
    private static getBasicFallback;
    private static getFirstTuesdayAfterFirstMonday;
    private static isSenateElectionYear;
    private static getNextStateElectionYear;
    private static inferElectionType;
    private static inferElectionLevel;
    private static inferElectionTypeFromLevel;
    /**
     * Force refresh cache (admin function)
     */
    static refreshCache(state?: string): Promise<void>;
}
//# sourceMappingURL=enhancedElectionService.d.ts.map
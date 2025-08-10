export interface CivicOfficial {
    name: string;
    office: string;
    party?: string;
    phones?: string[];
    emails?: string[];
    urls?: string[];
    photoUrl?: string;
    address?: {
        line1?: string;
        city?: string;
        state?: string;
        zip?: string;
    };
    channels?: Array<{
        type: string;
        id: string;
    }>;
}
export interface CivicResponse {
    officials: CivicOfficial[];
    offices: Array<{
        name: string;
        level: string;
        roles: string[];
        officials: number[];
    }>;
}
export declare class GeolocationService {
    /**
     * Get elected officials by address with caching
     */
    static getOfficialsByAddress(address: string, zipCode?: string, state?: string, forceRefresh?: boolean): Promise<CivicResponse | null>;
    /**
     * Transform Geocodio's response format to our standardized format
     */
    private static transformGeocodioResponse;
    /**
     * Format office title from legislator type and district info
     */
    private static formatOfficeTitle;
    /**
     * Determine government level from legislator type
     */
    private static determineLevelFromType;
    /**
     * Store officials in our database for enhanced searching
     */
    private static storeOfficialsInDb;
    /**
     * Get cached officials from our database (faster than API)
     */
    static getCachedOfficialsByLocation(zipCode: string, state: string): Promise<CivicOfficial[]>;
    /**
     * Refresh officials data for a location
     */
    static refreshLocation(zipCode: string, state: string): Promise<boolean>;
}
export declare const googleCivicService: typeof GeolocationService;
//# sourceMappingURL=googleCivic.d.ts.map
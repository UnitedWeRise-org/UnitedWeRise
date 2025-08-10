export interface Representative {
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
    district?: string;
    level: 'federal' | 'state' | 'local';
    type?: 'representative' | 'senator';
    bio?: {
        first_name?: string;
        last_name?: string;
        birthday?: string;
        gender?: string;
        party?: string;
    };
    social?: {
        twitter?: string;
        facebook?: string;
        youtube?: string;
    };
    references?: {
        bioguide_id?: string;
        thomas_id?: string;
        opensecrets_id?: string;
        votesmart_id?: string;
        fec_ids?: string[];
        cspan_id?: string;
        govtrack_id?: string;
        house_history_id?: string;
        maplight_id?: string;
        washington_post_id?: string;
        icpsr_id?: string;
    };
}
export interface RepresentativeResponse {
    representatives: Representative[];
    location: {
        zipCode: string;
        state: string;
        city?: string;
        coordinates?: {
            lat: number;
            lng: number;
        };
    };
    source: 'geocodio' | 'fec' | 'cache';
}
export declare class RepresentativeService {
    /**
     * Get representatives by address using available APIs
     */
    static getRepresentativesByAddress(address: string, zipCode?: string, state?: string, forceRefresh?: boolean): Promise<RepresentativeResponse | null>;
    /**
     * Fetch representatives from Geocodio API
     */
    private static fetchFromGeocodio;
    /**
     * Fetch representatives from FEC API (federal only)
     */
    private static fetchFromFEC;
    /**
     * Transform Geocodio response to our format
     */
    private static transformGeocodioResponse;
    /**
     * Transform FEC response to our format (simplified)
     */
    private static transformFECResponse;
    /**
     * Format office title from legislator type and district info
     */
    private static formatOfficeTitle;
    /**
     * Extract ZIP code from formatted address
     */
    private static extractZipFromAddress;
    /**
     * Extract state from formatted address
     */
    private static extractStateFromAddress;
    /**
     * Store representatives in our database
     */
    private static storeRepresentativesInDb;
    /**
     * Get cached representatives from our database
     */
    static getCachedRepresentativesByLocation(zipCode: string, state: string): Promise<Representative[]>;
    /**
     * Refresh representatives data for a location
     */
    static refreshLocation(zipCode: string, state: string): Promise<boolean>;
}
//# sourceMappingURL=representativeService.d.ts.map
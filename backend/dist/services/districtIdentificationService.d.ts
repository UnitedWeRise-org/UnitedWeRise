export interface AddressComponents {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    lat?: number;
    lng?: number;
}
export interface DistrictIdentification {
    districts: {
        id: string;
        name: string;
        type: string;
        level: string;
        identifier: string;
        confidence: number;
    }[];
    location: {
        lat: number;
        lng: number;
        h3Index: string;
        zipCode: string;
        state: string;
    };
    source: 'DATABASE' | 'GEOCODIO' | 'GOOGLE_CIVIC' | 'CENSUS' | 'CROWDSOURCED';
    cached: boolean;
}
export interface MissingDistrictOffice {
    districtId: string;
    districtName: string;
    officeTitle: string;
    level: string;
    estimatedTermLength?: number;
    nextElectionDate?: Date;
    confidence: number;
}
export declare class DistrictIdentificationService {
    /**
     * Identify all electoral districts for a given address
     */
    static identifyDistricts(address: AddressComponents, forceRefresh?: boolean): Promise<DistrictIdentification>;
    /**
     * Get districts from our database
     */
    private static getDistrictsFromDatabase;
    /**
     * Get districts from external APIs (Geocodio, Google Civic)
     */
    private static getDistrictsFromAPIs;
    /**
     * Fetch district data from Geocodio API
     */
    private static fetchDistrictsFromGeocodio;
    /**
     * Transform Geocodio response to our format
     */
    private static transformGeocodioResponse;
    /**
     * Transform Google Civic response to our format
     */
    private static transformGoogleCivicResponse;
    /**
     * Store identified districts in our database
     */
    private static storeDistrictsInDatabase;
    /**
     * Find offices that should exist but are missing data
     */
    static findMissingOffices(districtIds: string[]): Promise<MissingDistrictOffice[]>;
    /**
     * Get expected offices for a district type
     */
    private static getExpectedOffices;
    private static extractZipFromAddress;
    private static extractStateFromAddress;
    private static inferDistrictLevel;
    private static inferDistrictType;
    private static formatDistrictName;
}
//# sourceMappingURL=districtIdentificationService.d.ts.map
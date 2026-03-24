export interface Coordinates {
    lat: number;
    lng: number;
}
export interface AddressComponents {
    streetAddress: string;
    streetAddress2?: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
}
/**
 * Convert address to coordinates using lookup tables (simplified).
 * Returns null for non-US addresses since lookup tables are US-only.
 * In production, integrate with Google Maps, Mapbox, or similar service.
 * @param address - Address components including optional country code
 * @returns Coordinates or null if address cannot be geocoded
 */
export declare const geocodeAddress: (address: AddressComponents) => Promise<Coordinates | null>;
export declare const coordinatesToH3: (coords: Coordinates, resolution?: number) => string;
export declare const h3ToCoordinates: (h3Index: string) => Coordinates;
export declare const getNearbyH3Indexes: (h3Index: string, ringSize?: number) => string[];
export declare const addressToH3: (address: AddressComponents, resolution?: number) => Promise<string | null>;
export declare const generatePrivacyDisplacedCoordinates: (realCoords: Coordinates, privacyLevel?: "standard" | "high") => Coordinates;
export declare const formatFullAddress: (address: AddressComponents) => string;
export declare const getVotingDistrict: (coords: Coordinates) => Promise<{
    congressional: string;
    state: string;
    local: string;
} | null>;
//# sourceMappingURL=geospatial.d.ts.map
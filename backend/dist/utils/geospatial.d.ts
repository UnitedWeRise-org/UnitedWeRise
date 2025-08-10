export interface Coordinates {
    lat: number;
    lng: number;
}
export interface AddressComponents {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
}
export declare const geocodeAddress: (address: AddressComponents) => Promise<Coordinates | null>;
export declare const coordinatesToH3: (coords: Coordinates, resolution?: number) => string;
export declare const h3ToCoordinates: (h3Index: string) => Coordinates;
export declare const getNearbyH3Indexes: (h3Index: string, ringSize?: number) => string[];
export declare const addressToH3: (address: AddressComponents, resolution?: number) => Promise<string | null>;
export declare const getVotingDistrict: (coords: Coordinates) => Promise<{
    congressional: string;
    state: string;
    local: string;
} | null>;
//# sourceMappingURL=geospatial.d.ts.map
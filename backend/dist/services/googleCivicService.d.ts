export interface GoogleCivicRepresentative {
    name: string;
    office: string;
    party?: string;
    phones?: string[];
    emails?: string[];
    urls?: string[];
    photoUrl?: string;
    channels?: Array<{
        type: string;
        id: string;
    }>;
    address?: Array<{
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        zip?: string;
    }>;
}
export interface GoogleCivicResponse {
    kind?: string;
    normalizedInput?: {
        line1?: string;
        city?: string;
        state?: string;
        zip?: string;
    };
    divisions?: Record<string, any>;
    offices?: Array<{
        name: string;
        divisionId: string;
        levels?: string[];
        roles?: string[];
        officialIndices: number[];
    }>;
    officials?: GoogleCivicRepresentative[];
}
export declare class GoogleCivicService {
    /**
     * Get representatives using Google Civic Information API
     */
    static getRepresentativesByAddress(address: string, includeOffices?: boolean): Promise<any>;
    /**
     * Get election information
     */
    static getElectionInfo(address: string): Promise<any>;
    /**
     * Transform Google Civic response to our standard format
     */
    private static transformGoogleCivicResponse;
    /**
     * Extract social media handles from channels
     */
    private static extractSocialMedia;
}
export default GoogleCivicService;
//# sourceMappingURL=googleCivicService.d.ts.map
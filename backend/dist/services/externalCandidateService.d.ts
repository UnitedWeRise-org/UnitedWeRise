/**
 * External Candidate Import Service
 *
 * Pre-populates candidate data from external sources before they register
 * Supports Google Civic API, FEC API, and future Ballotpedia integration
 */
export declare class ExternalCandidateService {
    private static googleCivicApiKey;
    private static fecApiKey;
    private static readonly CACHE_DURATIONS;
    /**
     * Import candidates from Google Civic API for a specific address
     */
    static importCandidatesForAddress(address: string): Promise<{
        imported: number;
        updated: number;
        errors: string[];
    }>;
    /**
     * Import single candidate from Google Civic data
     */
    private static importSingleCandidate;
    /**
     * Map Google Civic office levels to our system
     */
    private static mapGoogleCivicLevel;
    /**
     * Find or create office for external candidate
     */
    private static findOrCreateOffice;
    /**
     * Bulk import candidates for all ZIP codes in database
     */
    static bulkImportFromUserLocations(): Promise<{
        addressesProcessed: number;
        totalImported: number;
        totalUpdated: number;
        errors: string[];
    }>;
    /**
     * Allow user to claim an external candidate profile
     */
    static claimCandidateProfile(userId: string, candidateId: string, verificationData?: {
        legalName: string;
        email: string;
        phone: string;
    }): Promise<{
        name: string;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        verificationStatus: string | null;
        campaignWebsite: string | null;
        userId: string | null;
        status: import(".prisma/client").$Enums.CandidateStatus | null;
        withdrawnAt: Date | null;
        party: string | null;
        officeId: string;
        dataSource: string | null;
        isVerified: boolean;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        isWithdrawn: boolean;
        withdrawnReason: string | null;
        statusChangedAt: Date | null;
        statusChangedBy: string | null;
        statusReason: string | null;
        suspendedUntil: Date | null;
        appealDeadline: Date | null;
        appealNotes: string | null;
        lastVerificationDate: Date | null;
        nextVerificationDue: Date | null;
        thirdPartyVerification: boolean;
        isExternallySourced: boolean;
        externalSourceId: string | null;
        lastExternalSync: Date | null;
        externalDataConfidence: number | null;
        isClaimed: boolean;
        claimedBy: string | null;
        claimedAt: Date | null;
        googleCivicId: string | null;
        fecCandidateId: string | null;
        ballotpediaId: string | null;
        externalPhotoUrl: string | null;
        externalBiography: string | null;
        externalKeyIssues: string[];
    }>;
    /**
     * Get unclaimed candidates that match a user's name
     */
    static getClaimableCandidates(userId: string): Promise<any[]>;
    /**
     * Process cached candidate data from ApiCacheService
     */
    private static processCachedCandidateData;
    /**
     * Calculate simple name similarity score
     */
    private static calculateNameSimilarity;
    /**
     * Get all candidates (internal + external) for a specific address grouped by race
     * Includes fuzzy matching for race deduplication
     */
    static getCandidatesForAddress(address: string): Promise<Array<{
        office: string;
        level: string;
        district?: string;
        election: {
            date: string;
            name: string;
        };
        candidates: Array<{
            id: string;
            name: string;
            party?: string;
            isExternal: boolean;
            isRegistered: boolean;
            campaignWebsite?: string;
            externalDataConfidence?: number;
            dataSource?: string;
        }>;
    }>>;
    /**
     * Normalize office titles for fuzzy matching and deduplication
     * Handles variations like "President", "President of the United States", "U.S. President"
     */
    private static normalizeOfficeTitle;
    /**
     * Get externally sourced candidates for search with caching
     */
    static searchExternalCandidates(searchTerm: string, limit?: number): Promise<any>;
    /**
     * Sync external data for existing candidates
     */
    static syncExternalData(): Promise<void>;
    /**
     * Health check for external APIs
     */
    static healthCheck(): Promise<{
        googleCivic: {
            status: string;
            configured: boolean;
        };
        fec: {
            status: string;
            configured: boolean;
        };
    }>;
}
export declare const externalCandidateService: ExternalCandidateService;
//# sourceMappingURL=externalCandidateService.d.ts.map